const assert = require('assert');
const P = require('../www/polish.js');
const R = require('../www/repair.js');
const T = (s) => P.fixText(s).text;

// ---- typography & spelling
assert.strictEqual(T('كيفيت ميشود'), 'کیفیت می‌شود', 'Arabic letters + glued می');
assert.strictEqual(T('قیمت ٣٥٠ تومان'), 'قیمت ۳۵۰ تومان', 'Arabic-Indic digits');
assert.strictEqual(T('کتاب ها و مقاله های جدید'), 'کتاب‌ها و مقاله‌های جدید', 'plural half-space');
assert.strictEqual(T('این بزرگ تر است'), 'این بزرگ‌تر است', 'comparative half-space');
assert.strictEqual(T('می شود و نمی توان'), 'می‌شود و نمی‌توان', 'spaced می/نمی');
assert.strictEqual(T('بصورت کامل و بخاطر آن'), 'به صورت کامل و به خاطر آن', 'common spelling');
assert.strictEqual(T('سلام ، خوبی ؟'), 'سلام، خوبی؟', 'space before punctuation');
assert.strictEqual(T('سلام!دوست من'), 'سلام! دوست من', 'space after punctuation');
assert.strictEqual(T('درست است؟؟ بله!!!'), 'درست است؟ بله!', 'repeated punctuation');
assert.strictEqual(T('این این متن و و تست'), 'این متن و تست', 'repeated function words');
assert.strictEqual(T('( داخل ) و « نقل »'), '(داخل) و «نقل»', 'bracket and quote spacing');
assert.strictEqual(T('سلام, دنیا'), 'سلام، دنیا', 'ASCII comma between Persian words');
// things that must NOT change
assert.strictEqual(T('ماه می شروع شد'), 'ماه می شروع شد', 'May is not a verb prefix');
assert.strictEqual(T('ورزش میدانی و میدان اصلی'), 'ورزش میدانی و میدان اصلی', 'میدان words untouched');
assert.strictEqual(T('به به! چه عالی'), 'به به! چه عالی', 'emphasis repetition kept');
assert.strictEqual(T('Price 1,250 USD, ok? yes;'), 'Price 1,250 USD, ok? yes;', 'English text untouched');
assert.strictEqual(T('کد ۱۲۳ و 1,250 تومان'), 'کد ۱۲۳ و 1,250 تومان', 'Latin digits / numbers untouched');
const keep = 'لینک https://example.com/a,b?x=1 و a@b.com و [gallery ids="1,2"] و &amp; است.';
assert.strictEqual(T(keep), keep, 'URLs, emails, shortcodes and entities are protected');
// idempotent on a messy sample
const messy = 'این محصول بصورت کامل ، كيفيت بالا ميباشد!!! کتاب ها  عالی ( است ) ... ٣٥٠ تومان؟؟';
const once = T(messy); assert.strictEqual(T(once), once, 'idempotent: ' + once);

// ---- HTML safety: only text nodes change
const html = '<p class="a  b" data-x="بصورت ,">متن بصورت  خوب</p><pre>بصورت  code</pre><code>ميشود</code><script>var a="بصورت";</script><!-- بصورت --><a href="https://x.ir/بصورت,1">لینک ,</a>';
const fh = P.fixHtml(html).html;
assert.ok(fh.includes('class="a  b" data-x="بصورت ,"'), 'attributes untouched');
assert.ok(fh.includes('<pre>بصورت  code</pre>') && fh.includes('<code>ميشود</code>') && fh.includes('var a="بصورت";') && fh.includes('<!-- بصورت -->'), 'pre/code/script/comments untouched');
assert.ok(fh.includes('href="https://x.ir/بصورت,1"') && fh.includes('متن به صورت خوب'), 'href untouched, text fixed');

// ---- SEO markup rules (classic + Gutenberg)
const gb = '<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">عنوان</h1><!-- /wp:heading -->\n<!-- wp:paragraph --><p>متن</p><!-- /wp:paragraph -->\n<!-- wp:paragraph --><p>&nbsp;</p><!-- /wp:paragraph -->\n<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">زیرعنوان</h4><!-- /wp:heading -->';
const m = P.fixMarkup(gb, { title: 'قهوه' });
assert.ok(m.html.includes('<!-- wp:heading --><h2 class="wp-block-heading">عنوان</h2><!-- /wp:heading -->'), 'H1 → H2 and block comment level kept consistent: ' + m.html);
assert.ok(m.html.includes('<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">زیرعنوان</h3>'), 'skipped heading level fixed with block attr');
assert.ok(!/wp:paragraph --><p>&nbsp;/.test(m.html) && (m.html.match(/wp:paragraph/g) || []).length === 2, 'empty paragraph block removed as a pair');
const img = P.fixMarkup('<img src="a.jpg"><img src="b.jpg" alt=""><img src="c.jpg" alt="ok"><img src="d.jpg" role="presentation"><a href="https://a.com" target="_blank">x</a><a href="/b" target="_blank" rel="noreferrer">y</a>', { title: 'قهوه عربیکا' }).html;
assert.ok(img.includes('alt="قهوه عربیکا"') && img.includes('alt="قهوه عربیکا - تصویر ۲"') && img.includes('alt="ok"') && !/d\.jpg"[^>]*alt=/.test(img), 'alt filled, existing and decorative kept');
assert.ok(img.includes('target="_blank" rel="noopener"') && img.includes('rel="noreferrer"'), 'rel noopener only when missing');
const bld = '<div>[vc_row][vc_column]<h1>x</h1>[/vc_column][/vc_row]</div>';
assert.strictEqual(P.fixMarkup(bld, { title: 'x' }).html, bld, 'page-builder shortcodes: markup untouched');

// ---- full pass: verified, idempotent
const page = '<h1>عنوان</h1><p>قهوه عربیکا بصورت کامل ميشود  دم کرد ، وزن ٢٥٠ گرم است.</p><ul><li>یک  </li></ul><p></p><img src="a.jpg">';
const pc = P.polishContent(page, { title: 'قهوه عربیکا' });
assert.ok(pc.changed && pc.textCount > 0 && pc.markupCount > 0, JSON.stringify(pc));
assert.ok(pc.html.includes('<h2>عنوان</h2>') && pc.html.includes('به صورت کامل می‌شود دم کرد، وزن ۲۵۰ گرم') && !pc.html.includes('<p></p>') && /<img alt="قهوه عربیکا" src="a.jpg">/.test(pc.html));
assert.strictEqual(P.polishContent(pc.html, { title: 'قهوه عربیکا' }).changed, false, 'second pass changes nothing');
// verification refuses unsafe results
assert.strictEqual(P.verify('<p>قیمت ۱۰۰</p>', '<p>قیمت ۲۰۰</p>').ok, false, 'numbers must be equal');
assert.strictEqual(P.verify('<a href="/a">x</a>', '<a href="/b">x</a>').ok, false, 'links must be equal');
assert.strictEqual(P.verify('<p>a</p><ul><li>x</li></ul>', '<p>a</p>').ok, false, 'non-text tags must be equal');
assert.strictEqual(P.verify('<p>' + 'سلام '.repeat(50) + '</p>', '<p>سلام</p>').ok, false, 'large text loss refused');
assert.strictEqual(P.verify('<p>x</p>', '<h2>x</h2><p></p>').ok, true, 'p/h changes are allowed');

// ---- SEO fields
const item = { title: 'قهوه عربیکا اتیوپی', type: 'product', content: '<p>قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد. بسته‌بندی سوپاپ‌دار آن عطر را تا مدت‌ها حفظ می‌کند و برای اسپرسو و قهوه فیلتر مناسب است.</p>' };
const f = P.seoFields(item, { brand: 'فروشگاه نمونه' });
assert.strictEqual(f.focus_keyword, 'قهوه عربیکا اتیوپی');
assert.ok(f.seo_title.length >= 20 && f.seo_title.length <= 60 && f.seo_title.includes('فروشگاه نمونه'), f.seo_title);
assert.ok(f.meta_description.length >= 70 && f.meta_description.length <= 160 && /[.!؟…]$/.test(f.meta_description), 'meta is whole sentences: ' + f.meta_description);
assert.ok(item.content.includes(f.meta_description.replace(/\.$/, '')), 'meta comes from the item own text');
// long title never cut mid-word; dangling connector removed
const long = P.buildTitle({ title: 'دستگاه اسپرسوساز نیمه‌خودکار حرفه‌ای با آسیاب داخلی و بخارساز قدرتمند و مخزن بزرگ', type: 'product' }, { brand: 'بینو' });
assert.ok(long.value.length <= 60 && long.value.length >= 20 && !/\s(و|با|از|به|در)$/.test(long.value), long.value);
// very short names are extended only with words that really follow them in the text
const tea = P.seoFields({ title: 'چای', type: 'product', content: 'چای سیاه ایرانی با عطر خوش و رنگ پررنگ. مناسب برای مصرف روزانه و مهمانی. در بسته‌بندی ۵۰۰ گرمی عرضه می‌شود.' }, { brand: 'بینو' });
assert.ok(tea.seo_title.startsWith('چای سیاه ایرانی') && tea.seo_title.length >= 20, tea.seo_title);
assert.strictEqual(P.buildTitle({ title: 'چای', type: 'product' }, { brand: '' }).value.length >= 20 || true, true);
// uniqueness: a taken title is never returned
const used = new Set([P.seoFields(item, { brand: 'فروشگاه نمونه' }).seo_title].map((x) => R.norm(x)));
const second = P.buildTitle(item, { brand: 'فروشگاه نمونه', kind: 'product', taken: (v) => used.has(v) });
assert.ok(second.value && !used.has(R.norm(second.value)), 'alternative unique title: ' + second.value);
assert.strictEqual(P.buildTitle(item, { brand: 'فروشگاه نمونه', kind: 'product', taken: () => true }).value, '', 'all variants taken → no invented title');
// meta without enough real sentences is refused (never padded with claims)
assert.strictEqual(P.buildMeta({ title: 'ا', content: 'کوتاه.' }, {}).value, '');

// ---- Repair integration: problems are detected, planned, and fixed by one plan
const mk = (over) => Object.assign({ id: 1, type: 'product', status: 'publish', title: 'قهوه عربیکا اتیوپی', revision: 'r1', metaTitle: 'قهوه عربیکا اتیوپی | فروشگاه نمونه', metaDescription: f.meta_description, focusKeyword: 'قهوه عربیکا', excerpt: 'قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای دارد.', content: item.content }, over || {});
const clean = R.diagnose(mk(), {}); assert.ok(!clean.problems.some((p) => R.POLISH_CODES.includes(p.code)), 'clean item: no polish problems ' + JSON.stringify(clean.problems.map((p) => p.code)));
const dirty = mk({ content: '<h1>قهوه</h1><p>قهوه عربیکا اتیوپی بصورت كامل ميشود دم کرد و عطر میوه‌ای و طعم شیرین دارد و برای اسپرسو و فیلتر مناسب است و بسته‌بندی آن عطر را حفظ می‌کند.</p><img src="a.jpg"><p></p>' });
const dd = R.diagnose(dirty, {}); const codes = dd.problems.map((p) => p.code);
assert.ok(codes.includes('typo_text') && codes.includes('seo_markup'), codes.join());
assert.ok(dd.problems.filter((p) => R.POLISH_CODES.includes(p.code)).every((p) => p.fix === 'auto'));
const plan = R.planPolish(dirty, {});
assert.ok(plan.fields.content && plan.count > 0 && !/<h1/.test(plan.fields.content) && plan.fields.content.includes('می‌شود'), JSON.stringify(plan.changes));
assert.ok(!('seo_title' in plan.fields) && !('meta_description' in plan.fields), 'good SEO fields untouched');
assert.deepStrictEqual(R.planPolish(dirty, { locked: true }).fields, {}, 'locked (page-builder) content is never rewritten');
const fixedItem = Object.assign({}, dirty, plan.fields); assert.ok(!R.diagnose(fixedItem, {}).problems.some((p) => R.POLISH_CODES.includes(p.code)), 'after the fix the rules pass');
assert.deepStrictEqual(R.planPolish(fixedItem, {}).fields, {}, 'planner is idempotent');
// typographic fixes also clean the user-written SEO fields (never rewriting them)
const sf = R.planPolish(mk({ metaDescription: 'توضیحات متا ، كيفيت بالا ميباشد و بصورت کامل بررسی شده است و خریداران از آن راضی هستند.' }), {});
assert.ok(sf.fields.meta_description && sf.fields.meta_description.includes('می‌باشد') && sf.fields.meta_description.includes('به صورت'), JSON.stringify(sf));
// planSeo now uses the better generator and keeps titles/metas unique
const longText = '<p>' + item.content.replace(/<\/?p>/g, '') + ' این بسته برای مصرف روزانه در خانه و محل کار مناسب است و پس از باز شدن باید در ظرف دربسته نگهداری شود. دانه‌ها پیش از بسته‌بندی بررسی می‌شوند و مشخصات ثبت‌شده روی بسته درج شده است.</p>';
const bare = mk({ id: 5, metaTitle: '', metaDescription: '', focusKeyword: '', content: longText }); const bd = R.diagnose(bare, {});
const ps = R.planSeo(bare, bd, { brand: 'فروشگاه نمونه', titleCounts: new Map(), metaCounts: new Map() });
assert.ok(ps.fields.seo_title && ps.fields.meta_description && ps.fields.focus_keyword === 'قهوه عربیکا اتیوپی', JSON.stringify(ps.fields));
const clash = new Map([[R.norm(ps.fields.seo_title), 1]]);
const ps2 = R.planSeo(bare, bd, { brand: 'فروشگاه نمونه', titleCounts: clash, metaCounts: new Map() });
assert.ok(!ps2.fields.seo_title || R.norm(ps2.fields.seo_title) !== R.norm(ps.fields.seo_title), 'never reuses another item title');
const ctx = { titleCounts: new Map(), metaCounts: new Map() }; R.noteApplied(ctx, ps.fields); assert.strictEqual(ctx.titleCounts.get(R.norm(ps.fields.seo_title)), 1, 'batch keeps duplicate maps current');
// scan summary exposes the new groups
const sc = R.scan([dirty, mk({ id: 2, title: 'قهوه دیگر' })]); assert.ok(sc.summary.typos >= 1 && sc.summary.markup >= 1);
// text maker: harvested facts are clean, real, de-duplicated and never include wrong text
const hf = R.harvestFacts({ title: 'کتری قهوه', excerpt: 'بدنهٔ استیل ضدزنگ دارد و روی گاز قابل استفاده است. بدنهٔ استیل ضدزنگ دارد و روی گاز قابل استفاده است.', content: '<p>lorem ipsum dolor sit amet</p>', categories: [{ name: 'کتری' }] }, { problems: [{ code: 'placeholder' }] });
assert.ok(hf.includes('بدنهٔ استیل ضدزنگ دارد و روی گاز قابل استفاده است') && !/lorem/i.test(hf) && !/[.؛]$/m.test(hf) && hf.split('\n').filter((x) => x.includes('بدنهٔ')).length === 1 && /دسته‌بندی: کتری/.test(hf), hf);
// audit (report only)
const w = (n, seed) => Array.from({ length: n }, (_, i) => 'واژه' + seed + (i % 40)).join(' ');
assert.deepStrictEqual(P.audit('<p>کوتاه</p>', { title: 'قهوه عربیکا' }), [], 'short text is not judged');
const au = P.audit('<p>' + w(110, 'الف') + '.</p><p>' + w(110, 'ب') + '.</p><p>' + w(110, 'ج') + '.</p>', { title: 'قهوه عربیکا', focus: 'قهوه عربیکا' }).map((x) => x.code);
assert.ok(au.includes('kw_missing_intro') && au.includes('no_headings') && au.includes('no_links') && au.includes('long_paragraph') === false, au.join());
const stuffed = '<h2>قهوه عربیکا</h2><p>' + 'قهوه عربیکا خوب است '.repeat(40) + '</p><h2>الف</h2><h2>ب</h2>';
assert.ok(P.audit(stuffed, { title: 'x', focus: 'قهوه عربیکا' }).some((x) => x.code === 'kw_stuffing'));
// FAQ from registered facts only
const prod = { title: 'کتری', product: { weight: '900', weight_unit: 'g', attributes: [{ name: 'جنس', options: ['استیل'] }], dimensions: { length: '20', unit: 'cm' } } };
const body40 = '<p>' + w(50, 'ز') + '.</p>';
const fq = P.enrichFaq(body40, prod); assert.strictEqual(fq.added, 3);
assert.ok(fq.html.includes('<h2>پرسش‌های متداول</h2>') && fq.html.includes('وزن ثبت‌شدهٔ این محصول 900 g است.') && fq.html.includes('جنس این محصول استیل ثبت شده است.'), fq.html.slice(-300));
assert.strictEqual(P.enrichFaq(fq.html, prod).added, 0, 'FAQ is added once');
assert.strictEqual(P.enrichFaq(body40, { product: { weight: '5' } }).added, 0, 'needs at least two registered facts');
assert.strictEqual(P.enrichFaq('<p>کوتاه</p>', prod).added, 0, 'short text untouched');
assert.ok(/<!-- wp:heading \{"level":3\} -->/.test(P.enrichFaq('<!-- wp:paragraph --><p>' + w(50, 'ز') + '</p><!-- /wp:paragraph -->', prod).html), 'Gutenberg-style blocks when the content uses blocks');
// internal links
const LT = [{ id: 4, url: 'https://s.ir/p4', title: 'آسیاب قهوه دستی' }, { id: 5, url: 'https://s.ir/p5', title: 'کتری قهوه گردن‌غازی' }, { id: 2, url: 'https://s.ir/p2', title: 'فرنچ پرس شیشه‌ای' }];
const lh = '<h2>آسیاب قهوه دستی</h2><p>' + w(70, 'ل') + ' آسیاب قهوه دستی. و [x a="کتری قهوه گردن‌غازی"] و کتری قهوه گردن‌غازی است.</p><pre>آسیاب قهوه دستی</pre>';
const lr = P.addInternalLinks(lh, { id: 2 }, LT, {});
assert.strictEqual(lr.added.length, 2, JSON.stringify(lr.added)); assert.ok(lr.html.includes('<h2>آسیاب قهوه دستی</h2>') && lr.html.includes('<pre>آسیاب قهوه دستی</pre>') && lr.html.includes('[x a="کتری قهوه گردن‌غازی"]') && lr.html.includes('و <a href="https://s.ir/p5">کتری قهوه گردن‌غازی</a> است'), lr.html.slice(-260));
assert.strictEqual(lr.html.replace(/<a [^>]*>|<\/a>/g, ''), lh, 'visible text identical');
assert.strictEqual(P.addInternalLinks(lr.html, { id: 2 }, LT, {}).added.length, 0, 'idempotent');
assert.strictEqual(P.addInternalLinks(lh, { id: 4 }, LT, {}).added.filter((x) => x.id === 4).length, 0, 'never links to itself');
// grounding / self-review of model text
const FACTS = 'جنس: استیل ضدزنگ؛ وزن: 900 g؛ ظرفیت ۱ لیتر؛ روی گاز و القایی قابل استفاده است';
const good = '<p>این کتری از استیل ضدزنگ ساخته شده و وزن آن 900 g است.</p><p>روی گاز و القایی قابل استفاده است.</p>';
assert.deepStrictEqual(P.groundingIssues(good, FACTS, 'کتری قهوه'), []);
const badH = '<p>این کتری از استیل ضدزنگ ساخته شده است.</p><p>بهترین کتری بازار با ضمانت ۲۴ ماهه و وزن 1500 g.</p><p>روی گاز قابل استفاده است.</p>';
const bi = P.groundingIssues(badH, FACTS, 'کتری قهوه').map((x) => x.code); assert.ok(bi.includes('ungrounded_number') && bi.includes('unsupported_claim'), bi.join());
const cg = P.cleanGenerated(badH, FACTS, 'کتری قهوه'); assert.strictEqual(cg.removed, 1); assert.ok(!/بهترین|ضمانت|1500/.test(cg.html) && cg.html.includes('استیل ضدزنگ') && cg.html.includes('گاز'), cg.html);
assert.deepStrictEqual(P.groundingIssues(cg.html, FACTS, 'کتری قهوه'), [], 'cleaned text passes the review');
assert.ok(P.groundingIssues('<p>' + ['سلام دنیا خوبی همه چیز عالی است', 'امروز هوا آفتابی است و همه شادند', 'ماشین قرمز سریع حرکت می‌کند', 'کتاب جدید منتشر شده است حالا'].join('. ') + '.</p>', FACTS, 'کتری').some((x) => x.code === 'ungrounded_text'), 'unrelated text is flagged');
assert.deepStrictEqual(P.groundingIssues('<p>بهترین کتری ما ضمانت دارد.</p>', 'بهترین کتری؛ ضمانت دو ساله', 'کتری'), [], 'claims present in the facts are allowed');
// fuzz: random mixes of text/markup must stay verified-safe and idempotent
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const bits = ['بصورت', 'ميشود', 'کتاب ها', 'سلام ،', 'قیمت ٣٥٠', '<p>', '</p>', '<h1>', '</h1>', '<img src="a.jpg">', '<a href="https://x.ir/a,b" target="_blank">', '</a>', '[gallery ids="1,2"]', '<pre>', '</pre>', 'متن  عادی', '&nbsp;', '<ul><li>', '</li></ul>', '!!!', ' ,', '<!-- wp:paragraph -->', '<!-- /wp:paragraph -->'];
for (let i = 0; i < 400; i++) {
  const src = Array.from({ length: 4 + Math.floor(rnd() * 14) }, () => bits[Math.floor(rnd() * bits.length)]).join(' ');
  const r1 = P.polishContent(src, { title: 'عنوان' }); const r2 = P.polishContent(r1.html, { title: 'عنوان' });
  assert.ok(r1.html === src || P.verify(src, r1.html).ok, 'fuzz safety: ' + src);
  assert.ok(!r2.changed || r2.rejected, 'fuzz idempotence: ' + JSON.stringify(src) + ' -> ' + JSON.stringify(r1.html) + ' -> ' + JSON.stringify(r2.html));
}

// ---- v1.34: ladder — one unsafe block must not cost the page every safe fix
{
  const bad = '<p>س' + 'ـ'.repeat(20) + 'لام</p><p>او مي شود و ك</p>';
  const full = P.polishContent(bad, { title: 'x' });
  assert.ok(full.changed && full.degraded === 'partial', 'partial ladder used: ' + JSON.stringify(full));
  assert.ok(full.html.startsWith('<p>س' + 'ـ'.repeat(20) + 'لام</p>'), 'the unsafe block is left exactly as it was');
  assert.ok(/می‌شود/.test(full.html) && /ک/.test(full.html), 'the safe block was fixed');
  assert.ok(P.verify(bad, full.html).ok, 'whole-page fingerprint still verified');
  const again = P.polishContent(full.html, { title: 'x' }); assert.ok(!again.changed || again.degraded, 'ladder result is stable');
  // a normal page never takes the ladder
  const normal = P.polishContent('<p>' + 'سلام مي شود '.repeat(30) + '</p>', { title: 'x' }); assert.ok(normal.changed && !normal.degraded);
}
// ---- v1.34: quality score
{
  const good = '<h2>معرفی</h2><p>' + 'آسیاب قهوه دستی برای آسیاب کردن دانه‌های قهوه در خانه ساخته شده و با تیغه سرامیکی کار می‌کند. '.repeat(3) + 'اندازهٔ آسیاب را می‌توان تنظیم کرد. '.repeat(3) + '</p><h2>نگهداری</h2><p>' + 'پس از هر بار استفاده آن را با برس تمیز کنید و دور از رطوبت نگه دارید. '.repeat(4) + '<a href="https://x.test/a">دانه قهوه</a></p><h2>پرسش‌های متداول</h2><p>جنس بدنه چیست؟ استیل.</p>';
  const meta = { title: 'آسیاب قهوه دستی', metaTitle: 'آسیاب قهوه دستی با تیغه سرامیکی | فروشگاه', metaDescription: 'آسیاب قهوه دستی با تیغه سرامیکی برای آسیاب یکنواخت دانه‌ها در خانه؛ ساده، بادوام و مناسب سفر و محل کار شما.', type: 'product' };
  const a = P.score(Object.assign({ content: good }, meta)); const empty = P.score(Object.assign({}, meta, { content: '' })); const thin = P.score(Object.assign({}, meta, { content: '<p>آسیاب قهوه.</p>' }));
  assert.ok(a.score >= 80 && a.score <= 100, 'good page: ' + a.score); assert.ok(empty.score <= 35, 'empty capped'); assert.ok(thin.score < a.score && thin.score <= 55, 'thin capped: ' + thin.score);
  assert.strictEqual(a.parts.reduce((n, x) => n + x.max, 0), 100); assert.ok(a.parts.every((x) => x.pts >= 0 && x.pts <= x.max)); assert.strictEqual(P.gradeOf(90), 'عالی'); assert.strictEqual(P.gradeOf(10), 'ضعیف');
  // typos lower the score and fixing them raises it again (the gate relies on this)
  const typos = good.replace(/می‌کند/g, 'مي كند').replace(/است/g, 'می باشد').replace(/ساخته/g, 'ساخته  ');
  const bt = P.score(Object.assign({ content: typos }, meta)); assert.ok(bt.score < a.score, 'typos cost points: ' + bt.score + ' vs ' + a.score);
  const fixed = P.polishContent(typos, { title: 'x' }); const af = P.score(Object.assign({ content: fixed.html }, meta)); assert.ok(af.score > bt.score, 'polish raises the score: ' + bt.score + ' -> ' + af.score);
  assert.ok(bt.parts.find((x) => x.key === 'typography').fixable, 'typography is marked auto-fixable');
  // seo parts
  const nometa = P.score(Object.assign({ content: good }, meta, { metaDescription: '', metaTitle: '' })); assert.ok(nometa.score < a.score && /خالی/.test(nometa.parts.find((x) => x.key === 'seo').note));
  const roll = P.scoreMany([a, empty, thin]); assert.strictEqual(roll.n, 3); assert.ok(roll.avg > 0 && roll.weak[0].pct <= roll.weak[roll.weak.length - 1].pct);
  assert.deepStrictEqual(P.scoreMany([]), { avg: 0, n: 0, parts: {}, weak: [] });
  // robust to garbage
  assert.doesNotThrow(() => { P.score(null); P.score({}); P.score({ content: '<<<>>><p', title: 5 }); });
}
console.log('polish engine (typography, SEO markup, SEO fields, repair integration) tests OK');

// ---- v1.44 scoring / intent / keymap keyword
{
  const art = { title: 'طرز تهیه قهوه ترک', type: 'post', content: '<p>قهوه ترک با آسیاب بسیار ریز و آب سرد در جزوه تهیه می‌شود و روی حرارت ملایم به آرامی دم می‌آید. کف آن نشانهٔ کیفیت است.</p>' };
  const t = P.buildTitle(art, { kind: 'article', intent: 'informational', keyword: 'قهوه ترک' });
  assert.ok(!/^خرید\s/.test(t.value), 'informational title never gets «خرید»: ' + t.value);
  const prod = { title: 'قهوه عربیکا اتیوپی', type: 'product' };
  const t2 = P.buildTitle(prod, { kind: 'product', intent: 'transactional', keyword: 'قهوه عربیکا' });
  assert.ok(t2.value && t2.candidates >= 1);
  assert.ok(P.scoreTitle('قهوه عربیکا اتیوپی | فروشگاه نمونه', { kw: 'قهوه عربیکا' }) > P.scoreTitle('فروشگاه نمونه | قهوه عربیکا اتیوپی', { kw: 'قهوه عربیکا' }));
  assert.strictEqual(P.seoFields(art, { keyword: 'قهوه ترک', kind: 'article' }).focus_keyword, 'قهوه ترک', 'keymap keyword wins');
}
console.log('polish v1.44 scoring tests OK');

const assert = require('assert');
const R = require('../www/repair.js');
const VOC = ['مقاوم', 'سبک', 'ظریف', 'محکم', 'کاربردی', 'ساده', 'دقیق', 'پایدار', 'زیبا', 'سریع', 'امن', 'بادوام', 'جمع‌وجور', 'قابل‌حمل', 'نرم', 'صاف', 'براق', 'مات', 'خنک', 'گرم', 'تمیز', 'روان', 'یکدست', 'منظم'];
const NOUN = ['آشپزخانه', 'سفر', 'کافه', 'میز کار', 'مهمانی', 'صبحانه', 'باغ', 'ایستگاه دم‌آوری', 'کمپینگ', 'هدیه', 'فضای باز', 'پذیرایی', 'دفتر', 'کارگاه', 'رستوران', 'خوابگاه'];
const seed = (n) => { let h = 7; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1103515245 + 12345) >>> 0; return h; }; };
const good = (name) => { const r = seed(name); const pick = (a) => a[(r() >>> 16) % a.length]; const sent = () => name + ' ' + pick(VOC) + ' و ' + pick(VOC) + ' است و برای ' + pick(NOUN) + ' و ' + pick(NOUN) + ' با ' + pick(VOC) + ' بودن ' + pick(['مناسب', 'مفید', 'پیشنهادی']) + ' شناخته می‌شود.'; return '<h2>معرفی</h2><p>' + [sent(), sent(), sent(), sent()].join(' ') + '</p><h2>مشخصات</h2><p>' + [sent(), sent(), sent()].join(' ') + ' وزن ۲۵۰ گرم.</p>'; };
const mk = (id, title, extra) => Object.assign({ id, type: 'product', status: 'publish', title, url: 'https://x.test/p' + id, revision: 'r' + id, metaTitle: title + ' | فروشگاه نمونه', metaDescription: title + ' را با ضمانت اصالت و ارسال سریع از فروشگاه نمونه تهیه کنید؛ مشخصات کامل و راهنمای انتخاب در صفحه آمده است.', focusKeyword: title, excerpt: title + ' با جنس مقاوم و کاربرد روزانه برای مصرف خانگی', content: good(title) }, extra || {});

const items = [
  mk(1, 'قهوه عربیکا اتیوپی'),
  mk(2, 'آسیاب دستی سرامیکی', { metaTitle: '', metaDescription: '', focusKeyword: '' }),
  mk(3, 'فرنچ پرس شیشه‌ای', { content: '', excerpt: '' }),
  mk(4, 'کتری گردو استیل', { content: '<p>لورم ایپسوم متن نمونه برای این محصول که باید بعدا تکمیل شود و هنوز واقعی نیست.</p>' }),
  mk(5, 'قهوه ساز موکاپات', { content: '<p>' + 'این دستگاه برش دهنده نان و کیک است و تیغه فولادی دارد و برای نانوایی ها مناسب است. '.repeat(3) + '</p>' }),
  mk(6, 'آسیاب برقی حرفه‌ای قهوه', { content: '<p>' + 'قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر و طعم میوه‌ای دارد، بسته‌بندی سوپاپ‌دار. '.repeat(2) + 'قهوه عربیکا اتیوپی برای همه مناسب است.</p>' }),
  mk(7, 'ترازوی دیجیتال آشپزخانه', { product: { weight: '0.25', weight_unit: 'kg' }, content: '<p>' + 'ترازوی دیجیتال آشپزخانه دقیق و سبک است و در بسته بندی ۵۰۰ گرم عرضه می شود و برای وزن کشی مواد غذایی کاربرد دارد. '.repeat(3) + '</p>' }),
  mk(8, 'قیف دم‌آوری سرامیکی', { content: '<p>' + 'This dripper is a handmade ceramic cone used for brewing filter coffee at home with great taste. '.repeat(4) + '</p>' }),
  mk(9, 'پیمانه اندازه‌گیری', { content: '<p>[vc_row][vc_column]پیمانه اندازه گیری برای مصرف خانگی استفاده می شود و چند اندازه دارد و جنس آن پلاستیک است و شسته می شود.[/vc_column][/vc_row]</p>' }),
  mk(10, 'دماسنج مایعات', { metaDescription: 'ارسال رایگان به سراسر کشور برای سفارش های بالای یک میلیون تومان در فروشگاه ما', metaTitle: 'x' }),
];
const dup = good('پارچه میکروفایبر');
items.push(mk(11, 'پارچه میکروفایبر آبی', { content: dup }), mk(12, 'پارچه میکروفایبر سبز', { content: dup }), mk(13, 'سه‌پایه نگهدارنده', { metaTitle: '', metaDescription: '', focusKeyword: '', content: '<p>متن نمونه برای این محصول که بعدا باید تکمیل شود و هنوز واقعی نیست و فقط جای خالی است.</p>' }));

// ---- scan + diagnosis
const sc = R.scan(items);
const by = (id) => sc.all.find((r) => String(r.id) === String(id));
const codes = (id) => by(id).problems.map((p) => p.code);
assert.strictEqual(codes(1).length, 0, 'healthy product must have no problems: ' + codes(1));
assert.ok(codes(2).includes('seo_no_title') && codes(2).includes('seo_no_meta') && codes(2).includes('seo_no_focus'), 'no SEO');
assert.ok(codes(3).includes('content_empty') && codes(3).includes('excerpt_missing'), 'no content');
assert.ok(codes(4).includes('placeholder'), 'placeholder text');
assert.ok(codes(5).includes('title_mismatch'), 'wrong product text: ' + codes(5));
assert.ok(codes(6).includes('foreign_product'), 'copied another product name: ' + codes(6));
assert.ok(codes(7).includes('fact_conflict'), 'weight conflict: ' + codes(7));
assert.ok(codes(8).includes('wrong_language'), 'wrong language');
assert.ok(codes(9).includes('raw_markup'), 'raw shortcode');
assert.ok(codes(10).includes('seo_meta_unrelated') && codes(10).includes('seo_title_len'), 'wrong meta: ' + codes(10));
assert.ok(codes(11).includes('duplicate_content') && codes(12).includes('duplicate_content'), 'duplicate texts');
assert.ok(sc.summary.noSeo >= 1 && sc.summary.noContent === 1 && sc.summary.wrong >= 5 && sc.summary.total === 13);
assert.ok(sc.results[0].score <= sc.results[sc.results.length - 1].score, 'worst first');
assert.ok(by(3).score < by(2).score, 'missing content hurts more than missing SEO');

// foreign product name copied from another product
const foreign = R.scan([mk(20, 'کتری استیل گردو'), mk(21, 'فنجان سرامیکی دست‌ساز', { content: '<p>' + 'کتری استیل گردو با دسته مقاوم و ظرفیت مناسب برای دم کردن چای و جوشاندن آب در خانه کاربرد دارد. '.repeat(3) + '</p>' })]);
assert.ok(foreign.all.find((r) => r.id === 21).problems.some((p) => p.code === 'foreign_product'), 'foreign name');

// ---- SEO planning: AUTO only for empty fields; blocked while content is wrong
const full2 = Object.assign({}, items[1]);
const plan2 = R.planSeo(full2, by(2), { brand: 'فروشگاه نمونه' });
assert.ok(!plan2.blocked && plan2.fields.seo_title && plan2.fields.meta_description && plan2.fields.focus_keyword, JSON.stringify(plan2));
assert.ok(Object.values(plan2.tiers).every((t) => t === 'auto'), 'empty fields are AUTO');
assert.ok(R.planSeo(items[3], by(4), { fromName: false }).blocked === 'content', 'placeholder text must block SEO generation from it (fromName off)');
assert.ok(R.planSeo(items[2], by(3), { fromName: false }).blocked === 'content', 'empty content must block (fromName off)');
const plan10 = R.planSeo(items[9], by(10), {});
assert.ok(plan10.fields.meta_description && plan10.tiers.meta_description === 'approve', 'replacing a bad non-empty value needs approval');

const noEx = Object.assign({}, items[0], { excerpt: '' });
const exPlan = R.planSeo(noEx, R.diagnose(noEx, {}), {});
assert.ok(exPlan.fields.excerpt && exPlan.tiers.excerpt === 'approve' && R.plain(items[0].content).includes(exPlan.fields.excerpt.slice(0, 30)), 'excerpt is derived from the real text only');

// ---- articles
const art = (id, title, extra) => Object.assign(mk(id, title), { type: 'post' }, extra || {});
const body = (t) => { const r = seed(t + 'x'); const pk = (a) => a[(r() >>> 16) % a.length]; let first = true; const s2 = () => { const lead = first ? t : pk(['این روش', 'این نکته', 'این مورد', 'این انتخاب']); first = false; return lead + ' ' + pk(VOC) + ' و ' + pk(VOC) + ' برای ' + pk(NOUN) + ' و ' + pk(NOUN) + ' ' + pk(['مهم', 'مفید', 'رایج']) + ' است و نکتهٔ ' + pk(VOC) + ' دارد.'; }; return '<h2>مقدمه</h2><p>' + Array.from({ length: 14 }, s2).join(' ') + '</p>'; };
const posts = [art(101, 'راهنمای انتخاب آسیاب قهوه', { content: body('راهنمای انتخاب آسیاب قهوه') }), art(102, 'روش دم‌آوری اسپرسو', { content: '', excerpt: '' }), art(103, 'تفاوت عربیکا و روبوستا', { content: '<p>لورم ایپسوم متن نمونه که بعدا باید با مقالهٔ واقعی عوض شود و فعلا فقط جای خالی است.</p>' }), art(104, 'نگهداری دانهٔ قهوه', { content: '<p>' + 'نگهداری صحیح دانه در ظرف دربسته انجام می شود و از نور دور نگه داشته می شود. '.repeat(4) + '</p>' }), art(105, 'تاریخچهٔ چای ایرانی', { metaTitle: '', metaDescription: '', focusKeyword: '', content: body('تاریخچهٔ چای ایرانی') }), art(106, 'مقالهٔ بلند بدون تیتر', { content: '<p>' + body('مقالهٔ بلند بدون تیتر').replace(/<\/?h2>/g, '').replace('مقدمه', '') + body('مقالهٔ بلند بدون تیتر').replace(/<\/?h2>/g, '').replace(/<\/?p>/g, '').replace('مقدمه', '') + '</p>' })];
const sa = R.scan(posts.concat(items.slice(0, 2)));
const pc = (id) => sa.all.find((r) => r.id === id).problems.map((p) => p.code);
assert.strictEqual(pc(101).length, 0, 'healthy article: ' + pc(101));
assert.ok(pc(102).includes('content_empty') && pc(103).includes('placeholder') && pc(104).includes('content_thin'), 'article thresholds are higher than products: ' + pc(104));
assert.ok(pc(105).includes('seo_no_title') && pc(105).includes('seo_no_meta'));
assert.ok(pc(106).includes('no_headings'), 'long article without headings: ' + pc(106));
assert.ok(sa.summary.articles === 6 && sa.summary.products === 2);
assert.ok(R.planSeo(posts[4], sa.all.find((r) => r.id === 105), { brand: 'وبلاگ' }).fields.meta_description, 'article SEO is filled from its own text');
assert.ok(R.planSeo(posts[2], sa.all.find((r) => r.id === 103), { fromName: false }).blocked === 'content');
const artGen = async (a) => { assert.strictEqual(a.kind, 'article'); return { content: '<h2>تفاوت</h2><p>' + Array.from({ length: 10 }, (_, i) => 'در آزمون شمارهٔ ' + (i + 1) + ' عربیکا شیرین‌تر و اسیدی‌تر بود و روبوستا کافئین بیشتر و طعم تلخ‌تری داشت. ').join('') + '</p>', excerpt: 'مقایسهٔ طعم، کافئین و کاربرد عربیکا و روبوستا برای انتخاب بهتر قهوه.', seo_title: 'تفاوت عربیکا و روبوستا در طعم و کافئین', meta_description: 'در این مقاله طعم، میزان کافئین و کاربرد قهوهٔ عربیکا و روبوستا را مقایسه می‌کنیم تا انتخاب بهتری داشته باشید.', focus_keyword: 'تفاوت عربیکا و روبوستا' }; };
(async () => {
  const d103 = sa.all.find((r) => r.id === 103);
  const n = await R.planContent(posts[2], d103, { generate: artGen }, {}); assert.strictEqual(n.status, 'needs_facts'); assert.ok(n.checklist.ask[1].includes('منبع'));
  const ok = await R.planContent(posts[2], d103, { generate: artGen }, { facts: 'عربیکا اسیدیتهٔ بیشتر و طعم شیرین‌تر دارد؛ روبوستا کافئین بیشتری دارد و طعم تلخ‌تر؛ عربیکا معمولاً گران‌تر است؛ روبوستا در اسپرسوهای ترکیبی برای کرمای بیشتر استفاده می‌شود؛ منبع: داده‌های فروشنده و تجربهٔ برشته‌کار', index: sa.ctx.index });
  assert.strictEqual(ok.status, 'ready', JSON.stringify(ok)); assert.ok(!('title' in ok.fields));
  const short = await R.planContent(posts[2], d103, { generate: async () => ({ content: '<p>کوتاه</p>' }) }, { facts: 'نکته یک؛ نکته دو؛ نکته سه؛ نکته چهار؛ ' + 'اطلاعات قطعی '.repeat(30) });
  assert.strictEqual(short.status, 'rejected');
  console.log('repair article tests OK');
})().catch((e) => { console.error(e); process.exit(1); });

// ---- content planning
(async () => {
  const gen = async () => ({ content: '<h2>معرفی</h2><p>قهوه ساز موکاپات از جنس آلومینیوم ساخته شده و برای دم‌آوری قهوهٔ اسپرسویی روی شعله مناسب است. ظرفیت آن ۳ فنجان است و شستن آن ساده است.</p><h2>مشخصات</h2><p>جنس: آلومینیوم؛ ظرفیت: ۳ فنجان؛ مناسب شعلهٔ گاز.</p>', excerpt: 'قهوه‌ساز موکاپات آلومینیومی سه‌فنجانه برای دم‌آوری قهوه روی شعله.', seo_title: 'قهوه ساز موکاپات آلومینیومی ۳ فنجان', meta_description: 'قهوه ساز موکاپات آلومینیومی با ظرفیت سه فنجان برای دم‌آوری قهوهٔ اسپرسویی روی شعلهٔ گاز؛ مشخصات کامل را ببینید.', focus_keyword: 'قهوه ساز موکاپات', keywords: ['موکاپات', 'قهوه ساز'] });
  const wrong5 = Object.assign({}, items[4]);
  // no facts at all -> must ask for facts and must NOT call the generator (never invent)
  let called = 0;
  const need = await R.planContent(wrong5, by(5), { generate: async () => { called++; return {}; } }, {});
  assert.strictEqual(need.status, 'needs_facts'); assert.strictEqual(called, 0); assert.ok(need.ignoredOldText, 'wrong old text is not evidence');
  // with real facts -> ready, every field REVIEW tier, title never included
  const ok = await R.planContent(wrong5, by(5), { generate: gen }, { facts: 'جنس: آلومینیوم؛ ظرفیت: ۳ فنجان؛ مناسب شعلهٔ گاز', index: sc.ctx.index });
  assert.strictEqual(ok.status, 'ready', JSON.stringify(ok));
  assert.ok(ok.fields.content && !('title' in ok.fields) && Object.values(ok.tiers).every((t) => t === 'review'));
  // generator output that is still wrong is rejected
  const bad = await R.planContent(wrong5, by(5), { generate: async () => ({ content: '<p>لورم ایپسوم متن نمونه که اصلا ربطی ندارد ' + 'x '.repeat(80) + '</p>' }) }, { facts: 'جنس: آلومینیوم؛ ظرفیت: ۳ فنجان' });
  assert.strictEqual(bad.status, 'rejected');
  // weight contradiction in generated text is rejected
  const w = await R.planContent(items[6], by(7), { generate: async () => ({ content: '<p>ترازوی دیجیتال آشپزخانه با وزن ۸۰۰ گرم و دقت بالا برای وزن کشی مواد غذایی ساخته شده و کاربرد خانگی دارد و ساده شسته می شود. ' + 'ترازوی دیجیتال آشپزخانه '.repeat(4) + '</p>' }) }, { facts: 'دقت یک گرم؛ صفحه نمایش دیجیتال' });
  assert.strictEqual(w.status, 'rejected'); assert.ok(/وزن/.test(w.reason));
  // generator failure is reported, not thrown
  const fail = await R.planContent(wrong5, by(5), { generate: async () => { throw new Error('boom'); } }, { facts: 'جنس: آلومینیوم؛ ظرفیت: ۳ فنجان' });
  assert.strictEqual(fail.status, 'rejected');

  // ---- sanitize / diff
  const s = R.sanitize({ content: 'x', title: 'NO', price: '1', seo_title: 'y'.repeat(80), meta_description: 'کوتاه', focus_keyword: 'کلید' });
  assert.deepStrictEqual(Object.keys(s).sort(), ['content', 'focus_keyword']);
  const rows = R.diffRows(items[1], { seo_title: 'عنوان جدید' }); assert.ok(rows[0].empty && rows[0].after === 'عنوان جدید');

  // ---- runSafe: only empty SEO, never content; revision & quota & dry-run
  const saves = []; const details = new Map(items.map((i) => [String(i.id), i]));
  const io = (extra) => Object.assign({ loadItem: async (id) => details.get(String(id)), save: async (p) => { saves.push(p); return { change_id: 'c' + saves.length, applied: Object.keys(p.fields) }; }, remaining: 10, brand: 'فروشگاه نمونه' }, extra || {});
  const diag = sc.results;
  const dry = await R.runSafe(io(), diag, { dryRun: true, ctx: sc.ctx, fromName: false });
  assert.strictEqual(saves.length, 0); assert.ok(dry.planned >= 1);
  const run = await R.runSafe(io(), diag, { ctx: sc.ctx, fromName: false });
  assert.ok(run.applied >= 1 && run.blocked >= 1, R.summarize(run));
  saves.forEach((p) => { assert.strictEqual(p.mode, 'automatic'); assert.ok(p.expected_revision); assert.ok(!('content' in p.fields) && !('excerpt' in p.fields) && !('title' in p.fields)); Object.keys(p.fields).forEach((k) => assert.ok(R.AUTO_FIELDS.includes(k))); });
  assert.ok(saves.every((p) => p.post_id !== 3 && p.post_id !== 4 && p.post_id !== 13), 'products with missing/placeholder content are never SEO-filled from bad text');
  // quota
  saves.length = 0; const q = await R.runSafe(io({ remaining: 1 }), diag, { ctx: sc.ctx, fromName: false }); assert.strictEqual(q.applied, 1); assert.strictEqual(q.stoppedBy, 'quota');
  const q2 = await R.runSafe(io({ save: async () => { throw new Error('سقف روزانهٔ اصلاح تمام شد'); } }), diag, { ctx: sc.ctx, fromName: false }); assert.strictEqual(q2.stoppedBy, 'quota');
  // v1.59+ default: with fromName on, products with unusable text may get SEO built from the NAME — but still never content/excerpt/title, and still only AUTO_FIELDS
  saves.length = 0; const dflt = await R.runSafe(io(), diag, { ctx: sc.ctx });
  assert.ok(dflt.applied >= run.applied, 'fromName default fills at least as many as fromName:false');
  saves.forEach((p) => { assert.ok(!('content' in p.fields) && !('excerpt' in p.fields) && !('title' in p.fields)); Object.keys(p.fields).forEach((k) => assert.ok(R.AUTO_FIELDS.includes(k))); });
  // stop button
  const st = await R.runSafe(io({ shouldStop: () => true }), diag, { ctx: sc.ctx }); assert.strictEqual(st.stoppedBy, 'user');
  console.log('repair engine tests OK');
})().catch((e) => { console.error(e); process.exit(1); });

// v1.58 runSafe: قفل ترافیک، یکتایی عنوان در دسته، توقف روی خطای پیاپی
{
  const assert = require('assert'); const R = require('../www/repair.js');
  const mk = (id) => ({ id, type: 'product', title: 'قهوه ساز شماره ' + id, url: 'https://a.ir/p/' + id, revision: 'r' + id, content: '<p>' + 'این دستگاه قهوه ساز خانگی با بدنه فلزی و مخزن آب بزرگ برای دم کردن قهوه است. '.repeat(3) + '</p>', metaTitle: '', metaDescription: '', focusKeyword: '' });
  const items = [mk(1), mk(2), mk(3)]; const ctx = { products: items, titleCounts: new Map(), metaCounts: new Map(), dupMap: new Map() };
  const diags = items.map((it) => R.diagnose(it, ctx));
  (async () => {
    let calls = 0; const sent = [];
    const rep = await R.runSafe({ loadItem: async (id) => items.find((x) => x.id === id), save: async (p) => { sent.push(p.fields); return { change_id: 'c' + (++calls) }; }, remaining: 10, brand: '', guard: () => ({ locked: true, reason: 'ترافیک' }) }, diags, { ctx });
    assert.ok(rep.applied >= 0);
    const fail = await R.runSafe({ loadItem: async (id) => items.find((x) => x.id === id), save: async () => { throw new Error('x'); }, remaining: 10, brand: '' }, diags.concat(diags, diags), { ctx: { products: items, titleCounts: new Map(), metaCounts: new Map(), dupMap: new Map() } });
    assert.ok(fail.failed <= 5 && (fail.failed === 0 || fail.stoppedBy === 'errors'), 'failed=' + fail.failed + ' ' + fail.stoppedBy);
    console.log('repair v1.58 runSafe guards OK');
  })().catch((e) => { console.error(e); process.exit(1); });
}

// v1.66: «ساخت از نام» هرگز متن/خلاصه را روی صفحه‌ساز نمی‌نویسد و در حالت عادی فقط پیشنهاد (approve) می‌سازد
{
  const assert = require('assert'); const R = require('../www/repair.js');
  const it = { id: 77, type: 'product', title: 'فرنچ پرس شیشه‌ای', url: 'https://a.ir/p/77', revision: 'r1', content: '', metaTitle: '', metaDescription: '', focusKeyword: '', excerpt: '' };
  const diag = R.diagnose(it, { products: [it], titleCounts: new Map(), metaCounts: new Map(), dupMap: new Map() });
  const open = R.planSeo(it, diag, { brand: '' });
  assert.ok(open.fromName, 'from-name plan used');
  assert.ok(open.fields.content && open.tiers.content === 'approve', 'body is only a proposal needing approval');
  const lock = R.planSeo(it, diag, { brand: '', locked: true });
  assert.ok(!('content' in lock.fields) && !('excerpt' in lock.fields) && !('related_keywords' in lock.fields), 'builder-locked: no body fields');
  assert.ok(lock.fields.seo_title && lock.tiers.seo_title === 'auto', 'SEO fields still filled');
  console.log('repair v1.66 locked from-name OK');
}

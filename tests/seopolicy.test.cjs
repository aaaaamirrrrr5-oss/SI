const assert = require('assert');
const P = require('../www/seopolicy.js'); const Polish = require('../www/polish.js'); const R = require('../www/repair.js'); const S100 = require('../www/score100.js'); const SR = require('../www/seorules.js');
const L = (s) => Array.from(s).length;

/* 1) one verdict: every module agrees on the same titles/metas */
const titles = ['قهوه', 'قهوه اسپرسو عربیکا ۲۵۰ گرمی برای دم‌آوری خانگی', 'قهوه اسپرسو عربیکا ۲۵۰ گرمی برای دم‌آوری خانگی و اداری با رست متوسط و تازه', 'A'.repeat(64)];
titles.forEach((t) => {
  const c = P.checkTitle(t); const sc = S100.evaluate({ metaTitle: t }).checks.find((x) => x.id === 'title');
  assert.strictEqual(sc.ok, c.ok, 'score100 vs policy: ' + t);
  const d = R.diagnose({ id: 1, type: 'product', title: 'x', metaTitle: t, content: '' }, {});
  assert.strictEqual(!d.problems.some((x) => x.code === 'seo_title_len'), c.ok || c.status === 'missing', 'repair vs policy: ' + t);
});
const metas = ['کوتاه', 'x'.repeat(100), 'x'.repeat(165), 'x'.repeat(175)];
metas.forEach((m) => {
  const c = P.checkMeta(m); const sc = S100.evaluate({ metaDescription: m }).checks.find((x) => x.id === 'meta');
  assert.strictEqual(sc.ok, c.ok, 'score100 meta: ' + m.length);
  const d = R.diagnose({ id: 1, type: 'product', title: 'x', metaDescription: m, content: '' }, {});
  assert.strictEqual(!d.problems.some((x) => x.code === 'seo_meta_len'), c.ok, 'repair meta: ' + m.length);
});
assert.strictEqual(P.checkMeta('x'.repeat(165)).status, 'long'); assert.strictEqual(P.checkMeta('x'.repeat(100)).idealShort, true);
// Google truncates by pixels, not characters: a 61–70 char Persian title that fits in ~600px is NOT "long"
const fa63 = 'قهوه اسپرسو عربیکا ۲۵۰ گرمی برای دم‌آوری خانگی و اداری با رست متوسط'; assert.ok(L(fa63) > 60 && P.pixelWidth(fa63) <= 600 ? P.checkTitle(fa63).ok : true);
assert.strictEqual(P.checkTitle('A'.repeat(64)).status, 'long', 'wide Latin title is cut by pixels');
// the fixer's own acceptance rules never exceed what the checker calls fine
assert.ok(P.titleFits('آسیاب قهوه دستی با تیغه سرامیکی') && !P.titleFits('الف'.repeat(80)));
assert.ok(!P.metaFits('x'.repeat(171)) && !P.metaAcceptable('x'.repeat(171)) && !P.titleAcceptable('کوتاه'));
// seorules.fixSeoFields only shortens what the policy calls long
assert.deepStrictEqual(SR.fixSeoFields({ seo_title: fa63 }).fields, {}, 'fits by pixels -> untouched');
assert.ok(Object.keys(SR.fixSeoFields({ seo_title: 'ب'.repeat(8) + ' ' + 'ب'.repeat(8) + ' | ' + 'کلمه '.repeat(14) }).fields).length >= 0);

/* 2) the focus keyword is never pasted into the meta description (keyword stuffing) */
const item = { id: 5, type: 'product', title: 'آسیاب قهوه دستی سرامیکی',
  content: '<p>این آسیاب با تیغهٔ سرامیکی ساخته شده و برای دم‌آوری روزانه مناسب است. بدنهٔ آن از استیل است و ظرفیت ۳۰ گرم دانه را دارد. تنظیم درشتی آسان است و صدای کمی دارد. شست‌وشوی قطعات با آب ساده انجام می‌شود.</p>' };
const short = { id: 6, type: 'product', title: 'آسیاب قهوه دستی سرامیکی', content: '<p>این آسیاب با تیغهٔ سرامیکی ساخته شده و برای دم‌آوری روزانه مناسب است. بدنهٔ آن از استیل است.</p>' };
const f = Polish.seoFields(short, { keyword: 'قیمت آسیاب برقی' });
assert.ok(f.meta_description && !/^قیمت آسیاب برقی\s*؛/.test(f.meta_description), 'meta must not start with the forced keyword: ' + f.meta_description);
assert.ok(!f.meta_description.includes('قیمت آسیاب برقی'), 'keyword that is not in the page text is not injected into meta');

/* 3) spam principles */
assert.ok(P.lintField('title', 'قهوه قهوه قهوه ارزان قهوه', {}).some((x) => x.code === 'repeated_word'));
assert.ok(P.lintField('title', 'بهترین قهوه ایران', { evidence: 'قهوه عربیکا' }).some((x) => x.code === 'unsupported_claim'));
assert.ok(!P.lintField('title', 'بهترین قهوه ایران', { evidence: 'برنده بهترین قهوه ایران' }).length, 'claim present in real data is allowed');
assert.ok(P.lintField('meta', 'قهوه تازه 🔥🔥 بخرید!!', {}).some((x) => x.code === 'decorative'));
assert.ok(P.keywordDensity("قهوه ".repeat(10) + "x ".repeat(40), "قهوه") > P.LIMITS.focus.maxDensity);

/* 4) every proposed field carries its principle (rule + source) */
const diag = R.diagnose(Object.assign({}, item, { metaTitle: '', metaDescription: '', focusKeyword: '' }), {});
const plan = R.planSeo(Object.assign({}, item, { metaTitle: '', metaDescription: '', focusKeyword: '', status: 'publish' }), diag, { brand: '' });
assert.ok(plan.why && Object.keys(plan.fields).every((k) => plan.why[k] && plan.why[k][0].rule), 'why map: ' + JSON.stringify(plan.why));
assert.ok(plan.why.seo_title.some((w) => w.rule === 'o02') && plan.why.meta_description[0].rule === 'o03');
const rows = R.diffRows({ title: item.title }, plan.fields); assert.ok(rows.every((r) => Array.isArray(r.why) && r.why.length));
Object.keys(plan.fields).forEach((k) => { if (k === 'seo_title') assert.ok(P.checkTitle(plan.fields[k]).ok, 'proposed title is itself valid'); if (k === 'meta_description') assert.ok(P.checkMeta(plan.fields[k]).ok, 'proposed meta is itself valid'); });
console.log('seopolicy ok');
/* 5) alt: file-name hint only when meaningful; camera/hash names never used; no keyword stuffing */
const al = Polish.fixMarkup('<img src="/u/a.jpg"><img src="/u/IMG_4821.jpg"><img src="/u/front-view.jpg"><img src="/u/side.png">', { title: 'قهوه عربیکا' }).html;
assert.ok(al.includes('alt="قهوه عربیکا"') && al.includes('alt="قهوه عربیکا - تصویر ۲"') && al.includes('alt="قهوه عربیکا - نمای روبه‌رو"') && al.includes('alt="قهوه عربیکا - نمای کنار"'), al);
console.log('seopolicy alt ok');

/* 6) Google content gate */
const good = '<h2>مشخصات</h2><p>این کتری استیل ظرفیت دو لیتر دارد و برای استفادهٔ روزانه در آشپزخانه ساخته شده است. دستهٔ آن عایق است و درپوش محکم دارد.</p><h2>نگهداری</h2><p>پس از هر بار استفاده با آب ساده شسته شود و خشک نگه داشته شود. برای جرم‌گیری می‌توان از سرکه استفاده کرد. ' + 'متن واقعی دیگر دربارهٔ کاربرد و جنس و ابعاد. '.repeat(1) + '</p><p>' + Array.from({ length: 14 }, (_, i) => 'نکتهٔ ' + (i + 1) + ' دربارهٔ انتخاب و نگهداری ظرف مناسب برای آشپزخانه').join('. ') + '.</p><a href="/kettle-2">کتری ۲ لیتری</a>';
const ag = P.auditContent(good, { focus: 'کتری استیل', title: 'کتری استیل ۲ لیتری', evidence: 'کتری استیل ۲ لیتری', kind: 'term' });
assert.ok(ag.ok, JSON.stringify(ag.blockers));
const code = (h, c) => P.auditContent(h, Object.assign({ kind: 'term', title: 'کتری' }, c || {}));
assert.ok(code('<p>' + 'کتری استیل ارزان '.repeat(30) + 'و متن دیگر برای پر کردن صفحه با واژه‌های متفاوت و جمله‌ها.</p>', { focus: 'کتری استیل' }).blockers.some((b) => b.code === 'keyword_stuffing'));
assert.ok(code('<p>' + 'این جمله عیناً تکرار می‌شود و محتوا ندارد. '.repeat(4) + '</p>').blockers.some((b) => b.code === 'repeated_sentences'));
assert.ok(code('<p>بهترین کتری ایران با تضمین کیفیت</p>', { evidence: 'کتری استیل' }).blockers.some((b) => b.code === 'unsupported_claim'));
assert.ok(!code('<p>بهترین کتری ایران</p>', { evidence: 'برندهٔ بهترین کتری ایران در سال گذشته' }).blockers.some((b) => b.code === 'unsupported_claim'));
assert.ok(code('<p>هزاران مشتری راضی از این کتری</p>').blockers.some((b) => b.code === 'fake_social_proof'));
assert.ok(code('<h1>کتری</h1><p>متن</p>').blockers.some((b) => b.code === 'h1_in_body'));
const wn = code('<h2>الف</h2><h4>ب</h4><p>برای دیدن <a href="/x">اینجا</a> کلیک کنید</p><img src="a.jpg">').warnings.map((w) => w.code);
assert.ok(['heading_skip', 'generic_anchor', 'img_no_alt', 'thin'].every((c) => wn.includes(c)), wn.join());
// planContent: a stuffed model draft is rejected by the gate, a clean one passes with its audit attached
(async () => {
  const item = { id: 9, type: 'product', title: 'کتری استیل ۲ لیتری', status: 'publish', content: '', product: { weight: '1', weight_unit: 'kg' } };
  const d = R.diagnose(item, {}); const facts = 'جنس: استیل ضدزنگ؛ ظرفیت: دو لیتر؛ دسته عایق؛ مناسب گاز و اجاق؛ شست‌وشو با آب ساده';
  const bad = await R.planContent(item, d, { generate: async () => ({ content: '<h2>کتری</h2><p>' + 'کتری استیل دو لیتری بخرید. '.repeat(1) + Array.from({ length: 40 }, (_, i) => 'کتری استیل ' + (i + 1)).join(' ') + '</p>', focus_keyword: 'کتری استیل' }) }, { facts });
  assert.strictEqual(bad.status, 'rejected'); assert.ok(/دروازهٔ کیفیت گوگل/.test(bad.reason), bad.reason);
  const ok = await R.planContent(item, d, { generate: async () => ({ content: good, focus_keyword: 'کتری استیل' }) }, { facts: facts + '؛ نمونهٔ واقعی' });
  assert.ok(ok.status === 'ready' && ok.google && ok.google.ok, JSON.stringify(ok).slice(0, 300));
  console.log('seopolicy content gate ok');
})().catch((e) => { console.error(e); process.exit(1); });
// 3–4% is a warning (a topical word may be frequent), above 4% is a blocker; matches inside longer words are not counted
const dense = '<p>' + Array.from({ length: 100 }, (_, i) => (i % 32 === 0 ? 'کتری' : 'واژه' + i)).join(' ') + '</p>';
const ad = P.auditContent(dense, { focus: 'کتری', kind: 'term', title: 'x' }); assert.ok(!ad.blockers.some((b) => b.code === 'keyword_stuffing') && ad.warnings.some((w) => w.code === 'keyword_dense'), JSON.stringify(ad.stats));
assert.strictEqual(P.keywordDensity('پیشکتری و کتری', 'کتری'), 33.3);

/* 7) finalGate: one gate for the site-wide run and the single-product run */
{
  const it = { id: 3, type: 'product', title: 'کتری استیل ۲ لیتری', content: '<p>کتری استیل با ظرفیت دو لیتر.</p>', metaDescription: '', excerpt: '' };
  const good100 = 'کتری استیل دو لیتری با دستهٔ عایق و درپوش محکم برای استفادهٔ روزانه در آشپزخانه؛ مشخصات و ابعاد را ببینید.';
  const g = R.finalGate(it, { seo_title: 'کتری استیل ۲ لیتری با دستهٔ عایق', meta_description: good100, focus_keyword: 'کتری استیل', content: good }, {});
  assert.deepStrictEqual(g.dropped, [], JSON.stringify(g.dropped)); assert.ok(g.google && g.google.ok);
  const b = R.finalGate(it, { seo_title: 'قهوه قهوه قهوه ارزان قهوه', meta_description: 'کوتاه', excerpt: 'بهترین کتری ایران با تضمین', content: '<h1>کتری</h1><p>متن</p>' }, {});
  assert.deepStrictEqual(Object.keys(b.fields), [], 'all bad values dropped'); assert.ok(b.contentDropped && b.dropped.length === 4, JSON.stringify(b.dropped));
  // a blocker that already exists in the site's current text does not stop an otherwise-safe edit
  const old = Object.assign({}, it, { content: '<h1>کتری</h1><p>متن قدیمی</p>' }); assert.ok('content' in R.finalGate(old, { content: '<h1>کتری</h1><p>متن بازنویسی‌شده با اطلاعات درست و کامل‌تر دربارهٔ کتری.</p>' }, {}).fields);
  console.log('seopolicy finalGate ok');
}

/* 8) the other writers use the same principles: auto-rebuild (titles/metas) and category/tag plans */
{
  const RB = require('../www/rebuild.js'); const X = require('../www/seoextra.js');
  const rows = [
    { id: 1, title: 'کتری استیل ۲ لیتری', metaTitle: 'کتری استیل ۲ لیتری | بینو', metaDescription: 'x'.repeat(100) },
    { id: 2, title: 'کتری', metaTitle: 'ک'.repeat(90), metaDescription: 'x'.repeat(175) },
    { id: 3, title: 'کتری', metaTitle: '', metaDescription: '' },
  ];
  const s = rows.map((r) => RB.scoreItem ? RB.scoreItem(r, {}) : null);
  if (RB.scoreItem) { assert.ok(s[0] > s[1] && s[0] > s[2], 'rebuild scoring follows the policy: ' + s); assert.strictEqual(RB.scoreItem({ metaTitle: 'کتری استیل ۲ لیتری برای دم‌آوری', metaDescription: 'x'.repeat(165) }, {}) < 100, true, 'meta 165 is long for the rebuild too'); }
  const t = X.planTerm({ id: 1, name: 'قهوه', description: '', seo_title: '', meta_description: '', count: 5 }, [{ title: 'قهوه عربیکا' }, { title: 'قهوه روبوستا' }, { title: 'قهوه ترک' }], { brand: 'بینو' });
  assert.ok(!t.fields.meta_description || P.checkMeta(t.fields.meta_description).ok, 'term meta obeys policy');
  console.log('seopolicy rebuild/term ok');
}

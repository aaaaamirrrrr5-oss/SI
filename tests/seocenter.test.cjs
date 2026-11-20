/* v1.83 — مرکز سئوی محصولات: SERP، شمارنده، گروه‌بندی، پیشنهاد/ویرایش، ممیزی کل کاتالوگ، CSV. */
const assert = require('assert'); const path = require('path');
const C = require(path.join(__dirname, '..', 'www', 'seocenter.js'));
const Repair = require(path.join(__dirname, '..', 'www', 'repair.js'));
let n = 0; const ok = (name, fn) => { fn(); n++; };

ok('SERP: عنوان بلند بریده می‌شود و کوتاه دست‌نخورده می‌ماند', () => {
  const long = 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل و فشار پانزده بار برای آشپزخانه و دفتر کار | فروشگاه نمونه';
  const a = C.serp({ title: long, description: 'کوتاه', url: 'https://shop.ir/product/espresso-200/' });
  assert(a.titleCut && a.title.endsWith('…')); assert.strictEqual(a.host, 'shop.ir'); assert.strictEqual(a.path, 'product › espresso-200');
  const b = C.serp({ title: 'قهوه‌ساز اسپرسو مدل ۲۰۰ | فروشگاه', description: 'x'.repeat(40), url: 'https://shop.ir/p' });
  assert(!b.titleCut && !b.descCut);
});
ok('SERP: توضیح بیش از ۱۶۰ نویسه بریده؛ خالی علامت می‌خورد؛ عنوان خالی از نام محصول', () => {
  assert(C.serp({ title: 'a', description: 'ب'.repeat(300) }).descCut);
  const s = C.serp({ title: '', fallbackTitle: 'نام محصول', description: '' }); assert(s.titleFromName && s.descMissing && s.title === 'نام محصول');
});
ok('meter: خالی/کوتاه/مناسب/بلند', () => {
  assert.strictEqual(C.meter('seo_title', '').state, 'empty');
  assert.strictEqual(C.meter('seo_title', 'کوتاه').state, 'short');
  assert.strictEqual(C.meter('seo_title', 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل | فروشگاه').state, 'ok');
  assert.strictEqual(C.meter('seo_title', 'ب'.repeat(90)).state, 'long');
  assert.strictEqual(C.meter('meta_description', 'ب'.repeat(200)).state, 'long');
  assert.strictEqual(C.meter('meta_description', 'کوتاه').state, 'short');
  assert.strictEqual(C.meter('focus_keyword', 'قهوه‌ساز اسپرسو').state, 'ok');
  assert.strictEqual(C.meter('focus_keyword', 'یک دو سه چهار پنج شش هفت هشت نه ده').state, 'long');
});
ok('groupFindings: ترتیب شدت، جمع جریمه، سود اصلاح خودکار', () => {
  const g = C.groupFindings([
    { code: 'seo_meta_len', label: 'm', sev: 'low', pen: 6, fix: 'auto' }, { code: 'seo_no_title', label: 't', sev: 'medium', pen: 10, fix: 'auto' },
    { code: 'seo_no_meta', label: 'm0', sev: 'high', pen: 15, fix: 'auto' }, { code: 'rule_o06', label: 'alt', sev: 'low', pen: 3, fix: 'manual' }, { code: 'info_content', label: 'i', fix: 'info', pen: 0 },
  ]);
  assert.deepStrictEqual(g.groups.map((x) => x.id), ['title', 'meta', 'structure']);
  assert.strictEqual(g.groups[1].items[0].code, 'seo_no_meta'); assert.strictEqual(g.total, 4); assert.strictEqual(g.auto, 3); assert.strictEqual(g.manual, 1); assert.strictEqual(g.gain, 31); assert.strictEqual(g.info.length, 1);
});
ok('proposals: فقط تغییرِ واقعی؛ ردیف متن قابل‌ویرایش نیست', () => {
  const item = { metaTitle: 'عنوان قدیمی', metaDescription: '', focusKeyword: 'کلید', content: '<p>الف</p>' };
  const r = C.proposals(item, { seo_title: 'عنوان تازهٔ بهتر برای محصول', meta_description: 'یک توضیح متا', focus_keyword: 'کلید', content: '<p>ب</p>' });
  assert.deepStrictEqual(r.map((x) => x.field), ['seo_title', 'meta_description', 'content']);
  assert(r[1].empty && r[0].editable && !r[2].editable && r[0].meter.after);
});
ok('resolveSelection: انتخاب نشده حذف؛ ویرایش معتبر اعمال؛ نامعتبر خطا', () => {
  const item = { metaTitle: '', metaDescription: '', focusKeyword: '', content: '' };
  const rows = C.proposals(item, { seo_title: 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل | فروشگاه', meta_description: 'ب'.repeat(100), focus_keyword: 'قهوه‌ساز اسپرسو' });
  const a = C.resolveSelection(rows, { meta_description: false }, {}); assert.deepStrictEqual(Object.keys(a.fields), ['seo_title', 'focus_keyword']);
  const b = C.resolveSelection(rows, {}, { seo_title: 'قهوه‌ساز اسپرسوی خانگی مدل ۲۰۰ با بدنهٔ استیل' }); assert(b.fields.seo_title.includes('خانگی') && !b.errors.length);
  const c = C.resolveSelection(rows, {}, { seo_title: 'x', focus_keyword: '' }); assert.strictEqual(c.errors.length, 2); assert(!('seo_title' in c.fields) && !('focus_keyword' in c.fields));
});
ok('filterFields: فقط فیلدهای مجاز نوع مشکل انتخاب‌شده', () => {
  const f = { seo_title: 'a', meta_description: 'b', focus_keyword: 'c', content: 'd', excerpt: 'e' };
  assert.deepStrictEqual(Object.keys(C.filterFields(f, ['seo_no_meta'])), ['meta_description']);
  assert.deepStrictEqual(Object.keys(C.filterFields(f, ['seo_no_title', 'seo_no_focus'])).sort(), ['focus_keyword', 'seo_title']);
  assert.deepStrictEqual(Object.keys(C.filterFields(f, [])), []);
  assert(!('content' in C.filterFields(f, ['seo_no_title', 'seo_no_meta', 'seo_no_focus', 'excerpt_missing'])));
});

/* ---- ممیزی کل کاتالوگ با موتور واقعی ---- */
const body = '<p>' + 'این قهوه‌ساز اسپرسو با بدنهٔ استیل ساخته شده و برای دم‌کردن قهوه در خانه مناسب است. ظرفیت مخزن یک لیتر است. '.repeat(3) + '</p>';
const items = []; for (let i = 1; i <= 30; i++) items.push({ id: i, type: 'product', status: 'publish', title: 'قهوه‌ساز مدل ' + (100 + i * 7), content: i % 3 === 0 ? '' : body + ' مدل ' + i, excerpt: 'توضیح کوتاه محصول شمارهٔ ' + i + ' با جزئیات کافی', metaTitle: i % 2 ? '' : 'قهوه‌ساز مدل ' + (100 + i * 7) + ' | فروشگاه نمونه', metaDescription: i % 4 === 0 ? '' : 'ب'.repeat(100) + i, focusKeyword: i % 5 === 0 ? '' : 'قهوه‌ساز' });
const scan = Repair.scan(items, { siteLang: 'fa' });
ok('bulkAudit: شمارش، میانگین، باندها و شایع‌ترین‌ها سازگار با scan', () => {
  const a = C.bulkAudit(scan.all, Repair.DEF);
  assert.strictEqual(a.total, 30); assert.strictEqual(a.avg, scan.summary.avgScore);
  assert.strictEqual(a.bands.bad + a.bands.mid + a.bands.good + a.bands.great, 30);
  const noTitle = a.issues.find((x) => x.code === 'seo_no_title'); assert.strictEqual(noTitle.n, items.filter((x) => !x.metaTitle).length);
  assert(a.issues[0].gain >= a.issues[a.issues.length - 1].gain); assert(a.estimatedAfter >= a.avg && a.estimatedAfter <= 100); assert.strictEqual(a.worst.length, 5);
});
ok('pickTargets: نوع مشکل، دامنه و سقف', () => {
  const t1 = C.pickTargets(scan.all, { codes: ['seo_no_title'], max: 5 });
  assert.strictEqual(t1.targets.length, 5); assert(t1.total >= 5); assert(t1.targets.every((d) => d.problems.some((p) => p.code === 'seo_no_title')));
  assert(t1.targets[0].score <= t1.targets[4].score);
  const none = C.pickTargets(scan.all, { codes: [], max: 5 }); assert.strictEqual(none.targets.length, 0);
  const ns = C.pickTargets(scan.all, { codes: C.DEFAULT_ON, scope: 'noseo', max: 100 }); assert(ns.targets.every((d) => d.noSeo));
  const posts = C.pickTargets([{ type: 'post', score: 10, problems: [{ code: 'seo_no_title' }] }], { codes: ['seo_no_title'] }); assert.strictEqual(posts.targets.length, 0);
});
ok('eta و durationFa', () => {
  assert.strictEqual(C.eta(0, 0, 10, 5000).remainSec, null);
  const e = C.eta(0, 5, 10, 10000); assert.strictEqual(e.pct, 50); assert.strictEqual(e.remainSec, 10);
  assert.strictEqual(C.durationFa(75), '1 دقیقه و 15 ثانیه'); assert.strictEqual(C.durationFa(null), 'در حال برآورد…');
});
ok('CSV: BOM، نقل‌قول، ویرگول و خط جدید امن', () => {
  const rows = C.changeRows([{ id: 7, title: 'نام, با ویرگول', url: 'https://x.ir/p', fields: { seo_title: { before: '', after: 'عنوان "نقل" قول' }, content: { before: 'a', after: 'b' }, meta_description: { before: 'x\ny', after: 'z' } } }]);
  assert.strictEqual(rows.length, 3); const csv = C.toCsv(rows);
  assert(csv.startsWith('\uFEFF')); assert(csv.includes('"نام, با ویرگول"')); assert(csv.includes('"عنوان ""نقل"" قول"')); assert(!/\ny/.test(csv.split('\r\n').slice(1).join('')));
  assert(!csv.includes(',b,') && !csv.endsWith(',b'));
  const au = C.auditCsv(scan.all); assert(au.split('\r\n').length === 31);
});
console.log('seocenter.test.cjs: ' + n + ' آزمون پاس شد');

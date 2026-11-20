const assert = require('assert'); const F = require('../www/fromname.js'); const R = require('../www/repair.js');
const L = (s) => Array.from(s).length;
const names = ['دریپر هاریو V60 سرامیکی', 'قهوه اسپرسو ۲۵۰ گرمی عربیکا', 'چای', 'کتری استیل ۲ لیتری مشکی', 'Moka Pot Bialetti 6 Cup'];
names.forEach((n) => {
  const r = F.build({ title: n }, { site: 'بینو' }); assert.ok(r.ok, n); const f = r.fields;
  assert.ok(L(f.seo_title) >= 20 && L(f.seo_title) <= 60, n + ' title ' + f.seo_title);
  assert.ok(L(f.meta_description) >= 70 && L(f.meta_description) <= 160, n + ' meta ' + L(f.meta_description));
  assert.ok(f.focus_keyword && !/\s[\d۰-۹]+$/.test(f.focus_keyword) && L(f.focus_keyword) <= 40, n + ' focus ' + f.focus_keyword);
  assert.ok(!/⟦|TODO|lorem/i.test(JSON.stringify(f)), 'no placeholder');
});
assert.strictEqual(F.build({ title: 'قهوه اسپرسو ۲۵۰ گرمی عربیکا' }).fields.focus_keyword, 'قهوه اسپرسو');
assert.ok(F.build({ title: 'کتری استیل ۲ لیتری مشکی' }).faq.length >= 2);
assert.ok(!F.build({ title: 'چای' }).fields.content.includes('جدول زیر'), 'no table claim without facts');
assert.strictEqual(F.build({ title: 'ab' }).ok, false);
// هیچ ادعای جعلی: عدد یا واژهٔ مشخصهٔ خارج از نام در خروجی نیست
const o = F.build({ title: 'کتری استیل ۲ لیتری مشکی' }).fields; assert.ok(!/ضمانت|اصل|بهترین|ارزان|تخفیف/.test(o.seo_title + o.meta_description + o.content));
// planSeo: محصول فقط‌نام → فیلدهای خالی auto، محتوا approve
const item = { id: 1, type: 'product', title: 'کتری استیل ۲ لیتری مشکی', url: 'https://a.ir/p/1', revision: 'r', content: '', metaTitle: '', metaDescription: '', focusKeyword: '' };
const ctx = { products: [item], titleCounts: new Map(), metaCounts: new Map(), dupMap: new Map() };
const d = R.diagnose(item, ctx); const sp = R.planSeo(item, d, {});
assert.ok(!sp.blocked && sp.tiers.seo_title === 'auto' && sp.tiers.meta_description === 'auto' && sp.tiers.focus_keyword === 'auto' && sp.tiers.content === 'approve', JSON.stringify(sp.tiers));
assert.strictEqual(R.planSeo(item, d, { fromName: false }).blocked, 'content');
console.log('fromname v1.59 OK');

// Persian regression set: hand-written (NOT scraped) cases covering short names, mixed fa/en, brand in title, long names, digits, ZWNJ.
const assert = require('assert'); const R = require('../www/repair.js'); const P = require('../www/polish.js');
const S = (n) => 'این محصول با مواد اولیهٔ مرغوب تهیه می‌شود و برای مصرف روزانه مناسب است. ' + 'بسته‌بندی آن بهداشتی است و تازگی را تا مدت‌ها حفظ می‌کند. '.repeat(n || 1) + 'نگهداری در جای خشک و خنک توصیه می‌شود.';
const names = ['چای', 'چای سبز ممتاز', 'قهوه Arabica اتیوپی', 'دمنوش بهارنارنج و بیدمشک', 'عسل طبیعی کوهستان ۵۰۰ گرمی', 'خرید زعفران سرگل ۱ مثقال', 'روغن زیتون بکر – فرابکر', 'نبات چوبی زعفرانی', 'سرویس چای‌خوری ۶ نفره', 'فنجان اسپرسو 80cc', 'Moka Pot 3 cup آلومینیومی', 'آسیاب دستی قهوه مدل ۲۰۰', 'کتری گلدار | استیل', 'شیرینی نخودچی با هل و گلاب', 'خشکبار مخلوط ویژه برای مهمانی‌های بزرگ خانوادگی و دورهمی', 'برنج طارم هاشمی', 'قند شکسته', 'کاکائو تلخ ۷۰٪', 'گرانول گرم و نرم', 'ماگ سرامیکی طرح‌دار'];
const items = names.map((t, i) => ({ id: i + 1, title: t, type: 'product', url: 'https://shop.ir/p/' + i, revision: 'r', content: '<p>' + t + ' ' + S(1 + (i % 3)) + '</p>', excerpt: '', seo_title: '', meta_description: '', focus_keyword: '', metaTitle: '', metaDescription: '', focusKeyword: '' }));
const used = new Set(), usedM = new Set(); let made = 0, blocked = 0;
const ctx = { titleCounts: new Map(), metaCounts: new Map() };
items.forEach((it) => {
  const d = R.diagnose(it, {}); const plan = R.planSeo(it, d, { brand: 'فروشگاه شاپ', titleCounts: ctx.titleCounts, metaCounts: ctx.metaCounts });
  if (plan.blocked) { blocked++; return; }
  const t = plan.fields.seo_title, m = plan.fields.meta_description;
  if (t) { const L = Array.from(t).length; assert.ok(L >= 20 && L <= 60, 'title len ' + L + ' ' + t); assert.ok(!/(?:\s|^)(?:و|یا|با|از|به|در|که|را|برای)\s*$/.test(t), 'dangling: ' + t); assert.ok(!/undefined|null|NaN/.test(t)); assert.ok(!used.has(t), 'dup title ' + t); used.add(t); R.noteApplied(ctx, { seo_title: t }); made++; }
  if (m) { const L = Array.from(m).length; assert.ok(L >= 70 && L <= 170, 'meta len ' + L); assert.ok(!usedM.has(m), 'dup meta'); usedM.add(m); R.noteApplied(ctx, { meta_description: m }); assert.ok(!/undefined|null|NaN/.test(m)); }
  if (plan.fields.focus_keyword) assert.ok(Array.from(plan.fields.focus_keyword).length <= 120);
});
assert.ok(made >= 12, 'most items get a valid unique title: ' + made + ' blocked ' + blocked);
// fact conflicts: weight + dimensions + colour
const prod = { weight: '250', weight_unit: 'g', dimensions: { length: '20', width: '10', height: '5' }, attributes: [{ name: 'رنگ', options: ['قرمز', 'آبی'] }] };
assert.strictEqual(R.factConflicts('وزن ۲۵۰ گرم و ابعاد ۲۰×۱۰×۵ سانتی‌متر در رنگ قرمز', prod).length, 0);
assert.ok(R.factConflicts('وزن ۴۰۰ گرم', prod).length === 1);
assert.ok(R.factConflicts('ابعاد ۳۰×۱۰×۵ سانتی‌متر', prod).length === 1);
assert.ok(R.factConflicts('این ماگ در رنگ سبز عرضه می‌شود', prod).length === 1);
assert.strictEqual(R.factConflicts('وزن ۴۰۰ گرم', Object.assign({}, prod, { variation_count: 3 })).length, 0, 'variable products skipped');
// brand resolution
assert.deepStrictEqual(R.resolveBrand('برند من', 'x'), { brand: 'برند من', source: 'explicit' });
assert.strictEqual(R.resolveBrand('', 'فروشگاه شاپ | بهترین قهوه و چای').brand, 'فروشگاه شاپ');
assert.strictEqual(R.resolveBrand('', 'فروشگاه اینترنتی بهترین قهوه و چای ایران با ارسال سریع').source, 'rejected');
console.log('fa-real regression tests OK (' + made + ' titles, ' + blocked + ' blocked)');

const assert = require('assert');
const P = require('../www/productstudio.js');
const F = require('../www/fromname.js');
const len = (s) => Array.from(String(s)).length;
const plain = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* brand / model / type */
const ph = F.parseName('گوشی موبایل سامسونگ گلکسی A15 128 گیگابایت');
assert.strictEqual(ph.brand, 'سامسونگ'); assert.strictEqual(ph.type, 'گوشی موبایل'); assert.deepStrictEqual(ph.models, ['A15']);
assert.strictEqual(F.parseName('مانیتور ال جی ۲۷ اینچ').brand, 'ال جی');
assert.strictEqual(F.parseName('ماوس بی سیم لاجیتک مدل MX Master 3S').brand, 'لاجیتک');
assert.strictEqual(F.parseName('شامپو ضد شوره ۴۰۰ میل').type, 'شامپو');
assert.strictEqual(F.parseName('کرم مرطوب کننده ۵۰ میل').colors.length, 0);
assert.deepStrictEqual(F.parseName('دریل شارژی بوش مدل GSR 120').models, ['GSR 120']);

/* focus keyword is always a real substring of the name */
['گوشی موبایل سامسونگ گلکسی A15 128 گیگابایت', 'لامپ ال ای دی ۹ وات مهتابی', 'مجموعه ۶ تایی لیوان شیشه‌ای', 'قابلمه استیل ۲۴ سانتی‌متر مدل کلاسیک'].forEach((n) => {
  const r = P.build(n, {}); assert.ok(r.ok); assert.ok(n.includes(r.fields.focus_keyword), n + ' → ' + r.fields.focus_keyword);
  assert.ok(r.score.value >= 88, n + ' score ' + r.score.value);
});
assert.strictEqual(P.build('مجموعه ۶ تایی لیوان شیشه‌ای', {}).fields.focus_keyword, 'لیوان شیشه‌ای');

/* no meaningless "word" sections for units/brands */
const h2 = (r) => (r.fields.content.match(/<h2>[\s\S]*?<\/h2>/g) || []).map(plain).join('|');
assert.ok(!/«(?:سانتی‌متر|موبایل|سامسونگ|میل)»/.test(h2(P.build('گوشی موبایل سامسونگ گلکسی A15 128 گیگابایت', {}))));
assert.ok(/ضد شوره/.test(h2(P.build('شامپو ضد شوره ۴۰۰ میل برند کلییر', {}))));

/* unit-aware + size sections */
assert.ok(/ظرفیت/.test(h2(P.build('گوشی موبایل سامسونگ گلکسی A15 128 گیگابایت', {}))));
assert.ok(/سایز ۴۳/.test(h2(P.build('کفش ورزشی مردانه مشکی سایز ۴۳', {}))));

/* FAQ: fact questions first, no duplicate topic, always the two shop questions, max 8 */
const sh = P.build('کفش ورزشی مردانه مشکی سایز ۴۳ برند نایک', {});
assert.ok(sh.faq.length <= 8 && sh.faq.filter((x) => x[0].includes('سایز')).length === 1);
assert.ok(sh.faq.some((x) => /قیمت و موجودی/.test(x[0])) && sh.faq.some((x) => /سفارش/.test(x[0])));

/* long names: title/meta never end on a dangling spec word, never exceed limits */
const lp = P.build('لپ تاپ ایسوس مدل Vivobook 15 X1504 رم ۱۶ گیگابایت حافظه ۵۱۲ گیگابایت', { site: 'فروشگاه نمونه' });
assert.ok(len(lp.fields.seo_title) <= 60 && len(lp.fields.meta_description) <= 160);
assert.ok(!/(?:^|\s)(?:رم|حافظه|گیگابایت|مدل|ظرفیت)$/.test(lp.fields.seo_title.replace(/\s*[–|]\s*مشخصات و قیمت$/, '')), lp.fields.seo_title);

/* owner facts reach the FAQ and JSON-LD; per-line facts in batch mode stay with their own product */
const dr = P.buildMany(['دریل شارژی بوش مدل GSR 120 | ولتاژ: ۱۲ ولت؛ وزن: ۱ کیلوگرم', 'کتری استیل ۲ لیتری مشکی'], { url: '', siteUrl: '' });
assert.ok(dr[0].facts.some((x) => x[0] === 'ولتاژ') && !dr[1].facts.some((x) => x[0] === 'ولتاژ'));
assert.ok(dr[0].faq.some((x) => x[0].includes('ولتاژ')));
assert.ok(dr[0].schema.product.additionalProperty.some((x) => x.name === 'ولتاژ' && x.value === '۱۲ ولت'));
assert.ok(!/GSR GSR/.test(dr[0].fields.excerpt));

/* honesty: nothing invented */
const all = P.buildMany(['شامپو ضد شوره ۴۰۰ میل', 'قابلمه استیل ۲۴ سانتی‌متر'], {}).map((r) => r.fields.content + r.fields.seo_title + r.fields.meta_description + r.fields.excerpt).join(' ');
assert.ok(!/(?<![\p{L}])(?:ضمانت|اصل|اورجینال|بهترین|ارزان|تخفیف|پرفروش|رایگان)(?![\p{L}])/u.test(all));

/* polish: valid excerpt accepted, claim-bearing excerpt ignored, content untouched on bad intro */
const base = P.build('شامپو ضد شوره ۴۰۰ میل برند کلییر', {});
const good = { intro: 'شامپو ضد شوره ۴۰۰ میل برند کلییر برای مراقبت روزانه از پوست سر معرفی شده و مشخصات ثبت‌شدهٔ آن در همین صفحه آمده است.', summary: 'پیش از سفارش، قیمت و موجودی روز را در همین صفحه ببینید. اگر دربارهٔ استفاده سؤالی دارید، از فروشگاه بپرسید.', excerpt: 'شامپو ضد شوره ۴۰۰ میل برند کلییر برای مراقبت از پوست سر؛ مشخصات و پرسش‌های رایج را در ادامه بخوانید.' };
const a = P.applyPolish(base, JSON.stringify(good)); assert.ok(a.ok && a.res.fields.excerpt === good.excerpt);
const b = P.applyPolish(base, JSON.stringify(Object.assign({}, good, { excerpt: 'بهترین شامپوی بازار با تخفیف ویژه برای همهٔ کاربران' }))); assert.ok(b.ok && b.res.fields.excerpt === base.fields.excerpt);
assert.ok(!P.applyPolish(base, JSON.stringify(Object.assign({}, good, { intro: 'متن بدون عبارت کلیدی که به اندازهٔ کافی طولانی است و هیچ عددی ندارد.' }))).ok);
console.log('productstudio quality OK');

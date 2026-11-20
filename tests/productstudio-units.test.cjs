const assert = require('assert');
const P = require('../www/productstudio.js');
const F = require('../www/fromname.js');
const len = (s) => Array.from(String(s)).length;
const plain = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* واحد باید تا مرز واژه تمام شود: «میل» ابتدای «میلی‌آمپر» نیست */
const pb = F.parseName('پاور بانک انکر ۲۰۰۰۰ میلی‌آمپر');
assert.strictEqual(pb.qty.length, 1);
assert.strictEqual(pb.qty[0].text, '۲۰۰۰۰ میلی‌آمپر');
assert.ok(/آمپر/.test(pb.qty[0].unit), pb.qty[0].unit);
assert.strictEqual(F.parseName('شامپو ضد شوره ۴۰۰ میل').qty[0].text, '۴۰۰ میل');
assert.strictEqual(F.parseName('روغن زیتون بکر ۵۰۰ میلی‌لیتر').qty[0].text, '۵۰۰ میلی‌لیتر');
assert.strictEqual(F.parseName('پنکه رومیزی ۱۲ ولتی').qty[0].n, '۱۲'.replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x06F0));
assert.strictEqual(F.parseName('کابل ۲ متری').qty[0].text, '۲ متری');
assert.strictEqual(F.parseName('کیف ۵۰ سانتی‌متر').qty[0].text, '۵۰ سانتی‌متر');

/* نوع دو کلمه‌ای «پاور بانک» در پرسش‌ها نیمه نمی‌ماند */
const pbr = P.build('پاور بانک انکر ۲۰۰۰۰ میلی‌آمپر', {});
assert.ok(pbr.ok);
assert.ok(pbr.faq.some((x) => x[0].includes('این پاور بانک')), pbr.faq.map((x) => x[0]).join(' / '));
assert.ok(!pbr.faq.some((x) => /این پاور(?! بانک)/.test(x[0])));
/* بخش اندازه برای میلی‌آمپر «حجم» نیست */
const pbh = (pbr.fields.content.match(/<h2>[\s\S]*?<\/h2>/g) || []).map(plain).join('|');
assert.ok(/۲۰۰۰۰ میلی‌آمپر/.test(pbh) && !/حجم مناسب/.test(pbh), pbh);
assert.ok(!/ساعت کار|شارژ کامل/.test(pbr.fields.content), 'no invented runtime claims');

/* عبارت کلیدی روی عدد/برچسب معلق تمام نمی‌شود و زیررشتهٔ نام می‌ماند */
[['پک ۱۲ تایی دستمال کاغذی سه لایه', 'دستمال کاغذی'], ['ماگ سرامیکی طرح گل ۳۵۰ میلی‌لیتر', 'ماگ سرامیکی'], ['کتاب رمان صد سال تنهایی', 'کتاب رمان']].forEach(([n, want]) => {
  const k = P.build(n, {}).fields.focus_keyword; assert.strictEqual(k, want, n + ' → ' + k); assert.ok(n.includes(k));
});

/* مدل چندکلمه‌ای: Redmi Watch 4 یک مدل است و عدد آن در عنوان سئو نمی‌افتد */
const rw = 'ساعت هوشمند شیائومی مدل Redmi Watch 4 رنگ نقره‌ای';
assert.deepStrictEqual(F.parseName(rw).models, ['Redmi Watch 4']);
assert.deepStrictEqual(F.parseName('دریل شارژی بوش مدل GSR 120').models, ['GSR 120']);
assert.deepStrictEqual(F.parseName('لپ تاپ ایسوس مدل Vivobook 15 X1504 رم ۱۶ گیگابایت').models.slice(0, 2), ['X1504', 'Vivobook 15']);
const rwr = P.build(rw, { site: '' });
assert.ok(len(rwr.fields.seo_title) <= 60 && /Redmi Watch 4/.test(rwr.fields.seo_title), rwr.fields.seo_title);
assert.ok(!/(?:^|\s)(?:رنگ|جنس|طرح|نوع)\s*[–|]/.test(rwr.fields.seo_title), rwr.fields.seo_title);
assert.ok(!/(?:^|\s)(?:رنگ|جنس|طرح|نوع)$/.test(rwr.fields.seo_title.replace(/\s*[–|]\s*مشخصات و قیمت$/, '')));

/* ادعای جعلی ساخته نمی‌شود */
const claims = /(?<![\p{L}])(?:ضمانت|اصل|اورجینال|بهترین|ارزان|تخفیف|پرفروش|رایگان|تضمین)(?![\p{L}])/u;
['پاور بانک انکر ۲۰۰۰۰ میلی‌آمپر', rw].forEach((n) => { const r = P.build(n, {}); assert.ok(!claims.test(r.fields.content + r.fields.seo_title + r.fields.meta_description + r.fields.excerpt), n); });
console.log('productstudio units OK');

/* step 24: fixed FAQ sentences vary between products */
{
  const P = require('../www/productstudio.js'); const assert = require('assert');
  const names = ['لیوان شیشه‌ای ۲۵۰ میلی‌لیتر', 'کفش اسپرت مردانه سایز ۴۳', 'پاوربانک ۲۰۰۰۰ میلی‌آمپر', 'کرم مرطوب‌کننده دست', 'چراغ مطالعه LED', 'کتاب آموزش پایتون', 'ماگ سرامیکی طرح گربه', 'هدفون بلوتوثی'];
  const res = P.buildMany(names, {}).filter((r) => r.ok);
  const prices = new Set(res.map((r) => r.faq[r.faq.length - 2][1].replace(/\s+/g, ' ')));
  const orders = new Set(res.map((r) => r.faq[r.faq.length - 1][1]));
  assert(prices.size >= 3, 'price FAQ answers should vary'); assert(orders.size >= 3, 'order FAQ answers should vary');
  console.log('productstudio step24 faq variety OK');
}

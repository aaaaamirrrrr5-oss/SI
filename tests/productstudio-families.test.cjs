// Any-product safety net: family detection must be SPECIFIC (never a wrong family) and every output must be clean.
const assert = require('assert');
const PS = require('../www/productstudio.js');
const gold = {
  'لپ تاپ ایسوس': 'computer', 'مانیتور 27 اینچ': 'computer', 'چاپگر لیزری': 'computer', 'جوهر پرینتر': 'computer',
  'قاب گوشی سامسونگ گلکسی S23': 'phoneacc', 'قطعه ماشین فیلتر روغن': 'autopart', 'روغن موتور': 'autopart', 'لنت ترمز پراید': 'autopart', 'لاستیک 205/55R16': 'autopart',
  'کتاب رمان صد سال تنهایی': 'book', 'پوشک بچه': 'baby', 'لباس نوزاد': 'baby', 'صندلی ماشین کودک': 'baby',
  'ماسک تنفسی': 'health', 'دستگاه فشار خون': 'health', 'ویتامین D': 'health',
  'رژ لب مایع': 'makeup', 'لاک ناخن': 'makeup', 'کولر گازی': 'building', 'سیم برق 2.5': 'building', 'کلید و پریز': 'building',
  'خاک گلدان': 'garden', 'بذر گوجه': 'garden', 'نرم افزار آنتی ویروس': 'digital', 'اشتراک نتفلیکس': 'digital', 'کارت هدیه': 'digital',
  'کفش کوهنوردی مردانه': 'footbag', 'کیف دستی چرم زنانه': 'footbag', 'کتری برقی': 'cookware', 'ابزار قهوه': 'coffeegear',
  'روغن زیتون': 'food', 'قهوه اسپرسو دانه': 'coffee', 'چای سیاه ایرانی': 'tea', 'تی شرت نخی مردانه': 'clothing', 'دستکش چرم': 'clothing',
  'غذای سگ': 'pet', 'شن گربه': 'pet', 'دمبل ۵ کیلویی': 'sport', 'راکت بدمینتون': 'sport', 'اسباب بازی لگو': 'toys', 'عطر ادکلن مردانه': 'perfume',
  'مخلوط کن': 'appliance', 'جارو برقی': 'appliance',
  // unknown things must stay generic, never guessed
  'کاغذ A4': 'generic', 'عینک آفتابی': 'generic', 'کراوات ابریشمی': 'generic',
};
for (const [n, id] of Object.entries(gold)) assert.strictEqual(PS.detectFamily(n).id, id, n + ' -> ' + PS.detectFamily(n).id + ' (want ' + id + ')');

const BAD = /\{[nt]\}|undefined|NaN|\bnull\b|این این|\[object/;
const claims = /(?<![\p{L}])(?:ضمانت|اورجینال|بهترین|ارزان|تخفیف|تضمین|پرفروش|رایگان|تضمینی)(?![\p{L}])/u;
const plain = (s) => String(s).replace(/<[^>]+>/g, ' ');
for (const n of Object.keys(gold)) {
  const r = PS.build(n, { site: 'بینو' });
  assert(r.ok, n);
  const f = r.fields; const text = plain(f.content);
  assert(!BAD.test(JSON.stringify(f)), 'leftover placeholder: ' + n);
  assert(!claims.test(text + f.seo_title + f.meta_description), 'claim: ' + n);
  assert(Array.from(f.seo_title).length <= 60, 'title len: ' + n);
  assert(Array.from(f.meta_description).length >= 70 && Array.from(f.meta_description).length <= 160, 'meta len: ' + n + ' ' + Array.from(f.meta_description).length);
  assert(r.name.replace(/[‌ي]/g, (c) => (c === 'ي' ? 'ی' : '')).includes(f.focus_keyword.replace(/‌/g, '')) || r.name.includes(f.focus_keyword), 'focus must be a real substring: ' + n + ' / ' + f.focus_keyword);
  assert(!/<li>\s*<\/li>/.test(f.content), 'empty li: ' + n);
  r.schemaJson.split('\n').forEach((x) => JSON.parse(x.replace(/^<script[^>]*>|<\/script>$/g, '')));
  // no number may appear that the name/facts did not give (digits in templates are not allowed)
  const given = new Set((String(n).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).match(/\d+/g) || []));
  const out = (text.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).match(/\d+/g) || []);
  out.forEach((x) => assert(given.has(x) || [...given].some((g) => g.includes(x) || x.includes(g)), 'invented number ' + x + ' in ' + n));
}
// health products carry no medical claim and always point to a professional
const h = PS.build('ویتامین D', { site: 'بینو' }); assert(/پزشک|داروساز/.test(plain(h.fields.content)) && !/درمان|معالج/.test(plain(h.fields.content)));
// electrical/gas/auto-safety items always tell the buyer to use a qualified installer
assert(/فرد مجاز|متخصص/.test(plain(PS.build('کلید و پریز', {}).fields.content)));
assert(/تعمیرکار|مجرب/.test(plain(PS.build('لنت ترمز پراید', {}).fields.content)));
console.log('productstudio families OK (' + Object.keys(gold).length + ' names)');

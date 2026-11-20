'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const SI = require('../www/engine.js'); const SP = require('../www/seoplus.js');
const rd = (f) => fs.readFileSync(path.join(__dirname, '../www', f), 'utf8');
const FA_P = 'این یک متن فارسی دربارهٔ قهوه و روش دم‌آوری آن است که پ چ ژ گ دارد و چند جملهٔ دیگر هم دارد. ';
const page = (o) => {
  o = o || {}; const lang = o.lang === undefined ? 'fa' : o.lang;
  return '<!doctype html><html' + (lang ? ' lang="' + lang + '"' : '') + ' dir="rtl"><head><meta charset="utf-8"><title>' + (o.title || 'راهنمای دم‌آوری قهوه در خانه') + '</title><meta name="description" content="' + (o.desc || 'توضیح کوتاه و کامل دربارهٔ دم‌آوری قهوه که حدود صد و بیست نویسه است و کاربر را به خواندن مقاله دعوت می‌کند، با نکات مهم.') + '">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' + (o.head || '') + '</head><body>' + (o.nav === undefined ? '<nav><a href="/shop">فروشگاه</a><a href="/blog">وبلاگ</a><a href="/cat">دسته‌ها</a><a href="/news">اخبار</a><a href="/faq">سؤالات</a></nav>' : o.nav) +
    '<main><h1>' + (o.h1 || 'راهنمای دم‌آوری قهوه') + '</h1><p>' + (o.text || FA_P.repeat(14)) + '</p>' + (o.imgs || '') + '</main></body></html>';
};
const codes = (html, url) => SI.analyzePage(html, url || 'https://x.test/blog/a', 200).issues.map((i) => i.code);
const has = (html, c, url) => codes(html, url).includes(c);

// ۱) حروف و ارقام عربی در صفحهٔ فارسی
assert.ok(has(page({ title: 'كتاب آموزش قهوه' }), 'arabic_chars'), 'Arabic kaf in title');
{ const i = SI.analyzePage(page({ title: 'كتاب آموزش قهوه' }), 'https://x.test/a', 200).issues.find((x) => x.code === 'arabic_chars'); assert.strictEqual(i.severity, 'medium'); assert.ok(i.detail.includes('عنوان')); }
{ const i = SI.analyzePage(page({ text: FA_P.repeat(14) + ' ي ي ي ك ك ك ى' }), 'https://x.test/a', 200).issues.find((x) => x.code === 'arabic_chars'); assert.ok(i && i.severity === 'low', 'body-only is low'); }
assert.ok(!has(page({}), 'arabic_chars') && !has(page({}), 'arabic_digits'), 'clean Persian page is clean');
assert.ok(!has(page({ lang: 'ar', title: 'كتاب القهوة', h1: 'دليل القهوة', desc: 'وصف قصير عن القهوة والكتاب', text: 'هذا نص عربي عن القهوة وطريقة التحضير في المنزل. '.repeat(20) }), 'arabic_chars'), 'a real Arabic page is never flagged');
assert.ok(has(page({ title: 'قهوه ٣ فنجان' }), 'arabic_digits'));
assert.ok(!has(page({ title: 'قهوه ۳ فنجان و 3 قاشق' }), 'arabic_digits'), 'Persian and Latin digits are fine');

// ۲) صفحات اعتماد (فقط صفحهٔ اصلی)
const navAll = '<nav><a href="/shop">فروشگاه</a><a href="/blog">وبلاگ</a><a href="/contact">تماس با ما</a><a href="/about">درباره ما</a><a href="/privacy">حریم خصوصی</a></nav>';
assert.ok(has(page({}), 'no_trust_pages', 'https://x.test/'), 'home without trust links');
{ const i = SI.analyzePage(page({}), 'https://x.test/', 200).issues.find((x) => x.code === 'no_trust_pages'); assert.strictEqual(i.severity, 'medium'); assert.ok(i.detail.includes('تماس با ما')); }
assert.ok(!has(page({ nav: navAll }), 'no_trust_pages', 'https://x.test/'), 'all three present');
assert.ok(!has(page({}), 'no_trust_pages', 'https://x.test/blog/a'), 'inner pages are not checked');
assert.ok(!has(page({ nav: '<a href="/a">a</a>' }), 'no_trust_pages', 'https://x.test/'), 'nearly-empty page: no verdict');
{ const i = SI.analyzePage(page({ nav: navAll.replace('<a href="/privacy">حریم خصوصی</a>', '<a href="/news">اخبار</a>') }), 'https://x.test/', 200).issues.find((x) => x.code === 'no_trust_pages'); assert.strictEqual(i.severity, 'low', 'contact present → low'); assert.ok(i.detail.includes('حریم خصوصی')); }

// ۳) اسکیمای تکراری
const ld = (o) => '<script type="application/ld+json">' + JSON.stringify(o) + '</script>';
const ORG = { '@type': 'Organization', name: 'فروشگاه' };
assert.ok(has(page({ head: ld({ '@context': 'https://schema.org', '@graph': [ORG, { '@type': 'WebSite', name: 'a' }] }) + ld(Object.assign({ '@context': 'https://schema.org' }, ORG)) }), 'schema_duplicate'), 'theme + plugin both emit Organization');
assert.ok(!has(page({ head: ld({ '@context': 'https://schema.org', '@graph': [ORG, { '@type': 'Article', headline: 'x', publisher: ORG }] }) }), 'schema_duplicate'), 'nested publisher is not a duplicate');
assert.ok(!has(page({ head: ld({ '@graph': [{ '@type': 'Product', name: 'الف' }, { '@type': 'Product', name: 'ب' }] }) }), 'schema_duplicate'), 'different products are legitimate');
assert.ok(has(page({ head: ld({ '@type': 'Product', name: 'الف' }) + ld({ '@type': 'Product', name: 'الف' }) }), 'schema_duplicate'), 'same product twice');
assert.ok(!has(page({ head: ld({ '@graph': [{ '@type': 'Organization', '@id': '#o', name: 'a' }, { '@type': 'Organization', '@id': '#o', name: 'a' }] }) }), 'schema_duplicate'), 'same @id merges');
assert.ok(!has(page({ head: '<script type="application/ld+json">{broken</script>' }), 'schema_duplicate'), 'invalid JSON never throws');

// ۴) نام فایل تصاویر
const im = (...n) => n.map((f) => '<img src="/wp-content/uploads/' + f + '" alt="x" width="400" height="300">').join('');
assert.ok(has(page({ imgs: im('IMG_1234.jpg', 'DSC_0099.jpg', 'a-good-name.jpg') }), 'img_bad_filename'));
assert.ok(has(page({ imgs: im('1700000012345.jpg', '20260101_123456.jpg', 'WhatsApp-Image-2026.jpeg') }), 'img_bad_filename'));
assert.ok(!has(page({ imgs: im('french-press-glass.webp', 'moka-pot-steel.webp', 'IMG_1.jpg') }), 'img_bad_filename'), 'minority of bad names is tolerated');
assert.ok(!has(page({ imgs: im('IMG_1234.jpg') }), 'img_bad_filename'), 'one image is not enough evidence');
assert.ok(!has(page({ imgs: im('logo-1234.png', 'icon_5555.png', 'IMG_9.jpg') }), 'img_bad_filename'), 'logos/icons are ignored');

// ۵) عنوان و H1
assert.ok(has(page({ title: 'خرید گوشی موبایل سامسونگ', h1: 'آموزش دم‌آوری قهوه در منزل' }), 'title_h1_unrelated'));
assert.ok(!has(page({ title: 'آموزش دم‌آوری قهوه | وبلاگ', h1: 'راهنمای دم‌آوری قهوه' }), 'title_h1_unrelated'), 'shared words');
assert.ok(!has(page({ title: 'فروشگاه نمونه', h1: 'خوش آمدید به دنیای قهوه' }), 'title_h1_unrelated', 'https://x.test/'), 'home page is skipped');
assert.ok(!has(page({ title: 'قهوه‌ها', h1: 'قهوه' }), 'title_h1_unrelated'), 'plural/suffix variants relate');

// ۶) resource hints و فونت
const ext = '<script src="https://a.cdn.com/x.js"></script><script src="https://b.cdn.com/y.js"></script><link rel="stylesheet" href="https://c.cdn.com/z.css">';
assert.ok(has(page({ head: ext }), 'no_preconnect'));
assert.ok(!has(page({ head: ext + '<link rel="preconnect" href="https://a.cdn.com">' }), 'no_preconnect'));
assert.ok(!has(page({ head: '<script src="https://a.cdn.com/x.js"></script>' }), 'no_preconnect'), 'one third party is fine');
assert.ok(!has(page({ head: '<script src="https://x.test/a.js"></script><script src="https://www.x.test/b.js"></script><script src="/c.js"></script>' }), 'no_preconnect'), 'same-site hosts do not count');
assert.ok(has(page({ head: '<style>@font-face{font-family:A;src:url(a.woff2)}</style>' }), 'font_display'));
assert.ok(!has(page({ head: '<style>@font-face{font-family:A;src:url(a.woff2);font-display:swap}</style>' }), 'font_display'));
assert.ok(has(page({ head: '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn" rel="stylesheet">' }), 'font_display'));
assert.ok(!has(page({ head: '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn&display=swap" rel="stylesheet">' }), 'font_display'));

// ۷) پایداری: ورودی خراب خطا نمی‌دهد، و هر کد دوبار گزارش نمی‌شود
assert.deepStrictEqual(SP.check(null), []); assert.deepStrictEqual(SP.check({}), []); assert.doesNotThrow(() => SP.check({ ldBlocks: [null, 5, '{'], imgs: [null, {}], linkList: [null] }));
{ const c = codes(page({ title: 'كتاب', imgs: im('IMG_1.jpg', 'IMG_2.jpg') }), 'https://x.test/'); assert.strictEqual(c.filter((x) => x === 'arabic_chars').length, 1); }

// ۸) هر کد جدید در همهٔ جدول‌های برنامه ثبت است (توضیح، راه‌حل، امتیاز حوزه، قوانین)
const brain = rd('brain.js'), smart = rd('smart.js'), site = rd('sitecheck.js'), rules = rd('seorules.js'), data = rd('seorules-data.js');
SP.CODES.forEach((c) => {
  assert.ok(new RegExp('\\b' + c + ': \\(\\) =>').test(brain), c + ' has a HOW'); assert.ok(new RegExp('\\b' + c + ": '").test(brain), c + ' has a WHY');
  assert.ok(new RegExp('\\b' + c + ': \\{ impact').test(smart), c + ' in smart.js'); assert.ok(site.includes(c), c + ' in an area score'); assert.ok(rules.includes("'" + c + "'"), c + ' is auto-checkable'); assert.ok(data.includes("'" + c + "'"), c + ' backed by a rule');
});
console.log('seoplus tests OK');

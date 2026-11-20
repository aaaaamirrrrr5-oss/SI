const assert = require('assert'); const P = require('../www/productstudio.js');
const BAN = /(?<![\p{L}])(?:ضمانت|اصل|اورجینال|بهترین|ارزان|تخفیف|تضمین|پرفروش|رایگان|تضمینی)(?![\p{L}])/u;
// 1) no banned claim in any fixed pool
(function walk(x, path) { if (typeof x === 'string') assert.ok(!BAN.test(x.replace(/\u200c/g, ' ')), 'banned word in TPL ' + path + ': ' + x); else if (Array.isArray(x)) x.forEach((y, i) => walk(y, path + '[' + i + ']')); else if (x && typeof x === 'object') Object.keys(x).forEach((k) => walk(x[k], path + '.' + k)); })(P.TPL, 'TPL');
// 2) pool sizes (step 25)
const min = { intro: 11, deliver: 32, summary: 12, faqPrice: 8, faqOrder: 8, nameBuy: 20, nameUse: 14, nameCare: 13, faqHead: 5, sumHead: 5, whatHead: 5 };
Object.keys(min).forEach((k) => assert.ok(P.TPL[k].length >= min[k], k + ' pool too small: ' + P.TPL[k].length));
// 3) cross-product sharing on a 30-name sample
const names = ['کتری استیل ۱ لیتری', 'کتری استیل ۲ لیتری مشکی', 'قابلمه استیل ۲۴ سانتی‌متری', 'لیوان شیشه‌ای ۳۰۰ میلی‌لیتری', 'قهوه اسپرسو ۲۵۰ گرمی عربیکا', 'قهوه ترک ۵۰۰ گرمی', 'دریپر هاریو V60 سرامیکی', 'Moka Pot Bialetti 6 Cup', 'تیشرت مردانه نخی مشکی', 'کفش کتانی زنانه کرم سایز ۳۸', 'کیف دستی چرمی قهوه‌ای', 'کرم ضدآفتاب SPF50 ۵۰ میلی‌لیتری', 'شامپو ضد شوره ۴۰۰ میلی‌لیتری', 'پاور بانک شیائومی ۲۰۰۰۰ میلی‌آمپر', 'هدفون بی‌سیم سامسونگ مدل Buds', 'لپ تاپ ایسوس Vivobook 15', 'قاب گوشی سامسونگ A54 سیلیکونی', 'روغن موتور ۴ لیتری 10W40', 'کتاب داستان کوتاه', 'پازل ۵۰۰ تکه چوبی', 'دمنوش گیاهی آرامش ۲۰ عددی', 'مجموعه ۶ تایی قاشق چنگال استیل', 'ماگ سرامیکی سفید طرح گل', 'پیراهن زنانه کتان آبی', 'چای سیاه ۴۵۰ گرمی', 'حوله حمام نخی ۷۰ در ۱۴۰', 'ترازوی آشپزخانه دیجیتال ۵ کیلوگرمی', 'آسیاب قهوه برقی ۱۵۰ وات', 'فیلتر کاغذی قهوه سایز ۲ بسته ۱۰۰ عددی', 'کفپوش ماشین ضدآب مشکی'];
const out = P.buildMany(names.join('\n'), { site: 'بینو', siteUrl: 'https://bino.ir' }).filter((r) => r.ok);
assert.strictEqual(out.length, names.length);
const avg = out.reduce((a, r) => a + r.similarity.max, 0) / out.length; const mx = Math.max(...out.map((r) => r.similarity.max));
assert.ok(avg <= 21, 'avg similarity ' + avg); assert.ok(mx <= 38, 'max similarity ' + mx);
const sents = (r) => r.fields.content.replace(/<\/(?:li|p|h[1-6]|td|th|tr)>/g, '. ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').split(/[.؟!]\s+/).map((s) => s.trim().split(r.name).join('{n}')).filter((s) => s.length > 25);
const freq = new Map(); out.forEach((r) => new Set(sents(r)).forEach((s) => freq.set(s, (freq.get(s) || 0) + 1)));
const top = Math.max(...freq.values()); assert.ok(top <= 14, 'most repeated sentence appears in ' + top + ' of 30 products');
// 4) quality gates unchanged
out.forEach((r) => { assert.ok(r.score.value >= 80, r.name + ' score ' + r.score.value); assert.ok(!/⟦|TODO|undefined|\{n\}|\{t\}|NaN/.test(JSON.stringify(r.fields)), r.name + ' placeholder'); assert.ok(r.score.checks.find((c) => c.id === 'claims').ok, r.name + ' claims'); });
console.log('productstudio step25 uniqueness OK (avg ' + avg.toFixed(1) + ', max ' + mx + ', top repeat ' + top + ')');

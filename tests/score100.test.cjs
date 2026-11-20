const assert = require('assert'); const S = require('../www/score100.js');
const e = S.evaluate({ type: 'product', title: 'کتری قهوه', metaTitle: '', content: '<p>کوتاه</p>', product: {} });
assert.ok(e.score < 30 && e.missingAuto.length >= 5 && e.missingManual.length >= 3); assert.ok(!e.checks.some((c) => c.id === 'images'), 'unknown image data is not guessed');
const words = ('کتری قهوه گردن‌غازی استیل ضدزنگ '.repeat(60)); const ok = S.evaluate({ type: 'product', title: 'کتری قهوه', focusKeyword: 'کتری قهوه', metaTitle: 'خرید کتری قهوه گردن‌غازی | برند', metaDescription: 'کتری قهوه گردن‌غازی استیل ضدزنگ با ظرفیت یک لیتر برای دم‌کردن قهوه مناسب است.', excerpt: 'کتری قهوه گردن‌غازی استیل ضدزنگ برای قهوه دمی.', brand: 'ب', categories: ['x'], product: { attributes: [1, 2], price: 1, sku: 's' }, content: '<p>' + words + '</p><h2>پرسش‌های متداول</h2><a href="/a">a</a><a href="/b">b</a>' });
assert.strictEqual(ok.score, 100, JSON.stringify(ok.checks.filter((c) => !c.ok)));
console.log('score100 ok');

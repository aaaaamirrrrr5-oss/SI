const assert = require('assert'); const R = require('../www/rules.js');
const r = R.apply({ seo_title: 'خرید کتری | برند', meta_description: 'ضمانت اصالت دارد و خوب است برای شما.', focus_keyword: 'کتری', content: '<p>کتری استیل است. ضمانت اصالت دارد.</p><p>ارسال سریع انجام می‌شود.</p><ul><li>جنس: استیل</li></ul>' }, { banned: 'ضمانت اصالت، ارسال سریع', buyPrefix: 'never', brandSuffix: 'never' }, { brand: 'برند' });
assert.strictEqual(r.fields.seo_title, 'کتری'); assert.ok(!('meta_description' in r.fields)); assert.strictEqual(r.fields.focus_keyword, 'کتری');
assert.strictEqual(r.fields.content, '<p>کتری استیل است.</p><ul><li>جنس: استیل</li></ul>');
assert.strictEqual(R.apply({ seo_title: 'کتری قهوه' }, { buyPrefix: 'always' }).fields.seo_title, 'خرید کتری قهوه');
assert.deepStrictEqual(R.apply({ seo_title: 'x' }, null).notes, []);
const g = R.gscFocus({ queryStats: [{ q: 'کتری', impressions: 900 }, { q: 'قیمت کتری قهوه گردن غازی', impressions: 120 }, { q: 'چای ساز', impressions: 500 }, { q: 'کتری قهوه', impressions: 5 }] }, 'کتری قهوه گردن‌غازی');
assert.strictEqual(g, 'قیمت کتری قهوه گردن غازی'); assert.strictEqual(R.gscFocus(null, 'x'), null);
console.log('rules ok');

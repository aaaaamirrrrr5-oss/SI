'use strict';
// رگرسیون‌های دقت (v1.78): هیچ ویرایش خودکاری نباید متنِ درست را خراب کند.
const assert = require('assert');
const Polish = require('../www/polish.js');
const PS = require('../www/productstudio.js');
const SP = require('../www/seopolicy.js');

// 1) املای درست با تنوین هرگز دست نمی‌خورد (قبلاً «معمولاًً» می‌شد و تغییر «املایی» هم گزارش می‌شد)
for (const ok of ['این معمولاً خوب است', 'قطعاً و تقریباً و کاملاً درست', 'احتمالاً', 'اصلاً مهم نیست', 'مثلاً همین']) {
  const r = Polish.fixPlain(ok); assert.strictEqual(r.text, ok, 'untouched: ' + ok); assert.strictEqual(r.count, 0, 'no change counted: ' + ok); assert.ok(!/ًً/.test(r.text));
}
// ولی املای غلط همچنان اصلاح می‌شود، یک‌بار و با تنوین
{ const r = Polish.fixPlain('این معمولا و قطعا و بصورت'); assert.strictEqual(r.text, 'این معمولاً و قطعاً و به صورت'); assert.strictEqual(r.count, 3); assert.ok(!/ًً/.test(r.text)); }
// اجرای دوباره روی خروجی تغییری نمی‌دهد (idempotent)
{ const once = Polish.fixPlain('معمولا و تقریبا کاملا').text; assert.strictEqual(Polish.fixPlain(once).text, once); assert.strictEqual(Polish.fixPlain(once).count, 0); }

// 2) اسم دوکلمه‌ای محصول در متن کوتاه نمی‌شود
for (const [name, type] of [['فرنچ پرس شیشه‌ای', 'فرنچ پرس'], ['موکا پات استیل ۶ کاپ', 'موکا پات'], ['قهوه ساز اسپرسو', 'قهوه ساز']]) {
  const r = PS.build(name, {}); assert.ok(String(r.type).indexOf(type) === 0, name + ' → type ' + r.type);
  const body = r.fields.content.replace(/<[^>]+>/g, ' ');
  const first = type.split(' ')[0], second = type.split(' ')[1];
  assert.ok(!new RegExp(first + '(?!\\s?' + second + ')').test(body.replace(/دستگاه|قهوه‌/g, '')) || first === 'قهوه', 'no lone «' + first + '» in ' + name);
  assert.ok(!/ًً/.test(body) && !/این این/.test(body), 'clean text for ' + name);
}
// 3) چگالی عبارت نوع زیر سقف مسدودکنندهٔ گوگل می‌ماند و دروازه بدنه را می‌پذیرد
for (const name of ['فرنچ پرس شیشه‌ای', 'موکا پات استیل ۶ کاپ', 'قهوه ساز اسپرسو', 'لیوان سرامیکی', 'آسیاب قهوه برقی', 'کتری استیل']) {
  const r = PS.build(name, {}); const txt = r.fields.content.replace(/<[^>]+>/g, ' ');
  const d = SP.keywordDensity(txt, r.type); assert.ok(d <= 3.5, name + ' type density ' + d);
  const a = SP.auditContent(r.fields.content, { focus: r.type, kind: 'product', title: name }); assert.deepStrictEqual(a.blockers, [], name + ' passes the Google gate with the type as focus: ' + JSON.stringify(a.blockers));
}
console.log('precision tests OK');

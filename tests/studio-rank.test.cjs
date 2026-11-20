/* v1.76: a catalog of SIBLING products with no text is written one by one (as the site-wide run does):
 * every text must be unique against the others, satisfy every rank check the writer controls, and pass the Google content gate. */
const assert = require('assert'); const R = require('../www/repair.js'); const S100 = require('../www/score100.js'); const P = require('../www/seopolicy.js');
const names = [
  'آسیاب قهوه دستی هاریو اسکرپ', 'آسیاب قهوه دستی تایمور چستنات', 'آسیاب قهوه دستی کامندانته C40', 'آسیاب قهوه دستی ۱۶۰۰ آوا', 'آسیاب قهوه دستی استیل ۳۰ گرمی', 'آسیاب قهوه دستی سرامیکی مینی',
  'قهوه اسپرسو عربیکا ۲۵۰ گرمی', 'قهوه اسپرسو روبوستا ۵۰۰ گرمی', 'قهوه اسپرسو ترکیبی ۱ کیلوگرمی', 'قهوه فیلتر برزیل ۲۵۰ گرمی', 'قهوه ترک ۲۰۰ گرمی', 'قهوه اسپرسو دیکف ۲۵۰ گرمی',
  'لیوان شیشه‌ای دوجداره ۲۰۰ میل', 'لیوان شیشه‌ای دوجداره ۳۰۰ میل', 'لیوان شیشه‌ای تک‌جداره ۲۵۰ میل', 'لیوان سرامیکی قهوه‌خوری ۱۵۰ میل', 'لیوان استیل مسافرتی ۴۵۰ میل', 'لیوان شیشه‌ای ۱۰۰ میل',
  'تیشرت مردانه نخی یقه گرد مشکی', 'تیشرت مردانه نخی یقه گرد سفید', 'تیشرت مردانه نخی یقه هفت مشکی', 'تیشرت زنانه نخی یقه گرد مشکی', 'تیشرت مردانه پلو سرمه‌ای', 'تیشرت مردانه نخی اورسایز طوسی',
];
const items = names.map((t, i) => ({ id: 100 + i, type: 'product', status: 'publish', title: t, content: '', metaTitle: '', metaDescription: '', focusKeyword: '', excerpt: '', product: {} }));
const ctx = { index: R.buildIndex(items), titleCounts: new Map(), metaCounts: new Map() };
const sh = (t, name) => { const w = String(t).split(name).join(' ').replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean); const s = new Set(); for (let i = 0; i + 4 <= w.length; i++) s.add(w.slice(i, i + 4).join(' ')); return s; };
const out = [];
items.forEach((it) => {
  const d = R.diagnose(it, ctx); const sp = R.planSeo(it, d, { brand: '', writeBody: true, index: ctx.index, titleCounts: ctx.titleCounts, metaCounts: ctx.metaCounts, site: 'بینو' });
  assert.ok(sp.fields.content, 'text written for ' + it.title + ' :: ' + JSON.stringify(sp.skipped)); assert.ok(sp.google && sp.google.ok, it.title + ' google gate: ' + JSON.stringify(sp.google && sp.google.blockers));
  R.noteApplied(ctx, sp.fields, it.id);
  const after = Object.assign({}, it, { content: sp.fields.content, excerpt: sp.fields.excerpt, metaTitle: sp.fields.seo_title, metaDescription: sp.fields.meta_description, focusKeyword: sp.fields.focus_keyword });
  const ev = S100.evaluate(after); const failed = ev.checks.filter((c) => !c.ok && ['focus', 'length', 'headings', 'faq', 'title', 'meta', 'excerpt'].includes(c.id)).map((c) => c.id);
  assert.deepStrictEqual(failed, [], it.title + ' rank checks: ' + failed);
  out.push({ it, set: sh(sp.fields.content, it.title), content: sp.fields.content });
});
let sum = 0, n = 0, max = 0, who = '';
for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) { let x = 0; out[i].set.forEach((v) => { if (out[j].set.has(v)) x++; }); const jac = x / (out[i].set.size + out[j].set.size - x); sum += jac; n++; if (jac > max) { max = jac; who = out[i].it.title + ' ~ ' + out[j].it.title; } }
const mean = 100 * sum / n; console.log('mean overlap ' + mean.toFixed(1) + '% max ' + (100 * max).toFixed(1) + '% (' + who + ')');
assert.ok(mean < 12, 'mean pairwise overlap ' + mean); assert.ok(100 * max < 45, 'worst pair ' + (100 * max) + ' ' + who);
assert.strictEqual(new Set(out.map((o) => o.content)).size, out.length, 'no two identical texts');
console.log('studio-rank ok');

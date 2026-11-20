'use strict';
const assert = require('assert');
const G = require('../www/articlegate.js');
const { S, G: GD } = require('./fixtures/articles-fa.cjs');
const html = (arr) => { const h = ['<p>' + arr.slice(0, 3).join(' ') + '</p>']; for (let i = 3; i < arr.length; i += 6) h.push('<h2>بخش ' + (i / 6 + 1) + ' دربارهٔ قهوه</h2><p>' + arr.slice(i, i + 5).join(' ') + '</p><p>' + arr.slice(i + 5, i + 6).join(' ') + '</p>'); return h.join('\n'); };
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const ev = (d, c) => G.evaluate(d, c);
const codes = (r) => r.reasons.map((x) => x.code);

const A = html(S.slice(0, 40)); const evidence = plain(A); // «اطلاعات واقعی» که ادعاهای متن را پشتیبانی می‌کند
const good = { title: 'راهنمای کامل دم‌آوری قهوه در خانه', content: A, focus_keyword: 'دم‌آوری قهوه' };

// ۱) مقالهٔ خوب و یکتا رد نمی‌شود
{ const r = ev(good, { minWords: 600, evidence }); assert.strictEqual(r.verdict, 'ready', JSON.stringify(r.reasons)); assert.ok(r.score >= 75); assert.ok(r.metrics.words > 700); assert.deepStrictEqual(r.similar, []); }
// مقالهٔ خوب ولی با یک «بهترین» بی‌مدرک: نیازمند بازبینی، نه توقف
{ const r = ev(good, { minWords: 600 }); assert.strictEqual(r.verdict, 'review'); assert.ok(codes(r).includes('policy_unsupported_claim')); }

// ۲) خیلی ضعیف: کوتاه / خودتکرار / بی‌تنوع / جای‌خالی / زبان غلط → نگه‌دار
{ const r = ev({ title: 'قهوه', content: '<p>' + S.slice(0, 6).join(' ') + '</p>' }, {}); assert.strictEqual(r.verdict, 'hold'); assert.ok(codes(r).includes('thin')); }
{ const r = ev({ title: 'قهوه', content: '<p>' + Array(12).fill(S.slice(0, 5).join(' ')).join(' ') + '</p>' }, {}); assert.strictEqual(r.verdict, 'hold'); assert.ok(codes(r).includes('repetitive') && codes(r).includes('low_diversity'), 'padding by repetition is held'); }
assert.strictEqual(ev({ title: 'ت', content: A + '<p>⟦قیمت⟧</p>' }, { evidence }).verdict, 'hold');
assert.ok(codes(ev({ title: 'T', content: '<p>' + 'The quick brown fox jumps over the lazy dog and keeps running far away. '.repeat(30) + '</p>' }, {})).includes('wrong_language'));
assert.ok(codes(ev({ title: '', content: A }, { evidence })).includes('no_title'));
// کلیدواژه‌چینی
{ const r = ev({ title: 'قهوه', focus_keyword: 'قهوه تازه', content: html(S.slice(0, 40).map((s) => s + ' قهوه تازه قهوه تازه')) }, { evidence: 'قهوه تازه' }); assert.strictEqual(r.verdict, 'hold'); assert.ok(codes(r).includes('policy_keyword_stuffing')); }
// کوتاه ولی نه خیلی کوتاه → بازبینی
{ const r = ev({ title: 'قهوه', content: html(S.slice(0, 22)) }, { minWords: 900, evidence }); assert.ok(['review', 'hold'].includes(r.verdict)); assert.ok(codes(r).includes('short')); assert.ok(!codes(r).includes('thin')); }

// ۳) مطالب یکسان: پیش‌نمایش مقالهٔ موجود (۵۰۰ نویسه) / متن کامل مقالهٔ هم‌دسته
const existing = [{ id: 7, title: 'آموزش دم‌آوری قهوه', url: 'https://x.test/a', type: 'post', status: 'publish', contentPreview: plain(A).slice(0, 500), focusKeyword: 'دم‌آوری قهوه' },
  { id: 8, title: 'نگهداری گیاهان آپارتمانی', url: 'https://x.test/g', type: 'post', status: 'publish', contentPreview: plain(html(GD)).slice(0, 500) },
  { id: 9, title: 'صفحهٔ تماس', url: 'https://x.test/c', type: 'page', status: 'publish', contentPreview: plain(A).slice(0, 500) }];
{ const r = ev({ title: 'نکات دم آوری قهوه', content: A, focus_keyword: 'قهوه' }, { existing, minWords: 600, evidence }); assert.strictEqual(r.verdict, 'hold'); assert.ok(codes(r).includes('duplicate')); assert.strictEqual(r.similar[0].id, 7); assert.ok(r.similar[0].sim >= 90); assert.ok(!r.similar.some((x) => x.id === 9), 'pages are not compared'); }
{ const edited = S.slice(0, 40).map((s) => s.replace('و', 'یا').replace('که', 'چون')); // بازنویسی سبک هم گرفته می‌شود
  const r = ev({ title: 'نکات دم آوری قهوه', content: html(edited) }, { existing, minWords: 600, evidence: plain(html(edited)) }); assert.strictEqual(r.verdict, 'hold'); assert.ok(r.similar[0].sim >= 60, 'light rewrite still caught: ' + r.similar[0].sim); }
{ const r = ev({ title: 'مقالهٔ دیگر', content: html(S.slice(10, 48)) }, { batch: [{ title: 'مقالهٔ اول', content: A }], minWords: 600, evidence: plain(html(S.slice(10, 48))) }); assert.strictEqual(r.similar[0].source, 'batch'); assert.ok(r.verdict === 'hold' || r.verdict === 'review'); }
{ const r = ev({ title: 'نکات پایانی دربارهٔ قهوه', content: html(S.slice(40, 48)) }, { existing, minWords: 100 }); assert.ok(!codes(r).includes('duplicate'), 'unrelated text is not a duplicate'); assert.deepStrictEqual(r.similar, [], 'no similar article reported'); }
// متنی که عیناً مقالهٔ موجودِ دیگری است، با همان مقاله تطبیق می‌خورد (نه با مقالهٔ نامرتبط)
{ const r = ev({ title: 'نگهداری از گیاهان', content: html(GD) }, { existing, minWords: 100 }); assert.strictEqual(r.similar[0].id, 8); assert.ok(codes(r).includes('duplicate')); }
// خودِ مقاله هنگام ویرایش با خودش مقایسه نمی‌شود
{ const r = ev({ title: 'آموزش دم‌آوری قهوه', content: A }, { existing, selfId: 7, minWords: 600, evidence }); assert.deepStrictEqual(r.similar, [], 'selfId excluded'); }
// عنوان یکسان
{ const r = ev({ title: 'آموزش  دم‌آوری قهوه', content: html(S.slice(20, 48)) }, { existing, minWords: 300, evidence: plain(html(S.slice(20, 48))) }); assert.strictEqual(r.verdict, 'hold'); assert.ok(codes(r).includes('same_title')); }
// هم‌پوشانی کم (≈۲۶٪) → فقط بازبینی
{ const r = ev({ title: 'قهوه', content: html(S.slice(28, 48).concat(S.slice(0, 6), S.slice(8, 14))) }, { batch: [{ title: 'x', content: html(S.slice(0, 28)) }], minWords: 500, evidence: S.join(' ') }); assert.strictEqual(r.verdict, 'review'); assert.ok(codes(r).includes('similar') && r.similar[0].level === 'review'); }

// ۴) ممیزی سایت
const items = [
  { id: 1, type: 'post', status: 'publish', title: 'راهنمای دم‌آوری قهوه', url: 'https://x.test/1', words: 900, contentPreview: plain(A).slice(0, 500), metaDescription: 'توضیح', focusKeyword: 'دم‌آوری قهوه', modified: '2026-10-01 10:00:00' },
  { id: 2, type: 'post', status: 'publish', title: 'کوتاه', url: 'https://x.test/2', words: 90, contentPreview: 'متن بسیار کوتاه', metaDescription: '', modified: '2026-10-02 10:00:00' },
  { id: 3, type: 'post', status: 'publish', title: 'نکات دم‌آوری', url: 'https://x.test/3', words: 880, contentPreview: plain(A).slice(0, 500), metaDescription: 'x', focusKeyword: 'دم‌آوری قهوه', modified: '2026-10-03 10:00:00' },
  { id: 4, type: 'post', status: 'draft', title: 'گلدان', url: 'https://x.test/4', words: 700, contentPreview: plain(html(GD)).slice(0, 500), metaDescription: 'y', modified: '2020-01-01 10:00:00' },
  { id: 5, type: 'post', status: 'publish', title: 'راهنمای  دم‌آوری قهوه', url: 'https://x.test/5', words: 700, contentPreview: plain(html(S.slice(20, 30))).slice(0, 500), metaDescription: 'z', modified: '2026-10-04 10:00:00' },
  { id: 6, type: 'page', status: 'publish', title: 'تماس', url: 'https://x.test/6', words: 50, contentPreview: 'تماس' },
  { id: 7, type: 'product', status: 'publish', title: 'محصول', url: 'https://x.test/7', words: 10, contentPreview: 'x' },
];
{ const a = G.auditSite(items, { now: Date.UTC(2026, 10, 18) }); const by = (id) => a.rows.find((r) => r.id === id);
  assert.strictEqual(a.rows.length, 5, 'pages and products are not articles'); assert.strictEqual(a.stats.total, 5); assert.strictEqual(a.stats.published, 4); assert.strictEqual(a.stats.draft, 1);
  assert.ok(by(2).flags.includes('weak') && by(2).level === 'bad' && by(2).flags.includes('nometa'));
  assert.ok(by(1).flags.includes('dup') && by(3).flags.includes('dup'), 'identical previews flagged both ways'); assert.strictEqual(by(1).similarTo[0].id, 3);
  assert.ok(by(1).flags.includes('dup_kw') && by(3).flags.includes('dup_kw'), 'same focus keyword');
  assert.ok(by(1).flags.includes('dup_title') && by(5).flags.includes('dup_title'), 'same normalised title');
  assert.ok(by(4).flags.includes('stale') && by(4).level === 'note'); assert.strictEqual(by(4).statusFa, 'پیش‌نویس');
  assert.ok(a.stats.weak === 1 && a.stats.dup >= 3 && a.stats.attention >= 4 && a.stats.avg > 0 && a.stats.avg < 100);
  assert.deepStrictEqual(G.filterRows(a.rows, { filter: 'weak' }).map((r) => r.id), [2]); assert.deepStrictEqual(G.filterRows(a.rows, { filter: 'draft' }).map((r) => r.id), [4]);
  assert.strictEqual(G.filterRows(a.rows, { q: 'گلدان' }).length, 1); assert.strictEqual(G.filterRows(a.rows, {}).length, 5);
  { const w = G.filterRows(a.rows, { sort: 'worst' }); assert.ok(w.every((r, i) => i === 0 || w[i - 1].score <= r.score), 'worst first (ascending score)'); assert.ok([1, 3].includes(w[0].id), 'the doubly-duplicated article ranks worst'); } assert.ok(G.filterRows(a.rows, { filter: 'attention' }).every((r) => r.level === 'bad' || r.level === 'warn'));
  assert.strictEqual(G.auditSite([]).stats.avg, 0); assert.deepStrictEqual(G.auditSite(null).rows, []);
}
// بزرگ‌مقیاس: ۴۰۰ مقالهٔ متفاوت سریع و بدون برچسب تکراریِ کاذب
{ const many = Array.from({ length: 400 }, (_, i) => ({ id: 100 + i, type: 'post', status: 'publish', title: 'مقالهٔ شمارهٔ ' + i + ' ' + S[i % 48].slice(0, 20), url: 'https://x.test/p' + i, words: 800, contentPreview: [i % 48, (i % 48 + 1 + Math.floor(i / 48)) % 48, (i % 48 + 7 + 2 * Math.floor(i / 48)) % 48, (i % 48 + 13 + 3 * Math.floor(i / 48)) % 48].map((k) => S[k]).join(' '), metaDescription: 'm', focusKeyword: 'کلیدواژهٔ ' + i }));
  const t0 = Date.now(); const a = G.auditSite(many); assert.ok(Date.now() - t0 < 4000, 'fast: ' + (Date.now() - t0) + 'ms'); assert.strictEqual(a.stats.total, 400);
  const nd = a.rows.filter((r) => r.flags.includes('dup')).length; assert.ok(nd <= 8, 'no false duplicates among distinct sentence mixes: ' + nd); }
assert.ok(G.similarity(plain(A), plain(A)) === 1 && G.similarity(plain(html(S.slice(0, 20))), plain(html(GD))) < 0.05);
assert.ok(G.titleSimilarity('راهنمای دم‌آوری قهوه', 'راهنمای دم آوری قهوه') > 0.9 && G.titleSimilarity('قهوه', 'باغبانی') === 0);
console.log('articlegate tests OK');

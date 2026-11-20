const assert = require('node:assert/strict');
const Knowledge = require('../www/knowledge.js');

(async () => {
  await Knowledge.clear();
  const saved = await Knowledge.upsertDocument({
    id: 'page:1', title: 'راهنمای قهوه تخصصی', url: 'https://example.test/guide?access_token=do-not-store#frag',
    scope: 'site-content', content: '<h1>راهنمای قهوه تخصصی</h1><p>برای دم‌آوری قهوه، اندازه آسیاب و دمای آب را متناسب با روش دم‌آوری انتخاب کنید. این راهنما درباره روش‌های دم‌آوری و انتخاب آسیاب توضیح می‌دهد.</p>',
    metadata: { sourceType: 'wp-content', verified: true, verificationMethod: 'admin-reviewed', confidence: 0.9, publishedAt: '2026-11-01' }
  });
  assert.ok(saved.chunks >= 1);
  assert.equal(saved.embedded, 0);
  const rows = await Knowledge._allRows();
  assert.equal(rows[0].url, 'https://example.test/guide');
  assert.equal(rows[0].verified, true);
  assert.equal(rows[0].verificationMethod, 'admin-reviewed');
  const results = await Knowledge.search('روش دم‌آوری آسیاب قهوه', { scope: 'site-content', limit: 5 });
  assert.ok(results.length >= 1);
  assert.equal(results[0].method, 'lexical-fallback');
  assert.equal(results[0].sourceType, 'wp-content');
  assert.equal((await Knowledge.search('دم‌آوری', { scope: 'external-research' })).length, 0);
  assert.equal((await Knowledge.search('دم‌آوری', { excludeDocId: 'page:1' })).length, 0);
  const bulk = await Knowledge.upsertDocuments([
    { id: 'bulk:1', title: 'راهنمای آسیاب', url: 'https://example.test/grinder', scope: 'site-content', content: 'این راهنمای کامل درباره انتخاب آسیاب قهوه برای دم آوری و تنظیم درجه آسیاب و روش های مختلف توضیح می دهد.' },
    { id: 'bulk:2', title: 'منبع RSS', url: 'https://news.example.test/post?token=do-not-store', scope: 'external-research', content: 'خبر و سرنخ پژوهشی درباره تغییرات جدید در جستجوی اینترنتی و ابزارهای سئو منتشر شده است.' },
    { id: 'bulk:1', title: 'تکراری با همان شناسه', scope: 'site-content', content: 'این سند با شناسه تکراری نباید در یک دسته ذخیره یا جایگزین شود چون ورودی اول برنده است.' },
    { id: 'bulk:secret', title: 'Secret', content: 'Bearer abcdef0123456789 this must be rejected because it is a token secret.' },
  ], { maxDocuments: 10, maxChars: 400, overlap: 40 });
  assert.equal(bulk.documents, 2);
  assert.equal(bulk.skipped, 2, 'duplicate document IDs and secret-bearing documents must be skipped');
  const bulkRows = await Knowledge._allRows();
  assert.ok(bulkRows.some((x) => x.docId === 'bulk:2' && x.url === 'https://news.example.test/post'));
  assert.equal((await Knowledge.search('آسیاب قهوه', { scope: 'site-content' })).some((x) => x.id === 'bulk:1'), true);
  assert.equal((await Knowledge.search('شناسه تکراری نباید', { scope: 'site-content' })).length, 0, 'duplicate IDs must not insert a second document body');
  assert.equal((await Knowledge.search('تغییرات جدید جستجو', { scope: 'external-research' })).some((x) => x.id === 'bulk:2'), true);
  assert.equal((await Knowledge.removeDocs(['bulk:1'])), 1);
  assert.equal((await Knowledge.search('آسیاب قهوه', { scope: 'site-content' })).some((x) => x.id === 'bulk:1'), false);
  const similarity = await Knowledge.semanticCompare('آسیاب قهوه برای دم‌آوری', [{ id: 2, title: 'محتوا', text: 'آسیاب قهوه برای روش دم‌آوری' }]);
  assert.ok(similarity[0].score > 0);
  assert.equal(similarity[0].method, 'lexical-fallback');
  await assert.rejects(() => Knowledge.upsertDocument({ id: 'secret:1', content: 'access_token=abc123 this is a secret value for testing only' }), /کلید، توکن یا رمز/);
  await assert.rejects(() => Knowledge.upsertDocument({ id: 'bad-url', url: 'javascript:alert(1)', content: 'A sufficiently long text that should otherwise be stored safely.' }), /نشانی منبع/);
  assert.throws(() => Knowledge.safeSourceUrl('https://user:pass@example.test/private'), /بدون اطلاعات ورود/);
  await Knowledge.clear('site-content');
  const left = await Knowledge._allRows();
  assert.equal(left.length, 1);
  assert.equal(left[0].docId, 'bulk:2', 'clearing one scope must preserve other-site knowledge scopes');
  console.log('knowledge/RAG store tests OK');
})().catch((e) => { console.error(e); process.exit(1); });

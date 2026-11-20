// مدیریت مقاله‌ها (v1.81): صندوق «نگه‌داشته‌ها»، ممیزی سایت، فیلتر/جست‌وجو/مرتب‌سازی، دستور چت، و اینکه هیچ چیزی خودکار منتشر یا ذخیره نمی‌شود.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const { S: SENT, G: GARDEN } = require('./fixtures/articles-fa.cjs');
const plain = (a) => a.join(' ');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept()); const net = [];
  p.on('request', (r) => { if (/^https?:/.test(r.url())) net.push(r.method() + ' ' + r.url()); });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  const items = [
    { id: 1, type: 'post', status: 'publish', title: 'راهنمای دم‌آوری قهوه', url: 'https://x.test/1', words: 900, contentPreview: plain(SENT.slice(0, 5)).slice(0, 500), metaDescription: 'م', focusKeyword: 'دم‌آوری قهوه', modified: '2026-10-01 10:00:00' },
    { id: 2, type: 'post', status: 'publish', title: 'کوتاه', url: 'https://x.test/2', words: 90, contentPreview: 'متن بسیار کوتاه', metaDescription: '', modified: '2026-10-02 10:00:00' },
    { id: 3, type: 'post', status: 'publish', title: 'نکات دم‌آوری', url: 'https://x.test/3', words: 880, contentPreview: plain(SENT.slice(0, 5)).slice(0, 500), metaDescription: 'x', focusKeyword: 'دم‌آوری قهوه', modified: '2026-10-03 10:00:00' },
    { id: 4, type: 'post', status: 'draft', title: 'گلدان آپارتمانی', url: 'https://x.test/4', words: 700, contentPreview: plain(GARDEN.slice(0, 5)).slice(0, 500), metaDescription: 'y', modified: '2026-09-01 10:00:00' },
    { id: 5, type: 'page', status: 'publish', title: 'تماس', url: 'https://x.test/5', words: 50 },
  ];
  await p.evaluate((items) => { const A = window.__SI_APP; A.S.catalog = { items, total: items.length, sampleSize: items.length, hasMore: false }; A.S.tab = 'chat'; A.S.chatPane = 'articles'; A.render(true); }, items);
  await p.waitForSelector('.articles');
  // صندوق خالی + آمار
  assert.ok((await p.textContent('.articles')).includes('هیچ مقالهٔ نگه‌داشته‌ای نیست'));
  assert.strictEqual((await p.$$('.art-stats div')).length, 5); assert.strictEqual((await p.$$('.art-row')).length, 4, 'pages are not listed as articles');
  assert.ok((await p.textContent('.art-stats')).includes('۴'));
  // مرتب‌سازی پیش‌فرض: بدترین اول (دو مقالهٔ تکراری با هم) و برچسب‌ها
  const first = await p.textContent('.art-row:first-of-type summary'); assert.ok(/ضعیف|تکراری/.test(first), 'worst first shows weak/duplicate flags: ' + first); const scores = await p.$$eval('.art-score', (els) => els.map((e) => Number(e.textContent.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))); assert.ok(scores.every((s, i) => i === 0 || scores[i - 1] <= s), 'ascending score order: ' + scores);
  // فیلترها
  await p.click('[data-act=artFilter][data-k=weak]'); assert.strictEqual((await p.$$('.art-row')).length, 1); assert.ok((await p.textContent('.art-row')).includes('کوتاه'));
  await p.click('[data-act=artFilter][data-k=dup]'); assert.strictEqual((await p.$$('.art-row')).length, 2);
  await p.click('[data-act=artFilter][data-k=draft]'); assert.strictEqual((await p.$$('.art-row')).length, 1); assert.ok((await p.textContent('.art-row')).includes('گلدان'));
  await p.click('[data-act=artFilter][data-k=all]');
  // جست‌وجو بدون از دست دادن فوکوس
  await p.fill('#artQ', 'گلدان'); assert.strictEqual((await p.$$('.art-row')).length, 1); assert.ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'artQ'), 'search keeps focus'); await p.fill('#artQ', '');
  assert.strictEqual((await p.$$('.art-row')).length, 4);
  // جزئیات یک ردیف: علت‌ها و مشابه با
  await p.click('.art-row summary'); const body = await p.textContent('.art-row[open] .art-body'); assert.ok(/٪|واژه|عنوان|عبارت کلیدی/.test(body)); assert.ok(await p.$('.art-row[open] [data-act=artDeep]') && await p.$('.art-row[open] [data-act=artRewrite]'));
  // صندوق نگه‌داشته‌ها
  await p.evaluate(() => { const A = window.__SI_APP; A.S.held = [{ id: 'h1', at: Date.now(), key: 'k', source: 'agent', title: 'مقالهٔ ضعیف نمونه', fields: { title: 'مقالهٔ ضعیف نمونه', content: '<p>متن کوتاه نمونه</p>' }, gate: { verdict: 'hold', score: 20, reasons: [{ level: 'hold', code: 'thin', detail: 'متن بسیار کوتاه است (۱۰ واژه؛ حداقل ۲۵۰).' }], similar: [] } }]; A.render(true); });
  assert.ok((await p.textContent('.held')).includes('مقالهٔ ضعیف نمونه') && (await p.textContent('.held')).includes('بسیار کوتاه'));
  assert.ok((await p.textContent('.chat-badge')).includes('۱'), 'badge counts held articles');
  await p.click('[data-act=heldView]'); assert.ok((await p.textContent('.held')).includes('متن کوتاه نمونه'));
  await p.click('[data-act=heldCopy]'); await p.waitForSelector('#toast.on');
  assert.strictEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('si_heldArticles') || '[]').length), 0, 'not persisted yet (injected only)');
  await p.click('[data-act=heldDel]'); assert.strictEqual(await p.evaluate(() => window.__SI_APP.S.held.length), 0); assert.strictEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('si_heldArticles')).length), 0, 'delete persists');
  // دستور چت: وضعیت مقاله‌ها بدون اجرای هیچ تغییری
  await p.evaluate(() => { const A = window.__SI_APP; A.S.chatPane = 'chat'; A.S.chat = []; A.render(true); });
  await p.fill('#chatIn', 'وضعیت مقاله‌ها را نشان بده'); await p.press('#chatIn', 'Enter'); await p.waitForSelector('.articles', { timeout: 5000 });
  const msg = await p.evaluate(() => window.__SI_APP.S.chat.map((m) => m.content).join('\n')); assert.ok(msg.includes('وضعیت مقاله‌ها') && msg.includes('تکراری') && msg.includes('میانگین امتیاز'), msg.slice(0, 200));
  assert.ok(!(await p.evaluate(() => !!window.__SI_APP.S.autoSeo && window.__SI_APP.S.autoSeo.running)), 'status command runs nothing');
  // پیش‌نمایش عامل: «نگه‌دار» دکمهٔ ذخیره را قفل می‌کند و apply هیچ درخواستی نمی‌فرستد؛ «بازبینی» فقط هشدار می‌دهد.
  const mk = (verdict, reasons) => ({ action: 'create', post_type: 'post', post_id: 0, fields: { title: 'مقالهٔ آزمایشی', content: '<p>متن</p>' }, quality: { score: 50, wordCount: 10, headings: 0, links: 0, issues: [] },
    gate: { verdict, score: verdict === 'hold' ? 20 : 70, reasons, similar: [{ id: 3, title: 'نکات دم‌آوری', url: 'https://x.test/3', sim: 71, level: 'hold' }] }, gateBlocked: verdict === 'hold', createdAt: Date.now() });
  await p.evaluate((pv) => { const A = window.__SI_APP; A.S.chatPane = 'tools'; A.S.agentPreview = pv; A.render(true); }, mk('hold', [{ level: 'hold', code: 'duplicate', detail: 'محتوا با «نکات دم‌آوری» بیش از حد شبیه است (۷۱٪).' }]));
  await p.waitForSelector('.agent-preview .gate.bad'); assert.ok((await p.textContent('.agent-preview .gate')).includes('نگه‌داشته شد') && (await p.textContent('.agent-preview .gate')).includes('نکات دم‌آوری'));
  assert.ok(await p.$('.agent-preview [data-act=applyAgentPreview][disabled]'), 'save button is locked when the gate holds the article');
  const before = net.length; await p.evaluate(() => window.__SI_APP.applyAgentPreview()); await p.waitForSelector('#toast.on'); assert.ok((await p.textContent('#toast')).includes('نگه‌داشته'), 'apply refuses: ' + await p.textContent('#toast')); assert.strictEqual(net.length, before, 'no request was sent');
  await p.evaluate((pv) => { const A = window.__SI_APP; A.S.agentPreview = pv; A.render(true); }, mk('review', [{ level: 'review', code: 'short', detail: 'متن از حد انتظار کوتاه‌تر است.' }]));
  assert.ok(await p.$('.agent-preview .gate.warn') && !(await p.$('.agent-preview [data-act=applyAgentPreview][disabled]')), 'review warns but does not lock');
  await p.evaluate(() => { window.__SI_APP.S.agentPreview = null; });
  assert.deepStrictEqual(net.filter((x) => !x.includes('file:')), [], 'no network at all during article management');
  assert.deepStrictEqual(errs, [], 'page errors'); await b.close(); console.log('articles e2e OK');
})().catch((e) => { console.error(e); process.exit(1); });

// صف محتوای کامل (v1.81): بازنویسی خودکار مقالهٔ منتشرشده از دروازهٔ کیفیت می‌گذرد؛ ضعیف/شبیه/کوتاه‌شده «نگه‌داشته» می‌شود و روی سایت نمی‌رود.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const { S: SENT, G: GARDEN } = require('./fixtures/articles-fa.cjs');
const KEY = 'sik_' + 'a'.repeat(40); const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const html = (arr) => { const h = ['<p>' + arr.slice(0, 3).join(' ') + '</p>']; for (let i = 3; i < arr.length; i += 6) h.push('<h2>بخش ' + (i / 6 + 1) + '</h2><p>' + arr.slice(i, i + 6).join(' ') + '</p>'); return h.join('\n'); };
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const mkPost = (id, title, content, extra) => Object.assign({ id, type: 'post', status: 'publish', title, url: 'https://wp.test/p' + id, revision: 'r' + id, seo_title: title + ' | وبلاگ', meta_description: 'توضیح کوتاه برای ' + title, focus_keyword: 'قهوه', excerpt: 'خلاصه', content }, extra || {});
  const posts = {
    10: mkPost(10, 'راهنمای دم‌آوری قهوه', html(SENT.slice(0, 22))),          // بازنویسی سالم خواهد داشت
    11: mkPost(11, 'نکات نگهداری قهوه', html(SENT.slice(22, 44))),            // بازنویسی کوتاه‌شده
    12: mkPost(12, 'گیاهان آپارتمانی', html(GARDEN.concat(SENT.slice(44, 48)).concat(GARDEN.slice(0, 5)))), // بازنویسی کپی مقالهٔ دیگر
  };
  const row = (x) => ({ id: x.id, type: x.type, status: x.status, title: x.title, url: x.url, revision: x.revision, seoTitle: x.seo_title, metaTitle: x.seo_title, metaDescription: x.meta_description, focusKeyword: x.focus_keyword, excerpt: x.excerpt, contentPreview: plain(x.content).slice(0, 500), words: plain(x.content).split(' ').length, modified: '2026-10-01 10:00:00', issues: [] });
  const calls = { save: [] }; const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const u = new URL(r.request().url()); if (!u.pathname.startsWith('/wp-json/si/v1/')) return r.fulfill({ status: 404, headers: CORS, body: 'nf' });
    const ep = u.pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true, content_agent_auto: true }, agent_remaining: 50 });
    if (ep === 'agent/types') return json(r, { items: [] }); if (ep === 'agent/media') return json(r, { items: [], total: 0, hasMore: false }); if (ep === 'agent/changes') return json(r, { items: [], remaining: 50 });
    if (ep === 'content') return json(r, { items: Object.values(posts).map(row), total: 3, hasMore: false, site: { name: 'وبلاگ' } });
    if (ep === 'agent/item') return json(r, posts[u.searchParams.get('id')]);
    if (ep === 'agent/save') { calls.save.push(post); const x = posts[post.post_id]; Object.assign(x, post.fields); x.revision += 's'; return json(r, { ok: true, applied: Object.keys(post.fields), change_id: 's' + calls.save.length }); }
    return json(r, { message: 'nf' }, 404);
  });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  const good = html(SENT.slice(0, 22).map((s) => s.replace('و ', 'و همچنین ').replace('که ', 'که در عمل ')).concat(SENT.slice(40, 48))); // بازنویسی بلندتر، با زاویهٔ تازه
  const short = '<p>' + SENT.slice(22, 25).join(' ') + '</p>';                                                                            // بسیار کوتاه‌تر از اصل
  const copy = '<p>' + plain(posts[10].content) + '</p>';                                                                                  // رونوشت مقالهٔ شمارهٔ ۱۰
  await p.evaluate(({ k, good, short, copy }) => {
    const A = window.__SI_APP; A.S.ai = Object.assign({}, A.S.ai, { provider: 'device-local', model: 'auto' });
    A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true, content_agent_auto: true, agent_remaining: 50 } };
    SI.OnDeviceAI.getStatus = async () => ({ models: [{ modelId: 'gemma', installed: true, verified: true }] });
    SI.OnDeviceAI.generate = async (prompt) => { const body = /گیاهان آپارتمانی/.test(prompt) ? copy : /نکات نگهداری/.test(prompt) ? short : good;
      return { modelName: 'fake', text: JSON.stringify({ title: 'عنوان بازنویسی', content: body, excerpt: 'خلاصه', seo_title: 'عنوان سئو', meta_description: 'توضیح', focus_keyword: 'قهوه', keywords: ['قهوه'] }) }; };
  }, { k: KEY, good, short, copy });
  await p.evaluate(() => window.__SI_APP.runAgentFullContentAutopilot());
  await p.waitForFunction(() => window.__SI_APP.S.agentStats && window.__SI_APP.S.agentStats.mode === 'full-content', null, { timeout: 20000 });
  const st = await p.evaluate(() => window.__SI_APP.S.agentStats); const held = await p.evaluate(() => window.__SI_APP.S.held.map((h) => ({ id: h.post_id, src: h.source, reasons: h.gate.reasons.filter((r) => r.level === 'hold').map((r) => r.code) })));
  assert.deepStrictEqual(calls.save.map((c) => c.post_id), [10], 'only the healthy rewrite reached the live site: ' + JSON.stringify(calls.save.map((c) => c.post_id)));
  assert.strictEqual(st.applied, 1); assert.strictEqual(st.held, 2, 'two rewrites held'); assert.strictEqual(st.failed, 0, JSON.stringify(st.errors));
  assert.deepStrictEqual(held.map((h) => h.id).sort(), [11, 12]); assert.ok(held.every((h) => h.src === 'autopilot'));
  assert.ok(held.find((h) => h.id === 11).reasons.some((c) => c === 'thin' || c === 'shrunk'), 'short rewrite flagged: ' + JSON.stringify(held));
  assert.ok(held.find((h) => h.id === 12).reasons.some((c) => c === 'duplicate' || c === 'same_title'), 'copy flagged: ' + JSON.stringify(held));
  assert.ok(posts[11].content === html(SENT.slice(22, 44)) && posts[12].content.includes('خاک گلدان'), 'held posts on the site are untouched');
  const msg = await p.evaluate(() => window.__SI_APP.S.chat.map((m) => m.content).join('\n')); assert.ok(msg.includes('نگه‌داشته‌شده توسط دروازهٔ کیفیت') && msg.includes('روی سایت نرفت'), 'report tells what was held');
  assert.strictEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('si_heldArticles')).length), 2, 'held articles persisted');
  assert.deepStrictEqual(errs, [], 'page errors'); await b.close(); console.log('autopilot gate e2e OK');
})().catch((e) => { console.error(e); process.exit(1); });

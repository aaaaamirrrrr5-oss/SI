let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const KEY = 'sik_' + 'a'.repeat(40);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  const saves = []; const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const ep = new URL(r.request().url()).pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true }, agent_remaining: 9 });
    if (ep === 'agent/save') { saves.push(post); return json(r, { ok: true, post_id: 100 + saves.length, status: 'draft', post_type: 'product', applied: Object.keys(post.fields), change_id: 'c' + saves.length }); }
    if (ep.startsWith('agent/changes')) return json(r, { items: [] });
    return json(r, { items: [], total: 0, hasMore: false });
  });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate((k) => { const A = window.__SI_APP; A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true } }; A.S.chatPane = 'tools'; A.S.tab = 'chat'; A.render(true); }, KEY);
  await p.click('#dock [data-t=chat]'); await p.evaluate(() => { window.__SI_APP.S.chatPane = 'tools'; window.__SI_APP.render(true); });
  await p.waitForSelector('#studioForm');
  await p.fill('#studioForm [name=names]', 'کتری استیل ۲ لیتری مشکی\nقهوه اسپرسو ۲۵۰ گرمی عربیکا');
  await p.click('#studioForm button[type=submit]');
  await p.waitForSelector('.studio-item'); assert.strictEqual(await p.locator('.studio-item').count(), 2);
  const txt = await p.locator('.studio-item').first().innerText(); assert.ok(/کتری استیل/.test(txt) && /عنوان سئو/.test(txt) && /JSON|ارزیابی/.test(txt));
  assert.ok(await p.locator('.studio-item .studio-content h2').count() >= 4, 'rendered HTML headings');
  // save one → a CREATE draft with SEO fields, never a publish
  await p.locator('[data-act=studioSave][data-i="0"]').click();
  await p.waitForFunction(() => window.__SI_APP.S.studio.saved[0], null, { timeout: 8000 });
  assert.strictEqual(saves.length, 1); const s = saves[0]; assert.strictEqual(s.action, 'create'); assert.strictEqual(s.post_type, 'product'); assert.strictEqual(s.confirmed, true);
  ['content', 'seo_title', 'meta_description', 'focus_keyword', 'excerpt', 'faq'].forEach((k) => assert.ok(s.fields[k], k)); assert.ok(!('status' in s.fields) && !('publish' in s));
  // save all → only the remaining one
  await p.locator('[data-act=studioSaveAll]').waitFor({ state: 'visible' }); await p.locator('[data-act=studioSaveAll]').click();
  await p.waitForFunction(() => window.__SI_APP.S.studio.saved[1], null, { timeout: 8000 }); assert.strictEqual(saves.length, 2);
  assert.deepStrictEqual(errs, []); await b.close(); console.log('studio e2e OK');
})().catch((e) => { console.error(e); process.exit(1); });

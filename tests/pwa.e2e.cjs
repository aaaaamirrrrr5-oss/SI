const nodeCrypto = require('node:crypto');
function sigOk(req, key) { const h = req.headers(); const u = new URL(req.url()); const route = u.searchParams.get('rest_route') || u.pathname.replace('/wp-json', ''); const secret = nodeCrypto.createHash('sha256').update(key).digest('hex'); const msg = [req.method(), route, h['x-si-time'], h['x-si-nonce'], nodeCrypto.createHash('sha256').update(req.postData() || '').digest('hex')].join('\n'); return h['x-si-sig'] === nodeCrypto.createHmac('sha256', secret).update(msg).digest('hex'); }
// Real-browser PWA test: installable, offline shell, and a full SEO rebuild from a *web origin* (real CORS) against a mocked Bridge.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const { serve } = require('../scripts/serve-pwa.cjs');
const long = 'این صفحه دربارهٔ آسیاب قهوهٔ دستی و نحوهٔ انتخاب آن برای خانه است و اطلاعات واقعی دقیق و مفیدی دارد که کاربر بتواند تصمیم بگیرد.';
const mk = (id) => ({ id, type: 'page', title: 'صفحه ' + id, url: 'https://blog.test/p' + id, revision: 'r' + id, metaTitle: '', metaDescription: '', excerpt: long, contentPreview: long, issues: ['no_meta_description'] });
(async () => {
  const srv = await serve(0); const origin = 'http://localhost:' + srv.address().port;
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const applied = []; let rolled = null; const seenKeys = new Set();
  const cors = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'x-si-time,x-si-nonce,x-si-sig,content-type,accept', 'access-control-allow-methods': 'GET,POST,OPTIONS', vary: 'Origin' };
  await p.route('https://blog.test/**', (r) => {
    const req = r.request(); const u = new URL(req.url());
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    seenKeys.add(sigOk(req, 'KEY123') ? 'KEY123' : undefined);
    const j = (o) => r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
    const route = u.searchParams.get('rest_route') || u.pathname.replace('/wp-json', '');
    if (route.endsWith('/si/v1/ping')) return j({ site: 'Blog', capabilities: { autopilot: true, read_content: true, approved_updates: true }, autopilot_remaining: 10, autopilot_daily_limit: 20 });
    if (route.endsWith('/si/v1/insights')) return j({ totals: { aiReferrals: 0, aiBots: 0 }, days: 30 });
    if (route.endsWith('/si/v1/brief')) return j({ site: { name: 'Blog' } });
    if (route.endsWith('/si/v1/content')) return j({ items: u.searchParams.get('offset') === '0' ? [mk(1), mk(2), mk(3)] : [], total: 3, hasMore: false, site: { name: 'Blog' } });
    if (route.endsWith('/si/v1/autopilot/apply')) { const body = JSON.parse(req.postData()); applied.push(body); return j({ applied: body.changes, change_id: 'c' + applied.length, autopilot_remaining: 10 - applied.length }); }
    if (route.endsWith('/si/v1/autopilot/rollback')) { rolled = JSON.parse(req.postData()); return j({ restored: rolled.change_ids, skipped: [] }); }
    return r.fulfill({ status: 404, headers: cors, contentType: 'application/json', body: '{}' });
  });
  await p.addInitScript(() => { if (!localStorage.getItem('si_bridge')) localStorage.setItem('si_bridge', JSON.stringify({ url: 'https://blog.test', key: 'KEY123', name: 'Blog', capabilities: { autopilot: true, read_content: true, approved_updates: true, autopilot_remaining: 10, autopilot_daily_limit: 20 } })); });
  p.on('dialog', (d) => d.accept());

  await p.goto(origin + '/?go=settings'); await p.waitForSelector('#view .card');
  // deep link + install card
  assert.ok(await p.locator('text=نصب روی گوشی').count() >= 1, 'install card missing');
  assert.strictEqual(await p.evaluate(() => window.__SI_APP.S.tab), 'settings');
  // manifest reachable & valid, service worker controls the page
  const man = await p.evaluate(() => fetch(document.querySelector('link[rel=manifest]').href).then((r) => r.json()));
  assert.strictEqual(man.display, 'standalone');
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForSelector('#view .card');
  assert.ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker is not controlling the page');
  const cached = await p.evaluate(async () => (await caches.keys()).filter((k) => k.indexOf('si-shell-') === 0));
  assert.strictEqual(cached.length, 1);

  // offline: shell still opens
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('#view .card', { timeout: 8000 });
  assert.ok(await p.locator('#dock button').count() >= 5, 'offline shell did not render');
  await ctx.setOffline(false);

  // rebuild from the web origin over real CORS
  await p.click('#dock [data-t=seo]'); await p.waitForSelector('[data-act=rebuildNow]:not([disabled])', { timeout: 8000 });
  await p.click('[data-act=rebuildPreview]'); await p.waitForFunction(() => window.__SI_APP.S.rebuildPreview, null, { timeout: 8000 });
  assert.strictEqual(applied.length, 0, 'preview must not write');
  await p.click('[data-act=rebuildNow]'); await p.waitForFunction(() => window.__SI_APP.S.rebuild.last && window.__SI_APP.S.rebuild.last.applied >= 1, null, { timeout: 10000 });
  assert.ok(applied.length >= 1 && applied.every((x) => x.expected_revision && Object.keys(x.changes).every((k) => ['seo_title', 'meta_description'].includes(k))));
  const st = await p.evaluate(() => window.__SI_APP.S.rebuild);
  assert.ok(st.last.scoreAfter > st.last.scoreBefore && st.journal.length === applied.length);
  assert.deepStrictEqual([...seenKeys].filter(Boolean), ['KEY123']);
  await p.click('[data-act=rebuildRollback]'); await p.waitForFunction(() => window.__SI_APP.S.rebuild.journal.length === 0, null, { timeout: 8000 });
  assert.strictEqual(rolled.change_ids.length, applied.length);
  assert.deepStrictEqual(errs, []);
  console.log('pwa e2e OK (install, offline shell, CORS rebuild + rollback)'); await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });

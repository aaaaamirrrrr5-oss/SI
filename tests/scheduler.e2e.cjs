let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const KEY = 'sik_' + 'a'.repeat(40);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const TEXT = '<h2>معرفی</h2><p>قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد. بسته‌بندی سوپاپ‌دار آن عطر را تا مدت‌ها حفظ می‌کند و برای اسپرسو و قهوه فیلتر مناسب است.</p>';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // stateful fake WordPress
  const posts = {
    1: { id: 1, type: 'product', status: 'publish', title: 'قهوه عربیکا اتیوپی', url: 'https://wp.test/p1', revision: 'r1', seo_title: '', meta_description: '', focus_keyword: '', excerpt: 'قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد و برای اسپرسو مناسب است.', content: TEXT, product: {} },
    2: { id: 2, type: 'product', status: 'publish', title: 'فرنچ پرس شیشه‌ای', url: 'https://wp.test/p2', revision: 'r2', seo_title: 'فرنچ پرس شیشه‌ای | فروشگاه نمونه', meta_description: 'فرنچ پرس شیشه‌ای را با ضمانت اصالت و ارسال سریع از فروشگاه نمونه تهیه کنید؛ مشخصات کامل در صفحه آمده است.', focus_keyword: 'فرنچ پرس', excerpt: '', content: '', product: {} },
  };
  const row = (x) => ({ id: x.id, type: x.type, status: x.status, title: x.title, url: x.url, revision: x.revision, metaTitle: x.seo_title, metaDescription: x.meta_description, focusKeyword: x.focus_keyword, excerpt: x.excerpt, contentPreview: x.content.replace(/<[^>]+>/g, ' ').trim(), issues: x.meta_description ? [] : ['no_meta_description'], schemaSupported: false });
  const calls = { autopilot: [], save: [] }; let autopilotLeft = 50, agentLeft = 50;
  const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const u = new URL(r.request().url()); if (!u.pathname.startsWith('/wp-json/si/v1/')) return r.fulfill({ status: 404, headers: CORS, body: 'nf' });
    const ep = u.pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true, content_agent_auto: true, autopilot: true, builder_content: true }, agent_remaining: agentLeft, autopilot_remaining: autopilotLeft });
    if (ep === 'content') return json(r, { items: Object.values(posts).map(row), total: 2, hasMore: false, site: { name: 'فروشگاه نمونه' } });
    if (ep === 'agent/item') return json(r, posts[u.searchParams.get('id')]);
    if (ep === 'autopilot/apply') { calls.autopilot.push(post); const x = posts[post.post_id]; Object.assign(x, { seo_title: post.changes.seo_title != null ? post.changes.seo_title : x.seo_title, meta_description: post.changes.meta_description != null ? post.changes.meta_description : x.meta_description }); x.revision += 'a'; autopilotLeft--; return json(r, { ok: true, applied: post.changes, change_id: 'c' + calls.autopilot.length, autopilot_remaining: autopilotLeft }); }
    if (ep === 'agent/save') { calls.save.push(post); const x = posts[post.post_id]; if (String(post.expected_revision) !== x.revision) return json(r, { message: 'محتوا تغییر کرده' }, 409); Object.assign(x, post.fields); x.revision += 's'; agentLeft--; return json(r, { ok: true, applied: Object.keys(post.fields), change_id: 's' + calls.save.length, revision: x.revision }); }
    return json(r, { message: 'nf' }, 404);
  });
  p.on('dialog', (d) => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate((k) => { const A = window.__SI_APP; A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true, content_agent_auto: true, autopilot: true, autopilot_remaining: 50, agent_remaining: 50 } }; A.render(true); }, KEY);
  const A = (fn, ...a) => p.evaluate(fn, ...a);
  // extra route layer: count content reads and optionally fail them (falls back to the fake WordPress above otherwise)
  let contentReads = 0, failContent = false;
  await p.route('https://wp.test/wp-json/si/v1/content*', (r) => { if (r.request().method() === 'OPTIONS') return r.fallback(); contentReads++; if (failContent) return r.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: JSON.stringify({ message: 'server down' }) }); return r.fallback(); });
  const H = 3600e3;
  const setRebuild = (hoursAgo) => A((h) => { const S = window.__SI_APP.S; S.rebuild = Object.assign({}, S.rebuild, { enabled: true, intervalHours: 24, lastRun: Date.now() - h * 3600e3 }); S.autoSched = {}; S.autoBlock = {}; S.autoPolicy = { wifiOnly: false, minBattery: 20, quietEnabled: false, quietStart: 23, quietEnd: 7 }; }, hoursAgo);
  const lastRun = () => A(() => window.__SI_APP.S.rebuild.lastRun);
  const sched = () => A(() => window.__SI_APP.S.autoSched.rebuild || {});
  const block = () => A(() => (window.__SI_APP.S.autoBlock.rebuild || {}).code || '');

  // 1) THE BUG: a scheduled run that cannot start because something else is running must not burn the whole interval
  await setRebuild(48); const old1 = await lastRun();
  await A(() => { window.__SI_APP.S.autoSeoBusy = true; });
  await A(() => window.__SI_APP.maybeAutoRebuild());
  assert.strictEqual(calls.autopilot.length, 0, 'nothing runs while busy');
  assert.strictEqual(await lastRun(), old1, 'schedule is not consumed by a busy tick');
  assert.strictEqual(await block(), 'busy', 'panel can explain why');
  await A(() => { window.__SI_APP.S.autoSeoBusy = false; });
  await A(() => window.__SI_APP.maybeAutoRebuild());
  assert.ok(calls.autopilot.length >= 1, 'runs as soon as it is free');
  assert.ok((await lastRun()) > old1 + 40 * H, 'interval restarts after a real run');
  assert.strictEqual((await sched()).lastCode, 'ok'); assert.strictEqual((await sched()).failures, 0);
  const afterOk = calls.autopilot.length + calls.save.length;
  await A(() => window.__SI_APP.maybeAutoRebuild()); assert.strictEqual(calls.autopilot.length + calls.save.length, afterOk, 'not due again right after a run');

  // 2) skipped for a permanent reason (no permission) is recorded, not run, and does not consume the interval
  await setRebuild(48); const old2 = await lastRun(); const before2 = calls.autopilot.length + calls.save.length;
  await A(() => { const S = window.__SI_APP.S; S.bridge = Object.assign({}, S.bridge, { capabilities: { content_agent: false, content_agent_auto: false, autopilot: false } }); });
  await A(() => window.__SI_APP.maybeAutoRebuild());
  assert.strictEqual(calls.autopilot.length + calls.save.length, before2);
  assert.strictEqual(await lastRun(), old2); const s2 = await sched(); assert.strictEqual(s2.lastCode, 'not_allowed'); assert.ok(s2.retryAt > Date.now() + 0.9 * H, 'retries in about an hour, not a day');
  await A(() => { const S = window.__SI_APP.S; S.bridge = Object.assign({}, S.bridge, { capabilities: { content_agent: true, content_agent_auto: true, autopilot: true, autopilot_remaining: 50, agent_remaining: 50 } }); });

  // 3) device policy: each condition holds the run (schedule untouched), lifting it lets the run happen
  const cases = [
    ['quiet', () => { const S = window.__SI_APP.S; const h = new Date().getHours(); S.autoPolicy = Object.assign({}, S.autoPolicy, { quietEnabled: true, quietStart: h, quietEnd: (h + 2) % 24 }); }, () => { window.__SI_APP.S.autoPolicy.quietEnabled = false; }],
    ['battery', () => { navigator.getBattery = async () => ({ level: 0.05, charging: false }); }, () => { navigator.getBattery = async () => ({ level: 0.05, charging: true }); }],
    ['metered', () => { Object.defineProperty(navigator, 'connection', { value: { type: 'cellular', saveData: false }, configurable: true }); window.__SI_APP.S.autoPolicy.wifiOnly = true; }, () => { window.__SI_APP.S.autoPolicy.wifiOnly = false; }],
    ['offline', () => { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); }, () => { Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true }); }]
  ];
  for (const [code, on, off] of cases) {
    await setRebuild(48); const o = await lastRun(); const n = calls.autopilot.length + calls.save.length;
    await A(on); await A(() => window.__SI_APP.maybeAutoRebuild());
    assert.strictEqual(await block(), code, 'blocked by ' + code); assert.strictEqual(await lastRun(), o, code + ': schedule untouched');
    assert.strictEqual(calls.autopilot.length + calls.save.length, n, code + ': no write while blocked');
    await A(off); await A(() => window.__SI_APP.maybeAutoRebuild());
    assert.strictEqual(await block(), '', code + ': cleared'); assert.ok((await lastRun()) > o, code + ': ran after the condition was lifted');
  }
  await A(() => { navigator.getBattery = async () => ({ level: 1, charging: true }); });

  // 4) failure -> back-off (no hammering) -> retry when the delay passes -> success resets the counter
  await setRebuild(48); const old4 = await lastRun(); failContent = true; contentReads = 0;
  await A(() => window.__SI_APP.maybeAutoRebuild());
  const s4 = await sched(); assert.strictEqual(s4.failures, 1, 'one failure recorded'); assert.strictEqual(s4.lastCode, 'fail'); assert.ok(s4.retryAt > Date.now() + 10 * 60e3 && s4.retryAt < Date.now() + 20 * 60e3, 'first retry in ~15 minutes');
  assert.strictEqual(await lastRun(), old4, 'a failed run keeps the task due');
  const reads4 = contentReads; await A(() => window.__SI_APP.maybeAutoRebuild());
  assert.strictEqual(contentReads, reads4, 'inside the back-off window nothing is requested'); assert.strictEqual(await block(), 'backoff');
  failContent = false; await A(() => { const S = window.__SI_APP.S; S.autoSched.rebuild = Object.assign({}, S.autoSched.rebuild, { retryAt: Date.now() - 1 }); });
  await A(() => window.__SI_APP.maybeAutoRebuild());
  const s4b = await sched(); assert.strictEqual(s4b.failures, 0, 'success resets the failure counter'); assert.strictEqual(s4b.retryAt, 0); assert.ok((await lastRun()) > old4 + 40 * H);

  // 5) auto-pilot never overlaps with the full SEO run (it used to ignore autoSeoBusy)
  await A(() => { window.__SI_APP.S.autoSeoBusy = true; });
  const ap = await A(() => window.__SI_APP.runAutoPilot({ manual: true })); assert.ok(ap && ap.ok === false && ap.reason === 'busy', 'auto-pilot refuses while the SEO run is active');
  await A(() => { window.__SI_APP.S.autoSeoBusy = false; });
  // a scheduled auto-pilot tick that is blocked by policy leaves its schedule alone
  await A(() => { const S = window.__SI_APP.S; S.autopilot = { enabled: true, intervalHours: 24, lastRun: Date.now() - 48 * 3600e3 }; S.autoSched = {}; navigator.getBattery = async () => ({ level: 0.05, charging: false }); });
  await A(() => window.__SI_APP.maybeAutoPilot());
  assert.strictEqual(await A(() => (window.__SI_APP.S.autoBlock.autopilot || {}).code), 'battery'); assert.ok(await A(() => Date.now() - window.__SI_APP.S.autopilot.lastRun > 47 * 3600e3), 'auto-pilot schedule untouched');
  await A(() => { navigator.getBattery = async () => ({ level: 1, charging: true }); });

  // 6) settings panel: live status + policy controls that persist
  await A(() => { const S = window.__SI_APP.S; S.tab = 'settings'; window.__SI_APP.render(); });
  await p.waitForSelector('#sec-auto');
  const txt = await p.evaluate(() => document.querySelector('#view').innerText);
  assert.ok(/مرکز اتوماسیون/.test(txt) && /خلبان خودکار/.test(txt) && /اجرای کامل سئو/.test(txt) && /ساعت سکوت/.test(txt), 'automation center rendered');
  await p.click('label:has(#polWifi)'); await p.selectOption('#polBattery', '30'); await p.click('label:has(#polQuiet)'); await p.selectOption('#polQStart', '1'); await p.selectOption('#polQEnd', '5');
  const pol = await A(() => window.__SI_APP.S.autoPolicy); assert.deepStrictEqual(pol, { wifiOnly: true, minBattery: 30, quietEnabled: true, quietStart: 1, quietEnd: 5 });
  await A(() => { const S = window.__SI_APP.S; S.autoSched = { rebuild: { failures: 2, retryAt: Date.now() + 3600e3, lastCode: 'fail', lastError: 'x' } }; window.__SI_APP.render(true); });
  await p.click('[data-act=autoRetryNow]'); const cleared = await A(() => window.__SI_APP.S.autoSched.rebuild || {}); assert.ok(!cleared.failures && !cleared.retryAt, 'reset clears delays');
  await p.reload(); await p.waitForFunction(() => window.__SI_APP);
  assert.deepStrictEqual(await A(() => window.__SI_APP.S.autoPolicy), pol, 'policy survives a restart');

  assert.deepStrictEqual(errs, []); console.log('scheduler e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

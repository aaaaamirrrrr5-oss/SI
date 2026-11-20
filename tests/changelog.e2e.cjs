let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const KEY = 'sik_' + 'a'.repeat(40);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const clean = (n) => '<p>' + 'قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد. '.repeat(1) + 'بسته‌بندی سوپاپ‌دار آن عطر را تا مدت‌ها حفظ می‌کند و برای اسپرسو و قهوه فیلتر مناسب است. ' + 'دانه‌ها پیش از بسته‌بندی بررسی می‌شوند و مشخصات ثبت‌شده روی بسته درج شده است (' + n + ').</p>';
const DIRTY1 = '<h1>قهوه</h1><p>قهوه عربیکا اتیوپی بصورت كامل ميشود دم کرد ، و عطر میوه‌ای و طعم شیرین دارد و برای اسپرسو و قهوه فیلتر مناسب است. بسته‌بندی سوپاپ‌دار آن عطر را تا مدت‌ها حفظ می‌کند و دانه‌ها پیش از بسته‌بندی بررسی می‌شوند و مشخصات ثبت‌شده روی بسته درج شده است. وزن ٢٥٠ گرم است.</p><img src="a.jpg"><p></p>';
// typo only AFTER the 600-char list preview, so the list view cannot see it: coverage must read the full text
const LONG2 = '<p>فرنچ پرس شیشه‌ای با بدنهٔ مقاوم ساخته شده است. صافی فلزی آن ذرات ریز را بدون کاغذ نگه می‌دارد. دستهٔ مقاوم در برابر حرارت جابه‌جایی را راحت می‌کند. ظرفیت مخزن برای دو تا چهار فنجان مناسب است. پیستون فولادی بدون لقی بالا و پایین می‌رود. درپوش محکم گرمای نوشیدنی را بیشتر حفظ می‌کند. شست‌وشوی قطعات جداشدنی ساده و سریع انجام می‌شود. اندازهٔ جمع‌وجور آن در آشپزخانهٔ کوچک جا می‌گیرد. برای دم‌کردن قهوه و چای در خانه و محل کار کاربرد دارد. بسته‌بندی ضربه‌گیر از شیشه در مسیر حمل محافظت می‌کند. راهنمای کوتاه استفاده کنار دستگاه قرار دارد.</p><p>برای آسیاب کردن دانه‌ها می‌توانید آسیاب قهوه دستی را هم ببینید. این محصول بصورت کامل شسته می شود و بخاطر جنس شیشه باید با احتیاط استفاده شود.</p>';
const BUILDER = '<div>[vc_row][vc_column]<p>متن بصورت صفحه‌ساز ميشود و هیچ‌وقت نباید تغییر کند چون چیدمان را خراب می‌کند و خیلی طولانی است و باید بیشتر از چهل واژه باشد تا مشکل دیگری نباشد.</p>[/vc_column][/vc_row]</div>';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const seoOk = (t) => ({ seo_title: t + ' | فروشگاه نمونه', meta_description: t + ' را با مشخصات کامل، ضمانت اصالت و ارسال سریع از فروشگاه نمونه تهیه کنید و جزئیات را ببینید.', focus_keyword: t, excerpt: t + ' با کیفیت بالا برای استفادهٔ روزانه در خانه و محل کار مناسب است.' });
  const posts = {
    1: Object.assign({ id: 1, type: 'product', status: 'publish', title: 'قهوه عربیکا اتیوپی', url: 'https://wp.test/p1', revision: 'r1', seo_title: '', meta_description: '', focus_keyword: '', excerpt: 'قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد و برای اسپرسو مناسب است.', content: DIRTY1 }),
    2: Object.assign({ id: 2, type: 'product', status: 'publish', title: 'فرنچ پرس شیشه‌ای', url: 'https://wp.test/p2', revision: 'r2', content: LONG2 }, seoOk('فرنچ پرس شیشه‌ای')),
    3: Object.assign({ id: 3, type: 'post', status: 'publish', title: 'راهنمای انتخاب صفحه‌ساز', url: 'https://wp.test/p3', revision: 'r3', protected_layout: true, content: BUILDER }, seoOk('راهنمای انتخاب صفحه‌ساز')),
    4: Object.assign({ id: 4, type: 'product', status: 'publish', title: 'آسیاب قهوه دستی', url: 'https://wp.test/p4', revision: 'r4', content: clean(4).replace(/قهوه عربیکا اتیوپی/, 'آسیاب قهوه دستی') }, seoOk('آسیاب قهوه دستی')),
  };
  posts[5] = Object.assign({ id: 5, type: 'product', status: 'publish', title: 'کتری قهوه گردن‌غازی', url: 'https://wp.test/p5', revision: 'r5', content: '', excerpt: 'کتری گردن‌غازی برای دم‌آوری دقیق قهوهٔ فیلتر ساخته شده و جریان آب را کنترل می‌کند. بدنهٔ استیل ضدزنگ دارد و روی گاز و القایی قابل استفاده است.', product: { weight: '900', weight_unit: 'g', attributes: [{ name: 'جنس', options: ['استیل ضدزنگ'] }, { name: 'ظرفیت', options: ['۱ لیتر'] }], variation_count: 0 } }, seoOk('کتری قهوه گردن‌غازی'));
  const row = (x) => ({ id: x.id, type: x.type, status: x.status, title: x.title, url: x.url, revision: x.revision, metaTitle: x.seo_title, metaDescription: x.meta_description, focusKeyword: x.focus_keyword, excerpt: x.excerpt, protected_layout: !!x.protected_layout, contentPreview: x.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600), issues: x.meta_description ? [] : ['no_meta_description'], schemaSupported: false });
  const calls = { save: [], items: 0, rollback: [] }; const hist = []; let refuse = false; const snap = {}; let agentLeft = 50;
  const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const u = new URL(r.request().url()); if (!u.pathname.startsWith('/wp-json/si/v1/')) return r.fulfill({ status: 404, headers: CORS, body: 'nf' });
    const ep = u.pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true, content_agent_auto: true, autopilot: false }, agent_remaining: agentLeft, autopilot_remaining: 0 });
    if (ep === 'content') return json(r, { items: Object.values(posts).map(row), total: 5, hasMore: false, site: { name: 'فروشگاه نمونه' } });
    if (ep === 'agent/item') { calls.items++; return json(r, posts[u.searchParams.get('id')]); }
    if (ep === 'agent/save') { calls.save.push(post); const x = posts[post.post_id]; if (String(post.expected_revision) !== x.revision) return json(r, { message: 'محتوا تغییر کرده' }, 409); const cid = 's' + calls.save.length; snap[cid] = {}; Object.keys(post.fields).forEach((k) => { snap[cid][k] = x[k]; }); hist.unshift({ change_id: cid, post_id: x.id, title: x.title, post_type: x.type, action: 'update', mode: post.mode || 'automatic', state: 'applied', ts: Math.floor(Date.now() / 1000), fields: Object.keys(post.fields) }); Object.assign(x, post.fields); x.revision += 's'; agentLeft--; return json(r, { ok: true, applied: Object.keys(post.fields), change_id: cid, revision: x.revision }); }
    if (ep === 'autopilot/rollback') { calls.ap = (calls.ap || []).concat([post]); if (refuse) return json(r, { restored: [], skipped: post.change_ids }); return json(r, { restored: post.change_ids, skipped: [] }); }
    if (ep === 'agent/changes') return json(r, { items: hist, remaining: agentLeft });
    if (ep === 'agent/rollback') { if (refuse) return json(r, { message: 'محتوا تغییر کرده' }, 409); calls.rollback.push(post); const h = hist.find((x) => x.change_id === post.change_id); const x = posts[h.post_id]; if (String(post.expected_revision) !== x.revision) return json(r, { message: 'محتوا تغییر کرده' }, 409); Object.assign(x, snap[post.change_id]); x.revision += 'u'; h.state = 'rolled_back'; return json(r, { ok: true }); }
    return json(r, { message: 'nf' }, 404);
  });
  p.on('dialog', (d) => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate((k) => { const A = window.__SI_APP; A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true, content_agent_auto: true, autopilot: false, autopilot_remaining: 0, agent_remaining: 50 } }; A.S.autoPolish = true; A.S.polishChecked = {}; A.render(true); }, KEY);
  await p.click('#dock [data-t=chat]');
  const said = (re) => p.waitForFunction((s) => window.__SI_APP.S.chat.some((m) => m.role === 'assistant' && new RegExp(s).test(m.content)), re.source, { timeout: 25000 });
  const lastMsg = () => p.evaluate(() => window.__SI_APP.S.chat[window.__SI_APP.S.chat.length - 1].content);

  // run the full auto flow so the app really changes the site
  await p.fill('#chatIn', 'سئو را همین الان خودکار اجرا کن'); await p.press('#chatIn', 'Enter'); await said(/گزارش اجرای کامل سئو/);
  const savedIds = calls.save.map((c) => c.post_id); assert.ok(savedIds.length >= 2, 'the app changed several items');
  const before1 = JSON.stringify(posts[1].content);

  // the change-log page lists them
  await p.click('#logBtn'); await p.waitForSelector('.chg');
  assert.strictEqual(await p.evaluate(() => window.__SI_APP.S.tab), 'changes');
  const rows = await p.$$eval('.chg', (els) => els.length); assert.ok(rows >= savedIds.length, 'one row per saved change: ' + rows);
  assert.ok(await p.$eval('.stats', (e) => /فعال/.test(e.textContent)), 'summary tiles');
  assert.ok((await p.$$eval('.chg-day b', (e) => e.map((x) => x.textContent))).includes('امروز'), 'grouped by day');
  assert.ok(await p.$eval('#logBtn', (e) => Number(e.dataset.n) >= 1), 'header badge counts today');
  // filter + search
  await p.click('[data-act=chFilter][data-k=text]'); assert.ok((await p.$$eval('.chg', (e) => e.length)) >= 1);
  await p.click('[data-act=chFilter][data-k=all]');
  await p.fill('#chSearch', 'قهوه عربیکا'); assert.ok((await p.$$eval('.chg', (e) => e.length)) >= 1 && (await p.$$eval('.chg', (e) => e.every((x) => /قهوه عربیکا/.test(x.textContent)))));
  await p.fill('#chSearch', 'چیزی که وجود ندارد'); assert.ok(await p.$eval('#chList', (e) => /پیدا نشد/.test(e.textContent)));
  await p.fill('#chSearch', '');

  // undo one change: revision is read fresh, content returns to the previous text
  const id1 = await p.evaluate(() => (window.__SI_APP.S.changeLog.find((e) => e.post_id === 1 && e.state === 'applied') || {}).id); assert.ok(id1, 'entry for product 1');
  const prev = snap[id1].content; assert.ok(prev !== undefined);
  await p.click(`[data-act=chUndo][data-id="${id1}"]`); await p.waitForFunction((i) => window.__SI_APP.S.changeLog.some((e) => e.id === i && e.state === 'rolled_back'), id1, { timeout: 15000 });
  assert.strictEqual(calls.rollback.length, 1); assert.strictEqual(calls.rollback[0].change_id, id1); assert.ok(calls.rollback[0].expected_revision, 'sends the live revision');
  assert.strictEqual(posts[1].content, prev, 'site content restored');
  await p.waitForSelector(`.chg.rolled[data-id="${id1}"]`, { timeout: 5000 });
  assert.strictEqual(await p.$(`[data-act=chUndo][data-id="${id1}"]`), null, 'no second undo button');
  // survives a reload
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /changeLog/.test(k)))).length); assert.ok(kept >= savedIds.length);

  // SEO-rebuild (autopilot) entries are undone through their own endpoint, in one batch call
  await p.evaluate(() => { const A = window.__SI_APP; A.S.rebuild = Object.assign({}, A.S.rebuild, { journal: [{ change_id: 'ap1', post_id: 2, title: 'صفحهٔ بازسازی', before: { seo_title: 'قدیم' }, after: { seo_title: 'جدید', meta_description: 'توضیح' } }, { change_id: 'ap2', post_id: 3, title: 'صفحهٔ دوم', before: {}, after: { seo_title: 'x' } }] }); A.syncChangeLog(); A.render(true); });
  await p.waitForSelector('.chg[data-id="ap1"]'); assert.ok(await p.$eval('.chg[data-id="ap1"]', (e) => /بازسازی سئو/.test(e.textContent)), 'source label');
  await p.click('.chg[data-id="ap1"] [data-act=chOpen]'); assert.ok(await p.$eval('.chg[data-id="ap1"] .chg-diff', (e) => /قدیم/.test(e.textContent) && /جدید/.test(e.textContent)), 'before/after shown');
  await p.click('[data-act=chUndo][data-id="ap1"]'); await p.waitForSelector('.chg.rolled[data-id="ap1"]', { timeout: 10000 });
  assert.deepStrictEqual(calls.ap[0].change_ids, ['ap1'], 'autopilot rollback endpoint used'); assert.strictEqual(calls.rollback.filter((c) => c.change_id === 'ap1').length, 0, 'not sent to the agent endpoint');
  assert.ok(await p.evaluate(() => !(window.__SI_APP.S.rebuild.journal || []).some((j) => j.change_id === 'ap1')), 'removed from the rebuild journal after undo');
  // the server refuses (page changed after the app's edit): the entry must stay "applied" and the app must not crash
  const other = calls.save.find((c) => c.post_id !== 1).post_id; const oid = await p.evaluate((pid) => window.__SI_APP.S.changeLog.find((e) => e.post_id === pid && e.state === 'applied').id, other);
  const keep = JSON.stringify(posts[other]); refuse = true;
  await p.click(`[data-act=chUndo][data-id="${oid}"]`); await p.waitForFunction(() => !window.__SI_APP.S.ch.busy, null, { timeout: 15000 });
  assert.strictEqual(JSON.stringify(posts[other]), keep, 'site untouched when the server refuses');
  assert.ok(await p.evaluate((i) => window.__SI_APP.S.changeLog.find((e) => e.id === i).state === 'applied', oid), 'entry still undoable later');
  // undo everything that is shown (bulk), server cooperates now
  refuse = false; await p.click('[data-act=chFilter][data-k=active]');
  await p.click('[data-act=chUndoShown]'); await p.waitForFunction(() => !window.__SI_APP.S.ch.busy && window.__SI_APP.S.changeLog.every((e) => e.state === 'rolled_back'), null, { timeout: 25000 });
  assert.ok(await p.$eval('#chList', (e) => /پیدا نشد/.test(e.textContent)), 'active filter is empty after undoing all');
  assert.deepStrictEqual(errs, [], 'no page errors: ' + errs.join(' | '));
  // assistant can open the same story in words
  await p.click('#dock [data-t=chat]');
  console.log('change log e2e OK');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

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
  const calls = { save: [], items: 0 }; let agentLeft = 50;
  const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const u = new URL(r.request().url()); if (!u.pathname.startsWith('/wp-json/si/v1/')) return r.fulfill({ status: 404, headers: CORS, body: 'nf' });
    const ep = u.pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true, content_agent_auto: true, autopilot: false }, agent_remaining: agentLeft, autopilot_remaining: 0 });
    if (ep === 'content') return json(r, { items: Object.values(posts).map(row), total: 5, hasMore: false, site: { name: 'فروشگاه نمونه' } });
    if (ep === 'agent/item') { calls.items++; return json(r, posts[u.searchParams.get('id')]); }
    if (ep === 'agent/save') { calls.save.push(post); const x = posts[post.post_id]; if (String(post.expected_revision) !== x.revision) return json(r, { message: 'محتوا تغییر کرده' }, 409); Object.assign(x, post.fields); x.revision += 's'; agentLeft--; return json(r, { ok: true, applied: Object.keys(post.fields), change_id: 's' + calls.save.length, revision: x.revision }); }
    return json(r, { message: 'nf' }, 404);
  });
  p.on('dialog', (d) => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate((k) => { const A = window.__SI_APP; A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true, content_agent_auto: true, autopilot: false, autopilot_remaining: 0, agent_remaining: 50 } }; A.S.autoPolish = true; A.S.polishChecked = {}; A.render(true); }, KEY);
  // ---- v1.45: fix ONE product with every auto-fix feature, with the exact before/after shown first ----
  await p.click('#dock [data-t=seo]');
  await p.waitForSelector('#oneQ', { state: 'visible' });
  await p.fill('#oneQ', 'قهوه عربیکا'); await p.click('[data-act=oneSearch]');
  await p.waitForSelector('[data-act=oneOpen]'); assert.ok((await p.$$('[data-act=oneOpen]')).length >= 1);
  const nSave0 = calls.save.length;
  await p.click('[data-act=oneOpen][data-id="1"]');
  await p.waitForSelector('[data-act=oneApply]', { timeout: 20000 });
  assert.strictEqual(calls.save.length, nSave0, 'preview never writes');
  const box = await p.innerText('#oneBox'); assert.ok(/عنوان سئو/.test(box) && /عبارت کلیدی/.test(box) && /متن کامل/.test(box), box.slice(0, 400));
  // exact diff: the Arabic kaf fix and the h1->h2 change are marked as deletions/insertions
  const dels = await p.$$eval('#oneBox del.d-del', (n) => n.map((x) => x.textContent)), ins = await p.$$eval('#oneBox ins.d-ins', (n) => n.map((x) => x.textContent));
  assert.ok(dels.some((x) => /كامل|<h1>|ميشود|ي/.test(x)), 'deletions: ' + JSON.stringify(dels)); assert.ok(ins.some((x) => /<h2>|کامل|می‌شود|alt=/.test(x)), 'insertions: ' + JSON.stringify(ins));
  await p.click('[data-act=oneApply]'); await p.waitForSelector('[data-act=oneUndo]', { timeout: 20000 });
  const sv = calls.save.slice(nSave0); assert.strictEqual(sv.length, 1, 'exactly one save'); assert.strictEqual(sv[0].post_id, 1);
  const prevFields = await p.evaluate(() => window.__SI_APP.S.one.done.fields); assert.deepStrictEqual(Object.keys(sv[0].fields).sort(), prevFields.slice().sort(), 'saved exactly what was previewed');
  assert.ok(await p.evaluate(() => { const v = window.__SI_APP.S.one.done.verify; return !!v && v.ok; }), 'saved values were re-read from the site and match');
  assert.ok(!('title' in sv[0].fields) && !('price' in sv[0].fields));
  assert.strictEqual(calls.save.filter((c) => c.post_id !== 1).length, 0, 'no other product touched');
  const jr = await p.evaluate(() => window.__SI_APP.S.repair.journal[0]); assert.ok(jr.changes && jr.changes.some((c) => c.segs || c.after), 'journal keeps exact changes');
  const cl = await p.evaluate(() => { const A = window.__SI_APP; A.syncChangeLog(); return A.S.changeLog.find((e) => e.post_id === 1 && e.changes); }); assert.ok(cl, 'change log entry has before/after rows');
  await p.click('[data-act=oneFlag]'); await p.waitForSelector('[data-act=oneExport]', { timeout: 5000 });
  await p.locator('details.rp-diff', { hasText: 'امتیاز آمادگی کل سایت' }).locator('summary').first().click(); await p.click('[data-act=siteScore]'); await p.waitForFunction(() => !!(window.__SI_APP.S.siteScore && window.__SI_APP.S.siteScore.avg != null), null, { timeout: 20000 }); assert.ok(await p.evaluate(() => window.__SI_APP.S.siteScore.worst.length > 0));
  // an item with nothing to fix reports so instead of writing
  await p.evaluate(() => { window.__SI_APP.S.one = null; window.__SI_APP.render(true); });
  await p.fill('#oneQ', 'آسیاب'); await p.click('[data-act=oneSearch]'); await p.waitForSelector('[data-act=oneOpen]');
  const nSave1 = calls.save.length; await p.click('[data-act=oneOpen][data-id="4"]'); await p.waitForFunction(() => /بدون تغییر|پیش‌نمایش/.test((document.querySelector('#oneBox') || {}).innerText || ''), null, { timeout: 20000 });
  assert.strictEqual(calls.save.length, nSave1);
  // v1.45 completion: an EMPTY product gets a grounded focus keyword and a whole-sentence meta (never a junk keyword like «ثبت شده»)
  await p.evaluate(() => { window.__SI_APP.S.one = null; window.__SI_APP.render(true); });
  await p.fill('#oneQ', 'کتری'); await p.click('[data-act=oneSearch]'); await p.waitForSelector('[data-act=oneOpen]'); await p.click('[data-act=oneOpen][data-id="5"]');
  await p.waitForSelector('[data-act=oneApply]', { timeout: 20000 });
  const fv = await p.evaluate(() => window.__SI_APP.S.one.plan.fieldValues); assert.ok(fv.content && /کتری/.test(fv.focus_keyword) && !/ثبت/.test(fv.focus_keyword), JSON.stringify(fv.focus_keyword));
  assert.ok(fv.meta_description && /[.!؟]$/.test(fv.meta_description) && fv.meta_description.length >= 70 && fv.meta_description.length <= 170, fv.meta_description); assert.ok(!/پیش از انتخاب|مشخصات بالا/.test(fv.meta_description), 'template filler is not a meta'); assert.ok(!/ضمانت اصالت|ارسال سریع/.test(fv.content), "promo copy must not enter the written text");
  // stale revision between preview and apply is refused, not overwritten
  await p.evaluate(() => { window.__SI_APP.S.one = null; window.__SI_APP.render(true); });
  posts[2].content = posts[2].content.replace('محل کار', 'محل کار بصورت');
  await p.fill('#oneQ', 'فرنچ'); await p.click('[data-act=oneSearch]'); await p.waitForSelector('[data-act=oneOpen]'); await p.click('[data-act=oneOpen][data-id="2"]');
  await p.waitForSelector('[data-act=oneApply]', { timeout: 20000 }); posts[2].revision += 'x'; const nSave2 = calls.save.length;
  await p.click('[data-act=oneApply]'); await p.waitForFunction(() => !!(window.__SI_APP.S.one && window.__SI_APP.S.one.err), null, { timeout: 20000 });
  assert.strictEqual(calls.save.length, nSave2, 'stale preview is not written'); assert.ok(/تغییر کرده/.test(await p.evaluate(() => window.__SI_APP.S.one.err)));
  assert.deepStrictEqual(errs, []); console.log('one-product e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

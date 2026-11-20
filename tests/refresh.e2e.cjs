// Browser test: the SEO tab shows the content-refresh plan; brief copy, "done" snooze and agent hand-off work without page errors.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const cors = { 'access-control-allow-origin': '*' };
  const page = (t, links, words) => `<html lang="fa"><head><title>${t}</title><meta name="viewport" content="width=device-width"></head><body><h1>${t}</h1>${links.map((l) => `<a href="${l}">x</a>`).join('')}<p>${Array(words).fill('قهوه اسپرسو').join(' ')}</p></body></html>`;
  await p.route('https://refresh-demo.test/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/robots.txt') return r.fulfill({ status: 200, headers: cors, contentType: 'text/plain', body: 'User-agent: *\nAllow: /\nSitemap: https://refresh-demo.test/sitemap.xml' });
    if (u === '/sitemap.xml') return r.fulfill({ status: 200, headers: cors, contentType: 'application/xml', body: '<urlset><url><loc>https://refresh-demo.test/thin</loc></url></urlset>' });
    if (u === '/llms.txt') return r.fulfill({ status: 404, headers: cors, body: 'no' });
    if (u === '/') return r.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: page('خانه', ['/thin'], 200) });
    return r.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: page('راهنمای قهوه 2019', ['/'], 20) });
  });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.fill('#urlIn', 'refresh-demo.test'); await p.click('#scanForm button'); await p.waitForSelector('.rings', { timeout: 15000 });
  await p.click('#dock [data-t=seo]');
  await p.click('[data-act=secAll][data-o="1"]'); // expand every collapsible section
  await p.waitForFunction(() => /برنامهٔ تازه‌سازی محتوا/.test(document.body.innerText), null, { timeout: 8000 });
  await p.evaluate(() => document.querySelectorAll('details.issue').forEach((d) => { d.open = true; }));
  const txt = await p.evaluate(() => document.body.innerText);
  assert.ok(/\/thin/.test(txt) && /بازنویسی با عامل محتوا/.test(txt) && /کپی برنامهٔ کامل/.test(txt), 'plan, agent hand-off and copy buttons visible');
  assert.ok(!/undefined|NaN/.test(txt.split('برنامهٔ تازه‌سازی محتوا')[1].split('یافته‌های سئو')[0]), 'no undefined/NaN in the panel');
  await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } } }); });
  await p.evaluate(() => document.querySelectorAll('details.issue').forEach((d) => { d.open = true; }));
  await p.click('[data-act=copyRefreshBrief]'); await p.waitForTimeout(300);
  const copied = await p.evaluate(() => window.__copied || '');
  assert.ok(/موضوع صفحه/.test(copied) && /عدد، آمار یا ادعای تضمینی/.test(copied), 'brief copied');
  await p.click('[data-act=copyRefreshPlan]'); await p.waitForTimeout(300);
  assert.ok(/برنامهٔ تازه‌سازی محتوا/.test(await p.evaluate(() => window.__copied || '')), 'markdown plan copied');
  await p.click('[data-act=sendRefreshToAgent]');
  await p.waitForSelector('#agentForm', { timeout: 5000 }); await p.waitForTimeout(300);
  const v = await p.evaluate(() => { const f = document.querySelector('#agentForm'); return { a: f.task_action.value, i: f.instructions.value, t: f.target_id.value }; });
  assert.strictEqual(v.a, 'update'); assert.ok(/تازه‌سازی/.test(v.i)); assert.strictEqual(v.t, '', 'no target guessed without a real catalog match');
  await p.click('#dock [data-t=seo]'); await p.waitForSelector('[data-act=markRefreshDone]', { state: 'attached' });
  await p.evaluate(() => document.querySelectorAll('details.issue').forEach((d) => { d.open = true; }));
  await p.click('[data-act=markRefreshDone]'); await p.waitForTimeout(300);
  const after = await p.evaluate(() => document.body.innerText);
  assert.ok(!/بازنویسی با عامل محتوا/.test(after.split('یافته‌های سئو')[0]) || /پنهان/.test(after), 'done page is snoozed');
  assert.deepStrictEqual(errs, []); console.log('refresh e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

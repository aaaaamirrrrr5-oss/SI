let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const cors = { 'access-control-allow-origin': '*' };
  await p.route('https://demo-site.test/**', (r) => { const u = new URL(r.request().url()).pathname;
    if (u === '/robots.txt') return r.fulfill({ status: 200, headers: cors, contentType: 'text/plain', body: 'User-agent: *\nDisallow: /wp-content/\n' });
    if (u === '/sitemap.xml' || u === '/llms.txt') return r.fulfill({ status: 404, headers: cors, body: 'no' });
    return r.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: '<html lang="fa"><head><title>خانه</title><meta name="keywords" content="a"><meta name="viewport" content="width=device-width"></head><body><h1>خانه</h1><p>' + 'متن '.repeat(100) + '</p></body></html>' }); });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.click('#dock [data-t=seo]');
  await p.waitForSelector('[data-act=ruleArea]'); assert.ok(await p.locator('#view section.card:has([data-act=ruleArea]) details.issue').count() > 50, 'library shown without scan');
  await p.click('#dock [data-t=home]'); await p.fill('#urlIn', 'demo-site.test'); await p.click('#scanForm button'); await p.waitForSelector('.rings', { timeout: 15000 });
  for (const t of ['home', 'ai', 'traffic', 'growth']) { await p.click('#dock [data-t=' + t + ']'); await p.waitForTimeout(300); const has = await p.evaluate(() => /قوانین/.test(document.querySelector('#view').textContent) && document.querySelectorAll('#view details.issue').length > 0); assert.ok(has, 'rules card missing on tab ' + t); }
  await p.click('#dock [data-t=seo]'); await p.waitForSelector('#view details.sec, #view [data-act=ruleArea]');
  await p.evaluate(() => document.querySelectorAll('#view details.sec').forEach((d) => { d.open = true; })); await p.waitForSelector('[data-act=ruleArea]', { state: 'visible' });
  const pg = p.locator('details.item.issue').first(); await pg.locator('summary').click(); assert.ok(/قوانین نقض‌شده|قانونی نقض نشده/.test(await pg.textContent()), 'per-page rules');
  const rep = await p.evaluate(async () => { return typeof window.__SI_APP; }); assert.equal(rep, 'object');
  await p.click('[data-act=ruleArea][data-k=geo]'); const n = await p.locator('#view section.card:has([data-act=ruleArea]) details.issue').count(); assert.ok(n >= 10 && n < 40, 'geo filter ' + n);
  await p.click('[data-act=ruleArea][data-k=all]'); await p.click('[data-act=ruleKind][data-k=myth]'); assert.ok(await p.locator('#view section.card:has([data-act=ruleArea]) details.issue').count() >= 3);
  assert.deepStrictEqual(errs, []); console.log('seorules e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

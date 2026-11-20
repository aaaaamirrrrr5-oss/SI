// Browser test: the SEO tab shows the site-structure intelligence panel built from a real (mocked-HTTP) scan.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const cors = { 'access-control-allow-origin': '*' };
  const body = (t, links) => `<html lang="fa"><head><title>${t}</title><meta name="viewport" content="width=device-width"></head><body><h1>${t}</h1>${links.map((l) => `<a href="${l}">x</a>`).join('')}${'<p>قهوه اسپرسو آسیاب دانه تازه برشته</p>'.repeat(50)}</body></html>`;
  await p.route('https://demo-site.test/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/robots.txt') return r.fulfill({ status: 200, headers: cors, contentType: 'text/plain', body: 'User-agent: *\nAllow: /\nSitemap: https://demo-site.test/sitemap.xml' });
    if (u === '/sitemap.xml') return r.fulfill({ status: 200, headers: cors, contentType: 'application/xml', body: '<urlset><url><loc>https://demo-site.test/b</loc></url><url><loc>https://demo-site.test/lonely</loc></url><url><loc>https://demo-site.test/dead</loc></url></urlset>' });
    if (u === '/llms.txt') return r.fulfill({ status: 404, headers: cors, body: 'no' });
    if (u === '/dead') return r.fulfill({ status: 404, headers: cors, contentType: 'text/html', body: '<html><body>404</body></html>' });
    if (u === '/') return r.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: body('خانه آزمایشی', ['/b', '/dead']) });
    return r.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: body(u === '/b' ? 'صفحه ب' : 'صفحه تنها', ['/']) });
  });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.fill('#urlIn', 'demo-site.test'); await p.click('#scanForm button'); await p.waitForSelector('.rings', { timeout: 15000 });
  await p.click('#dock [data-t=seo]');
  await p.click('[data-act=secAll][data-o="1"]'); // sections are collapsible now; expand all to inspect everything
  await p.waitForFunction(() => /هوش ساختار سایت/.test(document.body.innerText), null, { timeout: 8000 });
  const txt = await p.evaluate(() => document.body.innerText);
  assert.ok(/لینک داخلی به صفحهٔ خراب/.test(txt), 'broken internal link finding visible');
  assert.ok(/صفحهٔ یتیم/.test(txt), 'orphan finding visible');
  assert.ok(/کپی گزارش ساختار/.test(txt));
  assert.ok(/ابزارهای حرفه‌ای/.test(txt) && /برنامهٔ ریدایرکت/.test(txt) && /کپی قوانین Apache/.test(txt), 'pro tools panel visible');
  assert.ok(!/سلامت فنی وردپرس/.test(txt), 'health panel only appears once a bridge is connected');
  await p.evaluate(() => { navigator.clipboard = { writeText: (t) => { window.__copied = t; return Promise.resolve(); } }; });
  await p.click('[data-act=copyInsight]');
  await p.waitForTimeout(300);
  const copied = await p.evaluate(() => window.__copied || '');
  assert.ok(!copied || /گزارش ساختار سایت/.test(copied));
  if (process.env.SI_SHOT) await p.screenshot({ path: process.env.SI_SHOT, fullPage: true });
  assert.deepStrictEqual(errs, []); console.log('insight e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((y) => /داده نمونه/.test(y.textContent)); x && x.click(); });
  await p.waitForSelector('.rings');
  for (const tab of ['seo', 'ai']) {
    await p.click('#dock [data-t=' + tab + ']'); await p.waitForSelector('details.sec');
    const st = await p.evaluate(() => ({ n: document.querySelectorAll('details.sec').length, open: document.querySelectorAll('details.sec[open]').length, h: document.documentElement.scrollHeight, tools: !!document.querySelector('.sec-tools') }));
    assert.ok(st.n >= 3 && st.open >= 1 && st.open < st.n, tab + ': some sections open, some collapsed ' + JSON.stringify(st)); assert.ok(st.tools, 'open/close all controls');
    await p.click('[data-act=secAll][data-o="1"]'); const hOpen = await p.evaluate(() => document.documentElement.scrollHeight);
    assert.ok(hOpen > st.h, tab + ': expanding makes the page longer (' + st.h + ' → ' + hOpen + ')');
    await p.click('[data-act=secAll][data-o="0"]'); assert.strictEqual(await p.evaluate(() => document.querySelectorAll('details.sec[open]').length), 0);
  }
  // state is remembered across tab switches / re-renders
  await p.click('#dock [data-t=seo]'); await p.waitForSelector('details.sec');
  await p.evaluate(() => { document.querySelectorAll('details.sec').forEach((d) => { d.open = false; }); document.querySelectorAll('details.sec')[1].open = true; });
  await p.waitForTimeout(100); const key = await p.evaluate(() => document.querySelectorAll('details.sec')[1].dataset.k);
  await p.click('#dock [data-t=home]'); await p.click('#dock [data-t=seo]'); await p.waitForSelector('details.sec');
  assert.strictEqual(await p.evaluate((k) => { const d = [...document.querySelectorAll('details.sec')].find((x) => x.dataset.k === k); return d && d.open; }, key), true, 'opened section stays open');
  assert.strictEqual(await p.evaluate(() => document.querySelectorAll('details.sec[open]').length), 1, 'only the remembered one is open');
  // jump chip on a closed section opens it
  await p.evaluate(() => document.querySelectorAll('details.sec').forEach((d) => { d.open = false; }));
  const lastId = await p.evaluate(() => { const hs = [...document.querySelectorAll('details.sec > summary > h2')]; return hs[hs.length - 1].id; });
  await p.click('.jump [data-j="' + lastId + '"]'); await p.waitForTimeout(200);
  assert.strictEqual(await p.evaluate((id) => document.getElementById(id).closest('details').open, lastId), true, 'jump opens the target section');
  // tapping the title toggles
  const first = p.locator('details.sec > summary').first(); const was = await p.evaluate(() => document.querySelector('details.sec').open);
  await first.click(); await p.waitForTimeout(100); assert.strictEqual(await p.evaluate(() => document.querySelector('details.sec').open), !was, 'tap on title toggles');
  // short tabs are left alone
  await p.click('#dock [data-t=chat]'); assert.strictEqual(await p.evaluate(() => document.querySelectorAll('details.sec').length), 0);
  assert.deepStrictEqual(errs, []); console.log('collapsible sections e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

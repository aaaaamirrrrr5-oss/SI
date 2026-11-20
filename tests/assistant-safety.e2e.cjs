let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((y) => /داده نمونه/.test(y.textContent)); x && x.click(); });
  await p.waitForSelector('.rings'); await p.click('#dock [data-t=chat]'); await p.waitForSelector('#chatIn');
  const send = async (t) => { await p.fill('#chatIn', t); await p.press('#chatIn', 'Enter'); await p.waitForTimeout(350); };
  const last = () => p.evaluate(() => { const c = window.__SI_APP.S.chat; return c[c.length - 1].content; });
  // no bridge connected: a real command is answered with the "connect the plugin" message, a negated one with the safe reply
  await send('سئو را خودکار اجرا کن'); assert.ok(/Bridge/.test(await last()), 'command reaches the executor');
  await send('سئو را خودکار اجرا نکن'); assert.ok(/چیزی اجرا نمی‌کنم/.test(await last()), 'negated command is NOT executed');
  await send('اجرای خودکار سئو را متوقف کن'); assert.ok(/چیزی اجرا نمی‌کنم/.test(await last()), 'stop request is NOT executed');
  await send('seo ro khodkar ejra kon'); assert.ok(/Bridge/.test(await last()), 'Finglish command is understood');
  // conversation memory: assistant offers an action, a short yes runs it
  await send('قدم بعدی چیست؟');
  const offered = await p.evaluate(() => window.__SI_APP.S.brain && window.__SI_APP.S.brain.pending);
  if (offered) { await send('آره'); assert.ok(/Bridge/.test(await last()), 'short yes runs the offered action'); assert.strictEqual(await p.evaluate(() => window.__SI_APP.S.brain.pending), null, 'offer consumed'); }
  await send('آره'); assert.ok(!/Bridge/.test(await last()), 'a bare yes with nothing offered does nothing');
  // did-you-mean suggestions
  await send('وضعیت محصولات ناقص چند تاست'); assert.ok(/وضعیت|محصول/.test(await last()));
  assert.deepStrictEqual(errs, []); console.log('assistant safety e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

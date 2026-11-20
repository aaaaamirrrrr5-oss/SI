// Android-WebView simulation (fake native plugin): the assistant answers on a 1.5 GB phone, and survives an OOM on a big one.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const GB = 1024 ** 3;
async function run(label, plugin, expectFn) {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.addInitScript((cfg) => {
    const GB = 1024 ** 3; const st = { device: { totalRamBytes: cfg.total * GB, availableRamBytes: cfg.avail * GB, freeBytes: 30 * GB, lowMemory: false, deviceModel: 'Test' }, models: cfg.models, embedding: { installed: false } };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { SIOnDeviceAI: { getStatus: async () => st, loadModel: async () => ({}), generate: async () => { if (cfg.oom) throw new Error('OutOfMemoryError'); return { text: 'پاسخ مدل محلی' }; } } } };
  }, plugin);
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.click('#dock [data-t=chat]'); await p.waitForSelector('#chatIn');
  await p.fill('#chatIn', 'سلام، دستیار چه کارهایی بلد است؟'); await p.click('#chatForm button');
  await p.waitForSelector('.msg.assistant:not(.typing)', { timeout: 10000 });
  const txt = await p.textContent('#view'); expectFn(txt);
  assert.deepStrictEqual(errs, [], label + ' page errors'); await b.close(); console.log(label + ' OK');
}
(async () => {
  const q = { modelId: 'qwen3-0.6b', installed: true, verified: true }, g = { modelId: 'gemma4-e2b', installed: true, verified: true };
  await run('1.5GB phone, no model', { total: 1.5, avail: 0.8, models: [] }, (t) => { assert.ok(!t.includes('⚠️'), 'must not dead-end'); assert.ok(t.includes('حالت سبک خودکار')); });
  await run('8GB phone, model OOM mid-run', { total: 8, avail: 5, models: [g], oom: true }, (t) => { assert.ok(!t.includes('⚠️')); assert.ok(t.includes('OutOfMemory') && t.includes('قاعده‌محور')); });
  await run('8GB phone, healthy model', { total: 8, avail: 5, models: [g] }, (t) => { assert.ok(t.includes('پاسخ مدل محلی')); assert.ok(!t.includes('حالت سبک خودکار')); });
  await run('4GB phone, light model', { total: 4, avail: 2.5, models: [q] }, (t) => assert.ok(t.includes('پاسخ مدل محلی')));
})().catch((e) => { console.error(e); process.exit(1); });

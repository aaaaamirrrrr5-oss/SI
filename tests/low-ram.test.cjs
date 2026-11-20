// Assistant must work on every RAM size: tiers by RAM, and any model/RAM failure becomes a coded fallback to the rule engine.
const assert = require('assert'); const GB = 1024 ** 3;
const calls = []; let status; let genImpl;
globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { SIOnDeviceAI: { getStatus: async () => status, generate: async (a) => { calls.push(a); return genImpl(a); } } } };
const D = require('../www/ondevice.js');
const dev = (total, avail, extra) => Object.assign({ totalRamBytes: total * GB, availableRamBytes: avail * GB, freeBytes: 20 * GB, lowMemory: false }, extra);
const model = (id) => ({ modelId: id, installed: true, verified: true });

// tiers
assert.strictEqual(D.tier(dev(12, 8)).tier, 'high');
assert.strictEqual(D.tier(dev(8, 5)).tier, 'balanced');
assert.strictEqual(D.tier(dev(4, 2.5)).tier, 'light');
const t1 = D.tier(dev(1.5, 0.8)); assert.strictEqual(t1.tier, 'rules'); assert.ok(t1.reason.includes('۳ گیگابایت'));
assert.strictEqual(D.tier(dev(12, 8, { lowMemory: true })).tier, 'rules');
assert.strictEqual(D.tier({}).tier, 'rules'); // no telemetry -> never guess a heavy model

// usableModel needs install + SHA verification + current RAM fit
assert.strictEqual(D.usableModel({ device: dev(12, 8), models: [model('gemma4-e4b'), model('qwen3-0.6b')] }), 'gemma4-e4b');
assert.strictEqual(D.usableModel({ device: dev(4, 2.5), models: [model('gemma4-e4b'), model('qwen3-0.6b')] }), 'qwen3-0.6b');
assert.strictEqual(D.usableModel({ device: dev(4, 2.5), models: [{ modelId: 'qwen3-0.6b', installed: true, verified: false }] }), null);
assert.strictEqual(D.usableModel({ device: dev(1.5, 0.8), models: [model('qwen3-0.6b')] }), null);

(async () => {
  const fails = async (p) => { try { await p; } catch (e) { return e; } assert.fail('expected rejection'); };
  // low RAM phone: generate is refused with a fallback code and never reaches the native engine
  status = { device: dev(1.5, 0.8), models: [model('qwen3-0.6b')] };
  let e = await fails(D.generate('سلام', { modelId: 'auto' })); assert.ok(D.isFallbackError(e)); assert.strictEqual(calls.length, 0);
  // model not downloaded yet
  status = { device: dev(8, 5), models: [] };
  e = await fails(D.generate('سلام', { modelId: 'auto' })); assert.ok(D.isFallbackError(e));
  // native engine crashes / out of memory mid-generation
  status = { device: dev(8, 5), models: [model('gemma4-e2b')] }; genImpl = async () => { throw new Error('OutOfMemoryError'); };
  e = await fails(D.generate('سلام', { modelId: 'auto' })); assert.ok(D.isFallbackError(e) && /OutOfMemory/.test(e.message));
  // empty output also falls back
  genImpl = async () => ({ text: '  ' }); e = await fails(D.generate('سلام', { modelId: 'auto' })); assert.ok(D.isFallbackError(e));
  // healthy phone still uses the model
  genImpl = async () => ({ text: 'پاسخ مدل' }); const ok = await D.generate('سلام', { modelId: 'auto' }); assert.strictEqual(ok.text, 'پاسخ مدل');
  // unrelated errors are not swallowed as fallbacks
  assert.ok(!D.isFallbackError(new Error('x')));
  console.log('low-RAM tiers and automatic fallback tests OK');
})().catch((x) => { console.error(x); process.exit(1); });

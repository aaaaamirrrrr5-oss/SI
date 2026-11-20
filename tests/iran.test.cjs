const assert = require('assert');
const fs = require('fs');
const OnDevice = require('../www/ondevice.js');

assert.equal(OnDevice.normalizeMirror(''), '');
assert.equal(OnDevice.normalizeMirror(undefined), '');
assert.equal(OnDevice.normalizeMirror(' https://hf-mirror.com/ '), 'https://hf-mirror.com');
assert.equal(OnDevice.normalizeMirror('https://files.example.ir/hf/'), 'https://files.example.ir/hf');
assert.throws(() => OnDevice.normalizeMirror('http://hf-mirror.com'), /https/);
assert.throws(() => OnDevice.normalizeMirror('hf-mirror.com'), /معتبر/);
assert.throws(() => OnDevice.normalizeMirror('https://user:pw@hf-mirror.com'), /نام کاربری/);
assert.throws(() => OnDevice.normalizeMirror('https://hf-mirror.com/?token=1'), /پارامتر/);

// Without the native plugin (browser/PWA) import must fail with a clear message instead of crashing.
OnDevice.importModel('qwen3-0.6b').then(() => { throw new Error('should reject'); }, (e) => assert.match(e.message, /اندروید/));

// Mirror and import are wired through the real plugin boundary.
const calls = [];
global.Capacitor = { isNativePlatform: () => true, Plugins: { SIOnDeviceAI: {
  getStatus: async () => ({ device: { totalRamBytes: 4 * 1024 ** 3, availableRamBytes: 3 * 1024 ** 3, freeBytes: 20 * 1024 ** 3 }, models: [] }),
  generate: async () => ({ text: 'x' }),
  downloadModel: async (a) => { calls.push(['download', a]); return { ok: true }; },
  importModel: async (a) => { calls.push(['import', a]); return { ok: true, verified: true }; },
} } };
(async () => {
  await OnDevice.downloadModel('qwen3-0.6b', { mirror: 'https://hf-mirror.com/' });
  assert.equal(calls[0][1].mirror, 'https://hf-mirror.com');
  await OnDevice.downloadModel('qwen3-0.6b', {});
  assert.equal(calls[1][1].mirror, '');
  await OnDevice.importModel('qwen3-0.6b');
  assert.deepEqual(calls[2], ['import', { modelId: 'qwen3-0.6b' }]);
  await assert.rejects(() => OnDevice.importModel('evil-model'), /فهرست امن/);
  const app = fs.readFileSync(__dirname + '/../www/app.js', 'utf8');
  assert.ok(app.includes("id=\"modelMirror\"") && app.includes("act === 'importDeviceModel'") && app.includes("mirror: store.get('modelMirror'"));
  delete global.Capacitor;
  console.log('iran access (mirror + file import) tests OK');
})().catch((e) => { console.error(e); process.exit(1); });
{
  const fs = require('fs');
  const app = fs.readFileSync(__dirname + '/../www/app.js', 'utf8');
  assert.ok(app.includes("act === 'publishGeo'") && app.includes("bridgePost('/geo'"));
  console.log('geo publish wiring OK');
}
{
  const app = require('fs').readFileSync(__dirname + '/../www/app.js', 'utf8');
  assert.ok(app.includes("act === 'fullSetup'") && app.includes('async function runFullSetup') && app.includes("'/apply', { post_id: it.id") && app.includes('fullSetupCard()'));
  console.log('full setup wizard wiring OK');
}

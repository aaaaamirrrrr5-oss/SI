const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const app = fs.readFileSync(path.join(__dirname, '../www/app.js'), 'utf8');
const llm = fs.readFileSync(path.join(__dirname, '../www/llm.js'), 'utf8');
const native = fs.readFileSync(path.join(__dirname, '../scripts/prepare-android.py'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/build-apk.yml'), 'utf8');
const ondevice = require('../www/ondevice.js');
assert.equal(pkg.version, '1.83.0');
assert.deepEqual(Object.keys(ondevice.models).sort(), ['gemma4-e2b', 'gemma4-e4b', 'qwen3-0.6b']);
assert.equal(ondevice.recommend({ totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 8 * 1024 ** 3 }), 'gemma4-e4b');
assert.equal(ondevice.recommend({ totalRamBytes: 8 * 1024 ** 3, availableRamBytes: 5 * 1024 ** 3 }), 'gemma4-e2b');
assert.equal(ondevice.recommend({ totalRamBytes: 4 * 1024 ** 3, availableRamBytes: 3 * 1024 ** 3 }), 'qwen3-0.6b');
assert.equal(ondevice.recommend({ totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 5 * 1024 ** 3 }), 'gemma4-e2b', 'available RAM must downgrade the recommendation safely');
assert.equal(ondevice.recommend({ totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 8 * 1024 ** 3, lowMemory: true }), null, 'Android low-memory state must block all model suggestions');
assert.equal(ondevice.recommend({ totalRamBytes: 16 * 1024 ** 3 }), null, 'unknown available RAM must not produce a model suggestion');
for (const model of Object.values(ondevice.models).concat([ondevice.embedding])) {
  assert.match(model.sha256, /^[a-f0-9]{64}$/);
  assert.match(model.url, /https:\/\/huggingface\.co\/.+\/resolve\/[a-f0-9]{7,40}\//, 'model URLs must use immutable revisions');
  assert.equal(model.sizeBytes, model.minBytes, 'model integrity uses exact artifact size');
}
assert.match(app, /SI\.OnDeviceAI\.generate\(prompt/);
assert.match(app, /راه‌اندازی کامل هوش مصنوعی قوی روی همین گوشی/);
assert.match(app, /localSetupBusy/);
assert.doesNotMatch(llm, /fetch\s*\(|XMLHttpRequest|https?:\/\//i, 'LLM gateway must not call a model endpoint');
assert.match(llm, /litert-on-device/);
assert.match(native, /com\.google\.ai\.edge\.litertlm:litertlm-android/);
assert.match(native, /Backend\.GPU\(\)/);
assert.match(native, /Backend\.CPU\(\)/);
assert.match(native, /MessageDigest\.getInstance\(\"SHA-256\"\)/);
assert.match(native, /resolve\/28299f30ee4d43294517a4ac93abd6163412f07f/);
assert.doesNotMatch(native, /candidate\?\.close\(\)/, 'failed LiteRT initialize candidates must not be closed');
assert.match(native, /scheduleVerification\(id\)/, 'unverified completed model files must be verified asynchronously');
assert.match(native, /totalRamBytes.*spec\.minRam.*availableRamBytes.*spec\.minAvailableRam/s, 'embedding must check total and available RAM');
for (const model of Object.values(ondevice.models).concat([ondevice.embedding])) {
  assert.ok(native.includes(model.sha256), 'native SHA must match JS model catalog');
  assert.ok(native.includes(String(model.sizeBytes).replace(/\B(?=(\d{3})+(?!\d))/g, '_') + 'L'), 'native artifact size must match JS catalog');
}
console.log('local AI only, auto model selection and one-tap setup tests OK');

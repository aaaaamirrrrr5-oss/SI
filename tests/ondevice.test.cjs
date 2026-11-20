const assert = require('node:assert/strict');
const calls = [];
let currentStatus = {
  ok: true,
  device: { totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 8 * 1024 ** 3, freeBytes: 7 * 1024 ** 3, lowMemory: false },
  models: [
    { modelId: 'gemma4-e4b', installed: false, verified: false },
    { modelId: 'gemma4-e2b', installed: true, verified: true },
    { modelId: 'qwen3-0.6b', installed: true, verified: true },
  ],
  embedding: { modelId: 'embeddinggemma-270m', installed: true, verified: true },
};
global.Capacitor = {
  isNativePlatform: () => true,
  Plugins: {
    SIOnDeviceAI: {
      getStatus: async () => currentStatus,
      downloadModel: async (args) => { calls.push(['downloadModel', args]); return { ok: true, modelId: args.modelId }; },
      loadModel: async (args) => { calls.push(['loadModel', args]); return { ok: true, backend: 'CPU' }; },
      generate: async (args) => { calls.push(['generate', args]); return { ok: true, text: '{"ok":true}', modelId: args.modelId }; },
      embed: async (args) => { calls.push(['embed', args]); return { ok: true, vectors: args.texts.map(() => [0.1, 0.2, 0.3]) }; },
      unloadModel: async () => ({ ok: true }),
      deleteModel: async () => ({ ok: true }),
      cancelDownload: async () => ({ ok: true }),
    },
  },
};
const OnDevice = require('../www/ondevice.js');
(async () => {
  assert.equal(OnDevice.recommend({ totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 8 * 1024 ** 3 }), 'gemma4-e4b');
  assert.equal(OnDevice.recommend({ totalRamBytes: 8 * 1024 ** 3, availableRamBytes: 5 * 1024 ** 3 }), 'gemma4-e2b');
  assert.equal(OnDevice.recommend({ totalRamBytes: 4 * 1024 ** 3, availableRamBytes: 3 * 1024 ** 3 }), 'qwen3-0.6b');
  assert.equal(OnDevice.recommend({ totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 5 * 1024 ** 3 }), 'gemma4-e2b');
  assert.equal(OnDevice.recommend({ totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 8 * 1024 ** 3, lowMemory: true }), null, 'Android low-memory state must block all automatic model suggestions');
  assert.equal(OnDevice.recommend({ totalRamBytes: 16 * 1024 ** 3 }), null, 'unknown available RAM must never be guessed');
  assert.equal(OnDevice.modelFitsDevice('gemma4-e4b', { totalRamBytes: 16 * 1024 ** 3, availableRamBytes: 5 * 1024 ** 3 }), false);
  assert.equal(OnDevice.modelFitsDevice('qwen3-0.6b', { totalRamBytes: 4 * 1024 ** 3, availableRamBytes: 1 * 1024 ** 3 }), false);
  assert.match(OnDevice.models['gemma4-e4b'].sha256, /^[a-f0-9]{64}$/);
  assert.match(OnDevice.models['gemma4-e2b'].url, /resolve\/[a-f0-9]{40}\//);
  assert.equal(OnDevice.models['qwen3-0.6b'].file, 'Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm');
  assert.equal(await OnDevice.chooseModel('auto', currentStatus), 'gemma4-e2b', 'auto must choose the strongest installed model safe for available RAM');
  await OnDevice.downloadModel('auto');
  assert.equal(calls.at(-1)[0], 'downloadModel');
  currentStatus.device.availableRamBytes = 5 * 1024 ** 3;
  await assert.rejects(() => OnDevice.downloadModel('gemma4-e4b', { allowMobileData: false }), /RAM/);
  currentStatus.device.availableRamBytes = 8 * 1024 ** 3;
  assert.equal(calls.at(-1)[1].modelId, 'gemma4-e4b', 'auto-download must download the RAM-recommended model, not silently select a weaker installed model');
  const generated = await OnDevice.generate('Return JSON', { modelId: 'auto', status: currentStatus, maxTokens: 256 });
  assert.equal(generated.modelId, 'gemma4-e2b');
  const unverified = { ...currentStatus, models: currentStatus.models.map((x) => ({ ...x, verified: false })) };
  await assert.rejects(() => OnDevice.generate('Do not run', { modelId: 'gemma4-e2b', status: unverified }), /SHA-256/);
  assert.equal(generated.protocol, 'litert-on-device');
  const vectors = await OnDevice.embed(['hello', 'world'], 'search result');
  assert.equal(vectors.length, 2);
  assert.equal(calls.at(-1)[1].taskType, 'search result');
  currentStatus.device.totalRamBytes = 7 * 1024 ** 3;
  currentStatus.device.availableRamBytes = 5 * 1024 ** 3;
  await assert.rejects(() => OnDevice.loadModel('gemma4-e4b'), /RAM/);
  delete global.Capacitor;
  console.log('on-device model selection, generation and embedding tests OK');
})().catch((error) => { console.error(error); process.exit(1); });

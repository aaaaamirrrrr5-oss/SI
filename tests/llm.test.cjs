const assert = require('node:assert/strict');
const calls = { generate: [], embed: [] };
global.SI = { OnDeviceAI: {
  getStatus: async () => ({ ok: true, loadedModelId: 'gemma4-e4b', embedding: { installed: true } }),
  generate: async (prompt, options) => { calls.generate.push({ prompt, options }); return { text: '{"ok":true}', modelName: 'Gemma 4 E4B' }; },
  embed: async (texts, taskType) => { calls.embed.push({ texts, taskType }); return texts.map((_, i) => i ? [0.9, 0.1] : [1, 0]); },
} };
const LLM = require('../www/llm.js');
(async () => {
  assert.deepEqual(await LLM.health({ provider: 'device-local' }), { ok: true, loadedModelId: 'gemma4-e4b', embedding: { installed: true } });
  const chat = await LLM.chat({ provider: 'device-local', model: 'gemma4-e4b' }, [{ role: 'system', content: 'system' }, { role: 'tool', content: 'tool role becomes user' }], { maxTokens: 800, thinking: true }, async () => { throw new Error('must not call network'); });
  assert.equal(chat.content, '{"ok":true}'); assert.equal(chat.protocol, 'litert-on-device');
  assert.match(calls.generate[0].prompt, /دستور سیستم: system/); assert.match(calls.generate[0].prompt, /کاربر: tool role becomes user/);
  assert.equal(calls.generate[0].options.maxTokens, 800);
  const embeddings = await LLM.embed({ provider: 'device-local' }, ['alpha', 'beta'], async () => { throw new Error('must not call network'); }, 'search result');
  assert.deepEqual(embeddings, [[1, 0], [0.9, 0.1]]); assert.equal(calls.embed[0].taskType, 'search result');
  assert.equal(Math.round(LLM.cosine([1, 0], [1, 0]) * 100), 100); assert.equal(LLM.cosine([1], [1, 2]), null);
  const compared = await LLM.compareSimilarity({ provider: 'device-local' }, 'alpha', [{ id: 1, title: 'one', text: 'alpha' }]);
  assert.equal(compared[0].score, 99); assert.equal(compared[0].method, 'embeddinggemma-cosine-on-device');
  await assert.rejects(() => LLM.chat({ provider: 'legacy-server', base: 'http://127.0.0.1:9999' }, [], {}), /فقط با مدل دانلودشده/);
  await assert.rejects(() => LLM.embed({ provider: 'openai' }, ['x']), /فقط با مدل داخلی/);
  await assert.rejects(() => LLM.health({ provider: 'custom' }), /پشتیبانی نمی‌شود/);
  console.log('on-device-only LLM gateway tests OK');
})().catch((e) => { console.error(e); process.exit(1); });

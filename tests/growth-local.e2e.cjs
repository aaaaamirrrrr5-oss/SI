let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const KEY = 'sik_' + 'a'.repeat(40);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const TEXT = '<h2>معرفی</h2><p>قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد. بسته‌بندی سوپاپ‌دار آن عطر را تا مدت‌ها حفظ می‌کند و برای اسپرسو و قهوه فیلتر مناسب است.</p>';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const posts = {
    1: { id: 1, type: 'product', status: 'publish', title: 'قهوه عربیکا اتیوپی', url: 'https://wp.test/p1', revision: 'r1', seo_title: 'قدیمی', meta_description: '', focus_keyword: '', excerpt: 'قهوه عربیکا', content: TEXT, product: {} },
    2: { id: 2, type: 'product', status: 'publish', title: 'فرنچ پرس', url: 'https://wp.test/p2', revision: 'r2', seo_title: 'فرنچ پرس شیشه‌ای | فروشگاه نمونه', meta_description: 'فرنچ پرس شیشه‌ای را با ارسال سریع از فروشگاه نمونه تهیه کنید؛ مشخصات کامل در صفحه آمده است.', focus_keyword: 'فرنچ پرس', excerpt: 'فرنچ پرس', content: TEXT, product: {} }
  };
  const row = (x) => ({ id: x.id, type: x.type, status: x.status, title: x.title, url: x.url, revision: x.revision, seoTitle: x.seo_title, metaTitle: x.seo_title, metaDescription: x.meta_description, focusKeyword: x.focus_keyword, excerpt: x.excerpt, contentPreview: x.content.replace(/<[^>]+>/g, ' ').trim(), issues: [] });
  const calls = { save: [], rollback: [] };
  const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const u = new URL(r.request().url()); if (!u.pathname.startsWith('/wp-json/si/v1/')) return r.fulfill({ status: 404, headers: CORS, body: 'nf' });
    const ep = u.pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true, content_agent_auto: true, autopilot: true }, agent_remaining: 50, autopilot_remaining: 50 });
    if (ep === 'agent/types') return json(r, { items: [] });
    if (ep === 'agent/media') return json(r, { items: [], total: 0, hasMore: false });
    if (ep === 'agent/changes') return json(r, { items: [], remaining: 50 });
    if (ep === 'content') return json(r, { items: Object.values(posts).map(row), total: 2, hasMore: false, site: { name: 'فروشگاه نمونه' } });
    if (ep === 'agent/item') return json(r, posts[u.searchParams.get('id')]);
    if (ep === 'agent/save') { calls.save.push(post); const x = posts[post.post_id]; if (String(post.expected_revision) !== x.revision) return json(r, { message: 'محتوا تغییر کرده' }, 409); Object.assign(x, post.fields); x.revision += 's'; return json(r, { ok: true, applied: Object.keys(post.fields), change_id: 's' + calls.save.length, revision: x.revision }); }
    if (ep === 'agent/rollback') { calls.rollback.push(post); return json(r, { ok: true }); }
    return json(r, { message: 'nf' }, 404);
  });
  p.on('dialog', (d) => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  // fake on-device model: 1st answer violates the quality gate (guarantee claim), 2nd is clean -> exercises the repair retry
  await p.evaluate((k) => {
    const A = window.__SI_APP; let n = 0; window.__prompts = [];
    A.S.ai = Object.assign({}, A.S.ai, { provider: 'device-local', model: 'auto' });
    A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true, content_agent_auto: true, autopilot: true, agent_remaining: 50 } };
    A.S.growthCampaign = { enabled: true, mode: 'auto_metadata', keywords: [], target_urls: [], max_pages: 100, engine: 'android-on-device' };
    SI.OnDeviceAI.getStatus = async () => ({ models: [{ modelId: 'gemma', installed: true, verified: true }] });
    SI.OnDeviceAI.generate = async (prompt) => { window.__prompts.push(prompt); n++; return { modelName: 'fake', text: n === 1 ? JSON.stringify({ seo_title: 'ضمانت رتبه یک گوگل برای قهوه عربیکا اتیوپی', meta_description: 'بهترین قیمت قهوه عربیکا با ضمانت صفحه اول گوگل و ۱۰۰٪ رضایت برای شما عزیزان', reason: 'x', confidence: 0.9 }) : '```json\n' + JSON.stringify({ seo_title: 'قهوه عربیکا اتیوپی | رست متوسط و عطر میوه‌ای', meta_description: 'قهوه عربیکا اتیوپی با رست متوسط، عطر میوه‌ای و طعم شیرین؛ بسته‌بندی سوپاپ‌دار مناسب اسپرسو و قهوه فیلتر.', reason: 'متای خالی', confidence: 0.86 }) + '\n```' }; };
    A.render(true);
  }, KEY);
  const report = await p.evaluate(() => window.__SI_APP.runDeviceGrowthCycle(false));
  assert.ok(report && report.status === 'applied', 'cycle applied');
  assert.strictEqual(calls.save.length, 1, 'exactly one save');
  assert.strictEqual(calls.save[0].post_id, 1, 'empty-meta product chosen first');
  assert.ok(/^قهوه عربیکا اتیوپی \|/.test(calls.save[0].fields.seo_title), 'second (clean) attempt was saved, not the guarantee claim');
  const prompts = await p.evaluate(() => window.__prompts); assert.strictEqual(prompts.length, 2, 'one repair retry');
  assert.ok(prompts[1].includes('خروجی قبلی رد شد') && prompts[1].includes('تضمین'), 'repair hint lists the problems');
  assert.ok(prompts[0].includes('مشکل‌های تشخیص‌داده‌شده'), 'diagnosed reasons are passed to the model');
  await p.evaluate(() => { const A = window.__SI_APP; A.S.tab = 'growth'; A.render(true); });
  const text = await p.evaluate(() => document.body.innerText);
  assert.ok(text.includes('وضعیت چرخهٔ محلی'), 'status panel rendered');
  assert.ok(/امروز\s*۱\s*از\s*۳/.test(text), 'daily usage shown: ' + (text.match(/امروز[^\n]{0,20}/) || [''])[0]);
  assert.ok(text.includes('قبل و بعد') && text.includes('بدون مبنای مقایسه'), 'before/after shown; no GSC baseline was captured so impact says so');
  // gate blocks an immediate automatic rerun but not a manual one
  const blocked = await p.evaluate(async () => { try { await window.__SI_APP.runDeviceGrowthCycle(true); return 'ran'; } catch (e) { return e.message; } });
  assert.ok(/فاصلهٔ حداقلی/.test(blocked), 'automatic rerun blocked by pacing: ' + blocked);
  // rollback button restores through the bridge and marks the entry
  await p.evaluate(() => { document.querySelector('[data-act=rollbackLocalGrowth]').click(); });
  await p.waitForFunction(() => /بازگردانده شد/.test(document.body.innerText), null, { timeout: 8000 });
  assert.strictEqual(calls.rollback.length, 1); assert.strictEqual(calls.rollback[0].change_id, 's1');
  assert.strictEqual(errs.length, 0, 'no page errors: ' + errs.join(' | '));
  await b.close(); console.log('local growth autopilot e2e OK');
})().catch((e) => { console.error(e); process.exit(1); });

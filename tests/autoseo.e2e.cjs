let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const KEY = 'sik_' + 'a'.repeat(40);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const TEXT = '<h2>معرفی</h2><p>قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد. بسته‌بندی سوپاپ‌دار آن عطر را تا مدت‌ها حفظ می‌کند و برای اسپرسو و قهوه فیلتر مناسب است.</p>';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // stateful fake WordPress
  const posts = {
    1: { id: 1, type: 'product', status: 'publish', title: 'قهوه عربیکا اتیوپی', url: 'https://wp.test/p1', revision: 'r1', seo_title: '', meta_description: '', focus_keyword: '', excerpt: 'قهوه عربیکا اتیوپی با رست متوسط آماده دم‌آوری است و عطر میوه‌ای و طعم شیرین دارد و برای اسپرسو مناسب است.', content: TEXT, product: {} },
    2: { id: 2, type: 'product', status: 'publish', title: 'فرنچ پرس شیشه‌ای', url: 'https://wp.test/p2', revision: 'r2', seo_title: 'فرنچ پرس شیشه‌ای | فروشگاه نمونه', meta_description: 'فرنچ پرس شیشه‌ای را با ضمانت اصالت و ارسال سریع از فروشگاه نمونه تهیه کنید؛ مشخصات کامل در صفحه آمده است.', focus_keyword: 'فرنچ پرس', excerpt: '', content: '', product: {} },
  };
  const row = (x) => ({ id: x.id, type: x.type, status: x.status, title: x.title, url: x.url, revision: x.revision, metaTitle: x.seo_title, metaDescription: x.meta_description, focusKeyword: x.focus_keyword, excerpt: x.excerpt, contentPreview: x.content.replace(/<[^>]+>/g, ' ').trim(), issues: x.meta_description ? [] : ['no_meta_description'], schemaSupported: false });
  const calls = { autopilot: [], save: [] }; let autopilotLeft = 50, agentLeft = 50;
  const json = (r, o, s) => r.fulfill({ status: s || 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(o) });
  await p.route('https://wp.test/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const u = new URL(r.request().url()); if (!u.pathname.startsWith('/wp-json/si/v1/')) return r.fulfill({ status: 404, headers: CORS, body: 'nf' });
    const ep = u.pathname.replace('/wp-json/si/v1/', ''); const post = r.request().method() === 'POST' ? JSON.parse(r.request().postData() || '{}') : null;
    if (ep === 'ping') return json(r, { ok: true, capabilities: { read_content: true, content_agent: true, content_agent_auto: true, autopilot: true, builder_content: true }, agent_remaining: agentLeft, autopilot_remaining: autopilotLeft });
    if (ep === 'content') return json(r, { items: Object.values(posts).map(row), total: 2, hasMore: false, site: { name: 'فروشگاه نمونه' } });
    if (ep === 'agent/item') return json(r, posts[u.searchParams.get('id')]);
    if (ep === 'autopilot/apply') { calls.autopilot.push(post); const x = posts[post.post_id]; Object.assign(x, { seo_title: post.changes.seo_title != null ? post.changes.seo_title : x.seo_title, meta_description: post.changes.meta_description != null ? post.changes.meta_description : x.meta_description }); x.revision += 'a'; autopilotLeft--; return json(r, { ok: true, applied: post.changes, change_id: 'c' + calls.autopilot.length, autopilot_remaining: autopilotLeft }); }
    if (ep === 'agent/save') { calls.save.push(post); const x = posts[post.post_id]; if (String(post.expected_revision) !== x.revision) return json(r, { message: 'محتوا تغییر کرده' }, 409); Object.assign(x, post.fields); x.revision += 's'; agentLeft--; return json(r, { ok: true, applied: Object.keys(post.fields), change_id: 's' + calls.save.length, revision: x.revision }); }
    return json(r, { message: 'nf' }, 404);
  });
  p.on('dialog', (d) => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.evaluate((k) => { const A = window.__SI_APP; A.S.bridge = { url: 'https://wp.test', key: k, capabilities: { content_agent: true, content_agent_auto: true, autopilot: true, autopilot_remaining: 50, agent_remaining: 50 } }; A.render(true); }, KEY);
  await p.click('#dock [data-t=chat]');

  // 1) direct command from the assistant runs the whole pipeline
  await p.fill('#chatIn', 'سئو را همین الان خودکار اجرا کن'); await p.press('#chatIn', 'Enter');
  await p.waitForFunction(() => window.__SI_APP.S.chat.some((m) => m.role === 'assistant' && /گزارش اجرای کامل سئو/.test(m.content)), null, { timeout: 20000 });
  const report = await p.evaluate(() => window.__SI_APP.S.chat.filter((m) => /گزارش اجرای کامل سئو/.test(m.content)).pop().content);
  assert.strictEqual(calls.autopilot.length, 1, 'step 1 rebuilt title/meta via the safe autopilot endpoint');
  assert.ok(calls.autopilot[0].changes.meta_description, 'meta description filled from the product text');
  const s1 = calls.save.filter((c) => c.post_id === 1); assert.strictEqual(s1.length, 1, 'step 2 filled the remaining SEO fields');
  assert.strictEqual(s1[0].mode, 'automatic'); assert.ok(s1[0].fields.focus_keyword, 'focus keyword filled');
  assert.ok(!('content' in s1[0].fields) && !('title' in s1[0].fields), 'unattended run never rewrites body text or title');
  // محصول بدون متن: متن فقط از نام و مشخصات ثبت‌شده ساخته می‌شود (و در گزارش اعلام می‌شود)؛ هیچ ادعای ساختگی، املای خراب یا اسم ناقص نمی‌آید.
  { const s2 = calls.save.filter((c) => c.post_id === 2); assert.strictEqual(s2.length, 1, 'empty-text product gets a name-based text exactly once');
    const body = String((s2[0].fields || {}).content || '').replace(/<[^>]+>/g, ' ');
    assert.ok(body.length > 400, 'a real body was written');
    assert.ok(!/ًً/.test(body), 'no doubled tanvin (معمولاًً)');
    assert.ok(/فرنچ پرس/.test(body) && !/فرنچ(?!\s?پرس)/.test(body), 'two-word product type is never truncated to «فرنچ»');
    assert.ok(!/گارانتی|ضمانت اصالت|ارسال رایگان|تخفیف|بهترین|تضمین|\d+\s*(?:٪|%|درصد)/.test(body), 'no invented price/warranty/superlative claims');
    assert.ok(/متن ساخته‌شده/.test(report), 'report says the text was built from the name'); }
  assert.ok(/امن‌قابل‌ترمیم نبود|امن/.test(report) && /محصولات و مقالات/.test(report), 'report states what was skipped');
  assert.ok(await p.evaluate(() => !!window.__SI_APP.S.autoSeo && window.__SI_APP.S.autoSeo.repair.applied === 2), 'both products were repaired (product 2 from its name)');

  // 2) status question is answered from the real run
  await p.fill('#chatIn', 'وضعیت سئو خودکار چیست؟'); await p.press('#chatIn', 'Enter');
  await p.waitForFunction(() => /آخرین اجرا/.test(window.__SI_APP.S.chat[window.__SI_APP.S.chat.length - 1].content), null, { timeout: 8000 });

  // 3) repair command from chat scans and never fabricates text for a product without facts
  const before = calls.save.length;
  await p.fill('#chatIn', 'محصولات را خودکار ترمیم کن'); await p.press('#chatIn', 'Enter');
  await p.waitForFunction(() => window.__SI_APP.S.chat.some((m) => m.role === 'assistant' && /نتیجهٔ ترمیم خودکار|ترمیم اجرا نشد/.test(m.content)), null, { timeout: 20000 });
  // دستور چت هم همان قاعده را دارد: چیزی که بنویسد فقط متن مبتنی بر نام است، بدون ادعای ساختگی؛ و هرگز عنوان/متن محصولِ دارای متن را بازنویسی نمی‌کند.
  for (const c of calls.save.slice(before)) { const body = String((c.fields || {}).content || '').replace(/<[^>]+>/g, ' ');
    assert.ok(c.post_id === 2 || !('content' in (c.fields || {})), 'no body rewrite for a product that already has text');
    assert.ok(!/ًً|گارانتی|ضمانت اصالت|ارسال رایگان|بهترین|تضمین/.test(body), 'chat repair writes no invented claims'); }
  await p.fill('#chatIn', 'وضعیت محصولات چیست؟'); await p.press('#chatIn', 'Enter');
  await p.waitForFunction(() => /نیاز به ترمیم دارد/.test(window.__SI_APP.S.chat[window.__SI_APP.S.chat.length - 1].content), null, { timeout: 8000 });
  assert.deepStrictEqual(errs, []); console.log('auto SEO + assistant actions e2e OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

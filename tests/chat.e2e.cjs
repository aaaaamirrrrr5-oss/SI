// چت v1.71: Markdown امن، مبنای پاسخ، پیش‌نویس ماندگار، Shift+Enter، بازتولید، ویرایش، خروجی، توقف نرم مدل، بدون بازتولید دستور اجرایی.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('playwright missing, skipped'); process.exit(0); }
const assert = require('assert'); const path = require('path');
const GB = 1024 ** 3;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.addInitScript(() => {
    const st = { device: { totalRamBytes: 8 * 1024 ** 3, availableRamBytes: 5 * 1024 ** 3, freeBytes: 30 * 1024 ** 3, lowMemory: false, deviceModel: 'Test' }, models: [{ modelId: 'gemma4-e2b', installed: true, verified: true }], embedding: { installed: false } };
    window.__gen = { n: 0, slow: false };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { SIOnDeviceAI: { getStatus: async () => st, loadModel: async () => ({}),
      generate: async () => { window.__gen.n++; if (window.__gen.slow) await new Promise((r) => setTimeout(r, 1500)); return { text: '## نتیجه\nپاسخ **مدل** شمارهٔ ' + window.__gen.n + '\n\n1. اول\n2. دوم\n\n| الف | ب |\n|---|---|\n| ۱ | ۲ |\n\nhttps://developers.google.com/search' }; } } } };
  });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.click('#dock [data-t=chat]'); await p.waitForSelector('#chatIn');
  const S = (fn) => p.evaluate(fn);
  assert.ok(await p.$('textarea#chatIn'), 'composer is a textarea');

  // پیش‌نویس با رندر مجدد از بین نمی‌رود؛ Shift+Enter خط جدید می‌سازد و ارسال نمی‌کند
  await p.fill('#chatIn', 'خط اول'); await p.press('#chatIn', 'Shift+Enter'); await p.keyboard.type('خط دوم');
  assert.strictEqual(await S(() => window.__SI_APP.S.chat.length), 0, 'shift+enter does not send');
  await S(() => window.__SI_APP.render(true));
  assert.strictEqual(await p.inputValue('#chatIn'), 'خط اول\nخط دوم', 'draft survives re-render');

  // ارسال با Enter؛ Markdown واقعی (تیتر، فهرست، جدول، لینک) و مبنای پاسخ
  await p.press('#chatIn', 'Enter'); await p.waitForSelector('.msg.assistant:not(.typing) .md-tbl', { timeout: 10000 });
  assert.strictEqual(await p.inputValue('#chatIn'), '', 'draft cleared after send');
  assert.ok(await p.$('.msg.assistant ol.md-list li') && await p.$('.msg.assistant h4.md-h') && await p.$('.msg.assistant a[rel~=noopener][href^="https://developers.google.com"]'), 'markdown rendered');
  const src = await p.textContent('.msrc'); assert.ok(src.includes('مدل زبانی روی گوشی') && src.includes('ممیز عدد'), 'source panel');
  assert.ok(!(await p.textContent('.msg.assistant')).includes('&lt;') && !(await p.textContent('.msg.assistant')).includes('<small>'), 'no escaped small tag');

  // بازتولید: جفت پیام جایگزین می‌شود، نه تکرار
  assert.strictEqual(await S(() => window.__SI_APP.S.chat.length), 2);
  await p.click('[data-act=chatRegen]'); await p.waitForFunction(() => window.__gen.n === 2 && !window.__SI_APP.S.busy, null, { timeout: 10000 });
  assert.strictEqual(await S(() => window.__SI_APP.S.chat.length), 2, 'regenerate replaces, not appends');
  assert.ok((await S(() => window.__SI_APP.S.chat[1].content)).includes('شمارهٔ 2'), 'new answer');

  // ویرایش: متن به کادر می‌رود
  await p.click('[data-act=chatEdit]'); assert.strictEqual(await p.inputValue('#chatIn'), 'خط اول\nخط دوم');
  await S(() => { window.__SI_APP.S.chatDraft = ''; window.__SI_APP.render(true); });

  // خروجی گفتگو
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await p.click('[data-act=exportChat]'); await p.waitForTimeout(150);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => '')); if (clip) assert.ok(clip.includes('**دستیار**') && clip.includes('خط اول'), 'transcript copied');

  // توقف نرم: پاسخ دیررسیده دور ریخته می‌شود و دکمهٔ تلاش دوباره ظاهر می‌شود
  await S(() => { window.__gen.slow = true; });
  await p.fill('#chatIn', 'یک پرسش کند'); await p.press('#chatIn', 'Enter');
  await p.waitForSelector('[data-act=chatStop]', { timeout: 5000 }); await p.click('[data-act=chatStop]');
  await p.waitForTimeout(1800);
  const after = await S(() => { const c = window.__SI_APP.S.chat; return { n: c.length, last: c[c.length - 1], busy: window.__SI_APP.S.busy }; });
  assert.ok(after.last.stopped && !after.busy, 'stopped message is last; late answer discarded');
  assert.ok(await p.$('[data-act=chatRegen]'), 'retry offered after stop');
  await S(() => { window.__gen.slow = false; });

  // دستور اجرایی هرگز بازتولید نمی‌شود
  await p.fill('#chatIn', 'سئو را خودکار اجرا کن'); await p.press('#chatIn', 'Enter'); await p.waitForFunction(() => !window.__SI_APP.S.busy, null, { timeout: 8000 });
  assert.ok(await S(() => window.__SI_APP.S.chat.slice(-2)[0].act), 'action flagged'); assert.ok(!(await p.$('[data-act=chatRegen]')), 'no regenerate for site actions');


  // ===== v1.72 =====
  // مراحل پیشرفت + زمان‌سنج هنگام پاسخ کند
  await S(() => { window.__gen.slow = true; });
  await p.fill('#chatIn', 'پرسش با مرحله'); await p.press('#chatIn', 'Enter');
  await p.waitForSelector('#chatPhase', { timeout: 5000 });
  const ph = await p.textContent('.phase'); assert.ok(ph.includes('ثانیه') && /مدل|شواهد/.test(ph), 'phase + elapsed shown: ' + ph);
  await p.waitForFunction(() => !window.__SI_APP.S.busy, null, { timeout: 8000 }); assert.ok(!(await p.$('.phase')), 'phase row removed after answer');
  await S(() => { window.__gen.slow = false; });

  // پالت دستور: «/» همهٔ دستورها را نشان می‌دهد؛ انتخاب، متن را در کادر می‌گذارد و ارسال نمی‌کند
  const before = await S(() => window.__SI_APP.S.chat.length);
  await p.fill('#chatIn', '/'); await p.waitForSelector('#chatSug:not([hidden]) .sug', { timeout: 3000 });
  assert.strictEqual((await p.$$('#chatSug .sug')).length, 5, 'five suggestions');
  await p.fill('#chatIn', 'غلط املایی'); await p.waitForSelector('#chatSug .sug');
  const lbl = await p.textContent('#chatSug .sug'); assert.ok(lbl.includes('اصلاح کن') && lbl.includes('نیاز به افزونه'), 'unready command flagged: ' + lbl);
  await p.click('#chatSug .sug'); assert.strictEqual(await p.inputValue('#chatIn'), 'غلط‌های املایی متن‌ها را اصلاح کن');
  assert.strictEqual(await S(() => window.__SI_APP.S.chat.length), before, 'picking a suggestion does not send');
  assert.ok(await p.$('#chatSug[hidden]'), 'box closes after exact match'); await p.fill('#chatIn', ''); await S(() => { window.__SI_APP.S.chatDraft = ''; });

  // پاسخ بلند قدیمی جمع می‌شود؛ آخرین پاسخ هرگز
  await S(() => { const A = window.__SI_APP; A.S.chat.push({ role: 'user', content: 'بلند', at: Date.now() }, { role: 'assistant', content: 'پاراگراف '.repeat(400), at: Date.now() }, { role: 'user', content: 'بعدی', at: Date.now() }, { role: 'assistant', content: 'کوتاه', at: Date.now() }); A.render(true); });
  assert.strictEqual((await p.$$('.msg.collapsed')).length, 1, 'older long answer collapsed');
  await p.click('[data-act=chatMore]'); assert.strictEqual((await p.$$('.msg.collapsed')).length, 0, 'expand'); assert.ok(await p.textContent('[data-act=chatMore]').then((x) => x.includes('جمع')));
  await p.click('[data-act=chatMore]');

  // پرش به آخرین پیام وقتی بالای صفحه‌ایم
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250);
  assert.ok(await p.$('#chatJump:not([hidden])'), 'jump button visible when scrolled up');

  // تاریخچه: «گفتگوی جدید» ذخیره می‌کند، نه پاک
  const firstTitle = await S(() => window.__SI_APP.S.chat.find((m) => m.role === 'user').content.split('\n')[0]);
  await p.click('[data-act=clearChat]'); await p.waitForFunction(() => window.__SI_APP.S.chat.length === 0);
  assert.strictEqual(await S(() => window.__SI_APP.S.chatSessions.length), 1, 'archived'); assert.ok(await p.$('.chat-empty'), 'fresh empty state');
  await p.fill('#chatIn', 'سلام دوباره'); await p.press('#chatIn', 'Enter'); await p.waitForFunction(() => window.__SI_APP.S.chat.length === 2 && !window.__SI_APP.S.busy, null, { timeout: 8000 });
  await p.click('[data-act=chatHist]'); await p.waitForSelector('.sess-open');
  assert.ok((await p.textContent('.sess-open')).includes(firstTitle.slice(0, 10)), 'history lists the archived chat');
  await p.click('.sess-open'); await p.waitForFunction(() => window.__SI_APP.S.chat.length > 4);
  assert.ok(await S(() => window.__SI_APP.S.chat.some((m) => m.content === 'بلند')), 'restored conversation');
  const ids = await S(() => window.__SI_APP.S.chatSessions.map((x) => x.id)); assert.strictEqual(ids.length, 2, 'previous chat archived on switch');
  await p.click('[data-act=chatHist]'); await p.waitForSelector('[data-act=chatDel]'); await p.click('[data-act=chatDel]');
  assert.strictEqual(await S(() => window.__SI_APP.S.chatSessions.length), 1, 'delete from history (confirm auto-accepted)');
  // ماندگاری بین بارگذاری‌ها
  await p.reload(); await p.click('#dock [data-t=chat]'); await p.waitForSelector('#chatIn');
  assert.ok((await S(() => JSON.parse(localStorage.getItem('si_chatSessions') || '[]').length)) === 1 && (await S(() => window.__SI_APP.S.chat.length)) > 4, 'persisted across reload');

  // ذخیره بلافاصله پس از ارسال و سقف تاریخچه
  assert.ok((await S(() => JSON.parse(localStorage.getItem('si_chat') || '[]').length)) >= 4, 'persisted');
  assert.deepStrictEqual(errs, [], 'page errors'); await b.close(); console.log('chat e2e OK');
})().catch((e) => { console.error(e); process.exit(1); });

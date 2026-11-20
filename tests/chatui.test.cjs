'use strict';
const assert = require('assert');
const C = require('../www/chatui.js');
const R = (s, o) => C.renderMarkdown(s, o);

// 1) امنیت: HTML خام و scheme خطرناک هرگز فعال نمی‌شود
{
  const h = R('<img src=x onerror=alert(1)> <script>alert(1)</script> [x](javascript:alert(1)) [y](data:text/html,hi)');
  assert.ok(!/<img|<script/i.test(h), 'raw tags escaped'); assert.ok(!/href="javascript|href="data/i.test(h), 'no unsafe href');
  assert.ok(h.includes('&lt;script&gt;'));
  const l = R('[ok](https://example.com/a?x=1&y=2)');
  assert.ok(l.includes('href="https://example.com/a?x=1&amp;y=2"') && l.includes('rel="noopener noreferrer"') && l.includes('target="_blank"'));
  assert.ok(!R('https://a.com/x" onmouseover="alert(1)').includes('onmouseover="'), 'quote cannot break out of href');
}
// 2) بلوک‌ها
{
  const h = R('## تیتر\nمتن **پررنگ** و _کج_ و `code`\n\n1. اول\n2. دوم\n- الف\n- ب\n\n> نقل\n\n---');
  assert.ok(h.includes('<h4 class="md-h">تیتر</h4>') && h.includes('<b>پررنگ</b>') && h.includes('<i>کج</i>') && h.includes('<code>code</code>'));
  assert.ok(h.includes('<ol class="md-list"><li>اول</li><li>دوم</li></ol>') && h.includes('<ul class="md-list"><li>الف</li><li>ب</li></ul>'));
  assert.ok(h.includes('<blockquote>نقل</blockquote>') && h.includes('<hr>'));
  assert.ok(R('۱. یک\n۲. دو').includes('<ol'), 'persian digits list');
}
// 3) جدول
{
  const h = R('| الف | ب |\n|---|---|\n| ۱ | ۲ |\n| ۳ |');
  assert.ok(h.includes('<th>الف</th>') && h.includes('<td>۱</td>') && h.includes('<td></td>'), 'short row padded');
  assert.strictEqual((h.match(/<tr>/g) || []).length, 3);
}
// 4) کد: قالب‌بندی داخل کد اعمال نمی‌شود و callback کار می‌کند
{
  const got = []; const h = R('پیش\n```\nUser-agent: *\n**x** _y_\n```\nپس', { code: (s) => { got.push(s); return '[CODE' + (got.length - 1) + ']'; } });
  assert.deepStrictEqual(got, ['User-agent: *\n**x** _y_']); assert.ok(h.includes('[CODE0]'));
  assert.ok(R('`**a**`').includes('<code>**a**</code>'));
}
// 5) <small> مجاز است ولی فقط همان؛ لینک خام نقطهٔ پایانی را نمی‌بلعد
{
  const h = R('پاسخ\n\n<small>مدل: x</small> <b>no</b>');
  assert.ok(h.includes('<small>مدل: x</small>') && h.includes('&lt;b&gt;no&lt;/b&gt;'));
  const u = R('منبع https://developers.google.com/a/b.'); assert.ok(u.includes('>https://developers.google.com/a/b</a>.'));
  assert.ok(R('snake_case_word و a*b*c').indexOf('<i>') < 0, 'no false italics');
}
// 6) plainText / freshness
{
  assert.strictEqual(C.plainText('**سلام** <small>x</small>'), 'سلام');
  const now = Date.UTC(2026, 10, 18); assert.strictEqual(C.freshness(null, now), null);
  assert.deepStrictEqual(C.freshness({ at: now - 20 * 86400000 }, now), { days: 20, stale: true, label: '۲۰ روز پیش' });
  assert.strictEqual(C.freshness({ at: now - 3600000 }, now).label, 'امروز'); assert.strictEqual(C.freshness({ at: now }, now).stale, false);
}
// 7) مبنای پاسخ
{
  const now = Date.UTC(2026, 10, 18);
  const s = C.makeSource({ mode: 'model', modelName: 'Gemma', evidence: [{ title: 'T', url: 'https://a.com/p', sourceType: 'site', verified: true }, { title: 'bad', url: 'javascript:1' }], badNumbers: ['777'], report: { at: now - 30 * 86400000 }, ctx: ['بازرسی سایت'], now });
  assert.strictEqual(s.evidence[1].url, '', 'non-http url dropped');
  const h = C.renderSource(s);
  assert.ok(h.includes('msrc warn') && h.includes('نیاز به دقت') && h.includes('777') && h.includes('قدیمی است') && h.includes('Gemma'));
  assert.ok(!/javascript:/i.test(h));
  const ok = C.renderSource(C.makeSource({ mode: 'model', report: { at: now }, now })); assert.ok(!ok.includes('warn') && ok.includes('همهٔ عددهای مهم'));
  const rules = C.renderSource(C.makeSource({ mode: 'rules', note: 'حالت سبک خودکار' })); assert.ok(rules.includes('حالت سبک خودکار') && !rules.includes('ممیز عدد') && rules.includes('پاسخ عمومی'));
  assert.strictEqual(C.renderSource(null), '');
  assert.ok(C.renderSource(C.makeSource({ mode: 'research', sourcesCount: 7 })).includes('۷'));
  assert.ok(C.renderSource(C.makeSource({ evidence: [{ title: '<img onerror=1>' }] })).indexOf('<img') < 0, 'escaped');
}
// 8) تاریخچه، خروجی، ورودی
{
  const chat = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'm' + i })).concat([null, { role: 'user', content: 5 }]);
  const t = C.trimHistory(chat, 60); assert.strictEqual(t.length, 60); assert.strictEqual(t[59].content, 'm79');
  const tr = C.transcript([{ role: 'user', content: 'سلام', at: 0 }, { role: 'assistant', content: 'پاسخ **مهم**<small>x</small>', src: { mode: 'rules' } }], { site: 'a.com', now: 0 });
  assert.ok(tr.includes('a.com') && tr.includes('**شما**') && tr.includes('پاسخ مهم') && tr.includes('موتور قاعده‌محور') && !tr.includes('<small>'));
  assert.strictEqual(C.clampInput('  a\u0000b  '), 'ab'); assert.strictEqual([...C.clampInput('ب'.repeat(5000))].length, C.MAX_INPUT);
}
// 9) بازتولید فقط برای پاسخ نهایی غیر دستوری
{
  const c = [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }];
  assert.ok(C.canRegenerate(c, 1)); assert.ok(!C.canRegenerate(c, 0));
  assert.ok(!C.canRegenerate([{ role: 'user', content: 'سئو را اجرا کن', act: 'autoseo' }, { role: 'assistant', content: 'a' }], 1), 'never re-run site actions');
  assert.ok(!C.canRegenerate([{ role: 'assistant', content: 'a' }], 0));
  assert.ok(!C.canRegenerate(c.concat([{ role: 'user', content: 'x' }]), 1), 'only last');
}
// 10) timeout
(async () => {
  await assert.rejects(C.withTimeout(new Promise(() => {}), 20, 'T'), /T/);
  assert.strictEqual(await C.withTimeout(Promise.resolve(5), 50), 5);
  console.log('chatui tests OK');
})().catch((e) => { console.error(e); process.exit(1); });

// ===== v1.72: پالت دستور، نشست‌ها، جمع‌کردن، زمان‌سنج =====
(() => {
  const SI = require('../www/engine.js'); require('../www/brain.js')(SI); const R2 = require('../www/research.js');
  const B = SI.Brain; const bad = [];
  // هر دستور کاتالوگ باید واقعاً توسط دستیار فهمیده شود (اجرا، پژوهش یا یک intent شناخته‌شده)، نه «نمی‌فهمم»
  C.COMMANDS.forEach((c) => { const ok = B.actionIntent(c.t, {}) || R2.isRequest(c.t) || B.classify(B.norm(c.t)); if (!ok) bad.push(c.t); });
  assert.deepStrictEqual(bad, [], 'commands without a handler: ' + bad.join(' | '));
  assert.strictEqual(new Set(C.COMMANDS.map((c) => c.t)).size, C.COMMANDS.length, 'unique commands');

  // suggest
  assert.deepStrictEqual(C.suggest('', {}), [], 'empty → none'); assert.deepStrictEqual(C.suggest('ا', {}), [], 'one char → none');
  assert.strictEqual(C.suggest('/', {}).length, 5); assert.ok(C.suggest('/', {}, 50).length === C.COMMANDS.length);
  let s = C.suggest('ربات', {}); assert.ok(s.some((x) => x.t.includes('رباتان AI')) && s.every((x) => x.need === 'نیاز به بازرسی'), 'needs flagged without report');
  s = C.suggest('ربات', { report: {} }); assert.ok(s.every((x) => x.ready && !x.need), 'ready with report');
  assert.ok(C.suggest('غلط املایی', { bridge: {} }).some((x) => x.g === 'اجرا' && x.ready));
  assert.ok(C.suggest('غلط املایی', {}).find((x) => x.g === 'اجرا').need === 'نیاز به افزونه');
  assert.ok(!C.suggest('گزارش کلی بده', {}).some((x) => x.t === 'گزارش کلی بده'), 'exact match not re-suggested');
  assert.deepStrictEqual(C.suggest('خط\nدوم', {}), [], 'multiline → none');
  s = C.suggest('سئو', { recent: ['سئوی محصولات من چطور است', 'ربات'] }); assert.ok(s.some((x) => x.recent && x.g === 'اخیر'), 'recent included');
  assert.ok(C.suggest('ي', {}).length === 0); assert.ok(C.suggest('غلط‌های', {}).length > 0, 'ZWNJ-insensitive'); assert.ok(C.suggest('كلمه', {}).length === 0);
  assert.ok(C.suggest('۷ روزه', {}).some((x) => x.t.includes('برنامهٔ اقدام')), 'persian digits normalised');

  // نشست‌ها
  const now = Date.UTC(2026, 10, 18, 10, 0, 0);
  const chat = [{ role: 'user', content: 'سلام **این** یک پرسش خیلی طولانی است که باید در عنوان بریده شود تا از حد مجاز بیشتر نشود', at: 1 }, { role: 'assistant', content: 'پاسخ', chips: ['x'], src: { mode: 'rules' }, at: 2 }];
  assert.ok(C.hasContent(chat) && !C.hasContent([{ role: 'assistant', content: 'x' }]) && !C.hasContent([]));
  assert.ok(C.titleOf(chat).endsWith('…') && [...C.titleOf(chat)].length === 48 && !C.titleOf(chat).includes('**'));
  assert.strictEqual(C.titleOf([]), 'گفتگوی بدون عنوان');
  let ss = C.upsertSession([], 'a', chat, now);
  assert.strictEqual(ss.length, 1); assert.strictEqual(ss[0].n, 2); assert.ok(!('chips' in ss[0].msgs[1]) && ss[0].msgs[1].src.mode === 'rules', 'chips dropped, src kept');
  assert.deepStrictEqual(C.upsertSession(ss, 'b', [{ role: 'assistant', content: 'فقط خودکار' }], now).map((x) => x.id), ['a'], 'no user message → not saved');
  ss = C.upsertSession(ss, 'b', [{ role: 'user', content: 'دوم' }], now + 1000); assert.deepStrictEqual(ss.map((x) => x.id), ['b', 'a'], 'newest first');
  ss = C.upsertSession(ss, 'a', chat.concat([{ role: 'user', content: 'ادامه' }]), now + 5000); assert.deepStrictEqual(ss.map((x) => x.id), ['a', 'b']); assert.strictEqual(ss[0].n, 3); assert.strictEqual(ss[0].at, now, 'creation time kept');
  let many = []; for (let i = 0; i < 25; i++) many = C.upsertSession(many, 'id' + i, [{ role: 'user', content: 'q' + i }], now + i); assert.strictEqual(many.length, C.MAX_SESSIONS); assert.strictEqual(many[0].id, 'id24');
  const big = Array.from({ length: 100 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(20000) })); const bs = C.upsertSession([], 'big', big, now)[0]; assert.strictEqual(bs.msgs.length, 40); assert.strictEqual(bs.msgs[0].content.length, 8000);
  assert.deepStrictEqual(C.removeSession(ss, 'a').map((x) => x.id), ['b']);
  assert.ok(/^s[a-z0-9]+$/.test(C.newSessionId(now)) && C.newSessionId(now) !== C.newSessionId(now));
  assert.strictEqual(C.sessionLabel({ updated: now, n: 3 }, now), 'امروز · ۳ پیام'); assert.strictEqual(C.sessionLabel({ updated: now - 2 * 86400000, n: 1 }, now), '۲ روز پیش · ۱ پیام');

  // جمع‌کردن و زمان‌سنج
  assert.ok(!C.shouldCollapse('کوتاه')); assert.ok(C.shouldCollapse('ب'.repeat(1300))); assert.ok(C.shouldCollapse(Array(30).fill('خط').join('\n')));
  assert.ok(!C.shouldCollapse('<small>' + 'x'.repeat(1500) + '</small>'), 'small footers do not count');
  assert.strictEqual(C.elapsedLabel(0), '۰ ثانیه'); assert.strictEqual(C.elapsedLabel(59999), '۵۹ ثانیه'); assert.strictEqual(C.elapsedLabel(125000), '۲ دقیقه و ۵ ثانیه'); assert.strictEqual(C.elapsedLabel(-5), '۰ ثانیه');
  console.log('chatui v1.72 tests OK');
})();

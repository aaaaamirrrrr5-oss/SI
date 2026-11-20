const assert = require('assert'); const fs = require('fs');
const SI = require('../www/engine.js'); require('../www/brain.js')(SI); const B = SI.Brain;
const en = (t) => String(t).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); // the assistant prints Persian digits
const ans = (q, c) => { const o = B.answer(q, c, {}); return { text: en(o.text), chips: o.chips }; };

// 1) direct commands are detected; questions and the approval-based "autofix" flow are not hijacked
const cmd = [
  ['سئو را همین الان خودکار اجرا کن', 'autoseo'], ['سئوی سایت را درست کن', 'autoseo'], ['بازسازی سئو را انجام بده', 'autoseo'],
  ['میشه سئو رو خودکار اجرا کنی؟', 'autoseo'], ['محصولات را خودکار ترمیم کن', 'repair'], ['لطفا ترمیم کن', 'repair'], ['محصولات را بررسی کن', 'scan'],
];
cmd.forEach(([q, want]) => assert.strictEqual(B.actionIntent(q), want, q));
['سئو چیست؟', 'چطور سئو را اصلاح کنم؟', 'اصلاحات خودکار سایت', 'اصلاح خودکار', 'خودت اصلاح کن', 'robots.txt بساز', 'گزارش کلی بده', 'برنامهٔ اقدام بده', 'ترمیم محصولات را برگردان', 'عنوان و متای پیشنهادی بده', ''].forEach((q) => assert.strictEqual(B.actionIntent(q), null, q));

// 2) existing intents keep working
assert.strictEqual(B.classify(B.norm('اصلاحات خودکار سایت')), 'autofix');
assert.strictEqual(B.classify(B.norm('برنامهٔ اقدام بده')), 'plan');
assert.strictEqual(B.classify(B.norm('robots.txt بساز')), 'robots');

// 3) status / next-step answers come from real data and never invent numbers
const base = { bridgeConnected: true };
let r = B.answer('وضعیت محصولات چیست؟', base, {});
assert(/هنوز محصولات/.test(r.text) && r.chips.some((c) => /بررسی/.test(c)), 'asks for a scan first');
r = B.answer('وضعیت محصولات چیست؟', { bridgeConnected: false }, {});
assert(/Bridge/.test(r.text));
const repair = { total: 40, flagged: 12, noSeo: 7, noContent: 3, thin: 2, wrong: 1, avgScore: 71, at: Date.now() };
r = ans('وضعیت محصولات چیست؟', Object.assign({}, base, { repair }));
assert(/12/.test(r.text) && /40/.test(r.text) && r.chips.some((c) => /خودکار ترمیم/.test(c)));
assert.strictEqual(B.actionIntent(r.chips.find((c) => /خودکار ترمیم/.test(c))), 'repair', 'chips are runnable commands');
r = B.answer('وضعیت محصولات چیست؟', Object.assign({}, base, { repair: Object.assign({}, repair, { flagged: 0 }) }), {});
assert(/✅/.test(r.text));

const rebuild = { ready: true, enabled: false, intervalHours: 24, last: null };
r = B.answer('وضعیت سئو خودکار چیست؟', Object.assign({}, base, { rebuild }), {});
assert(/خاموش/.test(r.text) && /هنوز اجرای کامل/.test(r.text));
assert.strictEqual(B.actionIntent(r.chips[0]), 'autoseo');
r = ans('وضعیت سئو خودکار چیست؟', Object.assign({}, base, { rebuild: Object.assign({}, rebuild, { enabled: true }), autoSeo: { at: Date.now() - 3600e3, rebuild: { applied: 5, scanned: 30, scoreBefore: 60, scoreAfter: 85 }, repair: { applied: 4, skipped: 2, failed: 0 } } }));
assert(/روشن/.test(r.text) && /5 صفحه/.test(r.text) && /4 مورد/.test(r.text));

r = ans('قدم بعدی چیست؟', Object.assign({}, base, { repair, rebuild }));
assert(/12/.test(r.text) && r.chips.length >= 1);
r = B.answer('قدم بعدی چیست؟', { bridgeConnected: false }, {});
assert(/رادار/.test(r.text), 'no report -> start with scan');

// 4) app wiring (static): runnable from chat, panel, scheduler; the unattended run never rewrites body text
const app = fs.readFileSync(__dirname + '/../www/app.js', 'utf8');
['runAutoSeo', 'autoSeoRun', 'runChatAction', 'brainExtras', 'repairAuto', 'seoOnly'].forEach((k) => assert(app.includes(k), k));
assert(/runAutoSeo\(\{ manual: false \}\)/.test(app), 'scheduler runs the full pipeline');
assert(/repairAutoOne\(d\.id, \{ seoOnly: true, polishOnly: isCover, write: wantWrite \}\)/.test(app), 'full run never rebuilds body text through the product-repair path (seoOnly), writing is capped');

// 5) v1.32: smart-text features in the assistant (toggles, dry-run, status) — never hijack questions or negations
[['پیوند داخلی را خاموش کن', 'toggle:links:off'], ['ساخت خودکار متن را روشن کن', 'toggle:write:on'], ['پرسش های متداول را غیرفعال کن', 'toggle:faq:off'], ['پیوند داخلی را فعال کن', 'toggle:links:on'], ['اصلاح خودکار متن را خاموش کن', 'toggle:polish:off'], ['پیش‌نمایش اصلاح متن را بده', 'polishdry'], ['گزارش کیفیت متن بده', 'polishdry'], ['غلط‌های املایی متن‌ها را اصلاح کن', 'polish']]
  .forEach(([q, want]) => assert.strictEqual(B.actionIntent(q), want, q));
['پیوند داخلی چیست؟', 'چطور پیوند داخلی را خاموش کنم؟', 'پیوند داخلی را خاموش نکن', 'پیوند داخلی را خاموش نکنی'].forEach((q) => assert.strictEqual(B.actionIntent(q), null, q));
const smart = { polish: true, write: false, faq: true, links: true, last: null };
r = ans('قابلیت‌های هوشمند متن چیست؟', { bridgeConnected: true, smart });
assert(/ساخت خودکار متن/.test(r.text) && /خاموش/.test(r.text) && /پیوند داخلی/.test(r.text));
r = ans('آخرین اصلاح متن چه بود؟', { bridgeConnected: true, smart });
assert(/هنوز بررسی کامل/.test(r.text) && r.chips.some((c) => B.actionIntent(c) === 'polishdry'));
r = ans('آخرین اصلاح متن چه بود؟', { bridgeConnected: true, smart: Object.assign({}, smart, { lastText: '12 مورد ی/ک', last: { at: Date.now() - 600e3, dry: false, total: 50, scanned: 50, changed: 12, clean: 36, rejected: 2, failed: 0, links: 3, faq: 4, remaining: 1 } }) });
assert(/50/.test(r.text) && /12/.test(r.text) && /36/.test(r.text) && /ردشده/.test(r.text) && /پیوند داخلی: 3/.test(r.text));
r = ans('آخرین اصلاح متن چه بود؟', { bridgeConnected: false, smart });
assert(/Bridge/.test(r.text));
r = ans('وضعیت سئو خودکار چیست؟', { bridgeConnected: true, rebuild: { ready: true, enabled: true, intervalHours: 24 }, smart });
assert(/ساخت متن: خاموش/.test(r.text));
r = ans('قدم بعدی چیست؟', { bridgeConnected: true, rebuild: Object.assign({}, rebuild, { enabled: true }), autoSeo: { at: Date.now() }, smart, report: { scores: { seo: 90 }, pages: [] } });
assert(/پیش‌نمایش اصلاح متن/.test(r.text), 'suggests a dry run when text was never checked');
['برنامهٔ اقدام بده', 'دستیار چه کارهایی بلد است؟'].forEach((q) => assert.notStrictEqual(B.classify(B.norm(q)), 'features', q));
// stop requests still win over a toggle-looking sentence about the scheduler
assert.strictEqual(B.actionIntent('زمان‌بندی سئو را خاموش کن'), null);
['toggle:', 'polishdry', 'smart:'].forEach((k) => assert(fs.readFileSync(__dirname + '/../www/app.js', 'utf8').includes(k), 'app wiring ' + k));

// 6) v1.33: change-log awareness in chat
[['آخرین تغییر را برگردان', 'undolast'], ['همه تغییرات امروز را برگردان', 'undotoday'], ['صفحه تغییرات را باز کن', 'openlog'], ['لاگ تغییرات را نشان بده', 'openlog']].forEach(([q, want]) => assert.strictEqual(B.actionIntent(q), want, q));
['همه تغییرات را برگردان', 'چطور تغییر را برگردانم؟', 'تغییرات امروز چی بود؟', 'آخرین ترمیم را برگردان'].forEach((q) => assert.strictEqual(B.actionIntent(q), null, q));
r = ans('چه تغییری روی سایت دادی؟', { bridgeConnected: true, changes: { total: 5, applied: 4, today: 2, rolled: 1, pages: 3, last: [{ title: 'آسیاب قهوه', at: Date.now() - 3600e3, label: 'اصلاح متن', state: 'applied' }] } });
assert(/5/.test(r.text) && /آسیاب قهوه/.test(r.text) && r.chips.some((c) => B.actionIntent(c) === 'openlog') && r.chips.some((c) => B.actionIntent(c) === 'undolast'), 'real numbers + runnable chips');
r = ans('تغییرات امروز', { bridgeConnected: true, changes: { total: 0 } }); assert(/هیچ تغییری/.test(r.text));
['openlog', 'undolast', 'undotoday', 'chUndo(pick)'].forEach((k) => assert(fs.readFileSync(__dirname + '/../www/app.js', 'utf8').includes(k), 'app wiring ' + k));

// 7) v1.34: quality evaluation in chat
[['ارزیابی کیفیت متن‌ها را انجام بده', 'polishdry'], ['متن ها را ارزیابی کن', 'polishdry']].forEach(([q, want]) => assert.strictEqual(B.actionIntent(q), want, q));
assert.strictEqual(B.actionIntent('امتیاز کیفیت متن‌ها چقدر است؟'), null);
r = ans('امتیاز کیفیت متن‌ها چقدر است؟', { bridgeConnected: true });
assert(/هنوز ارزیابی/.test(r.text) && r.chips.some((c) => B.actionIntent(c) === 'polishdry'), 'no data yet -> offers a runnable evaluation');
r = ans('امتیاز کیفیت متن‌ها چقدر است؟', { bridgeConnected: true, quality: { at: Date.now() - 60e3, n: 40, before: 61, after: 74, prev: 58, weak: [{ label: 'عمق و حجم متن', pct: 52 }], worst: [{ title: 'آسیاب قهوه', score: 41, note: 'متن خالی' }], grades: { great: 3, good: 20, mid: 12, bad: 5 } } });
assert(/74/.test(r.text) && /61/.test(r.text) && /عمق و حجم متن/.test(r.text) && /آسیاب قهوه/.test(r.text) && /\+16/.test(r.text), r.text);
r = ans('قدم بعدی چیست؟', { bridgeConnected: true, rebuild: Object.assign({}, rebuild, { enabled: true }), autoSeo: { at: Date.now() }, quality: { at: Date.now(), n: 10, before: 50, after: 52 }, report: { scores: { seo: 90 }, pages: [] } });
assert(/52/.test(r.text) && /کیفیت/.test(r.text), 'next step mentions a low quality score');
console.log('assistant actions + auto SEO tests OK');

// ---------- v1.30: negations never execute, short "yes" confirms the offered action, Finglish, did-you-mean ----------
{
  // a negated or stop request must NOT run a write action (used to run it: "اجرا نکن" matched the verb "کن")
  ['سئو را خودکار اجرا نکن', 'لطفا محصولات را ترمیم نکن', 'نمی‌خوام سئو اجرا بشه', 'اجرای خودکار سئو را متوقف کن', 'سئوی خودکار رو خاموش کن', 'بازسازی رو لغو کن', 'دست نزن به سئو', 'seo ro ejra nakon'].forEach((q) => {
    assert.strictEqual(B.actionIntent(q), null, 'must not execute: ' + q);
    assert.strictEqual(B.stopIntent(q), 'stop', 'recognised as a stop request: ' + q);
    const o = B.answer(q, { bridgeConnected: true }, {}); assert(/چیزی اجرا نمی‌کنم/.test(o.text), 'safe reply: ' + q);
  });
  // status questions that merely contain those words are still questions
  ['وضعیت سئو خودکار خاموش است؟', 'آیا بازسازی متوقف شده؟', 'چرا سئو خودکار غیرفعال است؟'].forEach((q) => assert.strictEqual(B.stopIntent(q), null, q));
  // Finglish commands
  assert.strictEqual(B.actionIntent('seo ro khodkar ejra kon'), 'autoseo'); assert.strictEqual(B.actionIntent('mahsoolat ra tarmim kon'), 'repair');
  assert.strictEqual(B.actionIntent('mahsoolat ro barresi kon'), 'scan');
  assert.strictEqual(B.classify(B.norm(B.finglish('gozaresh koli bede'))), 'summary');
  assert.strictEqual(B.finglish('robots.txt بساز'), 'robots.txt بساز', 'mixed text is left alone');
  // pending action: the assistant offers a runnable chip -> a short yes runs it, a no declines, anything else does not
  const ctx0 = { bridgeConnected: true, repair: { total: 40, flagged: 12, noSeo: 7, noContent: 3, thin: 2, wrong: 1, avgScore: 71, at: Date.now() }, rebuild: { ready: true, enabled: false, intervalHours: 24, last: null } };
  const o1 = B.answer('قدم بعدی چیست؟', ctx0, {}); assert.strictEqual(o1.state.pending.act, 'repair');
  ['آره', 'باشه', 'بله انجامش بده', 'ok', 'are bezan', 'حتما', 'لطفا انجام بده'].forEach((q) => assert.strictEqual(B.actionIntent(q, o1.state), 'repair', q));
  ['آره', 'باشه'].forEach((q) => assert.strictEqual(B.actionIntent(q), null, 'no pending action -> a bare yes does nothing: ' + q));
  assert.strictEqual(B.actionIntent('آره ولی اول بگو چه چیزی عوض می‌شود', o1.state), null, 'long reply is not a confirmation');
  assert.strictEqual(B.actionIntent('باشه نکن', o1.state), null);
  const dec = B.answer('نه ممنون', ctx0, o1.state); assert(/چیزی اجرا نمی‌کنم/.test(dec.text)); assert.strictEqual(dec.state.pending, null);
  assert.strictEqual(B.actionIntent('باشه', dec.state), null, 'declined offer is forgotten');
  const stale = Object.assign({}, o1.state, { pending: { act: 'repair', at: Date.now() - 16 * 60000 } }); assert.strictEqual(B.actionIntent('آره', stale), null, 'offer expires after 15 minutes');
  const o2 = B.answer('GEO چیست؟', ctx0, o1.state); assert.strictEqual(o2.state.pending, null, 'an unrelated answer clears the offer');
  // did-you-mean instead of a generic fallback
  const f = B.answer('سایتم رباتای هوش مصنوعی رو ببینه', { report: null }, {}); assert(/دقیق متوجه نشدم/.test(f.text) || f.chips.length);
  const dm = B.didYouMean(B.norm('وضعیت محصولات ناقص چند تاست')); assert(dm.includes('وضعیت محصولات چیست؟'), JSON.stringify(dm));
  assert.deepStrictEqual(B.didYouMean(B.norm('بلبلبل')), [], 'nonsense gets no guess');
  Object.keys({ summary: 1, plan: 1, seo: 1, aibots: 1, robots: 1, llms: 1, schema: 1, titles: 1, traffic: 1, trend: 1, wp: 1, repairstatus: 1, autoseo: 1, next: 1 }).forEach((id) => {
    const chip = Object.values({ summary: 'گزارش کلی بده', plan: 'برنامهٔ اقدام بده', seo: 'مشکلات سئو چیست؟', aibots: 'رباتان AI من را می‌بینند؟', robots: 'robots.txt بساز', llms: 'llms.txt بساز', schema: 'اسکیما بساز', titles: 'عنوان و متای پیشنهادی بده', traffic: 'ترافیک من چطور است؟', trend: 'روند ترافیک من چطور است؟', wp: 'وضعیت وردپرس چطور است؟', repairstatus: 'وضعیت محصولات چیست؟', autoseo: 'وضعیت سئو خودکار چیست؟', next: 'قدم بعدی چیست؟' })[Object.keys({ summary: 1, plan: 1, seo: 1, aibots: 1, robots: 1, llms: 1, schema: 1, titles: 1, traffic: 1, trend: 1, wp: 1, repairstatus: 1, autoseo: 1, next: 1 }).indexOf(id)];
    assert.strictEqual(B.classify(B.norm(chip)), id, 'canonical suggestion maps back to its intent: ' + chip);
  });
  // app wiring
  const app2 = fs.readFileSync(__dirname + '/../www/app.js', 'utf8');
  assert(/actionIntent\(text, S\.brain\)/.test(app2), 'chat passes conversation state so "yes" can confirm'); assert(/pending: null/.test(app2), 'running an action clears the pending offer');
  console.log('assistant v1.30 tests OK');
}

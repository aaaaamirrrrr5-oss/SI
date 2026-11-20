const assert = require('node:assert/strict');
const T = require('../www/techaudit.js'), K = require('../www/campaign.js'), P = require('../www/contentplan.js');
const S = 'https://s.ir';
const fill = (n, s) => { const W = 'دانه عطر طعم فنجان دستگاه آسیاب فشار دما آب زمان کیفیت تازه مزرعه شکلات بادام'.split(' '); let x = s * 7919 + 13, o = []; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; o.push(W[(x >>> 12) % W.length]); } return o.join(' '); };
const pg = (path, title, lead, n, extra) => T.extractPage({ url: S + path, status: 200, html: '<html lang="fa"><head><title>' + title + '</title>' + (extra || '') + '</head><body><h1>' + title + '</h1><p>' + lead + ' ' + fill(n, path.length) + '</p></body></html>' });
const prod = '<script type="application/ld+json">{"@type":"Product","name":"x"}</script>';
const pages = [pg('/', 'فروشگاه قهوه', 'قهوه تازه', 90), pg('/product/a', 'قهوه اسپرسو', 'قهوه اسپرسو تازه', 120, prod), pg('/product/b', 'قهوه ترک', 'قهوه ترک نرم', 120, prod), pg('/blog/x', 'آموزش دم کردن قهوه اسپرسو', 'آموزش دم کردن قهوه اسپرسو', 160)];

assert.throws(() => K.applyContentPlan(K.create({ origin: S })));
const p = K.create({ origin: S });
K.setProfile(p, pages, { goal: 'فروش', audience: 'x', region: 'y', competitors: ['z'], seeds: ['خرید آسیاب دستی قهوه', 'راهنمای قهوه فرانسه', 'مقایسه موکاپات'] });
K.applyKeymap(p, pages);
assert.ok(p.keymap.gaps.length >= 2);
K.applyContentPlan(p, { perWeek: 2, start: '2026-11-15', max: 5 });
const b = p.contentplan.briefs; assert.ok(b.length >= 2 && b.length <= 5);
assert.ok(b.every((x) => x.id.startsWith('plan:') && x.title && x.date && x.outline.length >= 4 && x.faq.length === 3 && x.minWords > 0));
assert.equal(new Set(b.map((x) => x.id)).size, b.length);
assert.ok(b.every((x, i) => i === 0 || x.date > b[i - 1].date), 'dates strictly increase');
const wd = b.map((x) => new Date(x.date + 'T00:00:00').getDay()); assert.ok(wd.every((d) => [6, 1].includes(d)), 'perWeek=2 uses Saturday and Monday');
const tr = b.find((x) => x.intent === 'transactional'); assert.ok(tr); assert.equal(tr.type, 'category'); assert.ok(tr.title.startsWith('خرید'));
assert.equal(P.titleFor('مقایسه موکاپات', 'commercial'), 'مقایسه موکاپات'); assert.equal(P.titleFor('قهوه فرانسه', 'informational'), 'راهنمای قهوه فرانسه');
assert.ok(b.some((x) => x.linksOut.length) && b.every((x) => x.linksOut.every((l) => pages.some((q) => q.url === l.url))), 'links only to real pages');
assert.equal(b[0].source, 'seed');
assert.ok(p.tasks.some((t) => t.src === 'plan' && t.phase === 'p4' && t.tier === 'approve'));

/* skeleton never invents facts and is not publish-ready */
const sk = K.draftFor(p, b[0].id, ['برشت از سال ۱۳۹۰ فعال است']);
assert.ok(sk.markdown.startsWith('# ' + b[0].title) && sk.markdown.includes('برشت از سال ۱۳۹۰ فعال است') && sk.placeholders >= 4);
let ck = K.checkDraft(p, b[0].id, sk.markdown); assert.equal(ck.ready, false); assert.ok(ck.problems.some((x) => /جای خالی/.test(x)));
const kw = b[0].keyword, real = fill(b[0].minWords + 40, 3);
const good = '# ' + b[0].title + '\n\n' + kw + ' موضوعی است که در این نوشته توضیح می‌دهیم. ' + real + '\n\n## بخش دوم\n\n' + fill(30, 5);
ck = K.checkDraft(p, b[0].id, good); assert.equal(ck.ready, true, ck.problems.join('|')); assert.equal(ck.placeholders, 0);
assert.equal(K.checkDraft(p, b[0].id, '# عنوان دیگر\n\n' + real).ready, false);
assert.ok(K.checkDraft(p, b[0].id, '# ' + b[0].title + '\n\n' + (kw + ' ').repeat(150)).problems.some((x) => /تکرار/.test(x)));
assert.throws(() => K.draftFor(p, 'plan:nope'));

/* done status survives a re-plan; summary + persistence */
K.setTask(p, b[0].id, 'done'); K.applyContentPlan(p, { perWeek: 2, start: '2026-11-15', max: 5 });
assert.equal(p.tasks.find((t) => t.id === b[0].id).status, 'done');
K.applyAudit(p, pages, { origin: S }); assert.ok(p.tasks.some((t) => t.src === 'plan'), 'audit keeps plan tasks');
assert.equal(K.summary(p).content.briefs, p.contentplan.briefs.length);
assert.equal(K.restore(K.serialize(p)).contentplan.briefs.length, b.length);
assert.equal(P.schedule(3, { perWeek: 1, start: '2026-11-14' }).length, 3);
console.log('contentplan.test.cjs OK');

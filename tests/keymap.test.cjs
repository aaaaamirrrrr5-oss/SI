const assert = require('node:assert/strict');
const T = require('../www/techaudit.js'), M = require('../www/keymap.js'), K = require('../www/campaign.js');
const O = 'https://s.ir';
const filler = (n, s) => { const W = 'دانه عطر طعم فنجان دستگاه آسیاب فشار دما آب زمان کیفیت تازه مزرعه شکلات بادام'.split(' '); let x = s * 7919 + 13, o = []; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; o.push(W[(x >>> 12) % W.length]); } return o.join(' '); };
const mk = (path, title, h1, lead, n, extra) => T.extractPage({ url: O + path, status: 200, html: '<html lang="fa"><head><title>' + title + '</title>' + (extra || '') + '</head><body><h1>' + h1 + '</h1><p>' + lead + ' ' + filler(n, path.length) + '</p></body></html>' });
const prod = '<script type="application/ld+json">{"@type":"Product","name":"x"}</script>';
const pages = [
  mk('/', 'فروشگاه قهوه برشت', 'فروشگاه قهوه برشت', 'قهوه تازه', 90),
  mk('/product/espresso', 'قهوه اسپرسو | برشت', 'قهوه اسپرسو', 'قهوه اسپرسو تازه و خوش‌طعم', 120, prod),
  mk('/blog/how-espresso', 'آموزش دم کردن قهوه اسپرسو', 'آموزش دم کردن قهوه اسپرسو', 'آموزش دم کردن قهوه اسپرسو در خانه', 160),
  mk('/blog/espresso-guide', 'آموزش دم کردن قهوه اسپرسو خانگی', 'آموزش دم کردن قهوه اسپرسو', 'آموزش دم کردن قهوه اسپرسو', 130),
  mk('/blog/best-grinder', 'بهترین آسیاب قهوه', 'بهترین آسیاب قهوه', 'مقایسه بهترین آسیاب قهوه خانگی', 150),
  mk('/cart', 'سبد خرید', 'سبد خرید', 'سبد', 50),
  T.extractPage({ url: O + '/hidden', status: 200, html: '<head><title>مخفی</title><meta name="robots" content="noindex"></head><body><h1>مخفی</h1></body>' }),
];
const km = M.build(pages, { profile: { topTopics: ['قهوه ترک'] }, seeds: ['آسیاب دستی قهوه'] });
const row = (p) => km.pages.find((x) => x.url === O + p);
assert.equal(km.pages.length, 5);                                         // cart + noindex excluded
assert.equal(row('/product/espresso').intent, 'transactional');
assert.equal(row('/blog/how-espresso').intent, 'informational');
assert.equal(row('/blog/best-grinder').intent, 'commercial');
assert.equal(row('/').intent, 'navigational');
assert.match(row('/blog/best-grinder').keyword, /آسیاب/);
assert.match(row('/product/espresso').keyword, /اسپرسو/);
assert.ok(['high', 'medium', 'low'].includes(row('/blog/how-espresso').confidence));
const c = km.conflicts.find((x) => x.others.some((o) => o.url === O + '/blog/espresso-guide') || x.winner === O + '/blog/espresso-guide');
assert.ok(c, 'two how-to pages target the same keyword'); assert.equal(c.action, 'merge_or_differentiate'); assert.equal(c.severity, 'high'); assert.equal(c.pages, 2);
assert.ok(km.gaps.some((g) => g.source === 'profile' && /ترک/.test(g.topic)));
assert.ok(km.gaps.some((g) => g.source === 'seed'));
assert.ok(!km.gaps.some((g) => /اسپرسو/.test(g.topic) && g.source === 'profile'));
assert.equal(km.stats.total, 5); assert.ok(km.stats.byIntent.informational >= 2);

/* owner override is locked and survives rebuild */
const p = K.create({ origin: O }); K.setProfile(p, pages, { goal: 'فروش', audience: 'x', region: 'y', competitors: ['z'], seeds: ['قهوه ترک'] });
M.setKeyword(p, O + '/blog/espresso-guide', 'راهنمای اسپرسو خانگی', 'informational');
K.applyKeymap(p, pages);
const r2 = p.keymap.pages.find((x) => x.url === O + '/blog/espresso-guide');
assert.equal(r2.keyword, 'راهنمای اسپرسو خانگی'); assert.equal(r2.locked, true); assert.equal(r2.confidence, 'high');
assert.equal(p.keymap.conflicts.length, 0, 'override resolves the conflict');
assert.throws(() => M.setKeyword(p, O + '/', '   ')); assert.throws(() => M.setKeyword(p, O + '/', 'قهوه', 'bad'));
assert.ok(p.tasks.filter((t) => t.src === 'keymap').every((t) => t.phase === 'p2' || t.phase === 'p4'));
const gapTask = p.tasks.find((t) => t.code === 'content_gap'); assert.ok(gapTask); K.setTask(p, gapTask.id, 'done');
K.applyKeymap(p, pages); assert.equal(p.tasks.find((t) => t.id === gapTask.id).status, 'done');
assert.equal(M.build([]).stats.total, 0);
console.log('keymap.test.cjs OK');

const assert = require('assert');
const SI = require('../www/engine.js'); const Insight = require('../www/insight.js'); const Refresh = require('../www/refresh.js');
const O = 'https://shop.ir';
const pg = (url, title, h1, links, text, status) => SI.analyzePage(`<html lang="fa"><head><title>${title}</title><meta name="viewport" content="x"></head><body><h1>${h1}</h1>${links.map((l) => `<a href="${l}">x</a>`).join('')}<p>${text}</p></body></html>`, O + url, status || 200);
const long = Array(400).fill('قهوه اسپرسو دستگاه فشار').join(' ');
const pages = [
  pg('/', 'فروشگاه قهوه | شاپ', 'فروشگاه', ['/guide', '/old-2022'], 'قهوه'),
  pg('/guide', 'راهنمای اسپرسو ۱۴۰۱ | شاپ', 'راهنمای اسپرسو ۱۴۰۱', ['/'], 'اسپرسو کم'),
  pg('/old-2022', 'بهترین آسیاب 2022 | شاپ', 'آسیاب', ['/'], long),
  pg('/orphan', 'صفحه یتیم | شاپ', 'یتیم', ['/'], long),
  SI.analyzePage('<html><body>404</body></html>', O + '/gone', 404),
];
const report = SI.buildReport(O + '/', 'shop.ir', pages, SI.analyzeRobots(null), { sitemap: true }, []);
const row = (page, q, clicks, imp, pos) => ({ keys: [q, O + page], clicks, impressions: imp, position: pos });
const base = [row('/guide', 'اسپرسو', 100, 2000, 5)];
const cur = [row('/guide', 'اسپرسو چیست', 20, 1500, 9), row('/guide', 'اسپرسو', 10, 500, 9), row('/old-2022', 'آسیاب قهوه', 5, 400, 12)];

// stale years
const now = new Date('2026-11-13T00:00:00Z');
assert.deepStrictEqual(Refresh.staleYears('بهترین آسیاب 2022', now), ['2022']);
assert.deepStrictEqual(Refresh.staleYears('راهنمای ۱۴۰۱', now), ['1401']);
assert.deepStrictEqual(Refresh.staleYears('راهنما 2026', now), [], 'current year is not stale');
assert.deepStrictEqual(Refresh.staleYears('مدل 3000 و 12345', now), [], 'no false positives');

const r = Refresh.plan(report, { gscRows: cur, baseRows: base, now });
assert.ok(r.ready && r.hasSearchData);
assert.ok(r.items.every((i) => i.path !== '/gone' && i.path !== '/'), 'dead pages and home are not planned');
const g = r.items.find((i) => i.path === '/guide');
assert.ok(g, 'guide planned');
const codes = g.reasons.map((x) => x.code);
['decay', 'thin', 'stale', 'striking', 'faq'].forEach((c) => assert.ok(codes.includes(c), 'guide has ' + c + ': ' + codes));
assert.strictEqual(r.items[0].path, '/guide', 'the decaying thin page ranks first');
assert.ok(g.score <= 100 && g.score >= 55 && g.priority === 'high');
assert.ok(g.targetQueries.some((q) => q.query === 'اسپرسو چیست'));
assert.ok(/اسپرسو چیست/.test(g.brief) && /عدد، آمار یا ادعای تضمینی/.test(g.brief), 'brief carries real queries and honesty rules');
assert.ok(!/undefined|NaN/.test(g.brief + JSON.stringify(g.actions)));
const o = r.items.find((i) => i.path === '/orphan'); assert.ok(o && o.reasons.some((x) => x.code === 'orphan'), 'orphan flagged');
for (let i = 1; i < r.items.length; i++) assert.ok(r.items[i - 1].score >= r.items[i].score, 'sorted by score');

// works without Search Console
const r2 = Refresh.plan(report, { now });
assert.ok(r2.ready && !r2.hasSearchData && /Search Console/.test(r2.note));
assert.ok(!r2.items.some((i) => i.reasons.some((x) => x.code === 'decay' || x.code === 'striking')));
// empty / defensive
assert.ok(!Refresh.plan({ pages: [] }, {}).ready);
assert.ok(!Refresh.plan(null, {}).ready);
assert.doesNotThrow(() => Refresh.plan(report, { gscRows: [null, {}, { keys: [] }], baseRows: 'x' }));
assert.ok(/برنامهٔ تازه‌سازی/.test(Refresh.toMarkdown(r)) && /تضمین نمی‌کند/.test(Refresh.toMarkdown(r)));
assert.strictEqual(Refresh.toMarkdown({ ready: false }), '');
console.log('content refresh planner tests OK');

// snooze + agent prefill + wiring
const key = '/guide';
const rs = Refresh.plan(report, { gscRows: cur, baseRows: base, now, done: { [key]: now.getTime() - 5 * 86400000 } });
assert.ok(!rs.items.some((i) => i.path === key) && rs.snoozed === 1, 'recently refreshed page is snoozed');
const rs2 = Refresh.plan(report, { gscRows: cur, baseRows: base, now, done: { [key]: now.getTime() - 40 * 86400000 } });
assert.ok(rs2.items.some((i) => i.path === key) && rs2.snoozed === 0, 'snooze expires after 30 days');
const gi = r.items.find((i) => i.path === '/guide');
const pf = Refresh.agentPrefill(gi, [{ id: 7, type: 'post', title: 'راهنمای اسپرسو', url: O + '/guide' }, { id: 8, type: 'post', title: 'x', url: O + '/other' }]);
assert.ok(pf.matched && pf.target_id === '7' && pf.action === 'update' && pf.keyword === 'اسپرسو چیست' && /ممنوع/.test(pf.instructions));
const pf2 = Refresh.agentPrefill(gi, [{ id: 9, type: 'post', title: 'y', url: O + '/nope' }]);
assert.ok(!pf2.matched && pf2.target_id === '', 'never guesses a target');
assert.strictEqual(Refresh.agentPrefill(null, []), null);
const fs = require('fs'); const app = fs.readFileSync(__dirname + '/../www/app.js', 'utf8');
['refreshPanel(r)', "act === 'sendRefreshToAgent'", "act === 'markRefreshDone'", "act === 'copyRefreshBrief'"].forEach((x) => assert.ok(app.includes(x), 'app wiring: ' + x));
const hand = app.slice(app.indexOf("act === 'sendRefreshToAgent'"), app.indexOf("act === 'sendRefreshToAgent'") + 400);
assert.ok(/S\.tab = 'chat'/.test(hand) && !/S\.tab = 'growth'/.test(hand), 'agent form lives in the assistant (chat) tab');
assert.ok(fs.readFileSync(__dirname + '/../www/index.html', 'utf8').includes('refresh.js') && fs.readFileSync(__dirname + '/../www/sw.js', 'utf8').includes("'refresh.js'"));
console.log('refresh handoff + snooze tests OK');

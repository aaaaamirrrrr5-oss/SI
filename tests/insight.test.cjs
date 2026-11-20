const assert = require('assert');
const SI = require('../www/engine.js');
const Insight = require('../www/insight.js');

const body = (t) => ('<p>' + t + '</p>').repeat(40);
const html = (title, h1, links, text, extra) => `<!doctype html><html lang="fa"><head><title>${title}</title><meta name="viewport" content="width=device-width"><meta name="description" content="توضیح ${title}">${extra || ''}</head><body><h1>${h1}</h1>${links.map((l) => `<a href="${l}">لینک</a>`).join('')}${body(text)}</body></html>`;
const O = 'https://shop.ir';
const pages = [
  SI.analyzePage(html('فروشگاه قهوه | شاپ', 'فروشگاه قهوه', ['/', '/espresso/', '/grinder', '/gone', 'https://other.com/x', '/a-nofollow" rel="nofollow'], 'قهوه اسپرسو دانه آسیاب قهوه تازه'), O + '/', 200),
  SI.analyzePage(html('اسپرسو چیست | شاپ', 'اسپرسو چیست', ['/'], 'اسپرسو قهوه دم‌آوری آسیاب آسیاب قهوه فشار اسپرسو'), O + '/espresso/', 200),
  SI.analyzePage(html('آسیاب قهوه | شاپ', 'آسیاب قهوه برقی', ['/'], 'آسیاب برقی تیغه قهوه'), O + '/grinder', 200),
  SI.analyzePage(html('آسیاب قهوه | شاپ', 'آسیاب دستی', ['/espresso'], 'آسیاب دستی'), O + '/hand-grinder', 200),
  SI.analyzePage('<html><body>404</body></html>', O + '/gone', 404),
  SI.analyzePage(html('درباره ما', 'درباره', ['/'], 'ما یک فروشگاه هستیم', '<link rel="canonical" href="https://shop.ir/other-page">'), O + '/about', 200),
  SI.analyzePage(html('پنهان', 'پنهان', ['/'], 'x', '<meta name="robots" content="noindex">') + '<img src="http://cdn.old.com/a.png">', O + '/hidden', 200),
];
// engine facts
const f0 = pages[0].facts;
assert.deepStrictEqual(f0.links.sort(), ['/', '/espresso', '/gone', '/grinder'].sort(), 'internal links normalised, external/nofollow dropped');
assert.strictEqual(f0.h1Text, 'فروشگاه قهوه'); assert.ok(f0.terms.includes('قهوه'));
assert.strictEqual(pages[6].facts.mixed, 1); assert.strictEqual(pages[5].facts.canonicalUrl, 'https://shop.ir/other-page');

const report = SI.buildReport(O + '/', 'shop.ir', pages, SI.analyzeRobots(null), { sitemap: true, llms: false }, []);
const S = Insight.analyzeStructure(report);
assert.ok(S.ready && !S.partial);
assert.ok(S.orphans.some((u) => u.endsWith('/about')) && S.orphans.some((u) => u.endsWith('/hand-grinder')), 'about and hand-grinder have no inbound links');
assert.ok(!S.orphans.some((u) => u.endsWith('/grinder') || u.endsWith('/espresso')));
assert.ok(!S.orphans.some((u) => u.endsWith('/hidden')), 'noindex pages are not reported as orphans');
assert.strictEqual(S.broken.length, 1); assert.strictEqual(S.broken[0].status, 404);
assert.strictEqual(S.duplicates.title.length, 1); assert.strictEqual(S.duplicates.title[0].urls.length, 2);
assert.ok(S.mixed.length === 1 && S.canonicalElsewhere.length === 1 && S.canonicalElsewhere[0].targetScanned === false);
assert.ok(S.score < 100 && S.score >= 0);
assert.ok(S.hubs[0].url.endsWith('/'), 'home has most inlinks');
assert.ok(S.maxDepth >= 1);
// link suggestions only for real pages, never for already-linked pairs
S.suggestions.forEach((s) => { assert.notStrictEqual(s.from, s.to); const src = pages.find((p) => p.url === s.from); assert.ok(!src.facts.links.includes(Insight.pathOf(s.to))); });
assert.ok(S.suggestions.some((s) => s.to.endsWith('/grinder')), 'espresso page talks about the grinder but does not link to it');
// old reports without link data degrade gracefully
const old = JSON.parse(JSON.stringify(report)); old.pages.forEach((p) => { delete p.facts.links; });
const So = Insight.analyzeStructure(old); assert.ok(So.ready && So.partial && So.orphans.length === 0 && /بازرسی جدید/.test(So.note));
assert.strictEqual(Insight.analyzeStructure({ pages: [] }).ready, false);

// Search Console
const rows = [
  { keys: ['آسیاب قهوه', O + '/grinder'], clicks: 20, impressions: 400, position: 6.1 },
  { keys: [O + '/hand-grinder', 'آسیاب قهوه'], clicks: 8, impressions: 300, position: 8.4 },
  { keys: ['قهوه ترک', O + '/'], clicks: 50, impressions: 100, position: 2 },
  { keys: ['قهوه ترک', O + '/espresso'], clicks: 0, impressions: 10, position: 30 },
  { keys: ['دوره باریستا', O + '/about'], clicks: 1, impressions: 500, position: 24 },
  { keys: ['خرید دانه قهوه عربیکا', O + '/'], clicks: 2, impressions: 220, position: 14 },
];
const C = Insight.cannibalization(rows);
assert.ok(C.ready && C.items.length === 1 && C.items[0].query === 'آسیاب قهوه' && C.items[0].severity === 'high');
assert.ok(C.items[0].primary.endsWith('/grinder'), 'most clicks wins');
assert.ok(!Insight.cannibalization(rows.map((r) => ({ keys: [r.keys.find((k) => !k.startsWith('http'))], clicks: r.clicks, impressions: r.impressions, position: r.position }))).ready, 'query-only rows cannot show cannibalization');
const G = Insight.contentGaps(rows, report);
assert.ok(G.items.some((g) => g.query === 'دوره باریستا'));
assert.ok(G.items.find((g) => g.query === 'خرید دانه قهوه عربیکا').intent === 'خرید');
assert.ok(!G.items.some((g) => g.query === 'قهوه ترک'), 'ranking well: not a gap');
assert.ok(!G.items.some((g) => g.query === 'آسیاب قهوه'), 'covered by existing titles');
assert.strictEqual(Insight.intentOf('آموزش دم کردن').intent, 'آموزشی');
const P = Insight.priorityPages(report, rows);
assert.ok(P.ready && P.usesSearchDemand); assert.ok(Insight.priorityPages(report, []).usesSearchDemand === false);

const ins = Insight.buildInsights(report, rows);
assert.ok(ins.siteIQ >= 0 && ins.siteIQ <= 100 && ins.actions.length >= 4);
assert.ok(ins.actions.every((a) => a.affected > 0 && a.fix));
assert.ok(ins.actions.findIndex((a) => a.code === 'st_broken_links') < ins.actions.findIndex((a) => a.code === 'st_gap' ));
const md = Insight.toMarkdown(ins, 'shop.ir'); assert.ok(md.includes('# گزارش ساختار سایت') && md.includes('تضمین نمی'));
// no data at all must not throw
assert.doesNotThrow(() => Insight.buildInsights({ pages: [], scores: { seo: 90, ai: 80 } }, null));
console.log('site insight (structure, links, cannibalization, gaps) tests OK');

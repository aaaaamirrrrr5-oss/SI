const assert = require('assert');
const SI = require('../www/engine.js'); const Insight = require('../www/insight.js'); const Pro = require('../www/pro.js');
const O = 'https://shop.ir';
const pg = (url, title, h1, links, text, status) => SI.analyzePage(`<html lang="fa"><head><title>${title}</title><meta name="viewport" content="x"></head><body><h1>${h1}</h1>${links.map((l) => `<a href="${l}">x</a>`).join('')}${('<p>' + text + '</p>').repeat(40)}</body></html>`, O + url, status || 200);
const pages = [
  pg('/', 'فروشگاه قهوه | شاپ', 'فروشگاه قهوه', ['/espresso-guide', '/old-espresso-machine', '/grinder', '/blog/tea'], 'قهوه دانه فروشگاه'),
  pg('/espresso-guide', 'راهنمای اسپرسو ساز | شاپ', 'راهنمای اسپرسو ساز', ['/'], 'اسپرسو ساز قهوه فشار دستگاه اسپرسو'),
  pg('/espresso-machine-pro', 'اسپرسو ساز حرفه‌ای | شاپ', 'اسپرسو ساز حرفه‌ای', ['/espresso-guide'], 'اسپرسو ساز دستگاه فشار قهوه حرفه‌ای'),
  pg('/espresso-machine-home', 'اسپرسو ساز خانگی | شاپ', 'اسپرسو ساز خانگی', ['/'], 'اسپرسو ساز دستگاه فشار قهوه خانگی'),
  pg('/grinder', 'آسیاب قهوه | شاپ', 'آسیاب قهوه', ['/'], 'آسیاب تیغه قهوه برقی'),
  SI.analyzePage('<html><body>404</body></html>', O + '/old-espresso-machine', 404),
  SI.analyzePage('<html><body>404</body></html>', O + '/blog/tea', 404),
];
const report = SI.buildReport(O + '/', 'shop.ir', pages, SI.analyzeRobots(null), { sitemap: true }, []);
const st = Insight.analyzeStructure(report);
// redirects
const rp = Pro.redirectPlan(report, st);
assert.ok(rp.ready && rp.rules.length === 2);
const old = rp.rules.find((r) => r.from === '/old-espresso-machine'); assert.ok(old && /espresso-machine/.test(old.to), 'matched to an espresso machine page: ' + old.to);
const tea = rp.rules.find((r) => r.from === '/blog/tea'); assert.strictEqual(tea.confidence, 'low'); assert.strictEqual(tea.to, '/', 'no relevant page => low-confidence home, flagged');
assert.ok(/Redirect 301 \/old-espresso-machine \/espresso/.test(rp.apache) && /rewrite \^\/old-espresso-machine\/\?\$/.test(rp.nginx) && /permanent;/.test(rp.nginx));
assert.ok(rp.rules[0].confidence !== 'low' || rp.rules.every((r) => r.confidence === 'low'), 'best matches first');
assert.ok(!Pro.redirectPlan({ pages: [] }, null).ready);
// title variants
const v = Pro.titleVariants('خرید اسپرسو ساز', 'اسپرسو ساز | شاپ', { year: '۱۴۰۵' });
assert.strictEqual(v.length, 3); assert.ok(v.every((x) => [...x.title].length <= 70) && v.some((x) => x.title.includes('خرید')));
assert.ok(v.some((x) => x.title.includes('۱۴۰۵')));
assert.deepStrictEqual(Pro.titleVariants('', 'x'), []);
assert.ok(Pro.titleVariants('آموزش دم‌آوری', 'x').some((x) => /گام/.test(x.title)));
// ctr boost: matches the page, uses real current title
const gsc = [{ key: 'اسپرسو ساز خانگی', keys: ['اسپرسو ساز خانگی'], clicks: 5, impressions: 3000, ctr: 0.0017, position: 5 }];
const cb = Pro.ctrBoost(gsc, report, { year: '' });
assert.ok(cb.ready && cb.items[0].page.endsWith('/espresso-machine-home') && cb.items[0].variants.length === 3 && cb.items[0].extraClicks > 0);
assert.ok(!Pro.ctrBoost(null, report).ready);
// clusters
const tc = Pro.topicClusters(report, st);
assert.ok(tc.ready && tc.clusters.length >= 1);
const espresso = tc.clusters.find((c) => c.pages.some((u) => u.endsWith('/espresso-machine-pro'))); assert.ok(espresso && espresso.size >= 3);
assert.ok(espresso.pillar.endsWith('/espresso-guide'), 'most-linked page is the pillar');
assert.ok(espresso.missingLinksToPillar.some((u) => u.endsWith('/espresso-machine-home')) && !espresso.missingLinksToPillar.some((u) => u.endsWith('/espresso-machine-pro')));
assert.ok(!Pro.topicClusters({ pages: [] }, null).ready);
// breadcrumbs
const bc = Pro.breadcrumbSchema(report, O + '/espresso-guide'); const j = JSON.parse(bc.replace(/<\/?script[^>]*>/g, ''));
assert.strictEqual(j['@type'], 'BreadcrumbList'); assert.strictEqual(j.itemListElement.length, 2); assert.strictEqual(j.itemListElement[1].name, 'راهنمای اسپرسو ساز'); assert.strictEqual(j.itemListElement[0].item, O + '/');
assert.strictEqual(Pro.breadcrumbSchema(report, O + '/'), ''); assert.ok(Pro.breadcrumbSchema(report).length >= 4);
// decay
const row = (pg, c, i, pos) => ({ keys: ['q', O + pg], clicks: c, impressions: i, position: pos });
const base = [row('/espresso-guide', 100, 2000, 3), row('/grinder', 50, 1000, 4), row('/espresso-machine-home', 20, 800, 6), row('/espresso-machine-pro', 12, 500, 5), row('/tiny', 1, 20, 9)];
const now = [row('/espresso-guide', 40, 1900, 7), row('/grinder', 48, 1000, 4), row('/espresso-machine-home', 90, 1500, 3), row('/espresso-machine-pro', 3, 450, 5)];
const dcy = Pro.decay(Pro.compactPages(base), now, report);
assert.ok(dcy.ready && dcy.decaying.length === 2 && dcy.decaying[0].page.endsWith('/espresso-guide'));
assert.ok(/رتبه/.test(dcy.decaying[0].cause) && /عنوان/.test(dcy.decaying[1].fix), 'rank drop vs CTR drop explained differently');
assert.ok(dcy.rising.length === 1 && dcy.rising[0].page.endsWith('/espresso-machine-home'));
assert.ok(!dcy.decaying.some((x) => x.page.endsWith('/grinder') || x.page.endsWith('/tiny')), 'stable and tiny pages are not flagged');
assert.ok(!Pro.decay(null, now, report).ready);
assert.ok(Pro.compactPages(base).every((x) => x.keys.length === 1));
console.log('pro tools (redirects, CTR boost, topic clusters, breadcrumbs) tests OK');

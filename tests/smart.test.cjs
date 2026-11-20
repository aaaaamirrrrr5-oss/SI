const assert = require('assert');
const SI = require('../www/engine.js');
const Smart = require('../www/smart.js');
const rep = SI.demoReport ? SI.demoReport() : null;
// synthetic report in the engine's shape
const mk = (url, issues, facts) => ({ url, status: 200, issues: issues.map((c) => Object.assign({ url }, c)), facts: Object.assign({ title: 'صفحه ' + url, description: 'توضیح ' + url, words: 400, lang: 'fa', noindex: false }, facts || {}) });
const report = {
  site: 'a.ir', origin: 'https://a.ir/', at: 1, scores: { seo: 60, ai: 40, ok: 50 },
  robots: { found: true, sitemaps: [], bots: [{ id: 'GPTBot', status: 'blocked', purpose: 'search' }, { id: 'CCBot', status: 'blocked', purpose: 'training' }, { id: 'ClaudeBot', status: 'allowed', purpose: 'search' }] },
  pages: [
    mk('https://a.ir/', [{ code: 'missing_desc', severity: 'high', title: 'بدون توضیحات', detail: 'x' }], { title: 'خانه | الف', words: 900 }),
    mk('https://a.ir/b', [{ code: 'missing_desc', severity: 'high', title: 'بدون توضیحات', detail: 'x' }, { code: 'thin', severity: 'medium', title: 'کم', detail: 'y' }]),
    mk('https://a.ir/c', [{ code: 'noindex', severity: 'high', title: 'noindex', detail: 'z' }], { noindex: true })
  ],
  siteIssues: [{ code: 'no_llms', severity: 'low', title: 'llms', detail: 'd', url: 'https://a.ir/llms.txt' }, { code: 'no_sitemap', severity: 'high', title: 'sitemap', detail: 'd', url: 'https://a.ir/sitemap.xml' }]
};
const plan = Smart.buildActionPlan(report);
assert.strictEqual(plan.total, 7, '5 crawl findings + 2 derived GEO actions');
assert.deepStrictEqual(plan.actions.filter((a) => a.code.startsWith('geo_')).map((a) => a.code).sort(), ['geo_no_org_schema', 'geo_no_trust_pages']);
assert.ok(plan.actions[0].priority >= plan.actions[plan.actions.length - 1].priority, 'sorted by priority');
assert.ok(plan.tiers.now.some((a) => a.code === 'no_sitemap'), 'high impact low effort is a quick win');
assert.ok(plan.tiers.later.some((a) => a.code === 'no_llms') || plan.tiers.now.some((a) => a.code === 'no_llms') === false);
assert.ok(plan.actions.find((a) => a.code === 'missing_desc').autoFixable);
assert.strictEqual(plan.actions.reduce((n, a) => n + a.shareOfProblems, 0) >= 98, true);
assert.ok(plan.potentialScoreAfterQuickWins >= plan.currentScore && plan.potentialScoreAfterQuickWins <= 100);
assert.ok(Smart.toBrief(plan, 2).split('\n').length === 2);
assert.strictEqual(Smart.buildActionPlan({ pages: [], siteIssues: [], scores: { seo: 100 } }).total, 0);
// unknown codes still handled
assert.strictEqual(Smart.buildActionPlan({ pages: [mk('https://a.ir/', [{ code: 'zzz', severity: 'critical', title: 't', detail: 'd' }])], siteIssues: [], scores: { seo: 50 } }).actions[0].impact, 9);
// llms.txt excludes noindex and escapes brackets
const llms = Smart.generateLlmsTxt(report);
assert.ok(llms.startsWith('# خانه'));
assert.ok(!llms.includes('https://a.ir/c'));
assert.ok(llms.includes('https://a.ir/b'));
// robots: unblock search bot, keep training blocked
const rb = Smart.suggestRobots(report);
assert.ok(/User-agent: GPTBot\nAllow: \//.test(rb.text));
assert.ok(!/CCBot/.test(rb.text) && rb.notes.some((n) => /CCBot/.test(n)));
assert.ok(/Sitemap: https:\/\/a\.ir\/sitemap\.xml/.test(rb.text));
assert.ok(/User-agent: CCBot/.test(Smart.suggestRobots(report, { allowTraining: true }).text));
assert.ok(/User-agent: \*/.test(Smart.suggestRobots({ origin: 'https://a.ir/', robots: { found: false, bots: [] } }).text));
// schema is valid JSON-LD
const sch = Smart.generateSchema(report); const json = JSON.parse(sch.replace(/<\/?script[^>]*>/g, ''));
assert.strictEqual(json['@graph'].length, 2); assert.strictEqual(json['@graph'][1].inLanguage, 'fa');
// trend
const s1 = Smart.snapshot(report);
const better = JSON.parse(JSON.stringify(report)); better.scores.seo = 72; better.siteIssues = better.siteIssues.slice(1); better.pages[0].issues = [];
const d = Smart.diffSnapshots(s1, Smart.snapshot(better));
assert.ok(d.ready && d.fixed.includes('no_llms') && d.improved.some((x) => x.code === 'missing_desc') && d.seoDelta === 12);
assert.strictEqual(Smart.diffSnapshots(null, s1).ready, false);
// Search Console opportunities
const opp = Smart.searchOpportunities([
  { key: 'آسیاب قهوه', clicks: 10, impressions: 2000, ctr: 0.005, position: 8.2 },
  { key: 'قهوه ترک', clicks: 300, impressions: 1000, ctr: 0.3, position: 1.2 },
  { key: 'دم‌آوری', clicks: 5, impressions: 900, ctr: 0.0055, position: 4.4 },
  { key: 'کم', clicks: 0, impressions: 5, ctr: 0, position: 9 }
]);
assert.ok(opp.ready && opp.striking[0].query === 'آسیاب قهوه' && opp.striking[0].estimatedExtraClicks > 0);
assert.ok(opp.ctrGap.some((x) => x.query === 'آسیاب قهوه'));
assert.ok(!opp.striking.some((x) => x.query === 'کم' || x.query === 'قهوه ترک'));
assert.strictEqual(Smart.searchOpportunities([]).ready, false);
// engine extracts real Q&A pairs
const pg = SI.analyzePage('<html lang="fa"><head><title>t</title></head><body><h2>چطور قهوه دم کنیم؟</h2><p>آب را گرم کنید و قهوه را به مدت چهار دقیقه دم کنید تا طعم کامل شود.</p><h3>آسیاب چیست؟</h3><p>ابزاری برای خرد کردن دانهٔ قهوه به اندازهٔ مناسب دم‌آوری است.</p><h2>بدون پاسخ؟</h2></body></html>', 'https://a.ir/q', 200);
assert.strictEqual(pg.facts.qa.length, 2);
const faq = Smart.generateFaqSchema({ pages: [pg] });
assert.strictEqual(faq.length, 1); assert.strictEqual(JSON.parse(faq[0].schema.replace(/<\/?script[^>]*>/g, '')).mainEntity.length, 2);
assert.strictEqual(Smart.generateFaqSchema({ pages: [{ url: 'x', facts: { qa: [{ q: 'a؟', a: 'b'.repeat(30) }] } }] }).length, 0, 'needs 2+ pairs');
const wp = Smart.worstPages(report); assert.strictEqual(wp[0].url, 'https://a.ir/b');
const md = Smart.exportMarkdown(report); assert.ok(md.includes('# گزارش بازرسی a.ir') && md.includes('## همین امروز') && md.includes('ضعیف‌ترین صفحات'));
const act = plan.actions.find((a) => a.code === 'missing_desc');
const fb = Smart.explainFallback(act); assert.ok(fb.includes('چه کنید') && fb.includes('https://a.ir/b') && fb.includes('1.'));
const msgs = Smart.explainMessages(act, 'a.ir'); assert.strictEqual(msgs[0].role, 'system'); assert.ok(msgs[1].content.includes('a.ir'));
const psi = { url: 'https://a.ir/', scores: { performance: 40 }, metrics: { 'largest-contentful-paint': { numericValue: 4800, displayValue: '4.8 s' }, 'cumulative-layout-shift': { numericValue: 0.05 }, 'total-blocking-time': { numericValue: 300, displayValue: '300 ms' } } };
const sp = Smart.speedActions(psi); assert.deepStrictEqual(sp.map((x) => x.code).sort(), ['speed_lcp', 'speed_tbt']);
assert.strictEqual(sp.find((x) => x.code === 'speed_lcp').severity, 'high');
const planPsi = Smart.buildActionPlan(report, { psi }); assert.strictEqual(planPsi.total, plan.total + 2);
assert.ok(planPsi.actions.every((a, i, arr) => !i || arr[i - 1].priority >= a.priority));
assert.strictEqual(Smart.speedActions(null).length, 0);
assert.strictEqual(Smart.speedActions({ scores: { performance: 30 }, metrics: {} })[0].code, 'speed_score');
const H = 3600 * 1000;
assert.strictEqual(Smart.autoPilotDue({ enabled: false, lastRun: 0 }, 1e12), false);
assert.strictEqual(Smart.autoPilotDue({ enabled: true, intervalHours: 24, lastRun: 1e12 - 23 * H }, 1e12), false);
assert.strictEqual(Smart.autoPilotDue({ enabled: true, intervalHours: 24, lastRun: 1e12 - 25 * H }, 1e12), true);
assert.strictEqual(Smart.autoPilotDue({ enabled: true, intervalHours: 5, lastRun: 0 }, 1e12), true, 'invalid interval falls back to 24h');
const rep2 = Object.assign({}, report, { counts: { critical: 0, high: 2, medium: 1, low: 1 } });
const dg = Smart.buildDigest({ before: { scores: { seo: 70 } }, after: Object.assign({}, rep2, { scores: { seo: 60, ai: 40 } }), plan, diff: { ready: true, added: ['x'], fixed: [] }, rebuild: { applied: 3 } });
assert.strictEqual(dg.level, 'alert'); assert.ok(dg.text.includes('70 ← 60') && dg.text.includes('3 اصلاح') && dg.next);
assert.strictEqual(Smart.buildDigest({ before: { scores: { seo: 60 } }, after: Object.assign({}, rep2, { scores: { seo: 66, ai: 40 } }), plan }).level, 'ok');
assert.strictEqual(Smart.buildDigest({ after: Object.assign({}, rep2, { counts: { critical: 1 } }), plan: { actions: [] } }).level, 'alert');
assert.strictEqual(Smart.buildDigest({ error: 'timeout' }).level, 'alert');
// GEO audit
const full = JSON.parse(JSON.stringify(report));
full.flags = { sitemap: true, llms: true };
full.pages.forEach((p) => { p.facts.schema = 1; p.facts.schemaTypes = ['Organization', 'WebSite']; p.facts.sameAs = true; p.facts.hasFaq = true; p.facts.lists = 2; p.facts.hasAuthor = true; p.facts.hasDate = true; });
full.pages[0].facts.trust = { about: true, contact: true, privacy: true };
const g1 = Smart.geoAudit(report), g2 = Smart.geoAudit(full);
assert.ok(g1.ready && g2.score > g1.score && g2.score <= 100 && g2.parts.reduce((n, x) => n + x.max, 0) === 100);
assert.strictEqual(Smart.geoActions(full).length, 0);
assert.strictEqual(Smart.geoAudit({ pages: [] }).ready, false);
const pack = Smart.buildRebuildPack(report);
['llms.txt', 'robots.txt', 'JSON-LD', 'FAQPage'].forEach((k) => assert.ok(pack.includes(k), k));
// engine GEO signals
const art = SI.analyzePage('<html lang="fa"><head><title>مقاله کامل تست</title><meta name="viewport" content="x"><script type="application/ld+json">{"@type":"Organization","sameAs":["x"]}</script></head><body><h1>تیتر</h1><h4>پرش</h4><p>' + 'متن '.repeat(450) + '</p><a href="/about">درباره ما</a><a href="/contact">تماس</a></body></html>', 'https://a.ir/post', 200);
assert.ok(art.issues.some((i) => i.code === 'no_author') && art.issues.some((i) => i.code === 'no_date') && art.issues.some((i) => i.code === 'heading_skip'));
assert.deepStrictEqual(art.facts.schemaTypes, ['Organization']); assert.ok(art.facts.sameAs && art.facts.trust.about && art.facts.trust.contact);
const art2 = SI.analyzePage('<html lang="fa"><head><title>مقاله کامل تست</title></head><body><h1>x</h1><p>نویسنده: علی</p><time datetime="2026-01-01">1</time><p>' + 'متن '.repeat(450) + '</p></body></html>', 'https://a.ir/post2', 200);
assert.ok(!art2.issues.some((i) => i.code === 'no_author' || i.code === 'no_date'));
console.log('smart action planner tests OK');

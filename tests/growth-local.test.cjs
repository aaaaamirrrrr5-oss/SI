const assert = require('assert');
const G = require('../www/growth.js');
const H = 3600000, now = new Date(2026, 10, 14, 15, 0, 0).getTime();
const at = (hAgo) => now - hAgo * H;
// empty history: allowed
assert.strictEqual(G.localCycleGate([], now).ok, true);
// interval pacing
let h = G.recordLocalCycle([], { status: 'applied', post_id: 1, change_id: 'c1', fields: ['seo_title'] }, at(2));
let g = G.localCycleGate(h, now); assert.strictEqual(g.ok, false); assert.strictEqual(g.code, 'interval');
assert.strictEqual(g.nextAt, at(2) + 6 * H);
assert.strictEqual(G.localCycleGate(h, now, { manual: true }).ok, true, 'manual run bypasses interval');
assert.strictEqual(G.localCycleGate(h, at(-5)).ok, true, 'allowed after 6h');
// daily cap (counts only applied, resets at midnight) and applies to manual runs too
const mid = new Date(2026, 10, 14, 0, 0, 0).getTime();
let cap = []; for (let i = 0; i < 3; i++) cap = G.recordLocalCycle(cap, { status: 'applied', post_id: i }, mid + (i + 1) * H);
g = G.localCycleGate(cap, now); assert.strictEqual(g.code, 'daily_cap'); assert.strictEqual(g.nextAt, mid + 24 * H);
assert.strictEqual(G.localCycleGate(cap, now, { manual: true }).code, 'daily_cap');
assert.strictEqual(G.localCycleGate(cap, mid + 25 * H).ok, true, 'cap resets next day');
// skipped does not count toward the cap or failure streak
let sk = []; for (let i = 0; i < 5; i++) sk = G.recordLocalCycle(sk, { status: 'skipped', reason: 'no page' }, at(30 - i));
assert.strictEqual(G.localCycleGate(sk, now).ok, true);
// failure back-off after 3 consecutive failures
let f = []; for (let i = 0; i < 3; i++) f = G.recordLocalCycle(f, { status: 'failed', reason: 'bad json' }, at(8 - i));
g = G.localCycleGate(f, now); assert.strictEqual(g.code, 'failure_backoff'); assert.strictEqual(g.streak, 3);
assert.strictEqual(G.localCycleGate(f, now, { manual: true }).ok, true, 'manual retry allowed during back-off');
assert.strictEqual(G.localCycleGate(f, at(-13)).ok, true, 'back-off ends after 12h');
// a success breaks the streak
f = G.recordLocalCycle(f, { status: 'applied', post_id: 9 }, at(1)); f = G.recordLocalCycle(f, { status: 'failed' }, at(0.9));
assert.strictEqual(G.localCycleGate(f, at(-7)).ok, true);
// history is capped, sorted and sanitised
let big = []; for (let i = 0; i < 50; i++) big = G.recordLocalCycle(big, { status: 'weird', title: 'x'.repeat(500) }, i + 1);
assert.strictEqual(big.length, 30); assert.strictEqual(big[0].at, 21); assert.strictEqual(big[0].status, 'failed'); assert.strictEqual(big[0].title.length, 120);
assert.deepStrictEqual(G.localCycleGate(null, now), { ok: true, appliedToday: 0, streak: 0 });
// summary
const s = G.summarizeLocalHistory(h, now);
assert.strictEqual(s.applied, 1); assert.strictEqual(s.blocked, 'interval'); assert.strictEqual(s.lastApplied.change_id, 'c1'); assert.strictEqual(s.dailyCap, 3);
console.log('growth-local tests passed');

// ---------- smarter ranking / validation / impact ----------
const rows = [
  { keys: ['خرید آسیاب قهوه', 'https://x.test/grinder/'], impressions: 4000, clicks: 40, position: 6 },
  { keys: ['آسیاب دستی', 'https://x.test/grinder'], impressions: 1000, clicks: 10, position: 12 },
  { keys: ['قهوه عربیکا', 'https://x.test/beans'], impressions: 3000, clicks: 270, position: 2 },
  { keys: ['x', 'not-a-url'], impressions: 5, clicks: 0, position: 1 }
];
const perf = G.aggregateGscByPage(rows);
const gp = perf[G.normUrl('https://x.test/grinder')];
assert.strictEqual(gp.impressions, 5000); assert.strictEqual(gp.clicks, 50);
assert.ok(Math.abs(gp.position - (6 * 4000 + 12 * 1000) / 5000) < 1e-9, 'impression-weighted position');
assert.deepStrictEqual(gp.queries.slice(0, 2), ['خرید آسیاب قهوه', 'آسیاب دستی']);
assert.strictEqual(Object.keys(perf).length, 2, 'non-URL rows ignored, trailing slash merged');
assert.ok(G.expectedCtr(1) > G.expectedCtr(5) && G.expectedCtr(5) > G.expectedCtr(10) && G.expectedCtr(10) > G.expectedCtr(30));
assert.ok(Math.abs(G.expectedCtr(1.5) - 0.215) < 1e-9);
const okMeta = { seoTitle: 'آسیاب دستی قهوه | راهنمای خرید و مقایسه', metaDescription: 'آسیاب دستی قهوه را بر اساس اندازهٔ ذرات و جنس تیغه مقایسه کنید و مدل مناسب دم‌آوری خانگی را انتخاب کنید.' };
const items = [
  Object.assign({ id: 1, type: 'product', url: 'https://x.test/grinder', title: 'آسیاب' }, okMeta),
  { id: 2, type: 'post', url: 'https://x.test/beans', title: 'قهوه عربیکا', seoTitle: 'قهوه عربیکا اتیوپی | راهنمای خرید و طعم‌ها', metaDescription: 'قهوه عربیکا را از نظر رست، عطر و طعم بشناسید و بر اساس روش دم‌آوری مورد علاقه‌تان بهترین دانه را انتخاب کنید.' },
  { id: 3, type: 'post', url: 'https://x.test/empty', title: 'بدون متا', seoTitle: '', metaDescription: '' }
];
let ranked = G.rankGrowthCandidates(items, perf, { now });
assert.strictEqual(ranked[0].item.id, 1, 'big CTR gap + near page one ranks first');
assert.ok(ranked[0].reasons.some((r) => r.includes('کلیک کمتر از انتظار')));
assert.ok(ranked.find((x) => x.item.id === 3).reasons.includes('عنوان سئو خالی است'));
assert.ok(ranked.find((x) => x.item.id === 2).score < ranked.find((x) => x.item.id === 1).score, 'page with good CTR scores lower');
ranked = G.rankGrowthCandidates(items, perf, { now, lastRuns: { 1: now - 3 * 86400000 } });
assert.ok(!ranked.some((x) => x.item.id === 1), 'cooldown excludes recently changed page');
ranked = G.rankGrowthCandidates(items, perf, { now, targets: ['https://x.test/beans/'] });
assert.deepStrictEqual(ranked.map((x) => x.item.id), [2]);
// parseJsonLoose
assert.strictEqual(G.parseJsonLoose('```json\n{"a":1}\n```').a, 1);
assert.strictEqual(G.parseJsonLoose('متن {"a":2} پایان').a, 2);
assert.strictEqual(G.parseJsonLoose('بی‌ربط'), null);
// validation
const ctx = { content: 'آسیاب دستی قهوه با تیغه سرامیکی و بدنه استیل. قیمت ۱۲۰۰۰۰۰ تومان.', title: 'آسیاب دستی' };
const good = { seo_title: 'آسیاب دستی قهوه سرامیکی | مشخصات و خرید', meta_description: 'آسیاب دستی قهوه با تیغه سرامیکی و بدنهٔ استیل؛ مشخصات، اندازهٔ ذرات و نکات انتخاب را ببینید.', confidence: 0.85 };
assert.strictEqual(G.validateMetaCandidate(good, ctx).ok, true);
const bad1 = G.validateMetaCandidate(Object.assign({}, good, { meta_description: 'ضمانت رتبه یک گوگل برای بهترین قیمت آسیاب قهوه با ۹۹۹ تومان تخفیف ویژه فقط همین امروز برای شما عزیزان' }), ctx);
assert.strictEqual(bad1.ok, false); assert.ok(bad1.problems.some((x) => x.includes('تضمین')) && bad1.problems.some((x) => x.includes('پیدا نشد')));
assert.strictEqual(G.validateMetaCandidate(Object.assign({}, good, { meta_description: 'قیمت ۱۲۰۰۰۰۰ تومان؛ آسیاب دستی قهوه با تیغه سرامیکی و بدنهٔ استیل برای دم‌آوری خانگی.' }), ctx).ok, true, 'price present in page is allowed');
assert.ok(G.validateMetaCandidate(Object.assign({}, good, { seo_title: 'قهوه قهوه قهوه آسیاب قهوه بهترین آسیاب' }), ctx).problems.some((x) => x.includes('تکرار')));
assert.ok(G.validateMetaCandidate(Object.assign({}, good, { seo_title: 'Best manual coffee grinder buy online now' }), ctx).problems.some((x) => x.includes('فارسی')));
assert.ok(G.validateMetaCandidate(Object.assign({}, good, { confidence: 0.4 }), ctx).problems.length >= 1);
assert.ok(G.buildRepairHint(['الف', 'ب']).includes('الف؛ ب'));
// history keeps baseline/before/after
let hh = G.recordLocalCycle([], { status: 'applied', post_id: 1, url: 'https://x.test/grinder', change_id: 'c1', baseline: { impressions: 5000, clicks: 50, ctr: 0.01, position: 7.2 }, before: { seo_title: 'قدیمی' }, after: { seo_title: 'جدید' }, attempts: 2, score: 33.456 }, now - 20 * 86400000);
assert.strictEqual(hh[0].baseline.impressions, 5000); assert.strictEqual(hh[0].before.seo_title, 'قدیمی'); assert.strictEqual(hh[0].attempts, 2);
// impact assessment
const e = hh[0], D = 86400000;
assert.strictEqual(G.assessLocalImpact(e, { impressions: 6000, clicks: 90, ctr: 0.015, position: 6 }, now).verdict, 'improved');
assert.strictEqual(G.assessLocalImpact(e, { impressions: 5200, clicks: 30, ctr: 30 / 5200, position: 7.5 }, now).verdict, 'declined');
assert.strictEqual(G.assessLocalImpact(e, { impressions: 1000, clicks: 5, ctr: 0.005, position: 9 }, now).verdict, 'neutral', 'impressions collapse is not blamed on the edit');
assert.strictEqual(G.assessLocalImpact(e, { impressions: 5000, clicks: 52, ctr: 0.0104, position: 7 }, now).verdict, 'neutral');
assert.strictEqual(G.assessLocalImpact(e, { impressions: 10, clicks: 1, ctr: 0.1, position: 5 }, now).verdict, 'insufficient');
assert.strictEqual(G.assessLocalImpact(e, null, now).verdict, 'insufficient');
assert.strictEqual(G.assessLocalImpact(Object.assign({}, e, { at: now - 3 * D }), { impressions: 999, clicks: 99, position: 1 }, now).verdict, 'waiting');
assert.strictEqual(G.assessLocalImpact(Object.assign({}, e, { baseline: undefined }), {}, now).verdict, 'no_baseline');
assert.strictEqual(G.assessLocalImpact(Object.assign({}, e, { rolled_back: true }), {}, now).verdict, 'n/a');
const map = G.assessHistoryImpact(hh, perf, now); assert.ok(map.c1 && map.c1.verdict);
console.log('growth-local smart tests passed');

// ---------- v1.28: query coverage, healthy-page guard, learning ledger, adaptive cooldowns, grounding ----------
{
  const D = 86400000;
  // per-query stats
  const qp = G.aggregateGscByPage([
    { keys: ['آسیاب برقی', 'https://x.test/a'], impressions: 800, clicks: 4, position: 9 },
    { keys: ['آسیاب دستی', 'https://x.test/a'], impressions: 200, clicks: 2, position: 14 }
  ])[G.normUrl('https://x.test/a')];
  assert.strictEqual(qp.queryStats[0].q, 'آسیاب برقی'); assert.strictEqual(qp.queryStats[0].impressions, 800); assert.strictEqual(qp.queryStats[0].position, 9);
  assert.deepStrictEqual(qp.queries, ['آسیاب برقی', 'آسیاب دستی'], 'queries array stays backward compatible');
  // coverage
  const cv = G.queryCoverage('آسیاب دستی قهوه | راهنمای انتخاب', qp.queryStats);
  assert.ok(cv.uncovered.length === 1 && cv.uncovered[0].q === 'آسیاب برقی' && cv.coverage < 1);
  assert.strictEqual(G.queryCoverage('آسیاب برقی و دستی قهوه', qp.queryStats).uncovered.length, 0);
  // healthy page (top-3 and CTR above expectation, complete meta) is never picked; same page with a hole is
  const okM = { seoTitle: 'آسیاب دستی قهوه | راهنمای خرید و مقایسه', metaDescription: 'آسیاب دستی قهوه را بر اساس اندازهٔ ذرات و جنس تیغه مقایسه کنید و مدل مناسب دم‌آوری خانگی را انتخاب کنید.' };
  const hp = G.aggregateGscByPage([{ keys: ['آسیاب دستی', 'https://x.test/h'], impressions: 9000, clicks: 2700, position: 1.4 }]);
  assert.strictEqual(G.isHealthy(hp[G.normUrl('https://x.test/h')], okM), true);
  assert.strictEqual(G.rankGrowthCandidates([Object.assign({ id: 7, type: 'product', url: 'https://x.test/h', title: 'آسیاب دستی' }, okM)], hp, { now }).length, 0, 'healthy page left alone');
  assert.strictEqual(G.rankGrowthCandidates([{ id: 7, type: 'product', url: 'https://x.test/h', title: 'آسیاب دستی', seoTitle: '', metaDescription: '' }], hp, { now }).length, 1, 'healthy traffic but empty meta still fixable');
  // product bonus alone is not a reason to rewrite a fine page
  assert.strictEqual(G.rankGrowthCandidates([Object.assign({ id: 8, type: 'product', url: 'https://x.test/nodata', title: 'x' }, okM)], {}, { now }).length, 0);
  // ledger survives the history cap and drives cooldowns
  let L = {};
  L = G.updateLedger(L, { status: 'applied', post_id: 1, url: 'https://x.test/grinder', change_id: 'c1', baseline: { impressions: 5000, clicks: 50, ctr: 0.01, position: 7.2 }, after: { seo_title: 'عنوان جدید یک', meta_description: 'متا' } }, now - 20 * D);
  L = G.updateLedger(L, { status: 'applied', post_id: 2, url: 'https://x.test/beans', change_id: 'c2', baseline: { impressions: 3000, clicks: 30, ctr: 0.01, position: 5 }, after: { seo_title: 'عنوان جدید دو' } }, now - 20 * D);
  L = G.updateLedger(L, { status: 'applied', post_id: 3, url: 'https://x.test/neutral', change_id: 'c3', baseline: { impressions: 1000, clicks: 10, ctr: 0.01, position: 9 }, after: { seo_title: 'عنوان سه' } }, now - 20 * D);
  L = G.updateLedger(L, { status: 'applied', post_id: 4, url: 'https://x.test/fresh', change_id: 'c4', baseline: { impressions: 1000, clicks: 10, ctr: 0.01, position: 9 } }, now - 2 * D);
  const pn = G.aggregateGscByPage([
    { keys: ['a', 'https://x.test/grinder'], impressions: 6000, clicks: 120, position: 6 },   // CTR +100%  -> improved
    { keys: ['b', 'https://x.test/beans'], impressions: 3000, clicks: 12, position: 5 },      // CTR -60%   -> declined
    { keys: ['c', 'https://x.test/neutral'], impressions: 1000, clicks: 10, position: 9 }     // flat       -> neutral
  ]);
  const cd = G.buildCooldowns(L, pn, now);
  assert.strictEqual(cd['1'].verdict, 'improved'); assert.ok(cd['1'].until - (now - 20 * D) === 60 * D, 'winners rest 60 days');
  assert.strictEqual(cd['2'].verdict, 'declined'); assert.ok(cd['2'].until > now);
  assert.strictEqual(cd['3'].verdict, 'neutral'); assert.ok(cd['3'].until - (now - 20 * D) === 30 * D);
  assert.strictEqual(cd['4'].verdict, 'waiting', 'unmeasured change is not touched again');
  // rollback frees the page
  const L2 = G.ledgerMarkRolledBack(L, 'c2'); assert.ok(!G.buildCooldowns(L2, pn, now)['2']);
  // repeated failures park a page so the same candidate is not retried forever
  let F = G.updateLedger({}, { status: 'failed', post_id: 9, url: 'https://x.test/f' }, now - 2 * H);
  assert.ok(!G.buildCooldowns(F, {}, now)['9'], 'one failure is not enough');
  F = G.updateLedger(F, { status: 'failed', post_id: 9 }, now - H);
  assert.strictEqual(G.buildCooldowns(F, {}, now)['9'].verdict, 'failing');
  const itemsF = [{ id: 9, type: 'post', url: 'https://x.test/f', title: 'f', seoTitle: '', metaDescription: '' }, { id: 10, type: 'post', url: 'https://x.test/g', title: 'g', seoTitle: '', metaDescription: '' }];
  assert.deepStrictEqual(G.rankGrowthCandidates(itemsF, {}, { now, cooldowns: G.buildCooldowns(F, {}, now) }).map((x) => x.item.id), [10]);
  F = G.updateLedger(F, { status: 'applied', post_id: 9 }, now); assert.deepStrictEqual(F['9'].failures, [], 'success clears failures');
  assert.ok(Object.keys(G.updateLedger({}, { status: 'skipped', reason: 'x' }, now)).length === 0, 'entries without a page are ignored');
  let big2 = {}; for (let i = 0; i < 320; i++) big2 = G.updateLedger(big2, { status: 'failed', post_id: i }, i + 1);
  assert.strictEqual(Object.keys(big2).length, 300); assert.ok(!big2['0'] && big2['319']);
  // lessons for the prompt
  const les = G.buildLessons(L, 2, pn, now); assert.ok(les.includes('عنوان جدید دو') && les.includes('افت') && les.includes('عنوان جدید یک'), 'declined own title + winning style');
  assert.ok(!G.buildLessons(L, 1, pn, now).includes('عنوان جدید یک'), 'a page is never its own style example');
  assert.strictEqual(G.buildLessons({}, 1, {}, now), '');
  // grounding guard
  const gctx = { content: 'آسیاب دستی قهوه با تیغه سرامیکی و بدنه استیل برای دم‌آوری خانگی. ظرفیت ۳۰ گرم.', title: 'آسیاب دستی' };
  const gOk = { seo_title: 'آسیاب دستی قهوه سرامیکی | مشخصات و خرید', meta_description: 'آسیاب دستی قهوه با تیغه سرامیکی و بدنهٔ استیل برای دم‌آوری خانگی؛ مشخصات و ظرفیت را ببینید.', confidence: 0.85 };
  assert.strictEqual(G.validateMetaCandidate(gOk, gctx).ok, true);
  const gBad = G.validateMetaCandidate({ seo_title: 'آسیاب تیتانیومی ضدزنگ ژاپنی | نسل جدید', meta_description: 'آسیاب لوکس با موتور پرقدرت، کارکرد بی‌صدا، گارانتی طلایی و ساخت ایتالیا مناسب کافه‌های حرفه‌ای.', confidence: 0.9 }, gctx);
  assert.strictEqual(gBad.ok, false); assert.ok(gBad.problems.some((x) => x.includes('در متن صفحه')), 'invented features are rejected');
  const withQ = G.validateMetaCandidate(gOk, Object.assign({ queryStats: qp.queryStats }, gctx)); assert.ok(withQ.coverage >= 0 && withQ.coverage <= 1);
  assert.strictEqual(G.validateMetaCandidate(gOk, gctx).coverage, null);
  // query terms count as grounded (they come from real searches)
  assert.strictEqual(G.validateMetaCandidate({ seo_title: 'آسیاب دستی قهوه برقی سرامیکی | مشخصات و خرید', meta_description: 'آسیاب دستی قهوه با تیغه سرامیکی و بدنهٔ استیل برای دم‌آوری خانگی؛ مشخصات و ظرفیت را ببینید.', confidence: 0.85 }, Object.assign({}, gctx, { queries: ['آسیاب برقی'] })).ok, true);
  console.log('growth v1.28 tests passed');
}

const assert = require('assert'); const fs = require('fs'); const C = require('../www/changelog.js');
const now = new Date(2026, 10, 14, 15, 0, 0).getTime(); const day = 86400000;
const repair = [{ change_id: 'r1', post_id: 5, title: 'آسیاب', fields: ['seo_title', 'content'], at: now - 3600e3 }, { post_id: 9, title: 'بدون شناسه' }];
const rebuild = [{ change_id: 'b1', post_id: 7, title: 'صفحه', before: { seo_title: 'قدیمی' }, after: { seo_title: 'جدید', meta_description: 'توضیح' } }];
const agent = [{ change_id: 'a1', post_id: 5, title: 'آسیاب', ts: Math.floor((now - 2 * day) / 1000), state: 'applied', action: 'update', post_type: 'product', mode: 'automatic' }, { change_id: 'r1', post_id: 5, ts: Math.floor((now - 3600e3) / 1000), state: 'rolled_back' }];
const list = C.merge([], [].concat(repair.map(C.fromRepair), rebuild.map((j) => C.fromRebuild(j, now - 600e3)), agent.map(C.fromAgent)).filter(Boolean));
assert.strictEqual(list.length, 3, 'dedupe by change id; items without id are dropped');
assert.deepStrictEqual(list.map((e) => e.id), ['b1', 'r1', 'a1'], 'newest first');
const r1 = list.find((e) => e.id === 'r1'); assert.strictEqual(r1.state, 'rolled_back', 'server rolled_back is final'); assert.strictEqual(r1.kind, 'text'); assert.ok(r1.fields.includes('seo_title'), 'richer local fields kept');
assert.strictEqual(list.find((e) => e.id === 'b1').via, 'autopilot'); assert.strictEqual(list.find((e) => e.id === 'a1').auto, true);
// merge is idempotent and never resurrects a rolled-back entry
assert.deepStrictEqual(C.merge(list, repair.map(C.fromRepair).filter(Boolean)), list);
// filters
assert.deepStrictEqual(C.filter(list, 'today', '', now).map((e) => e.id), ['b1', 'r1']);
assert.deepStrictEqual(C.filter(list, 'active', '', now).map((e) => e.id), ['b1', 'a1']);
assert.deepStrictEqual(C.filter(list, 'rolled', '', now).map((e) => e.id), ['r1']);
assert.deepStrictEqual(C.filter(list, 'seo', '', now).map((e) => e.id), ['b1']);
assert.deepStrictEqual(C.filter(list, 'all', 'آسیاب', now).map((e) => e.id), ['r1', 'a1']);
assert.deepStrictEqual(C.filter(list, 'all', '7', now).map((e) => e.id), ['b1']);
// grouping + summary
const g = C.groupByDay(list, now, () => 'تاریخ'); assert.deepStrictEqual(g.map((x) => x.label), ['امروز', 'تاریخ']); assert.strictEqual(g[0].items.length, 2);
const s = C.summarize(list, now); assert.deepStrictEqual([s.total, s.today, s.applied, s.rolled, s.pages], [3, 2, 2, 1, 2]);
// before/after
const rows = C.diffRows(list.find((e) => e.id === 'b1')); assert.strictEqual(rows[0].before, 'قدیمی'); assert.strictEqual(rows[0].after, 'جدید'); assert.strictEqual(rows[1].before, '');
// rollback plan: only applied entries; autopilot ids batched separately
const plan = C.rollbackPlan(list); assert.deepStrictEqual(plan.autopilot.map((e) => e.id), ['b1']); assert.deepStrictEqual(plan.agent.map((e) => e.id), ['a1']);
const after = C.markRolledBack(list, ['b1']); assert.strictEqual(after.find((e) => e.id === 'b1').state, 'rolled_back'); assert.strictEqual(C.rollbackPlan(after).autopilot.length, 0);
assert.ok(C.toText(list).split('\n').length === 3);
// robustness: garbage input never throws
assert.deepStrictEqual(C.merge(null, [null, {}, undefined]), []); assert.strictEqual(C.fromAgent({}), null); assert.deepStrictEqual(C.groupByDay([], now), []);
// wiring
const app = fs.readFileSync(__dirname + '/../www/app.js', 'utf8'); const html = fs.readFileSync(__dirname + '/../www/index.html', 'utf8'); const sw = fs.readFileSync(__dirname + '/../www/sw.js', 'utf8');
['changelog.js'].forEach((f) => { assert(html.includes(f) && sw.includes(f), f); });
['vChanges', 'chUndo', 'syncChangeLog', '/autopilot/rollback', "'changes'"].forEach((k) => assert(app.includes(k), k));
assert(html.includes('id="logBtn"'));
console.log('change log tests OK');

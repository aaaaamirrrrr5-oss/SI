const assert = require('assert');
const R = require('../www/rebuild.js');
const long = 'این صفحه دربارهٔ آسیاب قهوهٔ دستی و نحوهٔ انتخاب آن برای خانه است و اطلاعات واقعی دقیق و مفیدی دارد که کاربر بتواند تصمیم بگیرد.';
const mk = (id, extra) => Object.assign({ id, type: 'page', title: 'صفحه ' + id, url: 'https://x.test/' + id, revision: 'r' + id, metaTitle: '', metaDescription: '', excerpt: long, contentPreview: long, issues: ['no_meta_description'] }, extra || {});
const items = [mk(1), mk(2, { metaDescription: long.slice(0, 100), metaTitle: 'عنوان خوب و مناسب برای صفحه دوم', issues: [] }), mk(3, { metaDescription: long.slice(0, 100), metaTitle: 'عنوان خوب و مناسب برای صفحه دوم', issues: [] })];

// duplicates + scoring
const dup = R.findDuplicates(items);
assert.ok(!dup['1'] && dup['2'].title && dup['3'].description);
assert.ok(R.scoreSite(items) < 100);
assert.ok(R.scoreItem(items[0]) < R.scoreItem(Object.assign({}, items[1]), {}));

// planning only emits safe, validated fields
const plan = R.planPage({ items, site: { name: 'فروشگاه' } }, null);
assert.ok(plan.length >= 1);
plan.forEach((p) => Object.keys(p.changes).forEach((k) => assert.ok(R.SAFE_FIELDS.includes(k), 'unsafe field ' + k)));
assert.ok(plan.some((p) => p.post_id === 1 && p.changes.meta_description));

// schedule gating
assert.strictEqual(R.isDue({ enabled: false, lastRun: 0 }, Date.now()), false);
assert.strictEqual(R.isDue({ enabled: true, intervalHours: 24, lastRun: Date.now() - 3600e3 }, Date.now()), false);
assert.strictEqual(R.isDue({ enabled: true, intervalHours: 24, lastRun: Date.now() - 25 * 3600e3 }, Date.now()), true);

(async () => {
  // dry run changes nothing
  let calls = 0;
  const io = (extra) => Object.assign({ remaining: 5, brief: null, loadPage: async (o) => ({ items: o ? [] : items, total: 3, hasMore: false, site: { name: 'فروشگاه' } }), apply: async (p) => { calls++; return { applied: p.changes, change_id: 'c' + calls, autopilot_remaining: 5 - calls }; } }, extra);
  const dry = await R.run(io(), { dryRun: true });
  assert.strictEqual(calls, 0); assert.ok(dry.planned >= 1); assert.ok(dry.scoreAfter >= dry.scoreBefore);

  // real run applies, journals change ids and raises score
  const real = await R.run(io(), {});
  assert.ok(real.applied >= 1 && real.journal.length === real.applied && real.journal[0].change_id);
  assert.ok(real.scoreAfter > real.scoreBefore);

  // quota stops cleanly; zero quota never calls apply
  calls = 0;
  const none = await R.run(io({ remaining: 0 }), {});
  assert.strictEqual(none.stoppedBy, 'quota'); assert.strictEqual(calls, 0);
  const q = await R.run(io({ remaining: 1, apply: async () => { throw new Error('سقف روزانهٔ اصلاح خودکار به پایان رسیده است.'); } }), {});
  assert.strictEqual(q.stoppedBy, 'quota'); assert.ok(q.failed >= 1);

  // 409-style failures are counted, not thrown
  const stale = await R.run(io({ apply: async () => { throw new Error('محتوا تغییر کرده'); } }), {});
  assert.ok(stale.failed >= 1 && stale.applied === 0);
  assert.ok(R.summarize(real).includes('اعمال'));
  console.log('seo auto-rebuild engine tests OK');
})().catch((e) => { console.error(e); process.exit(1); });

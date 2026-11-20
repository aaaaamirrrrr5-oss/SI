const assert = require('assert');
const S = require('../www/scheduler.js');
const H = 3600e3, M = 60e3;
const at = (h, m) => new Date(2026, 10, 14, h, m || 0, 0).getTime();

// --- policy normalisation
assert.deepStrictEqual(S.normalizePolicy(null), S.DEFAULT_POLICY);
assert.strictEqual(S.normalizePolicy({ minBattery: 999 }).minBattery, 60);
assert.strictEqual(S.normalizePolicy({ quietStart: 'x', quietEnd: -5 }).quietStart, 23);
assert.strictEqual(S.normalizePolicy({ quietEnd: -5 }).quietEnd, 0);
assert.strictEqual(S.normalizePolicy({ wifiOnly: 1 }).wifiOnly, true);

// --- quiet hours (overnight and same-day windows, disabled, empty window)
const q = { quietEnabled: true, quietStart: 23, quietEnd: 7 };
assert.strictEqual(S.inQuiet(q, at(23, 30)), true);
assert.strictEqual(S.inQuiet(q, at(2)), true);
assert.strictEqual(S.inQuiet(q, at(7)), false, 'end hour is exclusive');
assert.strictEqual(S.inQuiet(q, at(12)), false);
assert.strictEqual(S.inQuiet({ quietEnabled: true, quietStart: 13, quietEnd: 15 }, at(14)), true);
assert.strictEqual(S.inQuiet({ quietEnabled: true, quietStart: 13, quietEnd: 15 }, at(15)), false);
assert.strictEqual(S.inQuiet({ quietEnabled: false, quietStart: 0, quietEnd: 23 }, at(3)), false);
assert.strictEqual(S.inQuiet({ quietEnabled: true, quietStart: 5, quietEnd: 5 }, at(5)), false);
assert.strictEqual(S.quietRemainingMs(q, at(23, 30)), 7.5 * H, 'overnight: to 07:00 next day');
assert.strictEqual(S.quietRemainingMs(q, at(2)), 5 * H);
assert.strictEqual(S.quietRemainingMs(q, at(12)), 0);

// --- environment gate
assert.strictEqual(S.envGate({}, { online: true }, at(12)).ok, true);
assert.strictEqual(S.envGate({}, {}, at(12)).ok, true, 'unknown environment never blocks');
assert.strictEqual(S.envGate({}, { online: false }, at(12)).code, 'offline');
assert.strictEqual(S.envGate({}, { battery: { level: 0.1, charging: false } }, at(12)).code, 'battery');
assert.strictEqual(S.envGate({}, { battery: { level: 0.1, charging: true } }, at(12)).ok, true, 'charging is fine');
assert.strictEqual(S.envGate({}, { battery: { level: 0.2, charging: false } }, at(12)).ok, true, 'exactly at the threshold passes');
assert.strictEqual(S.envGate({ minBattery: 0 }, { battery: { level: 0.01, charging: false } }, at(12)).ok, true, 'threshold 0 disables the check');
assert.strictEqual(S.envGate({ wifiOnly: true }, { type: 'cellular' }, at(12)).code, 'metered');
assert.strictEqual(S.envGate({ wifiOnly: true }, { saveData: true }, at(12)).code, 'metered');
assert.strictEqual(S.envGate({ wifiOnly: true }, { type: 'wifi' }, at(12)).ok, true);
assert.strictEqual(S.envGate({ wifiOnly: true }, {}, at(12)).ok, true, 'wifiOnly with unknown connection type is permissive');
assert.strictEqual(S.envGate({ wifiOnly: false }, { type: 'cellular' }, at(12)).ok, true);
assert.strictEqual(S.envGate(q, { online: true }, at(1)).code, 'quiet');
assert.strictEqual(S.envGate(q, { online: false }, at(1)).code, 'offline', 'offline is reported before quiet hours');

// --- gate ordering
const now = at(12);
assert.strictEqual(S.gate({ now, due: false }).code, 'not_due');
assert.strictEqual(S.gate({ now, due: true, busy: 'autoSeo' }).code, 'busy');
assert.strictEqual(S.gate({ now, due: false, busy: 'x' }).code, 'not_due', 'not due wins over busy');
assert.strictEqual(S.gate({ now, due: true, state: { retryAt: now + M, lastCode: 'fail' } }).code, 'backoff');
assert.strictEqual(S.gate({ now, due: true, state: { retryAt: now + M, lastCode: 'not_allowed' } }).code, 'not_allowed');
assert.strictEqual(S.gate({ now, due: true, state: { retryAt: now - 1, lastCode: 'fail' }, env: { online: true } }).ok, true, 'expired backoff lets it run');
assert.strictEqual(S.gate({ now, due: true, env: { online: false } }).code, 'offline');
const ready = S.gate({ now, due: true, policy: {}, env: { online: true, battery: { level: 0.9, charging: false } } });
assert.strictEqual(ready.ok, true); assert.strictEqual(ready.code, 'ready');
const quiet = S.gate({ now: at(1), due: true, policy: q, env: {} });
assert.strictEqual(quiet.ok, false); assert.strictEqual(quiet.retryAt, at(1) + 6 * H, 'retry suggested at quiet end');

// --- record(): success resets and consumes the interval
let r = S.record({ failures: 3, retryAt: now + H }, { ok: true }, now);
assert.strictEqual(r.consumed, true); assert.strictEqual(r.state.failures, 0); assert.strictEqual(r.state.retryAt, 0); assert.strictEqual(r.state.lastOk, now);

// --- record(): a skipped run must NOT consume the schedule (the old bug: lastRun was stamped before the run)
r = S.record({}, { skipped: true, reason: 'busy' }, now);
assert.strictEqual(r.consumed, false); assert.strictEqual(r.state.retryAt, now + 5 * M); assert.strictEqual(r.state.failures, 0, 'skips are not failures');
r = S.record({}, { skipped: true, reason: 'not_allowed' }, now);
assert.strictEqual(r.consumed, false); assert.strictEqual(r.state.retryAt, now + H); assert.strictEqual(r.state.lastCode, 'not_allowed');

// --- record(): failures back off 15m, 1h, 3h, 6h and then give up until the next interval
let st = {}; const waits = [];
for (let i = 0; i < 4; i++) { r = S.record(st, { ok: false, error: 'net' }, now); assert.strictEqual(r.consumed, false); waits.push(r.state.retryAt - now); st = r.state; }
assert.deepStrictEqual(waits, [15 * M, H, 3 * H, 6 * H]);
assert.strictEqual(st.failures, 4);
r = S.record(st, { ok: false, error: 'net' }, now);
assert.strictEqual(r.consumed, true, 'fifth failure gives up and starts the interval over');
assert.strictEqual(r.state.failures, 0); assert.strictEqual(r.state.lastCode, 'gave_up'); assert.strictEqual(r.state.retryAt, 0);
assert.strictEqual(S.record({}, { ok: false, error: 'x'.repeat(500) }, now).state.lastError.length, 160);
r = S.record(st, { ok: true }, now); assert.strictEqual(r.state.failures, 0, 'a success after failures resets the counter');

// --- outcomeOf maps the app's run results
assert.deepStrictEqual(S.outcomeOf({ ok: true, summary: {} }), { ok: true });
assert.deepStrictEqual(S.outcomeOf({ ok: false, reason: 'busy' }), { skipped: true, reason: 'busy' });
assert.deepStrictEqual(S.outcomeOf({ ok: false, reason: 'no_bridge' }), { skipped: true, reason: 'no_bridge' });
assert.strictEqual(S.outcomeOf({ ok: false, summary: { error: 'boom' } }).error, 'boom');
assert.strictEqual(S.outcomeOf({ ok: false, summary: { error: 'boom' } }).ok, false);
assert.strictEqual(S.outcomeOf(undefined).ok, false, 'a run that returned nothing is not a success');
assert.ok(S.outcomeOf(null).error);

// --- describe / nextAt
assert.strictEqual(S.describe({ enabled: false }, now).code, 'off');
assert.strictEqual(S.nextAt(false, 0, 24, {}, now), 0);
assert.strictEqual(S.nextAt(true, now - 2 * H, 24, {}, now), now + 22 * H);
assert.strictEqual(S.nextAt(true, now - 30 * H, 24, { retryAt: now + 15 * M }, now), now + 15 * M, 'retry time wins when later than the interval');
assert.strictEqual(S.describe({ enabled: true, lastRun: now - 2 * H, hours: 24, state: {} }, now).code, 'not_due');
assert.strictEqual(S.describe({ enabled: true, lastRun: now - 30 * H, hours: 24, state: {} }, now).code, 'ready');
assert.strictEqual(S.describe({ enabled: true, lastRun: now - 30 * H, hours: 24, state: { retryAt: now + H, lastCode: 'fail' } }, now).code, 'backoff');
assert.strictEqual(S.describe({ enabled: true, lastRun: now, hours: 24, state: { lastCode: 'gave_up' } }, now).code, 'gave_up');
Object.keys(S.LABELS).forEach((k) => assert.ok(/[\u0600-\u06FF]/.test(S.LABELS[k]), 'label is Persian: ' + k));

console.log('scheduler tests OK');

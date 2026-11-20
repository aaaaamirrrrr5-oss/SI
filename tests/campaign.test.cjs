const assert = require('node:assert/strict');
const T = require('../www/techaudit.js'), K = require('../www/campaign.js');
const O = 'https://s.ir';
const body = (n, s) => { const W = 'قهوه چای دانه عطر طعم فنجان دستگاه آسیاب فشار دما آب زمان کیفیت تازه مزرعه شکلات بادام'.split(' '); let x = s * 7919 + 13, o = []; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; o.push(W[(x >>> 12) % W.length]); } return o.join(' '); };
const mk = (path, title, n, links, extra) => T.extractPage({ url: O + path, status: 200, html: '<html lang="fa"><head><title>' + title + '</title>' + (extra || '') + '</head><body><h1>' + title + '</h1><p>' + body(n, path.length) + '</p>' + (links || []).map((l) => '<a href="' + l + '">لینک</a>').join(' ') + '</body></html>' });
const prodSchema = '<script type="application/ld+json">{"@type":"Product","name":"x"}</script>';
const pages = [mk('/', 'فروشگاه قهوه', 100, ['/product/a', '/product/b', '/blog/x']), mk('/product/a', 'قهوه اسپرسو', 120, ['/'], prodSchema), mk('/product/b', 'قهوه ترک', 120, ['/'], prodSchema), mk('/product/c', 'قهوه فرانسه', 120, [], prodSchema), mk('/blog/x', 'آموزش دم کردن', 140, ['/'])];

assert.throws(() => K.create({ origin: 'nope' }));
const p = K.create({ origin: O + '/' });
assert.equal(p.origin, O); assert.equal(p.phases.p0.status, 'todo'); assert.equal(K.PHASES.length, 7);
assert.equal(K.nextAction(p).kind, 'profile');

K.setProfile(p, pages, {});
assert.equal(p.profile.kind, 'shop'); assert.equal(p.profile.language, 'fa'); assert.equal(p.profile.rtl, true);
assert.equal(p.profile.complete, false); assert.equal(p.phases.p0.status, 'active');
const na = K.nextAction(p); assert.equal(na.kind, 'questions'); assert.equal(na.questions.length, 4);
assert.ok(p.profile.types.product >= 3);

K.setProfile(p, pages, { goal: 'فروش', audience: 'علاقه‌مندان قهوه', region: 'کل ایران', competitors: ['a.ir'] });
assert.equal(p.profile.complete, true); assert.equal(p.phases.p0.status, 'done'); assert.equal(p.profile.kind, 'shop');
assert.equal(K.setProfile(K.create({ origin: O }), pages, { kind: 'content' }).profile.kind, 'content');
assert.equal(K.nextAction(p).kind, 'audit');

K.applyAudit(p, pages, { origin: O });
assert.ok(p.tasks.length > 0); assert.ok(p.baseline && p.last && p.last.health >= 0 && p.last.health <= 100);
for (let i = 1; i < p.tasks.length; i++) assert.ok(p.tasks[i - 1].score >= p.tasks[i].score);
assert.ok(p.tasks.every((t) => ['auto', 'approve', 'review'].includes(t.tier) && ['p1', 'p2', 'p3', 'p4'].includes(t.phase)));
assert.equal(K.tierOf('redirect_chain'), 'review'); assert.equal(K.tierOf('anchor_generic'), 'auto'); assert.equal(K.tierOf('no_subheadings'), 'approve');
assert.ok(['tasks', 'keymap'].includes(K.nextAction(p).kind));
K.applyKeymap(p, pages);
assert.ok(p.keymap && p.keymap.stats.mapped >= 4 && p.phases.p2.status);
assert.equal(K.nextAction(p).kind, 'tasks');
assert.ok(p.tasks.every((t) => ['tech', 'content', 'links', 'keymap'].includes(t.src)));
assert.equal(K.summary(p).keymap.total, p.keymap.stats.total);

const first = p.tasks[0]; K.setTask(p, first.id, 'done');
assert.equal(p.tasks.find((t) => t.id === first.id).status, 'done');
assert.throws(() => K.setTask(p, first.id, 'bad')); assert.equal(K.setTask(p, 'zzz', 'done'), null);
K.applyAudit(p, pages, { origin: O });                       // done state must survive a re-audit
assert.equal(p.tasks.find((t) => t.id === first.id).status, 'done');
K.applyAudit(p, pages, { origin: O }); assert.ok(p.tasks.some((t) => t.src === 'keymap') === (p.keymap.conflicts.length + p.keymap.gaps.length > 0 || p.keymap.pages.some((x) => x.confidence === 'low'))); assert.ok(p.log.length > 3);

const s = K.summary(p); assert.equal(s.phases.length, 7); assert.equal(s.open + 1 <= p.tasks.length, true);
const back = K.restore(K.serialize(p)); assert.deepEqual(back.profile, p.profile); assert.equal(back.tasks.length, p.tasks.length);
assert.throws(() => K.restore('{"v":2}'));
p.tasks.forEach((t) => { t.status = 'done'; }); assert.equal(K.nextAction(p).phase, 'p4');
console.log('campaign.test.cjs OK');

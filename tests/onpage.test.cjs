const assert = require('node:assert/strict');
const T = require('../www/techaudit.js'), K = require('../www/campaign.js'), M = require('../www/keymap.js'), O = require('../www/onpage.js');
const S = 'https://s.ir';
const fill = (n, s) => { const W = 'دانه عطر طعم فنجان دستگاه آسیاب فشار دما آب زمان کیفیت تازه مزرعه شکلات بادام'.split(' '); let x = s * 7919 + 13, o = []; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; o.push(W[(x >>> 12) % W.length]); } return o.join(' '); };
const pg = (path, head, h1, lead, n) => T.extractPage({ url: S + path, status: 200, html: '<html lang="fa"><head>' + head + '</head><body>' + h1 + '<p>' + lead + ' ' + fill(n, path.length) + '</p></body></html>' });
const t = (x) => '<title>' + x + '</title>', m = (x) => '<meta name="description" content="' + x + '">';
const pages = [
  pg('/', t('فروشگاه قهوه | برشت') + m('فروشگاه آنلاین قهوه تازه برشت با ارسال به سراسر کشور و دانه‌های برشته‌شده هر هفته'), '<h1>فروشگاه قهوه</h1>', 'قهوه تازه.', 90),
  pg('/a', t('قهوه اسپرسو تازه و برشته‌شده | برشت') + m('قهوه اسپرسو تازه و خوش‌طعم برای دستگاه‌های اسپرسو و موکاپات که هر هفته برشته می‌شود'), '<h1>قهوه اسپرسو</h1>', 'قهوه اسپرسو تازه و خوش‌طعم است. این جمله دوم است و درباره دانه است.', 130),
  pg('/b', t('قهوه ترک | برشت'), '<h1>قهوه ترک</h1>', 'قهوه ترک با آسیاب نرم و طعم قوی تهیه می‌شود و برای فنجان کوچک مناسب است.', 130),
  pg('/c', '', '<h1>آموزش دم کردن موکاپات</h1>', 'آموزش دم کردن موکاپات در خانه با آب و دما و زمان مناسب برای طعم بهتر انجام می‌شود.', 150),
  pg('/d', t('محصول') + m('کوتاه'), '<h1>محصول</h1><h1>دوباره</h1>', 'آسیاب قهوه برقی با کیفیت بالا و تیغه‌های فولادی برای آسیاب یکنواخت دانه‌ها ساخته شده است.', 130),
  pg('/e', t('قهوه ترک | برشت'), '<h1>قهوه ترک</h1>', 'قهوه ترک با آسیاب نرم.', 130),
];
assert.equal(O.detectBrand(pages), 'برشت');
const proj = K.create({ origin: S }); K.setProfile(proj, pages, { goal: 'فروش', audience: 'x', region: 'y', competitors: ['z'] });
M.setKeyword(proj, S + '/d', 'آسیاب قهوه برقی', 'transactional');
K.applyKeymap(proj, pages);
const op = O.analyze(pages, proj.keymap), item = (p) => op.items.find((i) => i.url === S + p), prop = (p, f) => (item(p) || { proposals: [] }).proposals.find((x) => x.field === f);

assert.equal(op.brand, 'برشت');
assert.ok(item('/c').codes.includes('title_missing') && item('/c').codes.includes('meta_missing'));
const ct = prop('/c', 'seo_title'), cm = prop('/c', 'meta_description');
assert.equal(ct.tier, 'auto'); assert.ok(ct.proposed.length <= 60 && ct.proposed.includes('موکاپات')); assert.ok(cm.tier === 'auto' && cm.proposed.length <= 160 && cm.proposed.length >= 70);
assert.ok(String(proj.keymap.pages.find((x) => x.url === S + '/c').keyword).length > 0);
assert.ok((pages[3].text || '').replace(/\s+/g, ' ').includes(cm.proposed.slice(0, 30)), 'meta comes from page text, nothing invented');
assert.ok(item('/b').codes.includes('meta_missing') && prop('/b', 'meta_description').tier === 'auto');
const d = item('/d'); assert.ok(d.codes.includes('h1_multiple') && d.codes.includes('meta_short') && d.codes.includes('title_short') && d.codes.includes('title_no_kw'));
assert.equal(prop('/d', 'seo_title').tier, 'approve'); assert.ok(prop('/d', 'seo_title').proposed.includes('آسیاب قهوه برقی')); assert.equal(prop('/d', 'meta_description').tier, 'approve');
assert.ok(item('/b').codes.includes('title_dup') && item('/e').codes.includes('title_dup'));
assert.ok(!item('/a'), 'a healthy page produces no issues');
assert.equal(prop('/d', 'focus_keyword').proposed, 'آسیاب قهوه برقی');
assert.ok(op.proposalsOk !== false && op.stats.checked === 6);

/* campaign integration */
assert.throws(() => K.applyOnpage(K.create({ origin: S }), pages));
K.applyOnpage(proj, pages);
assert.ok(proj.onpage.items.length && proj.tasks.some((x) => x.src === 'onpage' && x.phase === 'p3'));
const tk = proj.tasks.find((x) => x.id === 'onpage:title_missing'); assert.equal(tk.tier, 'auto'); assert.equal(tk.severity, 'high');
assert.equal(proj.tasks.find((x) => x.id === 'onpage:h1_multiple').tier, 'review');
K.setTask(proj, tk.id, 'done'); K.applyOnpage(proj, pages); assert.equal(proj.tasks.find((x) => x.id === tk.id).status, 'done');
K.applyAudit(proj, pages, { origin: S }); assert.ok(proj.tasks.some((x) => x.src === 'onpage'), 'audit keeps onpage tasks');

/* plan export: AUTO only until the owner accepts; H1 never exported */
let pl = K.plan(proj); assert.ok(pl.length); assert.ok(pl.every((x) => Object.keys(x.fields).every((f) => ['seo_title', 'meta_description', 'focus_keyword'].includes(f))));
assert.ok(!pl.some((x) => x.url === S + '/d' && x.fields.seo_title), 'APPROVE needs acceptance');
K.decide(proj, S + '/d', 'seo_title', 'accepted'); pl = K.plan(proj); assert.ok(pl.find((x) => x.url === S + '/d').fields.seo_title);
K.decide(proj, S + '/c', 'seo_title', 'rejected'); assert.ok(!(K.plan(proj).find((x) => x.url === S + '/c') || { fields: {} }).fields.seo_title);
assert.throws(() => K.decide(proj, S, 'seo_title', 'maybe'));
assert.equal(K.summary(proj).onpage.checked, 6);
assert.deepEqual(K.restore(K.serialize(proj)).decisions, proj.decisions);
console.log('onpage.test.cjs OK');

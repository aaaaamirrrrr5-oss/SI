const assert = require('node:assert/strict');
const T = require('../www/techaudit.js'), L = require('../www/linkgraph.js');
const O = 'https://s.ir';
const W = 'قهوه چای دانه برشت عطر طعم فنجان دستگاه آسیاب فشار دما آب زمان کیفیت تازه مزرعه برزیل کلمبیا اتیوپی شکلات بادام کارامل میوه ترش شیرین تلخ ملایم قوی سبک سنگین بسته ظرف نور رطوبت گرما سرد یخچال خانه اداره مهمان صبح عصر شب روزانه هفتگی ماهانه ارزان گران مناسب عالی ممتاز اصل ارگانیک طبیعی بهاره پاییزه لاهیجان گیلان شمال جنوب بازار فروشگاه سفارش ارسال سریع رایگان تخفیف هدیه گارانتی مشتری تجربه آموزش راهنما نکته اشتباه رایج انتخاب خرید نگهداری مصرف تهیه طبخ استخراج کرما پرتافیلتر موکاپات'.split(' ');
const prose = (n, seed, extra) => { let x = seed * 9301 + 49297, o = []; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; o.push(W[(x >>> 12) % W.length]); } return (extra || '') + ' ' + o.join(' '); };
const mk = (path, title, body, links) => T.extractPage({ url: O + path, status: 200, html: '<title>' + title + '</title><body><h1>' + title + '</h1><p>' + body + '</p>' + (links || []).map((l) => '<a href="' + (l.h || l) + '"' + (l.rel ? ' rel="' + l.rel + '"' : '') + '>' + (l.t == null ? 'لینک' : l.t) + '</a>').join(' ') + '</body>' });
const topic = (seed) => 'اسپرسو موکاپات پرتافیلتر کرما '.repeat(6);   // shared topic vocabulary
const pages = [
  mk('/', 'فروشگاه', prose(100, 1), ['/blog/a', '/blog/b', '/blog/c', '/blog/hub', '/product/p1']),
  mk('/blog/hub', 'راهنمای جامع قهوه', prose(120, 2), ['/', '/blog/a', '/blog/b', '/blog/c', '/product/p1', { h: '/blog/a', t: 'اینجا' }, { h: '/blog/b', t: 'ادامه' }, { h: '/blog/c', t: 'بیشتر' }]),
  mk('/blog/a', 'آموزش دم کردن اسپرسو', topic(1) + prose(150, 3), ['/', '/blog/hub']),
  mk('/blog/b', 'آموزش دم کردن موکاپات', topic(2) + prose(150, 4), ['/', '/blog/hub', { h: '/blog/a', t: 'آموزش دم کردن اسپرسو' }]),
  mk('/blog/c', 'نگهداری قهوه', prose(150, 5, 'نگهداری قهوه'), ['/', '/blog/hub', '/blog/a']),
  mk('/product/p1', 'دستگاه اسپرسو', topic(3) + prose(120, 6), ['/']),
  mk('/product/orphan', 'پرتافیلتر ممتاز', topic(4) + prose(120, 7), []),                         // zero inbound, zero outbound, same topic
  mk('/blog/dead', 'نکته‌های آسیاب', prose(130, 8), []),
  mk('/blog/over1', 'x سایت', prose(90, 9), [{ h: '/product/p1', t: 'خرید دستگاه اسپرسو ارزان' }, { h: '/blog/nofol', t: 'ن', rel: 'nofollow' }]),
];
for (let k = 2; k <= 7; k++) pages.push(mk('/blog/over' + k, 'مقاله ' + k, prose(90, 9 + k), [{ h: '/product/p1', t: 'خرید دستگاه اسپرسو ارزان' }, '/blog/hub']));
const r = L.analyze(pages);
const has = (c) => r.issues.some((i) => i.code === c), urls = (c) => (r.issues.find((i) => i.code === c) || { urls: [] }).urls;

/* PageRank sanity */
assert.equal(r.rank[O + '/blog/hub'].pr > r.rank[O + '/product/orphan'].pr, true);
assert.equal(r.rank[O + '/blog/hub'].pr === 100 || r.top[0].pr === 100, true);
assert.equal(r.rank[O + '/product/orphan'].inbound, 0);
assert.ok(r.top.length && r.top[0].pr === 100);
/* issues */
assert.ok(urls('no_inbound').includes(O + '/product/orphan') && urls('no_inbound').includes(O + '/blog/dead'));
assert.ok(urls('dead_end').includes(O + '/blog/dead') && urls('dead_end').includes(O + '/product/orphan'));
assert.ok(urls('anchor_generic').includes(O + '/blog/a') || urls('anchor_generic').includes(O + '/blog/b') || has('anchor_generic'));
assert.ok(urls('anchor_overoptimized').includes(O + '/product/p1'), JSON.stringify(r.issues.map((i) => i.code)));
assert.ok(!urls('no_inbound').includes(O + '/'));
/* nofollow links add no PR/inbound */
assert.equal(r.rank[O + '/blog/nofol'], undefined);
/* suggestions: orphan with same topic should receive links, with anchors, no existing links repeated */
const toOrphan = r.suggestions.filter((s) => s.to === O + '/product/orphan');
assert.ok(toOrphan.length >= 1, 'orphan not suggested');
assert.ok(toOrphan.every((s) => s.anchor && s.similarity >= 0.22));
assert.ok(r.suggestions.every((s) => s.from !== s.to));
const existing = new Set(); pages.forEach((p) => p.links.forEach((l) => existing.add(p.url + '>' + T.urlKey(l.href))));
assert.ok(r.suggestions.every((s) => !existing.has(s.from + '>' + T.urlKey(s.to))), 'suggested an existing link');
assert.ok(r.suggestions.length && r.suggestions[0].score >= r.suggestions[r.suggestions.length - 1].score);
/* anchor found verbatim inside the source text is flagged */
const pv = [mk('/', 'خانه', prose(100, 1), ['/blog/x', '/blog/y']), mk('/blog/x', 'آموزش دم کردن اسپرسو', topic(1) + prose(100, 3), ['/']),
  mk('/blog/y', 'مقالهٔ اصلی', 'در این مقاله دربارهٔ آموزش دم کردن اسپرسو در خانه صحبت می‌کنیم. ' + topic(1) + prose(100, 4), ['/']), mk('/blog/z', 'صفحه سوم', prose(100, 5), ['/']), mk('/blog/w', 'صفحه چهارم', prose(100, 6), ['/']), mk('/blog/v', 'صفحه پنجم', prose(100, 7), ['/'])];
const rv = L.analyze(pv); const sv = rv.suggestions.find((s) => s.from === O + '/blog/y' && s.to === O + '/blog/x');
assert.ok(sv && sv.inText === true && sv.anchor === 'آموزش دم کردن اسپرسو', JSON.stringify(rv.suggestions));
/* scale */
const big = []; for (let i = 0; i < 600; i++) big.push(mk('/blog/p' + i, 'مقاله ' + i, prose(120, 100 + i), ['/', '/blog/p' + ((i + 1) % 600), '/blog/p' + ((i * 7 + 3) % 600)]));
big.unshift(mk('/', 'خانه', prose(80, 99), ['/blog/p0']));
const t0 = Date.now(); const rb = L.analyze(big); const ms = Date.now() - t0;
assert.ok(ms < 20000 && rb.stats.pages === 601, ms);
console.log('linkgraph (PageRank, anchors, dead-ends, suggestions) tests OK (' + ms + 'ms for 601 pages)');

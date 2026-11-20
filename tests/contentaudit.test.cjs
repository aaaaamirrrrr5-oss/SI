const assert = require('node:assert/strict');
const T = require('../www/techaudit.js');
const C = require('../www/contentaudit.js');
const O = 'https://shop.ir';
const para = (s, n) => ('<p>' + s + '</p>').repeat(n);
const mk = (path, o = {}) => T.extractPage({ url: O + path, status: o.status || 200, html: '<html lang="fa"><head><title>' + (o.title || 'عنوان') + '</title>' + (o.head || '') + (o.noindex ? '<meta name="robots" content="noindex">' : '') + (o.canonical ? '<link rel="canonical" href="' + o.canonical + '">' : '') + '</head><body><h1>' + (o.h1 || o.title || 'عنوان') + '</h1>' + (o.body || '') + '</body></html>' });
const has = (r, c) => r.issues.some((i) => i.code === c);
const urlsOf = (r, c) => (r.issues.find((i) => i.code === c) || { urls: [] }).urls;

/* page types */
assert.equal(C.pageType(mk('/')), 'home');
assert.equal(C.pageType(mk('/product/espresso-beans')), 'product');
assert.equal(C.pageType(mk('/محصول/قهوه')), 'product');
assert.equal(C.pageType(mk('/product-category/coffee')), 'category');
assert.equal(C.pageType(mk('/blog/how-to-brew')), 'article');
assert.equal(C.pageType(mk('/2026/03/hello')), 'article');
assert.equal(C.pageType(mk('/tag/coffee')), 'archive');
assert.equal(C.pageType(mk('/cart')), 'utility');
assert.equal(C.pageType(mk('/about')), 'page');
assert.equal(C.pageType(mk('/x', { head: '<script type="application/ld+json">{"@type":"Product"}</script>' })), 'product');
assert.deepEqual(mk('/x', { head: '<script type="application/ld+json">{"@type":"Product"}</script>' }).schemaTypes, ['Product']);
assert.ok(mk('/h', { body: '<h2>الف</h2><h3>ب</h3>' }).headings.length === 3);

/* fixtures */
const A = 'دانه قهوه اسپرسو با برشت متوسط از مزارع برزیل تهیه می‌شود و طعم شکلاتی و بادامی ملایمی دارد. این دانه برای دستگاه اسپرسوساز و موکاپات مناسب است و عطر فوق‌العاده‌ای در فنجان به‌جا می‌گذارد. ';
const B = 'راهنمای دم‌آوری چای سبز شامل انتخاب برگ مناسب، دمای آب هشتاد درجه و مدت خیساندن دو دقیقه است. برای طعم متعادل هرگز از آب جوش استفاده نکنید و فنجان را قبل از ریختن چای گرم کنید. ';
const long = (seed, n) => seed.repeat(n);
const pages = [
  mk('/', { title: 'فروشگاه قهوه', body: para(long(A, 1), 3) }),
  mk('/product/thin', { title: 'قهوه عربیکا', body: '<p>قهوه خوب</p>' }),                                    // thin product
  mk('/blog/short', { title: 'آموزش دم کردن چای', body: '<p>' + 'چای ' + 'سبز '.repeat(30) + '</p>' }),    // thin article
  mk('/product/dup-a', { title: 'قهوه اسپرسو برزیل ۲۵۰ گرمی', body: para(long(A, 2), 2) }),
  mk('/product/dup-b', { title: 'اسپرسو برزیل قهوه بسته', body: para(long(A, 2), 2) }),                    // exact duplicate body of dup-a
  mk('/product/near', { title: 'قهوه دیگر کاملا متفاوت', body: para(long(A, 2).replace('برزیل', 'کلمبیا').replace('شکلاتی', 'کاراملی'), 2) }),
  mk('/blog/tea-1', { title: 'راهنمای دم کردن چای سبز', body: para(long(B, 3), 3) }),
  mk('/blog/tea-2', { title: 'دم کردن چای سبز راهنمای کامل', body: para(long(B, 3) + ' نکتهٔ اضافی دوم برای تمایز ', 3) }),    // cannibalization with tea-1 (similar topic, content)
  mk('/blog/long-no-h2', { title: 'نگهداری قهوه در خانه', body: '<p>' + 'نگهداری درست قهوه در ظرف دربسته و دور از نور و رطوبت و گرما باعث حفظ طعم می‌شود. هرگز دانه‌ها را در یخچال قرار ندهید چون بوی غذاها را جذب می‌کنند. برای مصرف روزانه مقدار کمی را در ظرف کوچک نگه دارید و بقیه را ببندید. '.repeat(14) + '</p>' }),
  mk('/blog/stuff', { title: 'خرید قهوه', body: '<p>' + 'خرید قهوه ارزان خرید قهوه عالی '.repeat(40) + '</p>' }),
  mk('/blog/mismatch', { title: 'آموزش عکاسی پرتره حرفه‌ای', body: '<h2>الف</h2>' + para(long(B, 2), 4) }),
  mk('/tag/coffee', { title: 'برچسب قهوه', body: para(A, 1) }),
  mk('/cart', { title: 'سبد خرید', body: '<p>خالی</p>' }),
  mk('/product/mushroom-a', { title: 'چای سبز ۲۵۰ گرمی', body: para('چای سبز ارگانیک بسته‌بندی ۲۵۰ گرمی با برگ‌های دست‌چین بهاره و عطر ملایم ', 8) }),
  mk('/product/mushroom-b', { title: 'چای سبز ۵۰۰ گرمی', body: para('چای سبز ارگانیک بسته‌بندی ۵۰۰ گرمی با برگ‌های دست‌چین بهاره و عطر ملایم ', 8) }),
  mk('/old', { status: 404, title: 'خطا' }),
];
const r = C.audit(pages);
for (const c of ['thin_content', 'duplicate_content', 'cannibalization', 'keyword_stuffing', 'title_not_in_content', 'archive_indexable', 'no_subheadings']) assert.ok(has(r, c), 'missing ' + c + ': ' + r.issues.map((i) => i.code));
assert.ok(urlsOf(r, 'thin_content').some((u) => u.endsWith('/product/thin')) && urlsOf(r, 'thin_content').some((u) => u.endsWith('/blog/short')));
assert.ok(!urlsOf(r, 'thin_content').some((u) => /\/cart|\/tag|\/old/.test(u)), 'utility/archive/404 must not be thin');
assert.ok(urlsOf(r, 'duplicate_content').some((u) => u.endsWith('dup-a')) && urlsOf(r, 'duplicate_content').some((u) => u.endsWith('dup-b')));
assert.ok(r.clusters.duplicates.length >= 1 && r.clusters.duplicates[0].exact);
const can = r.clusters.cannibalization.find((c) => c.others.concat(c.keep).some((u) => /tea-/.test(u)));
assert.ok(can && can.pages === 2 && can.type === 'article', JSON.stringify(r.clusters.cannibalization));
/* size variants must NOT be cannibalization */
assert.ok(!r.clusters.cannibalization.some((c) => [c.keep].concat(c.others).some((u) => /mushroom/.test(u))), 'size variants flagged');
assert.ok(urlsOf(r, 'keyword_stuffing').some((u) => u.endsWith('/blog/stuff')));
assert.ok(urlsOf(r, 'title_not_in_content').some((u) => u.endsWith('/blog/mismatch')));
assert.equal(r.perPage[O + '/blog/tea-1'].type, 'article');
assert.equal(r.stats.byType.article.pages >= 5, true);
assert.ok(r.score < 90);

/* clean site stays clean (varied prose, no artificial repetition) */
const WORDS = 'قهوه چای دانه برشت عطر طعم فنجان دستگاه آسیاب فشار دما آب زمان کیفیت تازه مزرعه برزیل کلمبیا اتیوپی شکلات بادام کارامل میوه ترش شیرین تلخ ملایم قوی سبک سنگین بسته ظرف نور رطوبت گرما سرد یخچال خانه اداره مهمان صبح عصر شب روزانه هفتگی ماهانه ارزان گران مناسب عالی ممتاز اصل ارگانیک طبیعی دست‌چین بهاره پاییزه لاهیجان گیلان شمال جنوب بازار فروشگاه سفارش ارسال سریع رایگان تخفیف هدیه گارانتی مشتری تجربه آموزش راهنما نکته اشتباه رایج انتخاب خرید نگهداری مصرف تهیه طبخ دم‌آوری استخراج کرما پرتافیلتر موکاپات فرنچ‌پرس ایروپرس قطره‌ای سرد جوش ترکی'.split(' ');
const prose = (n, seed) => { let x = seed * 9301 + 49297, out = []; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; out.push(WORDS[(x >>> 12) % WORDS.length]); if (i % 14 === 13) out.push('.'); } return out.join(' ').replace(/ \./g, '.'); };
const clean = [
  mk('/', { title: 'فروشگاه قهوه', body: para(prose(160, 1), 1) }),
  mk('/blog/brew', { title: 'روش دم کردن اسپرسو', body: '<h2>آماده‌سازی</h2>' + para('روش دم کردن اسپرسو. ' + prose(220, 2), 1) + '<h2>استخراج</h2>' + para(prose(220, 3), 1) + '<h2>نکته‌ها</h2>' + para(prose(120, 4), 1) }),
  mk('/product/a', { title: 'قهوه برزیل', body: para(prose(170, 5), 1) }),
  mk('/product/b', { title: 'چای ممتاز لاهیجان', body: para('چای ممتاز لاهیجان. ' + prose(170, 6), 1) }),
];
const rc = C.audit(clean);
assert.deepEqual(rc.issues.filter((i) => i.severity !== 'low').map((i) => i.code), [], JSON.stringify(rc.issues.map((i) => i.code)));
assert.ok(rc.score >= 85, rc.score);

/* scale: 700 distinct pages + one planted duplicate pair stays fast and finds the pair via banding */
const big = []; const bodies = []; const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const vocab = Array.from({ length: 600 }, (_, i) => 'واژه' + String.fromCharCode(1575 + (i % 30)) + String.fromCharCode(1575 + ((i * 7) % 30)) + String.fromCharCode(1575 + ((i * 13) % 28)));
for (let i = 0; i < 700; i++) { let t = ''; for (let k = 0; k < 90; k++) t += vocab[Math.floor(rnd() * vocab.length)] + ' '; bodies.push(t); big.push(mk('/blog/p' + i, { title: 'مقاله شماره ' + i + ' ' + vocab[i % 600], body: '<p>' + t + '</p>' })); }
big.push(T.extractPage({ url: O + '/blog/p-copy', status: 200, html: '<title>نسخهٔ کپی</title><body><h1>نسخهٔ کپی</h1><p>' + bodies[5] + '</p></body>' }));
const t0 = Date.now(); const rb = C.audit(big); const ms = Date.now() - t0;
assert.ok(urlsOf(rb, 'duplicate_content').some((u) => u.endsWith('/p-copy')) && urlsOf(rb, 'duplicate_content').some((u) => u.endsWith('/p5')), 'banded dup not found');
assert.ok(ms < 20000, 'too slow ' + ms);
console.log('contentaudit (types, thin, duplicates, cannibalization, stuffing) tests OK (' + ms + 'ms for 701 pages)');

/* v1.66: صفحه‌های کاربردی و صفحه‌بندی */
{
  ['/checkout/order-received/123/', '/wishlist/', '/compare/', '/lost-password/', '/thank-you/', '/مقایسه/'].forEach((pth) => assert.equal(C.pageType(mk(pth)), 'utility', pth));
  const thanks = C.audit([mk('/checkout/order-received/9/', { body: para('سفارش شما ثبت شد', 1) })]);
  assert.ok(!has(thanks, 'thin_content') && !has(thanks, 'weak_content'), 'utility pages are never thin');
  const pg = C.audit([mk('/product-category/coffee/page/2/', { body: para('فهرست محصولات قهوه', 1) }), mk('/blog/page/3/', { body: para('آرشیو وبلاگ', 1) })]);
  assert.ok(!has(pg, 'archive_indexable'), 'plain pagination is not flagged');
  const tg = C.audit([mk('/tag/coffee/', { body: para('آرشیو برچسب', 1) }), mk('/author/ali/', { body: para('نویسنده', 1) })]);
  assert.ok(has(tg, 'archive_indexable') && urlsOf(tg, 'archive_indexable').length === 2, 'tag/author archives still flagged');
}

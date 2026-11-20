const assert = require('assert'); const SC = require('../www/sitecheck.js');
const codes = (o) => SC.audit(o).map((i) => i.code);
const O = 'https://shop.ir';
// robots
let c = codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /wp-content/\nDisallow: /wp-content/uploads/\nCrawl-delay: 10\nNoindex: /x\nDisalow: /y\nSitemap: http://shop.ir/sitemap.xml' });
['robots_blocks_wp_assets', 'robots_blocks_images', 'robots_crawl_delay', 'robots_noindex_directive', 'robots_unknown_directive', 'robots_http_sitemap'].forEach((k) => assert.ok(c.includes(k), 'missing ' + k + ' in ' + c));
assert.deepStrictEqual(codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nSitemap: https://shop.ir/sitemap.xml' }), []);
assert.deepStrictEqual(codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /wp-content/\nAllow: /wp-content/' }), [], 'Allow overrides');
assert.ok(codes({ origin: O, robotsText: '<!DOCTYPE html><html>x</html>' }).includes('robots_html'));
assert.ok(codes({ origin: O, robotsText: 'User-agent: *\n' + 'Disallow: /a\n'.repeat(60000) }).includes('robots_large'));
assert.deepStrictEqual(codes({ origin: O }), [], 'nothing fetched → no verdict');
// sitemap
const u = (loc, d) => '<url><loc>' + loc + '</loc>' + (d ? '<lastmod>' + d + '</lastmod>' : '') + '</url>';
const wrap = (x) => '<?xml version="1.0"?><urlset>' + x + '</urlset>';
assert.ok(codes({ origin: O, sitemapText: wrap('') }).includes('sitemap_empty'));
const bad = wrap(Array.from({ length: 12 }, (_, i) => u('http://shop.ir/p' + i, '2026-01-01')).join('') + u('https://other.com/x', '2026-01-01') + u('http://shop.ir/p1', '2026-01-01') + u('https://shop.ir/?s=1', '2099-01-01') + u('https://shop.ir/cart/', '2026-01-01') + u('https://shop.ir/feed/', '2026-01-01'));
c = codes({ origin: O, sitemapText: bad });
['sitemap_http_urls', 'sitemap_foreign_host', 'sitemap_duplicate_urls', 'sitemap_junk_urls', 'sitemap_future_lastmod'].forEach((k) => assert.ok(c.includes(k), 'missing ' + k + ' in ' + c));
assert.ok(codes({ origin: O, sitemapText: wrap(Array.from({ length: 12 }, (_, i) => u('https://shop.ir/p' + i, '2026-01-01')).join('')) }).includes('sitemap_fake_lastmod'));
assert.ok(codes({ origin: O, sitemapText: wrap(Array.from({ length: 6 }, (_, i) => u('https://shop.ir/p' + i)).join('')) }).includes('sitemap_no_lastmod'));
assert.deepStrictEqual(codes({ origin: O, sitemapText: wrap(Array.from({ length: 12 }, (_, i) => u('https://www.shop.ir/p' + i, '2026-0' + (1 + i % 9) + '-1' + (i % 9))).join('')) }), [], 'www is same host; varied lastmod is clean');
assert.ok(codes({ origin: O, sitemapText: '<sitemapindex><sitemap><loc>https://shop.ir/a.xml</loc></sitemap></sitemapindex>' }).length === 0);
assert.ok(codes({ origin: O, sitemapText: wrap(Array.from({ length: 50001 }, (_, i) => u('https://shop.ir/p' + i)).join('')) }).includes('sitemap_too_many'));
// llms
assert.deepStrictEqual(codes({ origin: O, llmsText: '# فروشگاه نمونه\n> فروشگاه قهوه و تجهیزات دم‌آوری با ارسال سریع به سراسر کشور\n- [دریپر](https://shop.ir/drip): دریپر سرامیکی' }), []);
c = codes({ origin: O, llmsText: 'فروشگاه نمونه بدون قالب استاندارد و بدون هیچ لینکی در متن' });
['llms_no_title', 'llms_no_links', 'llms_thin'].forEach((k) => assert.ok(c.includes(k), 'missing ' + k));
// v1.64: چک‌های تازهٔ robots و نقشهٔ سایت
c = codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /' }); assert.ok(c.includes('robots_blocks_all'), c.join());
assert.ok(!codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /\nAllow: /shop/' }).includes('robots_blocks_all'), 'Allow برای زیرمسیر = بسته نیست');
assert.ok(!codes({ origin: O, robotsText: 'User-agent: Googlebot\nAllow: /\nUser-agent: *\nDisallow: /' }).includes('robots_blocks_all'), 'گروه گوگل مقدم است');
assert.ok(codes({ origin: O, robotsText: 'User-agent: Googlebot\nDisallow: /\nUser-agent: *\nAllow: /' }).includes('robots_blocks_all'));
assert.ok(codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /*.js$\nDisallow: /*.css$' }).includes('robots_blocks_css_js'));
assert.ok(!codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /*.js$\nAllow: /*.js$' }).includes('robots_blocks_css_js'));
assert.ok(codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /wp-content/plugins/' }).includes('robots_blocks_wp_assets'));
const sm3 = '<?xml version="1.0"?><urlset>' + u('https://shop.ir/shop/a', '2026-01-01') + u('https://shop.ir/cart/x', '2026-01-01') + u('https://shop.ir/p', '31/01/2026') + '</urlset>';
c = codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /cart/', sitemapText: sm3 });
assert.ok(c.includes('sitemap_blocked_by_robots') && c.includes('sitemap_bad_lastmod'), c.join());
assert.ok(!codes({ origin: O, sitemapText: sm3 }).includes('sitemap_blocked_by_robots'), 'بدون robots حکمی داده نمی‌شود');
assert.ok(!codes({ origin: O, robotsText: 'User-agent: *\nDisallow: /cart/', sitemapText: wrap(u('https://shop.ir/a', '2026-01-01T10:00:00+03:30')) }).some((x) => /bad_lastmod|blocked_by/.test(x)));
// area scores
const rep = { pages: [{ issues: [{ code: 'missing_title', severity: 'critical' }, { code: 'img_alt', severity: 'medium' }] }, { issues: [] }], siteIssues: [{ code: 'no_sitemap', severity: 'high' }, { code: 'robots_crawl_delay', severity: 'low' }] };
const a = Object.fromEntries(SC.areaScores(rep).map((x) => [x.id, x]));
assert.strictEqual(Object.keys(a).length, 7);
assert.ok(a.onpage.score < 100 && a.media.score < 100 && a.tech.score < 100 && a.schema.score === 100 && a.social.score === 100, JSON.stringify(a));
assert.strictEqual(a.tech.issues, 2);
assert.strictEqual(SC.areaScores({ pages: [] }).every((x) => x.score === 100), true);
console.log('sitecheck tests OK');

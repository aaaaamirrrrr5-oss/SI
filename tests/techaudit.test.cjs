const assert = require('node:assert/strict');
const T = require('../www/techaudit.js');
const O = 'https://shop.ir';
const page = (path, o = {}) => {
  const url = O + path;
  const head = '<title>' + (o.title == null ? 'عنوان ' + path + ' فروشگاه قهوه' : o.title) + '</title>' + (o.desc === null ? '' : '<meta name="description" content="' + (o.desc || 'توضیحات یکتا برای ' + path) + '">') + (o.robots ? '<meta name="robots" content="' + o.robots + '">' : '') +
    (o.canonical === null ? '' : '<link rel="canonical" href="' + (o.canonical || url) + '">') + (o.head || '') + '<link rel="stylesheet" href="/wp-content/themes/x/style.css">';
  const body = (o.links || []).map((l) => '<a href="' + l + '">لینک ' + l + '</a>').join(' ') + (o.body || '<h1>' + (o.h1 || 'تیتر ' + path) + '</h1><p>' + 'متن نمونه '.repeat(o.words || 80) + '</p>');
  return T.extractPage({ url, status: o.status || 200, hops: o.hops, headers: o.headers, html: '<html lang="fa"><head>' + head + '</head><body>' + body + '</body></html>' });
};
const codes = (r) => r.issues.map((i) => i.code);
const has = (r, c) => codes(r).includes(c);

/* extraction */
const ex = page('/a', { head: '<link rel="alternate" hreflang="fa" href="' + O + '/a"><link rel="alternate" hreflang="en" href="' + O + '/en/a">', robots: 'noindex, follow', links: ['/b', 'https://other.com/x', '#top', 'mailto:a@b.c'] });
assert.equal(ex.noindex, true); assert.equal(ex.nofollow, false); assert.equal(ex.hreflangs.length, 2); assert.equal(ex.links.length, 2);
assert.equal(ex.links.find((l) => l.href.endsWith('/b')).internal, true); assert.equal(ex.links.find((l) => /other/.test(l.href)).internal, false);
assert.equal(T.extractPage({ url: O + '/x', status: 200, headers: { 'X-Robots-Tag': 'noindex' }, html: '<title>t</title>' }).noindex, true);

/* robots matching */
const rb = T.parseRobots('User-agent: *\nDisallow: /private/\nDisallow: /*?s=\nAllow: /private/ok\nDisallow: /wp-content/uploads$\nSitemap: https://shop.ir/sitemap.xml');
assert.equal(T.robotsAllows(rb, 'googlebot', '/private/x'), false);
assert.equal(T.robotsAllows(rb, 'googlebot', '/private/ok/page'), true);
assert.equal(T.robotsAllows(rb, 'googlebot', '/search?s=abc'), false);
assert.equal(T.robotsAllows(rb, 'googlebot', '/wp-content/uploads'), false);
assert.equal(T.robotsAllows(rb, 'googlebot', '/wp-content/uploads/a.jpg'), true);
assert.equal(T.robotsAllows(T.parseRobots('User-agent: Googlebot\nDisallow: /\nUser-agent: *\nDisallow:'), 'googlebot', '/a'), false);
// v1.64: نام ربات فقط دقیق تطبیق می‌خورد (گروه «google» روی googlebot اثر ندارد)
assert.equal(T.robotsAllows(T.parseRobots('User-agent: google\nDisallow: /\nUser-agent: *\nAllow: /'), 'googlebot', '/a'), true);

/* healthy site: no serious issues */
const good = [
  page('/', { links: ['/a', '/b'] }), page('/a', { links: ['/', '/b'] }), page('/b', { links: ['/', '/a'] }),
];
const rg = T.audit(good, { origin: O, robotsTxt: 'User-agent: *\nDisallow: /wp-admin/\nSitemap: ' + O + '/sitemap.xml', sitemapUrls: [O + '/', O + '/a', O + '/b'], sitemapComplete: true });
assert.deepEqual(rg.issues.filter((i) => i.severity === 'critical' || i.severity === 'high').map((i) => i.code), [], JSON.stringify(codes(rg)));
assert.ok(rg.score >= 90, rg.score);
assert.equal(rg.stats.maxDepth, 1);

/* broken site: every check fires */
const bad = [
  page('/', { links: ['/old', '/gone', '/p1', '/nofollow-target', '/dup1', '/dup2'] }),
  page('/p1', { links: ['/p2'], canonical: O + '/canon-error' }),
  page('/p2', { links: ['/p3'] }), page('/p3', { links: ['/p4'] }), page('/p4', { links: ['/deep'] }), page('/deep', {}),
  page('/new', { hops: [{ url: O + '/old', status: 301 }, { url: O + '/mid', status: 301 }] }),
  page('/gone', { status: 404, body: '<h1>404</h1>' }),
  page('/error500', { status: 500 }),
  page('/soft', { title: 'صفحه یافت نشد', body: '<h1>یافت نشد</h1><p>ببخشید</p>' }),
  page('/noidx', { robots: 'noindex' }),
  page('/canon-error', { status: 404 }),
  page('/to-noindex', { canonical: O + '/noidx' }),
  page('/multi', { head: '<link rel="canonical" href="' + O + '/x1">' }),
  page('/Upper_Case', {}),
  page('/page/2/', { canonical: O + '/shop/' }),
  page('/dup1', { title: 'عنوان کاملا تکراری', desc: 'توضیح تکراری برای دو صفحه' }), page('/dup2', { title: 'عنوان کاملا تکراری', desc: 'توضیح تکراری برای دو صفحه' }),
  page('/hl', { head: '<link rel="alternate" hreflang="fa" href="' + O + '/hl"><link rel="alternate" hreflang="en" href="' + O + '/hl-en"><link rel="alternate" hreflang="farsi" href="' + O + '/hl-x"><link rel="alternate" hreflang="de" href="' + O + '/hl-de">' }),
  page('/hl-de', {}),
  page('/hl-en', { head: '<link rel="alternate" hreflang="fa" href="' + O + '/hl">' }),
  page('/orphan', {}),
  page('/q?utm_source=a&x=1', {}),
  page('/slash/'), page('/slash'),
  page('/mixed', { body: '<h1>m</h1><img src="http://cdn.x/a.jpg"><script src="http://cdn.x/a.js"></script>' + 'متن '.repeat(100) }),
];
bad[0].links.push({ href: O + '/new', text: 'x', rel: '', internal: true }); // link to redirected URL (requested /old)
bad[0].links.push({ href: O + '/old', text: 'x', rel: '', internal: true });
bad[0].links.push({ href: O + '/orphan2', text: 'x', rel: 'nofollow', internal: true });
const rbad = T.audit(bad, { origin: O, robotsTxt: 'User-agent: *\nDisallow: /wp-content/\nDisallow: /shop/\n', sitemapUrls: [O + '/gone', O + '/noidx', O + '/orphan', O + '/new', O + '/Upper_Case'], sitemapComplete: true });
for (const c of ['http_5xx', 'http_4xx', 'soft_404', 'redirect_chain', 'canonical_to_error', 'canonical_to_noindex', 'multi_canonical', 'url_uppercase', 'url_underscore', 'pagination_canonical_page1',
  'dup_title', 'dup_desc', 'hreflang_bad_code', 'hreflang_no_return', 'hreflang_no_self', 'deep_page', 'orphan_page', 'param_indexable', 'url_variants', 'mixed_content',
  'sitemap_error', 'sitemap_noindex', 'asset_blocked_robots', 'robots_no_sitemap', 'link_to_broken', 'link_to_redirect', 'missing_from_sitemap']) {
  assert.ok(has(rbad, c), 'missing ' + c + ' in ' + codes(rbad).join(','));
}
assert.ok(rbad.score < 30, rbad.score);
assert.equal(rbad.issues[0].severity, 'critical');
assert.equal(rbad.stats.statusCounts['5xx'], 1);

/* robots block-all + loops + http redirect */
const r3 = T.audit([page('/', {}), page('/loop', { hops: [{ url: O + '/loop', status: 301 }, { url: O + '/loop2', status: 301 }, { url: O + '/loop', status: 301 }] })], { origin: O, robotsTxt: 'User-agent: *\nDisallow: /' });
assert.ok(has(r3, 'robots_block_all') && has(r3, 'redirect_loop'));
const r4 = T.audit([T.extractPage({ url: 'http://shop.ir/', status: 200, html: '<title>x سایت</title><link rel="canonical" href="http://shop.ir/">' })], { origin: 'http://shop.ir' });
assert.ok(has(r4, 'not_https'));
console.log('techaudit (status, redirects, canonical, sitemap, robots, hreflang, depth, orphans) tests OK');

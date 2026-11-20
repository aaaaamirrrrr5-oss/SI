const assert = require('assert'); const SI = require('../www/engine.js');
// UA
assert.strictEqual(SI.classifyUA('Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.1; +https://openai.com/gptbot').id, 'GPTBot');
assert.strictEqual(SI.classifyUA('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)').vendor, 'Anthropic');
assert.strictEqual(SI.classifyUA('Mozilla/5.0 (compatible; Googlebot/2.1)').kind, 'search');
assert.strictEqual(SI.classifyUA('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36').kind, 'human');
assert.strictEqual(SI.classifyUA('python-requests/2.31').kind, 'other-bot');
// robots
const r = SI.analyzeRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: PerplexityBot\nDisallow: /private/\n\nUser-agent: *\nAllow: /\nSitemap: https://a.com/sitemap.xml');
const by = Object.fromEntries(r.bots.map((b) => [b.id, b.status]));
assert.strictEqual(by.GPTBot, 'blocked'); assert.strictEqual(by.PerplexityBot, 'partial'); assert.strictEqual(by.ClaudeBot, 'allowed');
assert.deepStrictEqual(r.sitemaps, ['https://a.com/sitemap.xml']);
assert.strictEqual(SI.analyzeRobots(null).found, false);
// v1.64 robots: RFC 9309 semantics
{
  const st = (txt, id) => SI.analyzeRobots(txt).bots.find((b) => b.id === id).status;
  // Allow برای زیرمسیر + Disallow ریشه → نیمه‌باز، نه کاملاً بسته
  assert.strictEqual(st('User-agent: GPTBot\nDisallow: /\nAllow: /blog/', 'GPTBot'), 'partial');
  // Allow: / هم‌مسیر Disallow: / است و Allow برنده است → کاملاً باز
  assert.strictEqual(st('User-agent: GPTBot\nDisallow: /\nAllow: /', 'GPTBot'), 'allowed');
  // گروه‌های هم‌نام ادغام می‌شوند (قبلاً فقط اولی خوانده می‌شد)
  assert.strictEqual(st('User-agent: GPTBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /', 'GPTBot'), 'allowed');
  assert.strictEqual(st('User-agent: GPTBot\nDisallow: /a\n\nUser-agent: GPTBot\nDisallow: /', 'GPTBot'), 'blocked');
  // گروه اختصاصی گروه * را کاملاً کنار می‌زند
  assert.strictEqual(st('User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nAllow: /', 'ClaudeBot'), 'allowed');
  assert.strictEqual(st('User-agent: *\nDisallow: /', 'ClaudeBot'), 'blocked');
  // wildcard و $
  assert.strictEqual(st('User-agent: *\nDisallow: /*', 'CCBot'), 'blocked');
  assert.strictEqual(st('User-agent: *\nDisallow: /*.pdf$', 'CCBot'), 'partial');
  // BOM و Disallow خالی
  assert.strictEqual(st('\uFEFFUser-agent: *\nDisallow:', 'CCBot'), 'allowed');
  // سایت‌مپ خالی ثبت نمی‌شود
  assert.deepStrictEqual(SI.analyzeRobots('Sitemap:\nUser-agent: *\nAllow: /').sitemaps, []);
}

// v1.64 pixel width estimate
{
  assert.ok(SI.pxWidth('Best Espresso Coffee Beans Whole Bean Arabica 1kg | Shop', 20) < 600);
  assert.ok(SI.pxWidth('W'.repeat(60), 20) > 600, 'wide caps overflow');
  assert.ok(SI.pxWidth('دریپر سرامیکی ۴ فنجان', 20) < 400);
  assert.strictEqual(SI.pxWidth('', 20), 0);
  const long = 'W'.repeat(60); // 60 chars (<=65) but wide
  const pg = SI.analyzePage('<html lang="fa"><head><title>' + long + '</title></head><body><h1>x</h1></body></html>', 'https://a.ir/', 200);
  assert.ok(pg.issues.some((i) => i.code === 'title_px_long'));
  const ok = SI.analyzePage('<html lang="fa"><head><title>دریپر سرامیکی ۴ فنجان | فروشگاه قهوه</title></head><body><h1>x</h1></body></html>', 'https://a.ir/', 200);
  assert.ok(!ok.issues.some((i) => i.code === 'title_px_long'));
}
// referrer
assert.strictEqual(SI.classifyReferrer('https://chatgpt.com/', 'a.com').type, 'ai');
assert.strictEqual(SI.classifyReferrer('https://www.perplexity.ai/search?q=x', 'a.com').type, 'ai');
const g = SI.classifyReferrer('https://www.bing.com/search?q=%D8%B3%D8%A6%D9%88', 'a.com'); assert.strictEqual(g.type, 'search'); assert.strictEqual(g.keyword, 'سئو');
assert.strictEqual(SI.classifyReferrer('https://www.google.com/', 'a.com').keyword, '');
assert.strictEqual(SI.classifyReferrer('https://t.me/chan', 'a.com').source, 'Telegram');
assert.strictEqual(SI.classifyReferrer('-', 'a.com').type, 'direct');
assert.strictEqual(SI.classifyReferrer('https://a.com/x', 'a.com').type, 'internal');
// logs
const L = [
 '1.2.3.4 - - [10/Nov/2026:10:00:01 +0000] "GET /blog/seo HTTP/1.1" 200 5123 "https://www.google.com/" "Mozilla/5.0 Chrome/120"',
 '1.2.3.5 - - [10/Nov/2026:10:01:01 +0000] "GET /blog/seo HTTP/1.1" 200 5123 "https://chatgpt.com/" "Mozilla/5.0 Chrome/120"',
 '20.1.1.1 - - [10/Nov/2026:11:00:00 +0000] "GET /blog/seo HTTP/1.1" 200 5123 "-" "Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.1)"',
 '20.1.1.2 - - [11/Nov/2026:11:00:00 +0000] "GET /about HTTP/1.1" 403 12 "-" "Mozilla/5.0 (compatible; ClaudeBot/1.0)"',
 '66.1.1.1 - - [11/Nov/2026:12:00:00 +0000] "GET /robots.txt HTTP/1.1" 200 90 "-" "Googlebot/2.1"',
 '1.2.3.4 - - [11/Nov/2026:12:00:00 +0000] "GET /style.css HTTP/1.1" 200 90 "https://a.com/" "Mozilla/5.0 Chrome"',
 '1.2.3.9 - - [11/Nov/2026:12:30:00 +0000] "GET /?utm_source=newsletter&utm_medium=email HTTP/1.1" 200 90 "-" "Mozilla/5.0 Chrome"',
 'garbage line',
 JSON.stringify({ time: '2026-11-11T13:00:00Z', method: 'GET', uri: '/p', status: 200, http_referer: 'https://t.me/x', http_user_agent: 'Mozilla/5.0 Chrome' }),
];
const a = SI.createLogAnalyzer('a.com'); L.forEach((l) => a.add(l)); const res = a.result();
assert.strictEqual(res.parsed, 8); assert.strictEqual(res.skipped, 1);
assert.strictEqual(res.totals.human, 4); assert.strictEqual(res.totals.aiBots, 2); assert.strictEqual(res.totals.searchBots, 1); assert.strictEqual(res.totals.aiReferrals, 1);
assert.strictEqual(res.ai.find((x) => x.id === 'ClaudeBot').blocked, 1);
assert.strictEqual(res.aiPages[0][0], '/blog/seo');
assert.strictEqual(res.utm[0][0], 'newsletter / email');
assert.ok(res.sources.some((s) => s.source === 'Telegram'));
assert.ok(res.from < res.to);
// html
const html = '<html lang="fa"><head><title>سلام</title><meta name="viewport" content="width=device-width"></head><body><h1>a</h1><h1>b</h1><img src=x><img src=y alt=""><a href="/x">x</a><a href="https://o.com">o</a></body></html>';
const p = SI.analyzePage(html, 'https://a.com/', 200); const codes = p.issues.map((i) => i.code);
['short_title', 'missing_desc', 'multi_h1', 'img_alt', 'thin', 'no_canonical', 'no_schema'].forEach((c) => assert.ok(codes.includes(c), c));
assert.ok(!codes.includes('no_viewport')); assert.strictEqual(p.facts.internalLinks, 1); assert.strictEqual(p.facts.externalLinks, 1); assert.strictEqual(p.facts.imagesNoAlt, 1);
assert.deepStrictEqual(SI.parseSitemap('<urlset><url><loc>https://a.com/1</loc></url><url><loc> https://a.com/2?a=1&amp;b=2 </loc></url></urlset>').locs, ['https://a.com/1', 'https://a.com/2?a=1&b=2']);
const sc = SI.scoreIssues([p], []); assert.ok(sc >= 0 && sc < 100);
// AI adapters
const rep = { site: 'a.com', scores: { seo: 70 }, counts: {}, flags: {}, pages: [p], siteIssues: [], robots: r };
const ctx = SI.buildAIContext(rep, res, { site: { name: 'x' } }); const cj = JSON.parse(ctx);
assert.ok(cj.scan.topIssues.length > 0 && cj.aiBotVisits.length === 2 && cj.wordpress.site.name === 'x' && cj.traffic.totals.human === 4);
assert.deepStrictEqual(Object.keys(SI.AI_PROVIDERS).sort(), ['builtin', 'device-local']);
assert.throws(() => SI.aiRequest({ provider: 'openai', key: 'k' }, ctx, [{ role: 'user', content: 'سلام' }]), /سرویس شبکه‌ای/);
assert.throws(() => SI.aiRequest({ provider: 'anthropic', key: 'k' }, ctx, [{ role: 'user', content: 'x' }]), /سرویس شبکه‌ای/);
assert.throws(() => SI.aiRequest({ provider: 'custom', model: 'qwen3:0.6b', base: 'https://ai.example.test/v1', key: 'test-key' }, ctx, [{ role: 'user', content: 'x' }]), /سرویس شبکه‌ای/);
assert.throws(() => SI.aiRequest({ provider: 'device-local' }, ctx, []), /LiteRT داخلی/);
assert.throws(() => SI.aiRequest({ provider: 'builtin' }, ctx, []), /قاعده‌محور/);
assert.throws(() => SI.aiParse({ provider: 'openai' }, { choices: [{ message: { content: 'hi' } }] }), /پاسخ مدل باید/);
assert.throws(() => SI.aiParse({ provider: 'device-local' }, { error: { message: 'bad model' } }), /bad model/);
console.log('engine tests OK');

// v1.57 new page checks + chat helpers
{
  const html = '<html lang="fa"><head><title>دریپر هاریو V60 سرامیکی</title><meta name="description" content="کوتاه"><link rel="canonical" href="https://other.com/x"></head><body><h1>دریپر</h1><div class="single_add_to_cart_button">x</div><script type="application/ld+json">{"@type":"Product","name":"d"}</script><img src=a.jpg alt=a><img src=b.jpg alt=b><img src=c.jpg alt=c><a href="/x">اینجا</a><a href="/y">اینجا</a><a href="/z">اینجا</a><p>' + 'متن فارسی نمونه '.repeat(60) + '</p></body></html>';
  const pg = SI.analyzePage(html, 'https://shop.ir/product/v60', 200); const codes = pg.issues.map((i) => i.code);
  ['short_desc', 'canonical_offsite', 'no_rtl', 'generic_anchor', 'img_dims', 'product_schema_offer', 'product_schema_ids'].forEach((c) => assert.ok(codes.includes(c), 'missing ' + c));
  const ok = SI.analyzePage('<html lang="fa" dir="rtl"><head><title>یک عنوان مناسب برای صفحه</title></head><body><p>x</p></body></html>', 'https://shop.ir/', 200).issues.map((i) => i.code);
  assert.ok(!ok.includes('no_rtl') && !ok.includes('product_no_schema'));
  const rep = SI.buildReport('https://shop.ir', 'shop.ir', [pg], SI.analyzeRobots(null), { llms: false, sitemap: false }, []);
  const d = SI.analysisDigest(rep, null, null); assert.ok(d.priorities.length && d.priorities[0].rank === 1); assert.ok(d.dataGaps.some((x) => /لاگ/.test(x)));
  const big = { products: Array.from({ length: 500 }, (_, i) => 'محصول شمارهٔ ' + i + ' با توضیح بلند '.repeat(6)) };
  const ctx = SI.buildAIContext(rep, null, big, 3000); assert.ok(JSON.parse(ctx).digest, 'context must stay valid JSON'); assert.ok(ctx.length <= 3500);
  assert.deepStrictEqual(SI.chatNumberIssues('امتیاز ۷۲ از ۱۰۰ و ۳۳۱ صفحه؛ اولویت ۱', '{"seo":72,"pages":100}', ''), ['331']);
  assert.ok(/۳ اقدام/.test(SI.chatIntentHint('از کجا شروع کنم؟')));
  const pr = SI.buildChatPrompt({ question: 'چرا امتیاز پایین است؟', report: rep, history: [{ role: 'assistant', content: 'پاسخ<small>x</small>' }] });
  assert.ok(pr.includes('پرسش فعلی') && !pr.includes('<small>') && pr.includes('تشخیص علت'));
  assert.ok(SI.chatChips(rep, null, null).length >= 2);
  console.log('engine v1.57 (checks, digest, chat helpers) OK');
}

// v1.58 دقت تحلیل
{
  const codesOf = (h, u, s) => SI.analyzePage(h, u || 'https://shop.ir/blog/x', s || 200).issues.map((i) => i.code);
  const filler = (n) => 'متن فارسی نمونهٔ مفید '.repeat(n);
  // صفحهٔ خطا فقط یک خطا می‌گیرد، نه فهرست «عنوان ندارد/H1 ندارد…»
  assert.deepStrictEqual(codesOf('', 'https://shop.ir/a', 599), ['http_error']);
  assert.deepStrictEqual(codesOf('{"a":1}', 'https://shop.ir/a', 200), ['not_html']);
  // منو و فوتر در شمارش واژه/لینک داخلی حساب نمی‌شوند
  const nav = '<nav>' + '<a href="/a">الف</a>'.repeat(20) + '</nav>';
  const pg = SI.analyzePage('<html lang="fa" dir="rtl"><head><title>عنوان نمونهٔ مناسب برای صفحه</title></head><body>' + nav + '<main><h1>تیتر</h1><p>' + filler(40) + '</p></main><footer>' + filler(200) + '</footer></body></html>', 'https://shop.ir/blog/x', 200);
  assert.ok(pg.facts.words < 200 && pg.facts.wordsAll > 400, 'words=' + pg.facts.words);
  assert.ok(pg.facts.internalLinks >= 20 && pg.facts.contentInternalLinks === 0);
  assert.ok(codesOf(pg.facts && '<html lang="fa" dir="rtl"><head><title>عنوان نمونهٔ مناسب برای صفحه</title></head><body>' + nav + '<main><h1>تیتر</h1><p>' + filler(100) + '</p></main></body></html>').includes('few_internal'));
  // نیم‌فاصله یک واژه را دو تا نمی‌کند
  assert.strictEqual(SI.analyzePage('<html><body><p>می‌خواهم می‌روم</p>' + '<p>' + 'الف '.repeat(30) + '</p></body></html>', 'https://a.ir/x', 200).facts.words, 32);
  // www و بدون www یکی‌اند؛ canonical دامنهٔ دیگر هنوز پیدا می‌شود
  const www = SI.analyzePage('<html><head><link rel="canonical" href="https://shop.ir/blog/x"></head><body><a href="https://www.shop.ir/q">q</a></body></html>', 'https://www.shop.ir/blog/x', 200);
  assert.ok(www.facts.internalLinks === 1 && !www.issues.some((i) => i.code === 'canonical_offsite'));
  assert.ok(codesOf('<html><head><link rel="canonical" href="https://other.com/x"></head><body><p>x</p></body></html>').includes('canonical_offsite'));
  assert.ok(codesOf('<html><head><link rel="canonical" href="/a"><link rel="canonical" href="/b"></head><body></body></html>').includes('multi_canonical'));
  // مقدار داخل کوتیشن با نام ویژگی اشتباه گرفته نشود
  assert.strictEqual(SI.analyzePage('<html><head><meta data-x="name=description" content="x"><meta name="description" content="' + 'توضیح مناسب '.repeat(10) + '"></head><body></body></html>', 'https://a.ir/', 200).facts.descLen, 120);
  assert.strictEqual(SI.analyzePage('<html><body><img src="a.jpg" data-alt="x"><img src="b.jpg" alt=""></body></html>', 'https://a.ir/', 200).facts.imagesNoAlt, 1);
  // پیکسل ردیابی و noscript حساب نمی‌شود
  assert.strictEqual(SI.analyzePage('<html><body><img src="a.jpg" alt="a"><img src="t.gif" width="1" height="1"><noscript><img src="a.jpg"></noscript></body></html>', 'https://a.ir/', 200).facts.images, 1);
  // H1 خالی، H1 لوگو با alt، noindex از googlebot، lang اشتباه
  assert.ok(codesOf('<html><body><h1> </h1></body></html>').includes('empty_h1'));
  assert.ok(!codesOf('<html><body><h1><a><img src="l.png" alt="لوگو"></a></h1></body></html>').includes('empty_h1'));
  assert.ok(SI.analyzePage('<html><head><meta name="googlebot" content="noindex,follow"></head><body></body></html>', 'https://a.ir/x', 200).facts.noindex);
  assert.ok(codesOf('<html lang="en-US"><body><main><p>' + filler(40) + '</p></main></body></html>').includes('lang_mismatch'));
  assert.ok(!codesOf('<html lang="fa-IR" dir="rtl"><body><main><p>' + filler(40) + '</p></main></body></html>').some((c) => c === 'lang_mismatch' || c === 'no_rtl'));
  // FAQ فقط از تیتر/اسکیما، نه از لینک «FAQ» در منو
  assert.ok(!SI.analyzePage('<html><body><nav><a href="/faq">FAQ</a></nav><main><p>' + filler(20) + '</p></main></body></html>', 'https://a.ir/x', 200).facts.hasFaq);
  assert.ok(SI.analyzePage('<html><body><main><h2><span>پرسش‌های متداول</span></h2></main></body></html>', 'https://a.ir/x', 200).facts.hasFaq);
  // soft-404
  assert.ok(codesOf('<html><head><title>صفحه مورد نظر یافت نشد</title></head><body><h1>404</h1><p>x</p></body></html>').includes('soft_404'));
  // JSON-LD: @graph، نوع آرایه‌ای، JSON خراب
  const ldp = (o) => '<html lang="fa"><body><div class="single_add_to_cart_button"></div><script type="application/ld+json">' + o + '</script></body></html>';
  const full = SI.analyzePage(ldp(JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', name: 'o', brand: 'b', sku: 'x' }, { '@type': ['Product', 'Thing'], name: 'p', sku: '1', brand: { '@type': 'Brand', name: 'b' }, offers: { '@type': 'Offer', price: '10', priceCurrency: 'IRR', availability: 'https://schema.org/InStock' } }] })), 'https://shop.ir/product/p', 200);
  assert.ok(full.facts.schemaTypes.includes('Product') && full.facts.schemaTypes.includes('Organization'));
  assert.ok(!full.issues.some((i) => /^product_(no_schema|schema_offer|schema_ids)$/.test(i.code)), 'product schema should be complete: ' + full.issues.map((i) => i.code));
  // brand/offers در Organization به حساب Product نمی‌آید
  const wrong = SI.analyzePage(ldp(JSON.stringify([{ '@type': 'Organization', brand: 'b', offers: { price: '1', availability: 'x' } }, { '@type': 'Product', name: 'p' }])), 'https://shop.ir/product/p', 200);
  const off = wrong.issues.find((i) => i.code === 'product_schema_offer'); assert.ok(off && /priceCurrency/.test(off.detail));
  assert.ok(codesOf(ldp('{"@type":"Product", broken')).includes('schema_invalid') && !codesOf(ldp('{"@type":"Product", broken')).includes('product_schema_offer'));
  // تکراری‌ها در buildReport؛ اجرای دوباره چیزی اضافه نمی‌کند؛ صفحهٔ خطا در امتیاز AI حساب نمی‌شود
  const mk = (path, t, d) => SI.analyzePage('<html lang="fa" dir="rtl"><head><title>' + t + '</title><meta name="description" content="' + d + '"><meta name="viewport" content="width=device-width"></head><body><main><h1>' + t + '</h1><p>' + filler(40) + '</p></main></body></html>', 'https://a.ir' + path, 200);
  const dupD = 'توضیحات یکسان برای دو صفحهٔ مختلف سایت';
  const A = mk('/a', 'عنوان یکسان برای دو صفحه', dupD), B = mk('/b', 'عنوان یکسان برای دو صفحه', dupD), C = mk('/c', 'عنوان یکتای سوم برای صفحه', 'توضیح یکتا و جدا برای صفحهٔ سوم سایت'); const E = SI.analyzePage('', 'https://a.ir/e', 404);
  const rp = SI.buildReport('https://a.ir/', 'a.ir', [A, B, C, E], SI.analyzeRobots(null), {}, []);
  const dc = (p) => p.issues.map((i) => i.code);
  assert.ok(dc(A).includes('dup_title') && dc(B).includes('dup_title') && dc(A).includes('dup_desc') && dc(A).includes('dup_h1') && !dc(C).includes('dup_title'));
  SI.crossPageChecks([A, B, C, E]); assert.strictEqual(dc(A).filter((c) => c === 'dup_title').length, 1);
  assert.strictEqual(rp.aiParts.find((x) => x[0] === 'داده ساختاریافته')[1], 0);
  // نمونه‌گیری نمایندهٔ سایت‌مپ
  const locs = []; for (let i = 0; i < 60; i++) locs.push(['https://www.a.ir/post-' + i, 'post-sitemap.xml']); for (let i = 0; i < 40; i++) locs.push(['https://a.ir/product/p' + i, 'product-sitemap.xml']); locs.push(['https://b.ir/x', 'x']); locs.push(['https://a.ir/img.jpg', 'x']);
  const smp = SI.sampleUrls(locs, 'https://a.ir/', 10);
  assert.strictEqual(smp.length, 10); assert.ok(smp.filter((u) => /product/.test(u)).length >= 4 && smp.filter((u) => /post-/.test(u)).length >= 4, smp.join(' '));
  assert.ok(!smp.some((u) => /b\.ir|\.jpg/.test(u)) && new Set(smp).size === 10);
  assert.ok(smp.some((u) => /post-(?!0$)\d+$/.test(u)) && !smp.slice(0, 10).every((u) => /post-[0-4]$|p[0-4]$/.test(u)), 'sampling must not just take the first URLs');
  assert.strictEqual(SI.sampleUrls(['https://a.ir/x', 'https://a.ir/x/'], 'https://a.ir/', 24).length, 1);
  console.log('engine v1.58 (precision checks, JSON-LD, duplicates, sampling) OK');
}

// v1.60 بررسی‌های تازهٔ سئو
{
  const codesOf = (h, u, s) => SI.analyzePage(h, u || 'https://shop.ir/blog/x', s || 200).issues.map((i) => i.code);
  const filler = (n) => 'متن فارسی نمونهٔ مفید '.repeat(n);
  const imgs = (n, ext, extra) => Array.from({ length: n }, (_, i) => '<img src="/u/p' + i + '.' + ext + '" alt="تصویر ' + i + '" width="100" height="100"' + (extra || '') + '>').join('');
  // صفحهٔ ضعیف: همهٔ بررسی‌های تازه باید پیدا شوند
  const bad = '<html lang="fa" dir="rtl"><head><title>خرید خرید خرید قهوه</title><meta name="description" content="خرید خرید خرید قهوه"><meta property="og:title" content="t"><meta property="og:description" content="d"><script type="application/ld+json">{"@type":"WebSite","name":"x"}</script></head><body><main><h1>تیتر</h1><p>' + filler(150) + '</p>' +
    '<img src="/a/IMG_1234.jpg" alt="IMG_1234.jpg" width="9" height="9"><img src="/a/b.png" alt="' + 'الف'.repeat(130) + '" width="9" height="9">' + imgs(6, 'jpg') + '<a href="http://shop.ir/old">قدیمی</a><time datetime="2026-01-01">x</time></main></body></html>';
  const c = codesOf(bad);
  ['no_twitter_card', 'no_og_image', 'no_charset', 'img_alt_filename', 'img_alt_long', 'img_no_lazy', 'img_legacy_format', 'title_stuffed', 'desc_equals_title', 'no_article_schema', 'http_internal_links', 'no_external_links', 'no_max_image_preview'].forEach((k) => assert.ok(c.includes(k), 'missing ' + k + ' in ' + c.join(',')));
  // no_h2: متن متوسط بدون زیرتیتر؛ متن ۶۰۰+ واژه‌ای با no_extractable پوشش داده می‌شود (هشدار تکراری نمی‌دهد)
  assert.ok(codesOf('<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>یک عنوان مناسب برای این صفحه</title></head><body><main><h1>تیتر</h1><p>' + filler(100) + '</p></main></body></html>').includes('no_h2'));
  assert.ok(!c.includes('no_h2') && c.includes('no_extractable'));
  // صفحهٔ اصلی بدون نماد و بدون اسکیمای سازمان
  const home = codesOf('<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>فروشگاه قهوهٔ نمونه | خانه</title><script type="application/ld+json">{"@type":"BreadcrumbList"}</script></head><body><p>x</p></body></html>', 'https://shop.ir/');
  assert.ok(home.includes('no_favicon') && home.includes('no_org_schema') && !home.includes('no_charset'), home.join(','));
  // صفحهٔ سالم: هیچ‌کدام از بررسی‌های تازه نباید هشدار الکی بدهد
  const NEW = ['no_twitter_card', 'no_og_image', 'no_favicon', 'no_charset', 'img_alt_filename', 'img_alt_long', 'img_no_lazy', 'img_legacy_format', 'title_stuffed', 'desc_equals_title', 'no_org_schema', 'no_article_schema', 'no_h2', 'http_internal_links', 'no_external_links', 'no_max_image_preview'];
  const good = '<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>راهنمای انتخاب دانهٔ قهوه برای دم‌آوری</title><meta name="description" content="در این راهنما تفاوت رست روشن و تیره، آسیاب مناسب هر روش دم‌آوری و نحوهٔ نگهداری دانه را مرحله‌به‌مرحله می‌خوانید."><meta name="robots" content="index,follow,max-image-preview:large"><meta name="twitter:card" content="summary_large_image"><meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="https://shop.ir/i.jpg"><link rel="icon" href="/f.ico"><script type="application/ld+json">{"@type":"BlogPosting","headline":"x","author":{"@type":"Person","name":"علی"}}</script></head><body><main><article><h1>راهنما</h1><h2>رست</h2><p>' + filler(150) + '</p><h2>آسیاب</h2><p>' + filler(10) + '</p>' + imgs(6, 'webp', ' loading="lazy"') + '<a href="https://example.org/ref">منبع</a><a href="/blog/a">مطلب اول</a><a href="/blog/b">مطلب دوم</a></article></main></body></html>';
  const gc = codesOf(good);
  NEW.forEach((k) => assert.ok(!gc.includes(k), 'false positive ' + k + ' in ' + gc.join(',')));
  console.log('engine v1.60 (16 new SEO checks) OK');
}

// v1.61 بررسی‌های عمیق‌تر
{
  const codesOf = (h, u) => SI.analyzePage(h, u || 'https://shop.ir/blog/x', 200).issues.map((i) => i.code);
  const filler = (n) => 'متن فارسی نمونهٔ مفید '.repeat(n);
  const NEW = ['nofollow_page', 'nosnippet', 'multi_title', 'multi_desc', 'meta_refresh', 'canonical_params', 'og_url_mismatch', 'no_apple_touch_icon', 'long_h1', 'empty_links', 'many_links', 'large_html', 'big_dom', 'render_blocking_scripts', 'js_rendered', 'img_no_srcset', 'lcp_image_lazy', 'product_schema_image', 'product_no_rating', 'article_schema_fields', 'faq_no_schema', 'video_no_schema', 'stale_content'];
  const scripts = Array.from({ length: 5 }, (_, i) => '<script src="/s' + i + '.js"></script>').join('');
  const bad = '<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>عنوان اول صفحه</title><title>عنوان دوم</title><meta name="description" content="توضیح اول"><meta name="description" content="توضیح دوم"><meta name="robots" content="nofollow,max-snippet:0"><meta http-equiv="refresh" content="5; url=/new"><link rel="canonical" href="https://shop.ir/blog/x?a=1"><meta property="og:url" content="https://shop.ir/other">' + scripts +
    '<script type="application/ld+json">{"@type":"BlogPosting","headline":"x","dateModified":"2019-01-01"}</script></head><body><main><h1>' + 'تیتر خیلی طولانی '.repeat(6) + '</h1><p>' + filler(150) + '</p><h2>چطور انتخاب کنیم؟</h2><p>پاسخ کامل و طولانی بیش از بیست نویسه.</p><h2>چقدر هزینه دارد؟</h2><p>پاسخ دوم هم بیش از بیست نویسه است.</p>' +
    '<img src="/a.jpg" loading="lazy" alt="الف" width="9" height="9"><img src="/b.jpg" alt="ب" width="9" height="9"><img src="/c.jpg" alt="ج" width="9" height="9"><img src="/d.jpg" alt="د" width="9" height="9">' +
    '<iframe src="https://www.youtube.com/embed/x"></iframe><a href="/e1"></a><a href="/e2"></a><a href="/e3"></a>' + Array.from({ length: 301 }, (_, i) => '<a href="/p' + i + '">ل' + i + '</a>').join('') + '<i></i>'.repeat(3000) + '</main></body></html><!-- ' + 'x'.repeat(1000100) + ' -->';
  const c = codesOf(bad);
  NEW.filter((k) => !['js_rendered', 'product_schema_image', 'product_no_rating', 'no_apple_touch_icon'].includes(k)).forEach((k) => assert.ok(c.includes(k), 'missing ' + k));
  // محصول، SPA و صفحهٔ اصلی
  const prod = codesOf('<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>محصول نمونه برای خرید</title><script type="application/ld+json">{"@type":"Product","name":"p","offers":{"@type":"Offer","price":"1","priceCurrency":"IRR","availability":"InStock"}}</script></head><body><main><h1>محصول</h1><p>' + filler(20) + '</p></main></body></html>', 'https://shop.ir/product/p');
  assert.ok(prod.includes('product_schema_image') && prod.includes('product_no_rating'), prod.join(','));
  assert.ok(codesOf('<html lang="fa"><head><title>اپ نمونه برای تست</title>' + scripts + '</head><body><div id="root"></div></body></html>', 'https://shop.ir/app').includes('js_rendered'));
  assert.ok(codesOf('<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>خانهٔ فروشگاه نمونه</title><link rel="icon" href="/f.ico"></head><body><p>x</p></body></html>', 'https://shop.ir/').includes('no_apple_touch_icon'));
  // صفحهٔ سالم: هیچ‌کدام از بررسی‌های تازه نباید هشدار الکی بدهد
  const now = new Date().toISOString();
  const im = (n) => Array.from({ length: n }, (_, i) => '<img src="/u/p' + i + '.webp" srcset="/u/p' + i + '-2x.webp 2x" alt="تصویر ' + i + '" width="100" height="100"' + (i ? ' loading="lazy"' : '') + '>').join('');
  const good = '<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>راهنمای انتخاب دانهٔ قهوه برای دم‌آوری</title><meta name="description" content="در این راهنما تفاوت رست روشن و تیره، آسیاب مناسب هر روش و نگهداری دانه را مرحله‌به‌مرحله می‌خوانید."><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="https://shop.ir/blog/x"><meta property="og:url" content="https://www.shop.ir/blog/x/"><script defer src="/a.js"></script><script type="application/ld+json">{"@type":"BlogPosting","headline":"x","image":"https://shop.ir/i.jpg","author":{"@type":"Person","name":"علی"},"datePublished":"' + now + '","dateModified":"' + now + '"}</script><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script></head><body><main><article><h1>راهنمای قهوه</h1><h2>چطور انتخاب کنیم؟</h2><p>پاسخ کامل و طولانی بیش از بیست نویسه.</p><h2>چقدر هزینه دارد؟</h2><p>پاسخ دوم هم بیش از بیست نویسه است.</p><p>' + filler(150) + '</p>' + im(6) + '<a href="https://example.org/r">منبع</a><a href="/b/a">مطلب اول</a><a href="/b/b">مطلب دوم</a></article></main></body></html>';
  const gc = codesOf(good);
  NEW.forEach((k) => { if (k !== 'no_apple_touch_icon') assert.ok(!gc.includes(k), 'false positive ' + k + ' in ' + gc.join(',')); });
  console.log('engine v1.61 (23 deeper SEO checks) OK');
}

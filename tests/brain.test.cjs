const assert = require('assert'); const SI = require('../www/engine.js'); require('../www/brain.js')(SI);
const html = (t, o) => `<html lang="fa"><head><title>${t}</title>${o.d ? `<meta name="description" content="${o.d}">` : ''}<meta name="viewport" content="width=device-width">${o.c ? '<link rel="canonical" href="x">' : ''}${o.s ? '<script type="application/ld+json">{}</script>' : ''}</head><body><h1>${t}</h1>${'<p>' + 'متن '.repeat(o.w) + '</p>'}${o.img || ''}</body></html>`;
const defs = [['/', 'فروشگاه نمونه | صفحهٔ اصلی', { d: 'فروشگاه آنلاین نمونه.', c: 1, s: 1, w: 90 }], ['/blog/seo-guide', 'راهنمای کامل سئو سایت برای مبتدیان و حرفه‌ای‌ها در سال جدید بدون هزینه', { d: '', c: 0, w: 60, img: '<img src=a>' }], ['/about', 'درباره', { d: '', w: 5 }], ['/products/shoes', 'کفش ورزشی', { d: 'خرید کفش.', c: 1, w: 80 }]];
const pages = defs.map(([p, t, o]) => SI.analyzePage(html(t, o), 'https://shop.example.ir' + p, 200));
const robots = SI.analyzeRobots('User-agent: GPTBot\nDisallow: /\nUser-agent: PerplexityBot\nDisallow: /\nUser-agent: *\nAllow: /\nSitemap: https://shop.example.ir/sitemap.xml');
const flags = { sitemap: true, llms: false, robots: true };
const report = SI.buildReport('https://shop.example.ir/', 'shop.example.ir', pages, robots, flags, [{ code: 'no_llms', severity: 'low', title: 'فایل llms.txt وجود ندارد', detail: 'اختیاری', url: 'https://shop.example.ir/llms.txt' }]);
const A = SI.createLogAnalyzer('shop.example.ir'); const L = [];
for (let d = 1; d <= 12; d++) { const day = String(d).padStart(2, '0'); for (let i = 0; i < 5 + d; i++) L.push(`1.1.1.${i} - - [${day}/Nov/2026:10:00:00 +0000] "GET /blog/seo-guide HTTP/1.1" 200 5 "https://www.google.com/" "Mozilla/5.0 Chrome"`); for (let i = 0; i < 4; i++) L.push(`20.0.0.${i} - - [${day}/Nov/2026:11:00:00 +0000] "GET /about HTTP/1.1" ${i % 2 ? 200 : 403} 5 "-" "Mozilla/5.0 (compatible; GPTBot/1.1)"`); }
L.forEach((l) => A.add(l)); const log = A.result();
const brief = { site: { name: 'فروشگاه نمونه', wordpress: '6.7', php: '8.2', language: 'fa_IR', https: true, searchEnginesDiscouraged: true, pretty_permalinks: true, coreSitemap: true, seoPlugin: 'Yoast SEO', cachePlugin: 'WP Rocket', woocommerce: true }, sampleSize: 3, issueCounts: { no_meta_description: 2 }, weakestContent: [{ title: 'درباره', issues: ['thin_content'] }] };
const ctx = { report, log, brief }; let st = {};
const ask = (q, c) => { const r = SI.Brain.answer(q, c || ctx, st); st = r.state; assert.ok(r.text && r.text.length > 10, q); assert.ok(Array.isArray(r.chips)); return r; };
const has = (r, ...x) => x.forEach((k) => assert.ok(r.text.includes(k), 'missing «' + k + '» in answer:\n' + r.text.slice(0, 600)));
let r;
r = ask('سلام'); has(r, 'دستیار داخلی');
r = ask('گزارش کلی بده'); has(r, 'گزارش اجرایی shop.example.ir', 'سه اقدام اول'); assert.ok(/[۰-۹]/.test(r.text) && !/\*\*\d/.test(r.text), 'persian digits');
r = ask('برنامه اقدام بده'); has(r, 'برنامهٔ اقدام', 'دیده‌نشدن'); assert.ok(/۱\. 🔴 \*\*سایت از موتورهای جستجو/.test(r.text), 'critical WP discouraged item first');
r = ask('بیشتر'); has(r, 'برنامهٔ اقدام'); // follow-up page 2 or end
r = ask('برنامه ۷ روزه'); has(r, 'تا ۷ روز');
r = ask('مشکلات سئو چیه'); has(r, 'یافته‌های سئو');
r = ask('چرا امتیاز سئو این قدر است؟'); has(r, 'امتیاز سئو'); assert.ok(/\+[۰-۹]+/.test(r.text), 'score deltas');
r = ask('رباتان AI من را می‌بینند؟'); has(r, 'مسدود', 'GPTBot'); has(r, 'رد‌شده'); has(r, 'robots.txt مسدودند ولی همچنان');
r = ask('robots.txt بساز'); has(r, 'User-agent: GPTBot', 'Disallow: /', 'User-agent: OAI-SearchBot', 'wp-admin', 'wp-sitemap.xml'); assert.ok(/User-agent: OAI-SearchBot\nAllow: \//.test(r.text));
r = ask('همه رباتان ai را مجاز کن robots.txt بساز'); assert.ok(!/User-agent: GPTBot\nDisallow/.test(r.text) && /User-agent: GPTBot\nAllow/.test(r.text), 'open mode');
r = ask('همه را مسدود کن robots.txt بساز'); assert.ok(/User-agent: OAI-SearchBot\nDisallow/.test(r.text), 'closed mode');
r = ask('llms.txt بساز'); has(r, '# فروشگاه نمونه', '- [');
for (const [q, k] of [['اسکیما FAQ بساز', 'FAQPage'], ['اسکیما محصول بساز', 'Product'], ['اسکیما مقاله بساز', 'Article'], ['اسکیما بساز', 'Organization']]) { r = ask(q); has(r, k); const code = r.text.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/); assert.ok(code, 'jsonld block'); JSON.parse(code[1]); }
r = ask('عنوان و متای پیشنهادی بده'); has(r, 'عنوان پیشنهادی'); (r.text.match(/عنوان پیشنهادی \((\d+)\)/g) || []).forEach((m) => assert.ok(+m.match(/\d+/)[0] <= 62)); (r.text.match(/متای پیشنهادی \((\d+)\)/g) || []).forEach((m) => assert.ok(+m.match(/\d+/)[0] <= 155));
r = ask('ترافیک من از کجاست؟'); has(r, 'ترافیک', 'موتور جستجو');
r = ask('روند ترافیک چطور است؟'); has(r, 'روند', 'بازدید انسانی');
r = ask('کلمات کلیدی ورودی'); has(r, 'Search Console');
r = ask('از دستیارهای AI چقدر بازدید دارم؟'); has(r, 'بازدید از دستیارهای AI', 'خوانده می‌شوی ولی نقل نمی‌شوی');
r = ask('کدام صفحه‌ها را AI دیده؟'); has(r, '/about');
r = ask('وضعیت وردپرس'); has(r, 'روشن است', 'Yoast SEO', 'WP Rocket');
r = ask('GEO چیست؟'); has(r, 'GEO');
r = ask('canonical یعنی چی'); has(r, 'canonical');
r = ask('وضعیت /blog/seo-guide را بگو'); has(r, 'صفحه `/blog/seo-guide`', 'بدون alt'); assert.strictEqual(st.page, 'https://shop.example.ir/blog/seo-guide');
r = ask('عنوان و متای پیشنهادی همین صفحه'); has(r, '/blog/seo-guide'); assert.ok(!r.text.includes('`/about`'), 'page-only titles');
r = ask('دستیار چه کارهایی بلد است؟'); has(r, 'بدون API');
r = ask('اااا ببب'); has(r, 'متوجه نشدم');
// ---- v2 abilities
r = ask('سؤالات متداول دربارهٔ «خرید کفش ورزشی» بساز'); has(r, 'خرید کفش ورزشی', 'FAQPage'); { const m = r.text.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/); JSON.parse(m[1]); }
r = ask('ساختار مقاله دربارهٔ سئو سایت فروشگاهی بده'); has(r, 'ساختار پیشنهادی مقاله', 'سئو سایت فروشگاهی', 'H1');
r = ask('چک لیست انتشار مقاله'); has(r, '- [ ]', 'انتشار مقاله');
r = ask('چک‌لیست راه‌اندازی سایت جدید'); has(r, 'راه‌اندازی', 'noindex');
r = ask('چک لیست آمادگی AI'); has(r, 'OAI-SearchBot');
r = ask('چرا ترافیک سایتم کم شده؟'); has(r, 'علت‌های محتمل', 'Search Console');
r = ask('سریع ترین کارها چیست؟'); has(r, 'سریع‌ترین بردها');
r = ask('چطور alt تصاویر را اضافه کنم؟'); has(r, 'چطور رفعش کنم', 'alt');
r = ask('چطور canonical را درست کنم؟'); has(r, 'canonical');
r = ask('اگر عنوان را رفع کنم چند امتیاز می‌گیرم؟'); assert.ok(/امتیاز|پیدا نشد/.test(r.text));
r = ask('اگر توضیحات متا را رفع کنم چند امتیاز می‌گیرم؟'); has(r, '+'); assert.ok(/\+[۰-۹]+/.test(r.text), r.text);
r = ask('قانون htaccess و nginx برای ربات‌ها'); has(r, '.htaccess', 'Nginx', 'GPTBot');
r = ask('گزارش مشتری بده'); has(r, '# گزارش وضعیت سئو', 'اقدام‌های پیشنهادی', 'محدودیت‌ها');
r = ask('برنامه اقدام بده'); r = ask('مورد ۲ را توضیح بده'); has(r, 'مورد ۲', 'چرا:', 'چطور:');
r = ask('core web vitals چیست'); has(r, 'LCP');
r = ask('ریدایرکت ۳۰۱ یعنی چی'); has(r, '۳۰۱');
r = ask('هوش مصنوعی خزنده‌ها رو بلاک کردم'); assert.ok(r.text.length > 20);
// typo tolerance
assert.strictEqual(SI.Brain.classify(SI.Brain.norm('ترافیگ سایتم')), 'traffic');
assert.strictEqual(SI.Brain.classify(SI.Brain.norm('اسکیمه بساز')), 'schema');
// topicless asks for topic
r = SI.Brain.answer('سؤالات متداول بساز', {}, {}); assert.ok(r.text.includes('دربارهٔ چه موضوعی') || r.text.includes('سؤالات متداول'));
// Arabic letters / digits normalization
assert.strictEqual(SI.Brain.classify(SI.Brain.norm('رباتان هوش مصنوعي را مسدود كنم')), 'aibots');
assert.strictEqual(SI.Brain.classify(SI.Brain.norm('برنامه ٧ روزه')), 'plan');
// no data
for (const q of ['گزارش کلی', 'برنامه اقدام', 'ترافیک من', 'رباتان AI', 'امتیاز', 'مشکلات سئو', 'llms.txt بساز', 'عنوان پیشنهادی', 'وضعیت وردپرس', 'روند', 'کلمات کلیدی']) { const e = SI.Brain.answer(q, {}, {}); assert.ok(e.text.length > 20, q); }
const e = SI.Brain.answer('robots.txt بساز', {}, {}); assert.ok(e.text.includes('example.com'), 'robots without data works');
// fuzz: no exceptions across partial contexts
const ctxs = [{}, { report }, { log }, { brief }, { report, log }, { report, brief }, { log, brief }, ctx]; const Q = ['گزارش', 'برنامه', 'بیشتر', 'سئو', 'امتیاز', 'ربات', 'robots', 'llms', 'schema', 'عنوان', 'ترافیک', 'کلید', 'chatgpt', 'صفحه', 'وردپرس', 'روند', 'geo چیست', 'کمک', 'سلام', '/about', 'xyz', ''];
let s2 = {}; for (const c of ctxs) for (const q of Q) { const o = SI.Brain.answer(q, c, s2); assert.ok(typeof o.text === 'string' && o.text.length > 0, 'fuzz ' + q); s2 = o.state; }
console.log('brain tests OK');

// ---- offline approved-fix proposals: grounded in actual WordPress content only
const catalog = { canApply: true, sampleSize: 1, site: { name: 'فروشگاه نمونه' }, items: [{
  id: 77, type: 'post', title: 'راهنمای بسیار طولانی برای انتخاب بهترین محصول در فروشگاه آنلاین در سال جاری',
  url: 'https://shop.example.ir/guide', modified: '2026-11-10 12:00:00', revision: 'r'.repeat(64),
  words: 220, excerpt: 'این راهنما بر اساس محتوای واقعی صفحه تهیه شده است و نکات کاربردی برای انتخاب محصول را توضیح می‌دهد. موارد مهم و ویژگی‌های اصلی در متن آمده‌اند.',
  contentPreview: '', metaTitle: '', metaDescription: '', issues: ['long_title', 'no_meta_description'], schemaSupported: false, schemaEnabled: false,
}] };
const proposals = SI.Brain.proposeFixes({ catalog, brief: { site: { name: 'فروشگاه نمونه' } } });
assert.strictEqual(proposals.length, 1);
assert.ok(proposals[0].changes.seo_title && [...proposals[0].changes.seo_title].length <= 60, 'title should be shortened');
assert.ok(proposals[0].changes.meta_description && [...proposals[0].changes.meta_description].length >= 70 && [...proposals[0].changes.meta_description].length <= 200, 'description derived from real content');
assert.strictEqual(proposals[0].revision, 'r'.repeat(64));
assert.ok(!('schema_mode' in proposals[0].changes), 'never add duplicate schema when not supported');
const noGrounding = SI.Brain.proposeFixes({ catalog: { items: [{ id: 78, title: 'درباره', revision: 'x', issues: ['no_meta_description'], excerpt: '', contentPreview: '', schemaSupported: false }] } });
assert.strictEqual(noGrounding.length, 0, 'do not invent descriptions without enough source text');
r = SI.Brain.answer('اصلاحات خودکار سایت', { catalog, bridgeConnected: true, report, brief }, {});
has(r, 'پیشنهادهای قابل بررسی', 'تأیید و اعمال');
assert.strictEqual(SI.Brain.classify(SI.Brain.norm('اصلاح و تغییرات خودکار بعد از تایید برای SEO GEO AEO')), 'autofix', 'the exact requested Persian phrase should trigger the approved-fix flow');
const noBridge = SI.Brain.answer('اصلاح و تغییرات خودکار بعد از تایید برای SEO GEO AEO', { bridgeConnected: false }, {});
assert.ok(noBridge.text.includes('افزونه') && noBridge.text.includes('وصل'), 'without bridge, request setup instructions');
// expert knowledge layer
r = ask('core web vitals چیست'); has(r, 'LCP', 'INP', 'CLS');
r = ask('ریدایرکت 301 چیست'); has(r, '۳۰۱', 'soft');
r = ask('crawl budget چیست'); has(r, 'Crawl budget');
r = ask('چک‌لیست ووکامرس'); has(r, 'ووکامرس', 'Product + Offer');
r = ask('چک‌لیست ممیزی فنی'); has(r, 'نمایه‌پذیری', 'Core Web Vitals');
r = ask('چک‌لیست استراتژی محتوا'); has(r, 'اقتدار موضوعی');
console.log('approved-fix tests OK');

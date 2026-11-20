const assert = require('node:assert/strict');
const SR = require('../www/seorules.js');
const SI = require('../www/engine.js'); require('../www/brain.js')(SI);

/* ---- کاتالوگ ---- */
const st = SR.stats();
assert.ok(st.total >= 140, 'at least 140 rules, got ' + st.total);
assert.equal(SR.AREAS.length, 11);
const ids = SR.RULES.map((r) => r.id); assert.equal(new Set(ids).size, ids.length, 'unique ids');
SR.RULES.forEach((r) => {
  assert.ok(SR.AREAS.some((a) => a.id === r.area), r.id + ' area');
  assert.ok(['rule', 'best', 'myth', 'dep', 'info'].includes(r.kind), r.id + ' kind');
  assert.ok(['google', 'geo', 'both'].includes(r.engine), r.id + ' engine');
  assert.ok(['critical', 'high', 'medium', 'low', 'info'].includes(r.sev), r.id + ' sev');
  assert.ok(r.title && r.rule && r.source, r.id + ' must have title/rule/source');
  assert.ok(!/تضمین(‌| )?(می‌?کند|رتبه)/.test(r.title) || /نمی‌?کند|نیست|ندارد/.test(r.title + r.rule), r.id + ' no guarantee claims');
});
SR.AREAS.forEach((a) => assert.ok(SR.byArea(a.id).length >= 5, a.id + ' has >=5 rules'));
// هر کدِ مرتبط یا قابل‌سنجش است یا عمداً دستی (فقط bot_rejected از لاگ)
const known = new Set(SR.ENGINE_CODES.concat(SR.OWN_CODES));
SR.RULES.forEach((r) => r.codes.forEach((c) => assert.ok(known.has(c) || c === 'bot_rejected', r.id + ' unknown code ' + c)));
// کدهای واقعی engine.js باید در فهرست ما باشند (جلوگیری از جاماندن ممیزی جدید)
const fs = require('fs'); const eng = fs.readFileSync(__dirname + '/../www/engine.js', 'utf8');
const engineCodes = Array.from(new Set((eng.match(/add\('([a-z0-9_]+)'/g) || []).map((x) => x.slice(5, -1))));
assert.ok(engineCodes.length > 60);
const missing = engineCodes.filter((c) => !SR.ENGINE_CODES.includes(c)); assert.deepEqual(missing, [], 'engine codes missing from SeoRules.ENGINE_CODES');

/* ---- واقعیت‌های ۲۰۲۶ ---- */
const faq = SR.get('s08'); assert.equal(faq.kind, 'dep'); assert.ok(/۷ مه ۲۰۲۶/.test(faq.rule) && /منسوخ نشده/.test(faq.rule));
assert.equal(SR.get('y01').kind, 'myth'); assert.ok(/نیست|لازم نیست/.test(SR.get('y01').title));
assert.equal(SR.get('g01').engine, 'geo'); assert.ok(/همان سئوست/.test(SR.get('g01').title));
assert.ok(/INP/.test(SR.get('t02').title) && /۲۰۰/.test(SR.get('t02').title));
assert.ok(SR.get('p13').title.includes('AI Mode'));
assert.ok(SR.get('g08').kind === 'best' && /تضمین نیست/.test(SR.get('g08').rule), 'GEO research claim must not be stated as a Google rule');

/* ---- جست‌وجو ---- */
assert.equal(SR.search('آیا llms.txt لازم است؟', 1)[0].id, 'y01');
assert.ok(SR.search('قانون کانونیکال', 3).some((r) => r.id === 'c12'));
assert.ok(SR.search('hreflang', 3).some((r) => r.id === 'i02'));
assert.equal(SR.detectArea('قوانین GEO'), 'geo'); assert.equal(SR.detectArea('اسپم گوگل'), 'spam'); assert.equal(SR.detectArea('خرافه های سئو'), 'myth');
assert.deepEqual(SR.search('', 5), []);

/* ---- ممیزی صفحه ---- */
const bad = '<html lang="fa"><head><meta name="keywords" content="a,b"><meta name="robots" content="max-snippet:0"><link rel="alternate" hreflang="fa_IR" href="https://x.ir/fa/"><link rel="canonical" href="https://x.ir/"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"x"},{"@type":"WebSite","potentialAction":{"@type":"SearchAction"}},{"@type":"HowTo"}]}</script></head><body><a onclick="x()">a</a><a href="javascript:void(0)">b</a><a href="/p" rel="nofollow">1</a><a href="/q" rel="nofollow">2</a><a href="/r" rel="nofollow">3</a><a href="/cart" rel="nofollow">cart</a><img src=http://x.ir/a.jpg>' + 'کلمه '.repeat(800) + '</body></html>';
const codes = SR.auditPage({ url: 'https://x.ir/', status: 200, headers: { 'X-Robots-Tag': 'noindex, nofollow' }, html: bad }).map((i) => i.code);
['xrobots_noindex', 'max_snippet_zero', 'meta_keywords', 'mixed_content', 'uncrawlable_links', 'internal_nofollow', 'hreflang_bad_code', 'hreflang_no_self', 'org_no_sameas', 'deprecated_schema', 'geo_no_structure'].forEach((c) => assert.ok(codes.includes(c), 'expected ' + c + ' in ' + codes));
const good = '<html lang="fa"><head><meta name="robots" content="max-image-preview:large"><link rel="alternate" hreflang="fa-IR" href="https://x.ir/"><link rel="alternate" hreflang="x-default" href="https://x.ir/"><link rel="canonical" href="https://x.ir/"><script type="application/ld+json">{"@type":"Organization","name":"x","sameAs":["https://instagram.com/x"]}</script></head><body><a href="/a">a</a><a href="/cart" rel="nofollow">cart</a><ul><li>' + 'کلمه '.repeat(800) + '</li></ul></body></html>';
assert.deepEqual(SR.auditPage({ url: 'https://x.ir/', status: 200, html: good }), [], 'clean page must give zero extra issues (no false positives)');
assert.deepEqual(SR.auditPage({ url: 'https://x.ir/a', status: 200, html: '<html><body><a href="/b" rel="nofollow ugc">x</a></body></html>' }), []);
const faqOnly = SR.auditPage({ url: 'https://x.ir/f', html: '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>' }).map((i) => i.code);
assert.ok(!faqOnly.includes('deprecated_schema'), 'FAQPage must not be flagged as an error');

/* ---- robots / sitemap ---- */
assert.deepEqual(SR.auditRobots('User-agent: *\nDisallow: /\nCrawl-delay: 5\nNoindex: /a').map((i) => i.code).sort(), ['robots_blocks_all', 'robots_crawl_delay', 'robots_no_sitemap', 'robots_noindex_directive']);
assert.deepEqual(SR.auditRobots('User-agent: *\nDisallow: /cart/\nSitemap: https://x.ir/s.xml'), []);
assert.ok(SR.auditRobots('User-agent: *\nDisallow: /wp-content/\nSitemap: https://x.ir/s').some((i) => i.code === 'robots_blocks_css_js'));
assert.deepEqual(SR.auditRobots('User-agent: *\nDisallow: /wp-content/\nAllow: /wp-content/uploads/\nSitemap: https://x.ir/s').map((i) => i.code), []);
const xml = '<urlset>' + Array.from({ length: 12 }, (_, i) => '<url><loc>https://x/' + i + '</loc><lastmod>2026-01-01</lastmod><priority>1</priority></url>').join('') + '</urlset>';
assert.deepEqual(SR.auditSitemap(xml).map((i) => i.code).sort(), ['sitemap_fake_lastmod', 'sitemap_ignored_tags']);

/* ---- تطبیق با گزارش ---- */
const mk = (t, o) => '<html lang="fa"><head><title>' + t + '</title><meta name="viewport" content="width=device-width"></head><body><h1>' + t + '</h1><p>' + 'متن '.repeat(o.w || 50) + '</p></body></html>';
const pages = [SI.analyzePage(mk('صفحهٔ اصلی فروشگاه', {}), 'https://s.ir/', 200)];
const report = SI.buildReport('https://s.ir/', 's.ir', pages, SI.analyzeRobots('User-agent: OAI-SearchBot\nDisallow: /\nSitemap: https://s.ir/s.xml'), { sitemap: true, llms: false, robots: true }, [{ code: 'no_llms', severity: 'low', title: 't', detail: 'd', url: 'https://s.ir/' }]);
const c0 = SR.compliance(null, []); assert.equal(c0.hasData, false); assert.equal(c0.summary.score, null); assert.ok(c0.rows.some((r) => r.state === 'unknown'));
const c = SR.compliance(report, []); assert.equal(c.hasData, true);
const row = (id) => c.rows.find((r) => r.id === id);
assert.equal(row('b03').state, 'fail', 'blocked OAI-SearchBot must violate b03'); assert.equal(row('y01').state, 'info', 'myths are never pass/fail');
assert.equal(row('c26').state, 'manual'); assert.ok(c.summary.score >= 0 && c.summary.score <= 100);
assert.equal(c.summary.total, st.total);
const c2 = SR.compliance(report, [{ code: 'xrobots_noindex', severity: 'critical', url: 'https://s.ir/' }]); assert.equal(c2.rows.find((r) => r.id === 'c05').state, 'fail'); assert.ok(c2.summary.score <= c.summary.score);

/* ---- خلاصهٔ مدل زبانی ---- */
const dg = SR.digest(); assert.ok(dg.length > 500 && dg.length <= 3200); assert.ok(/llms\.txt/.test(dg) && /FAQ/.test(dg) && /۷ مه ۲۰۲۶/.test(dg));
assert.ok(SR.digest(900).length <= 900);
const prompt = SI.buildChatPrompt({ question: 'سلام', rulesDigest: dg, report });
assert.ok(prompt.includes('پایگاه قوانین رسمی') && prompt.indexOf('پایگاه قوانین رسمی') < prompt.lastIndexOf('داده‌های سایت:'));
assert.ok(/۸\)/.test(SI.SYSTEM_PROMPT));

/* ---- دستیار (brain) ---- */
const ctx = { report, log: null, brief: null }; let state = {};
const say = (q) => { const r = SI.Brain.answer(q, ctx, state); state = r.state || state; return r.text; };
let t1 = say('قوانین GEO را بگو'); assert.ok(/GEO/.test(t1) && /همان سئوست/.test(t1), 'GEO rules answer');
state = {}; let t2 = say('آیا llms.txt لازم است؟'); assert.ok(/نیست|نیازی/.test(t2) && /باور نادرست/.test(t2), 'llms myth answer: ' + t2.slice(0, 200));
state = {}; let t3 = say('llms.txt بساز'); assert.ok(/llms\.txt پیشنهادی/.test(t3), 'make-llms still works');
state = {}; let t4 = say('FAQ schema چیست'); assert.ok(/۷ مه ۲۰۲۶/.test(t4), 'FAQ gloss updated');
state = {}; let t5 = say('رعایت قوانین سئوی گوگل را بسنج'); assert.ok(/امتیاز رعایت قوانین/.test(t5) && !/\\n/.test(t5), 'compliance answer');
state = {}; let t6 = say('خرافه های سئو'); assert.ok(/باور نادرست/.test(t6) && /بیشتر/.test(t6));
let t7 = say('بیشتر'); assert.ok(t7 && t7 !== t6, 'pagination via «بیشتر»');
state = {}; let t8 = say('قوانین اسپم گوگل'); assert.ok(/Scaled|انبوه/.test(t8));
state = {}; assert.ok(!/باور نادرست/.test(say('گزارش کلی بده')), 'unrelated intents unaffected');

/* ---- سنجش متن تولیدشده ---- */
const good2 = SR.checkCopy({ seoTitle: 'خرید شارژر فست ۶۵ وات اورجینال با ضمانت', meta: 'شارژر فست ۶۵ وات با خروجی USB-C برای لپ‌تاپ و موبایل؛ ارسال سریع و ضمانت اصالت کالا. مشخصات و راهنمای انتخاب را ببینید.', keyword: 'شارژر فست ۶۵ وات', kind: 'product',
  html: '<p>' + 'شارژر فست ۶۵ وات برای شارژ سریع لپ‌تاپ و گوشی مناسب است و با ولتاژ ۲۰ ولت کار می‌کند. '.repeat(1) + 'در این صفحه مشخصات را می‌بینید.</p><h2>مشخصات</h2><ul><li>توان ۶۵ وات</li></ul><h2>چگونه انتخاب کنیم؟</h2><p>' + 'متن توضیحی دقیق دربارهٔ کاربرد ۶۵ وات و سازگاری با دستگاه‌ها. '.repeat(14) + '</p><img src="a.jpg" alt="شارژر">' });
assert.ok(good2.score >= 80, 'good copy score ' + good2.score + JSON.stringify(good2.failed.map((x) => x.label)));
const bad2 = SR.checkCopy({ seoTitle: 'شارژر', meta: 'کوتاه', keyword: 'شارژر', kind: 'product', html: '<p>' + 'شارژر '.repeat(150) + '</p><img src="a.jpg">' });
['q11', 'o01', 'o03', 'o06'].forEach((id) => assert.ok(bad2.failed.some((x) => x.rule === id), 'bad copy should fail ' + id));
assert.deepEqual(SR.checkCopy({}).checks, []);
console.log('copy check ok');

/* ---- رعایت قوانین هنگام نوشتن و اصلاح ---- */
const longT = 'خرید شارژر فست ۶۵ وات اورجینال سامسونگ با ضمانت اصالت و ارسال سریع | فروشگاه نمونه';
const fx = SR.fixSeoFields({ seo_title: longT, meta_description: 'جمله‌ای ' + 'بسیار طولانی و پرتکرار برای آزمایش برش متا. '.repeat(6) });
assert.ok(Array.from(fx.fields.seo_title).length <= 62 && !/\s(و|با|برای)$/.test(fx.fields.seo_title), 'title trimmed w/o dangling word: ' + fx.fields.seo_title);
assert.ok(Array.from(fx.fields.meta_description).length <= 165 && fx.notes.length === 2);
assert.deepEqual(SR.fixSeoFields({ seo_title: 'عنوان درست و کوتاه', meta_description: 'x'.repeat(100) }).fields, {}, 'valid fields untouched');
assert.deepEqual(SR.fixSeoFields({}).fields, {});
const ext = SR.fixSeoFields({ seo_title: 'عنوان', meta_description: 'متای کوتاه برای محصول.', excerpt: 'این شارژر برای شارژ سریع لپ‌تاپ و گوشی ساخته شده است. جمله دوم.' });
assert.ok(Array.from(ext.fields.meta_description).length >= 70, 'short meta extended only from own lead');
const ld = SR.lintDraft({ content: '<h1>x</h1><p style="display:none">k</p><p>تضمین رتبه یک گوگل</p>', seo_title: 'ک' }, { kind: 'article' });
['p07', 'q01', 'o04'].forEach((r) => assert.ok(ld.issues.some((i) => i.rule === r), 'lint ' + r)); assert.ok(ld.issues.filter((i) => i.severity === 'major').length >= 2);
assert.deepEqual(SR.lintDraft({ content: '<p>' + 'متن دقیق و طبیعی دربارهٔ موضوع با ۲ مثال. '.repeat(20) + '</p><h2>بخش اول</h2><ul><li>مورد</li></ul>', seo_title: 'عنوان سئو استاندارد و کامل', meta_description: 'x'.repeat(120) }, { kind: 'article' }).issues.filter((i) => i.severity === 'major'), []);
const before = { seo_title: 'عنوان خوب و استاندارد برای صفحه', content: '<p>' + 'کلمه '.repeat(250) + '</p><a href="/a">لینک</a><img src="a" alt="x"><script type="application/ld+json">{}</script>' };
const rg = SR.regressions(before, { seo_title: 'عنوان خوب و استاندارد برای صفحه', content: '<p>' + 'کلمه '.repeat(250) + '</p>' }).map((x) => x.rule).sort();
assert.deepEqual(rg, ['c15', 'o06', 'o06', 's01']); assert.deepEqual(SR.regressions(before, before), []);
assert.ok(SR.regressions({ seo_title: 'عنوان خوب و استاندارد', content: '' }, { seo_title: 'ک' }).some((x) => x.rule === 'o01'));
assert.ok(/H1/.test(SR.writingRules('article')) && !/اصلاح مطلب موجود/.test(SR.writingRules('article')) && /اصلاح مطلب موجود/.test(SR.writingRules('edit')));
const Agent = require('../www/agent.js');
assert.ok(/قوانین سئوی گوگل و GEO/.test(Agent.prompt('article', 'مقاله', '', 'نکته', 'برند', '')) && !/اصلاح مطلب موجود/.test(Agent.prompt('article', 'مقاله', '', 'نکته', 'برند', '')), 'new-writing prompt carries rules');
assert.ok(/اصلاح مطلب موجود/.test(Agent.prompt('article', 'ویرایش', '<p>متن</p>', 'نکته', 'برند', '')), 'edit prompt carries no-regression rule');
const sw = Agent.makeSeo('راهنمای کامل خرید شارژر فست برای لپ‌تاپ و موبایل در سال جاری با مقایسهٔ توان', '<p>' + 'شارژر فست برای شارژ سریع. '.repeat(30) + '</p>', 'فروشگاه نمونهٔ بسیار طولانی');
assert.ok(Array.from(sw.seo_title).length <= 62 && Array.from(sw.meta_description).length <= 165, 'makeSeo respects rules');
const Writer = require('../www/writer.js'); assert.equal(typeof Writer.writeArticle, 'function');
console.log('write/edit rules ok');
console.log('seorules ok:', st.total, 'rules,', st.checkable, 'auto-checkable');

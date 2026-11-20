const assert = require('assert');
const Agent = require('../www/agent.js');
const product = Agent.makeProduct({
  title: 'قهوه عربیکا اتیوپی ۲۵۰ گرم',
  brand: 'Beano Coffee',
  facts: 'دانه قهوه عربیکا؛ وزن ۲۵۰ گرم؛ رُست متوسط؛ مناسب دم‌آوری دمی و فرنچ‌پرس؛ بسته‌بندی سوپاپ‌دار.'
});
assert.ok(product.content.includes('۲۵۰ گرم'));
assert.ok(product.content.includes('رُست متوسط'));
assert.ok(product.seo_title.length <= 60);
assert.ok(product.meta_description.length >= 40 && product.meta_description.length <= 158);
assert.ok(product.focus_keyword);
assert.ok(!/۱۰۰٪|بهترین جهان|ارگانیک|دارویی/.test(product.content), 'must not add unsupported claims');

const article = Agent.makeArticle({ title: 'راهنمای انتخاب آسیاب قهوه', facts: 'آسیاب قهوه بر اندازه ذرات و یکنواختی پودر اثر می‌گذارد. برای اسپرسو معمولاً درجه آسیاب ریزتر از روش‌های دمی انتخاب می‌شود. آسیاب دستی و برقی هرکدام مزایا و محدودیت‌هایی دارند. ظرفیت، درجه تنظیم و سهولت نظافت از معیارهای مهم انتخاب هستند.' });
assert.ok(article.content.includes('<h2>'));
assert.ok(article.content.includes('آسیاب قهوه'));
assert.ok(article.excerpt.length > 30);

assert.throws(() => Agent.makeProduct({ title: 'قهوه', facts: 'خوب' }), /ویژگی واقعی/);
assert.throws(() => Agent.makeArticle({ title: 'راهنمای قهوه', facts: 'چند کلمه' }), /۸۰ نویسه/);

const seo = Agent.makeSeo('راهنمای قهوه', 'این راهنمای کامل دربارهٔ دانه قهوه و روش دم‌آوری است. نکات کاربردی برای انتخاب قهوه در این متن توضیح داده شده است.', 'Beano');
assert.ok(seo.seo_title.length <= 60);
assert.ok(seo.meta_description.length <= 158);
assert.ok(seo.focus_keyword);
assert.ok(Array.isArray(seo.keywords) && seo.keywords.length > 0);

const media = Agent.makeMedia({ title: 'تصویر بسته قهوه', facts: 'بسته قهوه ۲۵۰ گرمی با سوپاپ هواگیری، روی پس‌زمینه سفید' });
assert.ok(media.media_alt.includes('بسته قهوه'));
assert.ok(media.media_alt.length <= 220);
assert.ok(media.content.includes('سوپاپ هواگیری'));

const json = Agent.parseJson('{"title":"عنوان مقاله","content":"<p>متن</p>","excerpt":"خلاصه","keywords":["قهوه عربیکا"]}');
assert.strictEqual(json.title, 'عنوان مقاله');
assert.deepStrictEqual(json.keywords, ['قهوه عربیکا']);
assert.throws(() => Agent.parseJson('این JSON نیست'), /JSON معتبر/);
assert.throws(() => Agent.parseJson('{"title":"x"}'), /content/);

const optimized = Agent.optimizeExisting({ title: 'راهنمای خرید قهوه', content: '<p>اطلاعات واقعی درباره دانه قهوه و آسیاب و روش دم‌آوری در این متن ارائه شده است.</p>', excerpt: '' }, 'روان‌تر کن', 'Beano');
assert.ok(optimized.content.includes('اطلاعات واقعی'));
assert.ok(optimized.notes.length > 0);
assert.strictEqual(optimized.content, '<p>اطلاعات واقعی درباره دانه قهوه و آسیاب و روش دم‌آوری در این متن ارائه شده است.</p>', 'built-in edits must preserve existing HTML exactly');
const quality = Agent.auditContent({ title: 'راهنمای کامل انتخاب آسیاب قهوه برای خانه', content: '<h2>انتخاب آسیاب</h2><p>' + 'آسیاب قهوه و اندازه ذرات برای روش دم‌آوری اهمیت دارد. '.repeat(35) + '</p><a href="/guide">راهنما</a>', focusKeyword: 'آسیاب قهوه', kind: 'article' });
assert.ok(quality.wordCount > 100);
assert.ok(quality.keywordHits > 0);
const links = Agent.suggestInternalLinks({ id: 1, title: 'راهنمای آسیاب قهوه', content: 'انتخاب آسیاب قهوه و روش دم آوری' }, [{ id: 2, title: 'انواع آسیاب قهوه', excerpt: 'راهنمای انتخاب آسیاب و دم آوری قهوه', url: 'https://example.test/grinders' }]);
assert.strictEqual(links[0].id, 2, 'internal link suggestions match related content');
const cannibal = Agent.findKeywordCannibalization(
  { id: 1, title: 'راهنمای خرید آسیاب قهوه', focusKeyword: 'آسیاب قهوه' },
  [{ id: 2, title: 'بهترین آسیاب قهوه', focusKeyword: 'آسیاب قهوه', url: 'https://example.test/a' }, { id: 3, title: 'دانه قهوه', focusKeyword: 'دانه قهوه', url: 'https://example.test/b' }]
);
assert.strictEqual(cannibal.length, 1, 'duplicate focus keywords should be flagged for human review');
assert.strictEqual(cannibal[0].id, 2);

const blockSource = '<!-- wp:paragraph -->\n<p>متن قدیمی</p>\n<!-- /wp:paragraph -->\n[gallery ids="10,11"]';
const blockTokens = Agent.structureTokens(blockSource);
assert.strictEqual(blockTokens.length, 3);
assert.strictEqual(Agent.assertStructurePreserved(blockSource, '<!-- wp:paragraph -->\n<p>متن جدید</p>\n<!-- /wp:paragraph -->\n[gallery ids="10,11"]'), true);
assert.throws(() => Agent.assertStructurePreserved(blockSource, '<p>متن جدید</p>'), /ساختار بلوک‌های وردپرس/);
console.log('content agent tests OK');

// Product copy must scale with evidence complexity, remain distinct, and contain both WooCommerce descriptions.
const simplePlan = Agent.productLengthPlan('وزن ۲۵۰ گرم؛ رست متوسط', {});
const complexPlan = Agent.productLengthPlan('وزن ۲۵۰ گرم؛ رست متوسط؛ تک‌خاستگاه؛ بسته‌بندی سوپاپ‌دار؛ مناسب فرنچ‌پرس؛ مناسب دم‌آوری دمی', { attributes: [{ name: 'رست', options: ['متوسط', 'تیره'] }] });
const technicalPlan = Agent.productLengthPlan('مشخصه یک؛ مشخصه دو؛ مشخصه سه؛ مشخصه چهار؛ مشخصه پنج؛ مشخصه شش؛ مشخصه هفت؛ مشخصه هشت؛ مشخصه نه؛ مشخصه ده؛ مشخصه یازده؛ مشخصه دوازده؛ مشخصه سیزده؛ مشخصه چهارده؛ مشخصه پانزده', {});
assert.ok(complexPlan.minWords > simplePlan.minWords, 'content sufficiency guidance should grow with real product detail');
assert.ok(complexPlan.recommendedMax > simplePlan.recommendedMax, 'complex products can receive more detailed copy');
assert.ok(technicalPlan.recommendedMax > complexPlan.recommendedMax, 'very complex products can receive extended but evidence-led copy');
const woocommerceFacts = Agent.productFacts({ facts: '', product: { weight: '0.25', weight_unit: 'kg', dimensions: { length: '10', width: '8', height: '5', unit: 'cm' }, attributes: [{ name: 'roast', label: 'درجه رست', options: ['متوسط', 'تیره'] }] } });
assert.ok(woocommerceFacts.some((x) => x.includes('0.25 kg')), 'WooCommerce weight and unit should be read as product facts');
assert.ok(woocommerceFacts.some((x) => x.includes('درجه رست')), 'WooCommerce attribute label and options should be used');
const variationFacts = Agent.productFacts({ facts: '', product: { variation_count: 2, variation_summaries: [{ 'رنگ': 'مشکی', 'ظرفیت': '۳۵۰ میلی‌لیتر' }, { 'رنگ': 'سفید', 'ظرفیت': '۵۰۰ میلی‌لیتر' }] } });
assert.ok(variationFacts.some((x) => x.includes('رنگ: مشکی') && x.includes('ظرفیت: ۳۵۰ میلی‌لیتر')), 'real WooCommerce variation attributes should be added as evidence');
assert.ok(variationFacts.some((x) => x.includes('رنگ: سفید') && x.includes('ظرفیت: ۵۰۰ میلی‌لیتر')), 'variation differences must remain distinct in product evidence');
const productCopy = '<h2>معرفی</h2><p>' + ('قهوه عربیکا اتیوپی با رست متوسط و وزن ۲۵۰ گرم برای دم‌آوری دمی عرضه می‌شود. مشخصات بسته‌بندی و روش مصرف در این معرفی آمده است. ').repeat(8) + '</p><h2>مشخصات</h2><ul><li>وزن ۲۵۰ گرم</li><li>رست متوسط</li></ul>';
const productAudit = Agent.auditProductContent({ title: 'قهوه عربیکا اتیوپی ۲۵۰ گرم', content: productCopy, excerpt: 'قهوه عربیکا اتیوپی با رست متوسط، وزن ۲۵۰ گرم و مناسب دم‌آوری دمی.', focusKeyword: 'قهوه عربیکا اتیوپی', facts: 'وزن ۲۵۰ گرم؛ رست متوسط؛ عربیکا اتیوپی؛ مناسب دم‌آوری دمی', seoTitle: 'قهوه عربیکا اتیوپی ۲۵۰ گرم | خرید', metaDescription: 'قهوه عربیکا اتیوپی با رست متوسط و وزن ۲۵۰ گرم؛ مشخصات و روش دم‌آوری را پیش از انتخاب بررسی کنید.' });
assert.strictEqual(productAudit.isProduct, true);
assert.ok(productAudit.shortDescriptionChars >= 45);
assert.ok(productAudit.h2Count >= 2);
const dupText = '<h2>معرفی محصول</h2><p>' + ('این قهوه عربیکا اتیوپی با رست متوسط و وزن ۲۵۰ گرم برای دم‌آوری دمی عرضه می‌شود و مشخصات بسته‌بندی در ادامه توضیح داده شده است. ').repeat(8) + '</p><h2>مشخصات</h2>';
const similar = Agent.findSimilarContent({ id: 99, kind: 'product', content: dupText }, [{ id: 10, type: 'product', title: 'قهوه اتیوپی ۲۵۰ گرم', url: 'https://example.test/p', contentPreview: dupText }]);
assert.ok(similar.length && similar[0].score >= 90, 'near-identical product copy must be detected');
assert.throws(() => Agent.validateProductDraft({ title: 'محصول تست', content: '<p>متن</p>' }, { facts: 'وزن ۲۵۰ گرم' }), /اطلاعات واقعی محصول/);
console.log('product SEO generation and uniqueness tests OK');
const validProductBody = '<h2>معرفی</h2><p>قهوه عربیکا اتیوپی با رست متوسط و وزن ۲۵۰ گرم برای کسانی معرفی شده است که مشخصات دانه و شیوه دم‌آوری را پیش از انتخاب بررسی می‌کنند. این متن فقط اطلاعات درج‌شده برای همین محصول را توضیح می‌دهد و هیچ ادعای آزمایشگاهی یا گواهی تازه‌ای اضافه نمی‌کند.</p><h2>مشخصات و انتخاب</h2><p>وزن بسته ۲۵۰ گرم است و درجه رست آن متوسط ثبت شده است. گونه محصول عربیکا و مبدأ ثبت‌شده اتیوپی است. کاربردهای اعلام‌شده شامل دم‌آوری دمی و فرنچ‌پرس است. خریدار می‌تواند این داده‌ها را با تجهیزات و سلیقه خود مقایسه کند و در صورت نیاز جزئیات آسیاب، تاریخ رست و شرایط نگهداری را از فروشنده استعلام بگیرد.</p><h2>جمع‌بندی</h2><p>این محصول با مشخصات بالا قابل مقایسه با گزینه‌های دیگر است. پیش از خرید، اطلاعات روی بسته و توضیحات فروشنده را با نیاز خود تطبیق دهید. اگر یک مشخصه برای تصمیم شما مهم است اما در صفحه ثبت نشده، آن را از فروشنده بپرسید.</p>';
const validProduct = { title: 'قهوه عربیکا اتیوپی ۲۵۰ گرم', content: validProductBody, excerpt: 'قهوه عربیکا اتیوپی با رست متوسط در بسته ۲۵۰ گرمی؛ مناسب دم‌آوری دمی و فرنچ‌پرس بر اساس اطلاعات ثبت‌شده.', seo_title: 'قهوه عربیکا اتیوپی ۲۵۰ گرم | مشخصات', meta_description: 'قهوه عربیکا اتیوپی با رست متوسط و وزن ۲۵۰ گرم؛ مشخصات محصول و روش‌های دم‌آوری ثبت‌شده را بررسی کنید.', focus_keyword: 'قهوه عربیکا اتیوپی', keywords: ['قهوه اتیوپی', 'عربیکا', 'قهوه رست متوسط'] };
const validProductQuality = Agent.validateProductDraft(validProduct, { facts: 'وزن ۲۵۰ گرم؛ رست متوسط؛ عربیکا اتیوپی؛ مناسب دم‌آوری دمی؛ مناسب فرنچ‌پرس' });
assert.ok(validProductQuality.wordCount >= validProductQuality.minWords, 'complete product copy must meet its fact-based sufficiency floor');
assert.ok(validProductQuality.h2Count >= 2);

// v1.55 editorial prompt applies to products only
{
  const A = require('../www/agent.js'); const assert = require('assert');
  const pp = A.prompt('product', 'x', '', 'جنس: سرامیک\nظرفیت: ۲ فنجان', 'برند', '');
  ['سردبیر ارشد', 'صفر جعل', 'faq_candidates', 'self_check', 'جدول HTML با th/td', '۷۰ تا ۱۶۰'].forEach((k) => assert.ok(pp.includes(k), 'missing in product prompt: ' + k));
  assert.ok(!A.prompt('article', 'x', '', 'n', 'b', '').includes('سردبیر ارشد'));
  assert.throws(() => A.validateProductDraft({ title: 't', content: '<h1>x</h1><h2>a</h2><h2>b</h2>' + 'کلمه '.repeat(300), excerpt: 'خلاصهٔ مستقل و کامل دربارهٔ این محصول برای خریدار', seo_title: 'عنوان سئو نمونه برای محصول', meta_description: 'توضیح متای نمونه که جملهٔ کامل است و یک واقعیت ملموس دربارهٔ محصول را بیان می‌کند.', focus_keyword: 'کلید', keywords: ['a'] }, { facts: 'جنس: سرامیک\nظرفیت: ۲ فنجان\nمناسب روش پوراور\nنگهداری: شست‌وشو با آب ولرم و خشک‌کردن کامل پس از هر بار استفاده' }), /H1/);
  console.log('editorial prompt tests OK');
}

// v1.56 deterministic linter
{
  const A = require('../www/agent.js'); const assert = require('assert');
  const facts = 'جنس: سرامیک\nظرفیت: ۲ فنجان\nمناسب روش پوراور\nوزن: ۲۸۰ گرم\nنگهداری: شست‌وشو با آب ولرم';
  const bad = { title: 'دریپر هاریو V60', content: '<h1>x</h1><p>این محصول بهترین است و می‌باشد.</p><h2>توضیحات بیشتر</h2><p>متن</p>', excerpt: 'ک', seo_title: 'کوتاه', meta_description: 'ناقص و نیمه', focus_keyword: 'دریپر هاریو', keywords: [] };
  const rb = A.lintProductDraft(bad, { title: 'دریپر هاریو V60', facts });
  ['hype', 'bureaucratic', 'h1', 'generic_h2', 'seo_title_len', 'meta_len', 'meta_cut', 'kw_first'].forEach((c) => assert.ok(rb.issues.some((x) => x.code === c), 'lint missed ' + c));
  const good = { title: 'دریپر هاریو V60', content: '<p><strong>دریپر هاریو V60</strong> قیف سرامیکی ۲ فنجانی برای دم‌آوری قهوه به روش پوراور است. بدنهٔ سرامیکی وزن ۲۸۰ گرمی دارد.</p><h2>مشخصات فنی دریپر هاریو V60</h2><table><tr><th>جنس</th><td>سرامیک</td></tr><tr><th>ظرفیت</th><td>۲ فنجان</td></tr><tr><th>وزن</th><td>۲۸۰ گرم</td></tr></table><h2>نگهداری</h2><p>دریپر را با آب ولرم بشویید.</p>', excerpt: 'قیف سرامیکی ۲ فنجانی با وزن ۲۸۰ گرم برای پوراور. با آب ولرم شسته می‌شود.', seo_title: 'دریپر هاریو V60 سرامیکی ۲ فنجانی', meta_description: 'دریپر هاریو V60 قیف سرامیکی ۲ فنجانی با وزن ۲۸۰ گرم برای پوراور است و با آب ولرم شسته می‌شود.', focus_keyword: 'دریپر هاریو V60', keywords: ['پوراور'] };
  const rg = A.lintProductDraft(good, { title: 'دریپر هاریو V60', facts });
  assert.strictEqual(rg.major, 0, JSON.stringify(rg.issues)); assert.ok(rg.score >= 90);
  assert.ok(A.prompt('product', 'x', 'متن فعلی', facts, 'b', '').includes('حالت بهبود متن موجود'));
  assert.ok(!A.prompt('product', 'x', '', facts, 'b', '').includes('حالت بهبود متن موجود'));
  assert.ok(A.reviewFeedback(rb.issues, [{ code: 'ungrounded_number', detail: '۹۹' }]).includes('۹۹'));
  console.log('linter tests OK');
}

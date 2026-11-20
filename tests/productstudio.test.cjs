const assert = require('assert'); const P = require('../www/productstudio.js'); const D = require('../www/studiodata.js');
const L = (s) => Array.from(s).length;
const names = ['دریپر هاریو V60 سرامیکی', 'قهوه اسپرسو ۲۵۰ گرمی عربیکا', 'کتری استیل ۲ لیتری مشکی', 'تیشرت مردانه نخی مشکی', 'Moka Pot Bialetti 6 Cup', 'کفش کتانی زنانه کرم', 'چای', 'کرم ضدآفتاب SPF50', 'ست ابزار ۴۰ تکه', 'عسل طبیعی ۵۰۰ گرمی', 'گردنبند نقره‌ای', 'یک محصول ناشناخته خاص'];
names.forEach((n) => {
  const r = P.build(n, { site: 'بینو', siteUrl: 'https://bino.ir' }); assert.ok(r.ok, n); const f = r.fields;
  assert.ok(L(f.seo_title) >= 20 && L(f.seo_title) <= 60, n + ' title ' + f.seo_title);
  assert.ok(L(f.meta_description) >= 70 && L(f.meta_description) <= 160, n + ' meta ' + L(f.meta_description));
  assert.ok(f.focus_keyword && L(f.focus_keyword) <= 40 && f.content.includes('<h2>') && !/<h1/i.test(f.content), n);
  assert.ok(r.wordCount >= 300, n + ' words ' + r.wordCount);
  assert.ok(r.faq.length >= 3 && /^[a-z0-9؀-ۿ-]+$/i.test(r.slug.replace(/-/g, '')), n + ' faq/slug ' + r.slug);
  assert.ok(!/⟦|TODO|lorem|undefined|\{n\}|\{t\}|NaN/i.test(JSON.stringify(r.fields)), n + ' placeholder');
  assert.ok(r.score.checks.find((c) => c.id === 'claims').ok, n + ' claims: ' + r.score.checks.filter((c) => !c.ok).map((c) => c.label));
  assert.ok(!/aggregateRating|"offers"/.test(r.schemaJson), n + ' schema must not invent rating/price');
  JSON.parse(r.schemaJson.split('\n')[0].replace(/^<script[^>]*>|<\/script>$/g, ''));
});
// family detection is boundary-safe and colour-aware
assert.strictEqual(P.detectFamily('کتری استیل').id, 'cookware'); assert.notStrictEqual(P.detectFamily('کتری استیل').id, 'clothing', 'کت inside کتری');
assert.notStrictEqual(P.detectFamily('کتاب داستان').id, 'clothing'); assert.strictEqual(P.detectFamily('قهوه‌ای کیف چرمی').id, 'footbag', 'قهوه‌ای is a colour');
assert.strictEqual(P.detectFamily('کفش کرم').id, 'footbag'); assert.strictEqual(P.detectFamily('کرم ضدآفتاب').id, 'skincare'); assert.strictEqual(P.detectFamily('چیز عجیب').id, 'generic');
assert.strictEqual(P.build('قهوه‌ای کیف چرمی').fields.focus_keyword.startsWith('قهوه‌ای'), false);
// name-only: facts only from the name; no table when there is nothing to tabulate
const bare = P.build('چای'); assert.ok(!bare.fields.content.includes('<table'), 'no table for 1 fact'); assert.ok(bare.missing.includes('برند') && bare.missing.length >= 3);
// owner-supplied facts are used verbatim; real price only when passed
const rich = P.build('فنجان چینی', { facts: 'جنس: چینی\nوزن: ۳۰۰ گرم', price: '۱۲۰٬۰۰۰', currency: 'IRT', siteUrl: 'https://bino.ir', url: 'https://bino.ir/p/1' });
assert.ok(rich.fields.content.includes('<td>۳۰۰ گرم</td>') && rich.schema.product.offers.price === '120000' && rich.schema.product.offers.priceCurrency === 'IRT' && rich.schema.breadcrumb);
// different products get different wording (no duplicate-content template across a shop)
const batch = P.buildMany('کتری استیل ۱ لیتری\nکتری استیل ۲ لیتری\nکتری استیل ۱ لیتری\nقابلمه استیل ۲۴ سانتی‌متری');
assert.strictEqual(batch.length, 3, 'exact duplicate names collapse'); assert.strictEqual(new Set(batch.map((b) => b.fields.seo_title)).size, 3); assert.strictEqual(new Set(batch.map((b) => b.fields.meta_description)).size, 3, 'metas unique');
// related-product block uses only real catalog urls
const rel = P.build('کتری استیل ۲ لیتری', { catalog: [{ title: 'کتری استیل ۱ لیتری', url: 'https://bino.ir/a' }, { title: 'لیوان', url: 'javascript:alert(1)' }, { title: 'کتری استیل ۲ لیتری', url: 'https://bino.ir/self' }] });
assert.ok(rel.related.length === 1 && rel.fields.content.includes('href="https://bino.ir/a"') && !rel.fields.content.includes('javascript') && !rel.fields.content.includes('/self'));
// HTML safety
const xss = P.build('کتری <img src=x onerror=alert(1)> استیل'); assert.ok(xss.ok && !/<img/i.test(xss.fields.content + xss.fields.excerpt));
assert.strictEqual(P.build('ab').ok, false); assert.strictEqual(P.build('x'.repeat(200)).ok, false);
// save shape matches what the Bridge already accepts
const sf = P.toSaveFields(P.build('کتری استیل ۲ لیتری مشکی')); ['title', 'content', 'excerpt', 'seo_title', 'meta_description', 'focus_keyword', 'related_keywords', 'faq'].forEach((k) => assert.ok(sf[k] && sf[k].length, k)); assert.ok(sf.faq[0].q && sf.faq[0].a);
// knowledge base never makes item-specific claims
D.FAMILIES.concat([D.GENERIC]).forEach((f) => assert.ok(!/(?<![\p{L}])(?:ضمانت|اورجینال|بهترین|ارزان|تخفیف|تضمین|پرفروش|رایگان)(?![\p{L}])/u.test(JSON.stringify(f).replace(/<[^>]*>/g, '')), f.id + ' has a hype/claim word'));
console.log('productstudio v1.63 OK');
// v1.63 pro additions: CSV, guarded model polish, density/readability checks
{
  const r = P.build('کتری استیل ۲ لیتری مشکی'); const csv = P.toCsv([r, P.build('=HYPERLINK("x")')]);
  assert.ok(csv.split('\r\n').length === 3 && csv.includes('_yoast_wpseo_focuskw') && csv.includes('rank_math_description') && csv.includes('"\'=HYPERLINK'), 'csv + formula neutralised');
  const good = JSON.stringify({ intro: 'کتری استیل ۲ لیتری مشکی برای تهیهٔ آب‌جوش روزانه در این صفحه با مشخصات ثبت‌شده معرفی شده است.', summary: 'قیمت و موجودی روز را در همین صفحه ببینید و اگر پرسشی دارید پیش از سفارش بپرسید.' });
  const ok = P.applyPolish(r, 'خروجی: ' + good); assert.ok(ok.ok && ok.res.polished && ok.res.fields.content.includes('آب‌جوش روزانه') && !ok.res.fields.content.includes(r.parts.intro));
  const bad = (o) => P.applyPolish(r, JSON.stringify(Object.assign(JSON.parse(good), o)));
  assert.ok(!bad({ intro: 'کتری استیل ۲ لیتری مشکی اصل است و برای کاربرد روزانه در این صفحه معرفی شده است.' }).ok, 'hype');
  assert.ok(!bad({ intro: 'کتری استیل ۲ لیتری مشکی با گارانتی ۱۸ ماهه برای کاربرد روزانه در این صفحه معرفی شده است.' }).ok, 'invented number');
  assert.ok(!bad({ summary: 'کوتاه' }).ok && !bad({ intro: 'این متن عبارت کلیدی را ندارد ولی به اندازهٔ کافی بلند است و ادعایی هم نمی‌کند.' }).ok && !P.applyPolish(r, 'not json').ok);
  assert.ok(P.build('کتری استیل ۲ لیتری مشکی').score.checks.some((c) => c.id === 'density') && P.build('قهوه اسپرسو ۲۵۰ گرمی عربیکا').score.checks.find((c) => c.id === 'readability').ok);
}
console.log('productstudio pro OK');
// duplicate/thin-content guard
{
  const b = P.buildMany(['کتری استیل ۱ لیتری', 'قهوه اسپرسو ۲۵۰ گرمی عربیکا', 'کتری استیل ۱ لیتری مشکی']);
  assert.ok(b[0].similarity.max < 45 && b[2].similarity.max < 45, 'same-family products get different texts');
  assert.ok(b[1].similarity.max < 40 && b[1].score.checks.find((c) => c.id === 'unique').ok, 'different products are not');
  const one = P.build('کتری استیل ۲ لیتری'); const ex = P.markSimilarity([one], [{ title: 'کتری دیگر', text: one.fields.content.replace(/<[^>]+>/g, ' ') }]); assert.ok(ex[0].similarity.max >= 45, 'compared with existing shop text');
}
console.log('productstudio uniqueness OK');

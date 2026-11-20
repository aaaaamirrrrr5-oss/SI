/* v1.82 — «سئوی فقط یک محصول»: منطق تشخیص (soFindings) و انتخاب فیلدهای مجاز (soOnlySeo)، بدون مرورگر. */
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const www = path.join(__dirname, '..', 'www'); const src = fs.readFileSync(path.join(www, 'app.js'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert(i >= 0 && j > i, 'برش پیدا نشد: ' + a); return src.slice(i, j); };
const itemAfterSrc = src.split('\n').find((l) => l.includes('function itemAfter(item, fields)'));
const code = cut('const soState', 'async function soLoad') + '\n' + cut('function soOnlySeo', 'async function soFix') + '\n' + itemAfterSrc + '\nreturn { soFindings, soSummary, soOnlySeo };';
const SI = { Repair: require(path.join(www, 'repair.js')), Polish: require(path.join(www, 'polish.js')), SeoRules: require(path.join(www, 'seorules.js')), SeoPolicy: require(path.join(www, 'seopolicy.js')) };
const ctx = { products: [], titleCounts: new Map(), metaCounts: new Map(), siteLang: 'fa' };
const R = { scan: { ctx } };
const mk = (locked) => new Function('SI', 'S', 'rpState', 'builderLocked', 'repairBrand', code)(SI, {}, () => R, () => !!locked, () => '');
const body = '<p>این قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل ساخته شده و برای دم‌کردن قهوه در خانه مناسب است. ظرفیت مخزن یک لیتر و فشار پمپ پانزده بار است و می‌تواند هر بار دو فنجان قهوه تازه آماده کند. کاربر می‌تواند میزان شیر و قهوه را تنظیم کند. این دستگاه برای آشپزخانه‌های کوچک و دفتر کار طراحی شده است و تمیزکردن آن ساده است.</p>';
const base = { id: 1, title: 'قهوه‌ساز اسپرسو مدل ۲۰۰', type: 'product', status: 'publish', revision: 'r', excerpt: 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل ساخته شده است.', product: {} };
function plan(f, item) {
  const F = f.soFindings(item); const d = f.soSummary(item, F); const diag = SI.Repair.diagnose(item, ctx);
  const sp = SI.Repair.planSeo(item, diag, { brand: '', titleCounts: ctx.titleCounts, metaCounts: ctx.metaCounts });
  return { F, d, P: f.soOnlySeo({ item, fields: Object.assign({}, sp.fields), why: [], wrongNow: false, feat: {}, google: null }, d) };
}
const f = mk(false);

// ۱) محصولی با چند مشکل سئو: همه پیدا می‌شوند و فقط فیلدهای سئو (و ساختار سئوی متن) در خروجی می‌ماند
{ const item = Object.assign({}, base, { metaTitle: 'قهوه', metaDescription: '', focusKeyword: '', content: '<h1>قهوه‌ساز</h1>' + body + '<p></p><img src="a.jpg" alt="">' });
  const { F, P } = plan(f, item); const codes = F.map((x) => x.code);
  ['seo_title_len', 'seo_no_meta', 'seo_no_focus', 'seo_markup'].forEach((c) => assert(codes.includes(c), 'باید پیدا می‌شد: ' + c));
  const keys = Object.keys(P.fields); keys.forEach((k) => assert(['seo_title', 'meta_description', 'focus_keyword', 'content'].includes(k), 'فیلد غیرمجاز: ' + k));
  ['seo_title', 'meta_description', 'focus_keyword'].forEach((k) => assert(P.fields[k], 'باید ساخته می‌شد: ' + k));
  assert(!/<h1/i.test(P.fields.content) && /alt="[^"]+"/.test(P.fields.content) && !/<p><\/p>/.test(P.fields.content), 'ساختار سئوی متن اصلاح نشد');
  assert(SI.Polish.verify(item.content, P.fields.content).ok, 'متن باید از تأیید ایمنی بگذرد');
  assert.strictEqual(P.written, false); assert.strictEqual(P.enriched, 0); assert.strictEqual(P.linked, 0); assert(!('excerpt' in P.fields) && !('related_keywords' in P.fields)); }

// ۲) عبارت کلیدیِ نامربوط: هم تشخیص داده می‌شود و هم بعد از اصلاح، مشکل برطرف است
{ const item = Object.assign({}, base, { metaTitle: 'خرید قهوه‌ساز اسپرسو مدل ۲۰۰ | فروشگاه', metaDescription: 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل و فشار پمپ پانزده بار؛ مناسب دم‌کردن قهوه در خانه و دفتر کار با تمیزکردن آسان.', focusKeyword: 'ابزار قهوه', content: body });
  const { F, P } = plan(f, item); assert(F.some((x) => x.code === 'seo_focus_absent'));
  assert(P.fields.focus_keyword && P.fields.focus_keyword !== 'ابزار قهوه');
  const after = Object.assign({}, item, { metaTitle: P.fields.seo_title || item.metaTitle, metaDescription: P.fields.meta_description || item.metaDescription, focusKeyword: P.fields.focus_keyword });
  const left = f.soFindings(after).filter((x) => x.fix === 'auto'); assert.strictEqual(left.length, 0, 'مشکل خودکار باقی ماند: ' + left.map((x) => x.code)); }

// ۳) محصول سالم: هیچ مشکل خودکاری و هیچ تغییری وجود ندارد
{ const item = Object.assign({}, base, { metaTitle: 'خرید قهوه‌ساز اسپرسو مدل ۲۰۰ | فروشگاه', metaDescription: 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل و فشار پمپ پانزده بار؛ مناسب دم‌کردن قهوه در خانه و دفتر کار با تمیزکردن آسان.', focusKeyword: 'قهوه‌ساز اسپرسو', content: body });
  const { F, P } = plan(f, item); assert.strictEqual(F.filter((x) => x.fix === 'auto').length, 0); assert.deepStrictEqual(Object.keys(P.fields), []); }

// ۴) متن ساخته‌شده با صفحه‌ساز: ساختار متن دست‌نخورده و «دستی» علامت می‌خورد
{ const g = mk(true); const item = Object.assign({}, base, { metaTitle: 'خرید قهوه‌ساز اسپرسو مدل ۲۰۰', metaDescription: '', focusKeyword: 'قهوه‌ساز اسپرسو', protected_layout: true, content: '<h1>قهوه‌ساز</h1>' + body });
  const { F, P } = plan(g, item); const m = F.find((x) => x.code === 'seo_markup'); assert(m && m.fix === 'manual'); assert(!('content' in P.fields)); }

// ۵) غلط نگارشی فقط در فیلد سئو
{ const item = Object.assign({}, base, { metaTitle: 'خريد قهوه‌ساز اسپرسو مدل ۲۰۰', metaDescription: 'قهوه‌ساز اسپرسو مدل ۲۰۰ با بدنهٔ استیل و فشار پمپ پانزده بار؛ مناسب دم‌کردن قهوه در خانه و دفتر کار با تمیزکردن آسان.', focusKeyword: 'قهوه‌ساز اسپرسو', content: body });
  const { F, P } = plan(f, item); assert(F.some((x) => x.code === 'seo_typo')); assert(P.fields.seo_title && !/ي/.test(P.fields.seo_title)); }
console.log('seo-one.test OK');

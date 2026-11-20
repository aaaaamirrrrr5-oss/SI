/* v1.83 — پنل‌های «مرکز سئوی محصولات» (تکی و کلی): رندر HTML، منطق اجرای گروهی و اعمال انتخابی، بدون مرورگر (برش کد از app.js + stubهای شبکه). */
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const www = path.join(__dirname, '..', 'www'); const src = fs.readFileSync(path.join(www, 'app.js'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert(i >= 0 && j > i, 'برش پیدا نشد: ' + a); return src.slice(i, j); };
const itemAfterSrc = src.split('\n').find((l) => l.includes('function itemAfter(item, fields)'));
const pushDetailSrc = src.split('\n').find((l) => l.includes('function pushDetail(sumObj, r)'));
const code = cut('const soState', 'function oneProductPanel()') + '\n' + itemAfterSrc + '\n' + pushDetailSrc + '\nreturn { soState, soFindings, soSummary, soPlan, soFix, soPanel, soResolved, bulkState, bulkPanel, runBulkSeo, bulkDownload };';
const SI = { Repair: require(path.join(www, 'repair.js')), Polish: require(path.join(www, 'polish.js')), SeoRules: require(path.join(www, 'seorules.js')), SeoPolicy: require(path.join(www, 'seopolicy.js')), SeoCenter: require(path.join(www, 'seocenter.js')), FromName: require(path.join(www, 'fromname.js')) };
const FA = '۰۱۲۳۴۵۶۷۸۹'; const fa = (n) => String(n).replace(/\d/g, (d) => FA[d]); const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const body = '<p>' + 'این قهوه‌ساز اسپرسو با بدنهٔ استیل ساخته شده و برای دم‌کردن قهوه در خانه مناسب است. ظرفیت مخزن یک لیتر است و فشار پمپ پانزده بار است. '.repeat(3) + '</p>';
const items = []; for (let i = 1; i <= 12; i++) items.push({ id: i, type: 'product', status: 'publish', title: 'قهوه‌ساز اسپرسو مدل ' + (100 + i * 7), url: 'https://shop.ir/product/m' + i + '/', content: body + ' مدل ' + (100 + i * 7) + ' با کد ' + i + '.', excerpt: 'توضیح کوتاه محصول شمارهٔ ' + i + ' با جزئیات کافی برای خریدار', metaTitle: i <= 6 ? '' : 'قهوه‌ساز اسپرسو مدل ' + (100 + i * 7) + ' | فروشگاه', metaDescription: i % 2 ? '' : 'این توضیح متا برای محصول نمونه نوشته شده و طول مناسب دارد و درباره قهوه‌ساز است. ' + i, focusKeyword: i <= 3 ? '' : 'قهوه‌ساز اسپرسو', revision: 'r' + i, product: {} });
const scan = SI.Repair.scan(items, { siteLang: 'fa' });

function harness(over) {
  const calls = { render: 0, toasts: [], saved: [], planned: [] };
  const S = { bridge: { url: 'https://shop.ir', capabilities: {} } };
  const R = { scan, items: items.slice(), details: new Map(), journal: [], busy: false, at: Date.now() };
  const live = items.map((x) => Object.assign({}, x)); // «سایت» که ذخیره‌ها را نگه می‌دارد
  const fnArgs = { SI, S, fa, esc, document: { querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } }, window: { confirm: () => true, SI }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, Blob: class { constructor(p) { this.p = p; } },
    rpState: () => R, builderLocked: () => false, repairBrand: () => '', render: () => { calls.render++; if (over && over.onRender) over.onRender(); }, toast: (m) => calls.toasts.push(m), focusRepair() {}, repairReady: () => true, WRITE_MAX: 40, diffBlock: () => '<div class="od">diff</div>', detailsHtml: () => '', saveRepairJournal() {},
    ensureAgentAccess: async () => ({ agent_remaining: 100 }), oneEnsureItems: async () => {}, loadRepairItems: async () => live.map((x) => Object.assign({}, x)), repairRescan() { R.scan = SI.Repair.scan(live, { siteLang: 'fa' }); },
    loadAgentItem: async (id) => Object.assign({}, live.find((x) => String(x.id) === String(id))), repairItem: (full, base) => Object.assign({}, base, full),
    agentPost: async () => ({}), repairPlanOne: async (id, o) => { const it = live.find((x) => String(x.id) === String(id)); calls.planned.push(id); return Object.assign({ item: Object.assign({}, it), fields: { seo_title: 'قهوه‌ساز اسپرسو مدل ' + id + ' | فروشگاه نمونه', meta_description: 'توضیح متای ساخته‌شده برای محصول شمارهٔ ' + id + ' که طول مناسب و مرتبط با قهوه‌ساز دارد و کامل است.', focus_keyword: 'قهوه‌ساز اسپرسو', excerpt: 'خلاصهٔ تازه برای محصول شمارهٔ ' + id + ' با جزئیات کافی', content: it.content + '<p>x</p>' }, why: [], pol: { fields: {}, changes: { a: 1 }, count: 1, rejected: '' }, enriched: 0, linked: 0, written: false, q: null, audit: [], wrongNow: false, feat: {}, google: null }, over && over.plan ? over.plan : {}); },
    repairFinishOne: async (P, o) => { if (o.dry) return { status: 'preview', id: P.item.id, title: P.item.title, fieldValues: P.fields, fields: Object.keys(P.fields), why: [] }; if (!Object.keys(P.fields).length) return { status: 'skipped', id: P.item.id, title: P.item.title, why: ['هیچ فیلدی'] }; const it = live.find((x) => x.id === P.item.id); const m = { seo_title: 'metaTitle', meta_description: 'metaDescription', focus_keyword: 'focusKeyword' }; Object.keys(P.fields).forEach((k) => { it[m[k] || k] = P.fields[k]; }); calls.saved.push({ id: P.item.id, fields: Object.keys(P.fields) }); return { status: 'applied', id: P.item.id, title: P.item.title, url: P.item.url, change_id: 'c' + P.item.id, fields: Object.keys(P.fields), changes: [{ field: 'seo_title' }], diff: [], why: [], verify: { ok: true }, written: false }; } };
  const names = Object.keys(fnArgs); const f = new Function(...names, code)(...names.map((k) => fnArgs[k]));
  return { f, S, R, calls, live };
}

let n = 0; const ok = async (name, fn) => { await fn(); n++; };
(async () => {
  await ok('bulkPanel: بدون بررسی فقط دکمهٔ بررسی؛ با بررسی همهٔ اجزا', async () => {
    const h = harness(); h.R.scan = null; const none = h.f.bulkPanel(); assert(none.includes('data-act="repairScan"') && !none.includes('bulkRun'));
  });
  await ok('bulkPanel: ممیزی، نوار نوع مشکل، دامنه، سقف، دکمه‌ها', async () => {
    const h = harness(); h.R.scan = scan; const html = h.f.bulkPanel();
    ['sc-gauge', 'sc-band', 'data-act="bulkCode"', 'data-act="bulkScope"', 'data-act="bulkMax"', 'data-act="bulkSample"', 'data-act="bulkRun"', 'data-act="bulkAuditCsv"', 'sc-bar'].forEach((s) => assert(html.includes(s), 'گم‌شده: ' + s));
    assert(html.includes(fa(12) + '</b> محصول'));
  });
  await ok('نمونهٔ پیش‌نمایش: هیچ‌چیز ذخیره نمی‌شود و ۵ نمونه با قبل/بعد می‌آید', async () => {
    const h = harness(); h.R.scan = scan; await h.f.runBulkSeo({ dry: true });
    const B = h.f.bulkState(); assert.strictEqual(B.stage, 'sampled'); assert.strictEqual(h.calls.saved.length, 0); assert.strictEqual(B.sample.length, 5);
    const html = h.f.bulkPanel(); assert(html.includes('نمونهٔ پیش‌نمایش — چیزی ذخیره نشده') && html.includes('sc-serp'));
  });
  await ok('اجرای گروهی: فقط نوع مشکل انتخاب‌شده (فقط توضیحات متا) نوشته می‌شود؛ سقف و ژورنال و گزارش', async () => {
    const h = harness(); h.R.scan = scan; const B = h.f.bulkState(); B.codes = ['seo_no_meta']; B.max = 3; B.scope = 'all';
    await h.f.runBulkSeo({ dry: false });
    assert.strictEqual(B.stage, 'done'); assert.strictEqual(h.calls.saved.length, 3);
    h.calls.saved.forEach((s) => assert.deepStrictEqual(s.fields, ['meta_description']));
    assert.strictEqual(B.report.applied, 3); assert.strictEqual(h.R.journal.length, 3); assert.strictEqual(B.report.entries.length, 3);
    assert(B.report.avgAfter >= B.report.avgBefore); assert(B.report.flaggedAfter <= B.report.flaggedBefore);
    const html = h.f.bulkPanel(); assert(html.includes('گزارش آخرین اجرای گروهی') && html.includes('bulkChangesCsv') && html.includes('repairRollback'));
  });
  await ok('اجرای گروهی بدون انتخاب نوع مشکل یا با محصول نامطابق، چیزی نمی‌نویسد', async () => {
    const h = harness(); h.R.scan = scan; const B = h.f.bulkState(); B.codes = []; await h.f.runBulkSeo({ dry: false }); assert.strictEqual(h.calls.saved.length, 0); assert(h.calls.toasts.length);
  });
  await ok('توقف کاربر: بعد از مورد جاری متوقف می‌شود و گزارش علت را دارد', async () => {
    let B2 = null; const F2 = harness({ onRender: () => { if (B2 && B2.stage === 'running' && B2.done >= 1) B2.stop = true; } }); F2.R.scan = scan; B2 = F2.f.bulkState(); B2.codes = ['seo_no_meta']; B2.max = 6;
    await F2.f.runBulkSeo({ dry: false });
    assert.strictEqual(B2.report.stoppedBy, 'user'); assert(B2.report.applied >= 1 && B2.report.applied < 6);
  });
  await ok('تکی: پنل بررسی ← پیش‌نمایش با چک‌باکس/ویرایش ← اعمال انتخابی', async () => {
    const h = harness(); const st = h.f.soState(); st.id = '1';
    const it = h.live[0]; st.diag = h.f.soSummary(it, h.f.soFindings(Object.assign({}, it, { contentPreview: it.content }))); st.stage = 'diagnosed'; st.list = [{ id: '1', title: it.title }];
    let html = h.f.soPanel(); assert(html.includes('sc-gauge') && html.includes('sc-grp') && html.includes('data-act="soPlan"') && html.includes('sc-serp'));
    await h.f.soPlan(); assert.strictEqual(st.stage, 'preview'); assert(st.plan.rows.length >= 3);
    html = h.f.soPanel(); assert(html.includes('data-act="soTog"') && html.includes('data-so-edit="seo_title"') && html.includes('data-act="soFix"') && html.includes('قبل') && html.includes('بعد'));
    st.plan.sel.meta_description = false; st.plan.edit.seo_title = 'قهوه‌ساز اسپرسوی ویرایش‌شده توسط خودم | فروشگاه';
    await h.f.soFix(); assert.strictEqual(st.stage, 'done', st.err); const sv = h.calls.saved[0];
    assert(!sv.fields.includes('meta_description') && sv.fields.includes('seo_title')); assert(h.live[0].metaTitle.includes('ویرایش‌شده'));
    html = h.f.soPanel(); assert(html.includes('اصلاح شد') && html.includes('soUndo'));
  });
  await ok('تکی: ویرایش نامعتبر ذخیره نمی‌شود و کاربر در پیش‌نمایش می‌ماند', async () => {
    const h = harness(); const st = h.f.soState(); st.id = '2'; const it = h.live[1]; st.diag = h.f.soSummary(it, h.f.soFindings(it)); st.stage = 'diagnosed';
    await h.f.soPlan(); st.plan.edit.seo_title = 'x'; await h.f.soFix();
    assert.strictEqual(st.stage, 'preview'); assert(st.err.includes('ویرایش نامعتبر')); assert.strictEqual(h.calls.saved.length, 0);
  });
  console.log('seocenter-ui.test.cjs: ' + n + ' آزمون پاس شد');
})().catch((e) => { console.error(e); process.exit(1); });

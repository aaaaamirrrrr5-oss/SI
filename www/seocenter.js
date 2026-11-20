/* Site Inspector — seocenter.js (v1.83.0)  SI.SeoCenter
 * منطق خالصِ «مرکز سئوی محصولات» (بدون DOM و بدون شبکه؛ قابل‌آزمون با Node):
 *  - پیش‌نمایش نتیجهٔ گوگل (SERP) با عرض پیکسلی واقعی و بریدگی عنوان/متا
 *  - شمارندهٔ طول هر فیلد سئو (خالی / کوتاه / مناسب / بلند)
 *  - گروه‌بندی مشکلات یک محصول بر اساس حوزه و تأثیر بر امتیاز
 *  - پیشنهادهای قبل/بعد برای هر فیلد با اعتبارسنجی ویرایش دستی
 *  - ممیزی کل کاتالوگ (توزیع امتیاز، شایع‌ترین مشکلات، سود احتمالی هر اصلاح)
 *  - انتخاب هدف‌های اجرای گروهی (نوع مشکل، دامنه، سقف) و برآورد زمان باقی‌مانده
 *  - خروجی CSV (با BOM برای Excel فارسی)
 * هیچ داده‌ای ساخته نمی‌شود؛ این ماژول فقط می‌سنجد، دسته‌بندی می‌کند و از مقدارهای پیشنهادیِ موتورهای دیگر محافظت می‌کند.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./seopolicy.js'));
  else (root.SI = root.SI || {}).SeoCenter = factory(root.SI && root.SI.SeoPolicy);
})(typeof self !== 'undefined' ? self : this, function (Policy) {
  'use strict';
  const L = Policy.LIMITS;
  const len = (v) => Array.from(String(v == null ? '' : v)).length;
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

  /* ---------- نام فیلدها و نگاشت مشکل ← فیلد ---------- */
  const FIELD_LABEL = { seo_title: 'عنوان سئو', meta_description: 'توضیحات متا', focus_keyword: 'عبارت کلیدی', excerpt: 'توضیح کوتاه', content: 'متن محصول', related_keywords: 'کلمات مرتبط' };
  // هر کد مشکل چه فیلدهایی را (در صورت اصلاح) تغییر می‌دهد. محافظ «انتخاب نوع مشکل» در اجرای گروهی از همین جدول استفاده می‌کند.
  const CODE_FIELDS = {
    seo_no_title: ['seo_title'], seo_title_len: ['seo_title'], seo_dup_title: ['seo_title'],
    seo_no_meta: ['meta_description'], seo_meta_len: ['meta_description'], seo_dup_meta: ['meta_description'], seo_meta_unrelated: ['meta_description'],
    seo_no_focus: ['focus_keyword'], seo_focus_absent: ['focus_keyword'],
    excerpt_missing: ['excerpt'],
    typo_text: ['content', 'excerpt', 'seo_title', 'meta_description'],
    seo_markup: ['content'],
    content_empty: ['content', 'excerpt', 'related_keywords'], content_thin: ['content', 'excerpt', 'related_keywords'],
  };
  // حوزه‌های نمایش (ترتیب = اولویت نمایش)
  const AREAS = [
    { id: 'title', label: 'عنوان سئو', ic: '🏷️' },
    { id: 'meta', label: 'توضیحات متا', ic: '📝' },
    { id: 'focus', label: 'عبارت کلیدی', ic: '🎯' },
    { id: 'structure', label: 'ساختار و نگارش متن', ic: '🧱' },
    { id: 'content', label: 'متن و محتوا', ic: '📄' },
  ];
  const AREA_OF = {
    seo_no_title: 'title', seo_title_len: 'title', seo_dup_title: 'title', seo_typo: 'title',
    seo_no_meta: 'meta', seo_meta_len: 'meta', seo_dup_meta: 'meta', seo_meta_unrelated: 'meta',
    seo_no_focus: 'focus', seo_focus_absent: 'focus',
    seo_markup: 'structure', typo_text: 'structure', excerpt_missing: 'content', content_empty: 'content', content_thin: 'content', info_content: 'content',
  };
  const areaOf = (code) => { if (AREA_OF[code]) return AREA_OF[code]; if (/^rule_o0[12]$/.test(code)) return 'title'; if (/^rule_o0[34]$/.test(code)) return 'meta'; if (/^rule_o0[56]$/.test(code)) return 'structure'; return 'content'; };
  const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  /* ---------- پیش‌نمایش گوگل ---------- */
  /** رشته را تا حد پیکسلی/نویسه‌ای می‌برد و «…» می‌گذارد. cut=true یعنی گوگل آن را کوتاه نشان می‌دهد. */
  function clip(text, o) {
    const t = clean(text); const maxPx = o && o.maxPx, maxLen = o && o.maxLen;
    const over = (s) => (maxPx && Policy.pixelWidth(s) > maxPx) || (maxLen && len(s) > maxLen);
    if (!over(t)) return { text: t, cut: false };
    const chars = Array.from(t); let n = chars.length; while (n > 1 && over(chars.slice(0, n).join('') + '…')) n--;
    return { text: chars.slice(0, n).join('').replace(/[\s،,.\-–—|:]+$/, '') + '…', cut: true };
  }
  /** host و مسیر «breadcrumb» مثل نتیجهٔ واقعی گوگل. */
  function crumbs(url) {
    try { const u = new URL(url); const parts = decodeURIComponent(u.pathname).split('/').filter(Boolean).slice(0, 3); return { host: u.host.replace(/^www\./, ''), path: parts.join(' › ') }; } catch (e) { return { host: '', path: '' }; }
  }
  /** fallbackTitle: اگر عنوان سئو خالی است، گوگل معمولاً نام محصول را نشان می‌دهد. */
  function serp(f) {
    const x = f || {}; const rawT = clean(x.title); const t = rawT || clean(x.fallbackTitle); const d = clean(x.description);
    const tc = clip(t, { maxPx: L.title.pxMax }), dc = clip(d, { maxLen: L.meta.max });
    const c = crumbs(x.url || '');
    return { title: tc.text || '(بدون عنوان)', titleCut: tc.cut, titleFromName: !rawT && !!t, titlePx: Policy.pixelWidth(t), desc: dc.text || '(گوگل خودش از متن صفحه یک توضیح می‌سازد)', descCut: dc.cut, descMissing: !d, host: c.host, path: c.path };
  }

  /* ---------- شمارندهٔ فیلد ---------- */
  /** کلید: seo_title | meta_description | focus_keyword. state: empty | short | ok | long | bad. pct برای نوار (۰ تا ۱۰۰؛ ۱۰۰ = حد ایده‌آل). */
  function meter(field, value) {
    const v = clean(value);
    if (field === 'seo_title') {
      const c = Policy.checkTitle(v); const px = c.px;
      if (!v) return { state: 'empty', len: 0, px: 0, pct: 0, text: 'خالی' };
      const state = c.status === 'short' ? 'short' : (c.len > L.title.target || px > L.title.pxMax) ? 'long' : c.ok ? 'ok' : 'bad';
      return { state, len: c.len, px, pct: Math.min(100, Math.round(px / L.title.pxMax * 100)), text: c.len + ' نویسه · ' + px + ' از ' + L.title.pxMax + ' پیکسل' + (state === 'long' ? ' — در گوگل بریده می‌شود' : state === 'short' ? ' — کوتاه' : '') };
    }
    if (field === 'meta_description') {
      const c = Policy.checkMeta(v);
      if (!v) return { state: 'empty', len: 0, pct: 0, text: 'خالی' };
      const state = c.status === 'short' ? 'short' : c.len > L.meta.max ? 'long' : c.ok ? 'ok' : 'bad';
      return { state, len: c.len, pct: Math.min(100, Math.round(c.len / L.meta.target * 100)), text: c.len + ' از ' + L.meta.max + ' نویسه' + (state === 'long' ? ' — بریده می‌شود' : state === 'short' ? ' — کوتاه (حداقل ' + L.meta.min + ')' : '') };
    }
    const n = len(v); const words = v ? v.split(' ').length : 0;
    if (!v) return { state: 'empty', len: 0, pct: 0, text: 'خالی' };
    const state = n > L.focus.maxChars || words > L.focus.maxWords + 2 ? 'long' : 'ok';
    return { state, len: n, pct: Math.min(100, Math.round(words / L.focus.maxWords * 100)), text: words + ' واژه' + (state === 'long' ? ' — بلند؛ عبارت کلیدی باید کوتاه و دقیق باشد' : '') };
  }

  /* ---------- گروه‌بندی مشکلات یک محصول ---------- */
  /** findings: خروجی soFindings ({code,label,detail,sev,pen,fix,note}). برمی‌گرداند گروه‌های غیرخالی به‌ترتیب اولویت + جمع جریمه‌ها. */
  function groupFindings(findings) {
    const list = (findings || []).filter((x) => x && x.fix !== 'info');
    const info = (findings || []).filter((x) => x && x.fix === 'info');
    const groups = AREAS.map((a) => {
      const items = list.filter((x) => areaOf(x.code) === a.id).sort((p, q) => (SEV_RANK[p.sev] == null ? 9 : SEV_RANK[p.sev]) - (SEV_RANK[q.sev] == null ? 9 : SEV_RANK[q.sev]) || (q.pen || 0) - (p.pen || 0));
      const penalty = items.reduce((s, x) => s + (x.pen || 0), 0); const auto = items.filter((x) => x.fix === 'auto');
      return { id: a.id, label: a.label, ic: a.ic, items, penalty, autoCount: auto.length, autoGain: auto.reduce((s, x) => s + (x.pen || 0), 0), manualCount: items.length - auto.length };
    }).filter((g) => g.items.length);
    return { groups, info, total: list.length, auto: list.filter((x) => x.fix === 'auto').length, manual: list.filter((x) => x.fix !== 'auto').length, gain: list.filter((x) => x.fix === 'auto').reduce((s, x) => s + (x.pen || 0), 0) };
  }
  const grade = (score) => (score >= 85 ? { id: 'great', label: 'عالی' } : score >= 70 ? { id: 'good', label: 'خوب' } : score >= 50 ? { id: 'mid', label: 'نیازمند بهبود' } : { id: 'bad', label: 'ضعیف' });

  /* ---------- پیشنهادهای قبل/بعد برای مرحلهٔ پیش‌نمایش ---------- */
  const CUR = { seo_title: 'metaTitle', meta_description: 'metaDescription', focus_keyword: 'focusKeyword', excerpt: 'excerpt', content: 'content', related_keywords: 'relatedKeywords' };
  const ORDER = ['seo_title', 'meta_description', 'focus_keyword', 'excerpt', 'content', 'related_keywords'];
  /** از item (وضع فعلی) و fields (طرح اصلاح) فهرست ردیف‌های قابل‌ویرایش می‌سازد. فیلدی که مقدارش با فعلی یکی است حذف می‌شود. */
  function proposals(item, fields) {
    const out = [];
    ORDER.forEach((k) => {
      if (!fields || fields[k] == null) return;
      const after = k === 'content' ? String(fields[k]) : clean(fields[k]); const before = k === 'content' ? String(item[CUR[k]] || '') : clean(item[CUR[k]]);
      if (!after.trim() || after.trim() === before.trim()) return;
      const editable = k !== 'content' && k !== 'related_keywords';
      out.push({ field: k, label: FIELD_LABEL[k] || k, before, after, empty: !before.trim(), editable, meter: editable && k !== 'excerpt' ? { before: meter(k, before), after: meter(k, after) } : null });
    });
    return out;
  }
  /** اعتبارسنجی مقدار ویرایش‌شدهٔ کاربر؛ ok=false یعنی ذخیره نمی‌شود و reason به کاربر نشان داده می‌شود. */
  function validateEdit(field, value) {
    const v = clean(value);
    if (field === 'seo_title') { if (!v) return { ok: false, reason: 'عنوان سئو خالی است.' }; const c = Policy.checkTitle(v); return Policy.titleAcceptable(v) ? { ok: true, value: v, warn: c.ok ? '' : c.reason } : { ok: false, reason: c.reason || 'عنوان سئو معتبر نیست.' }; }
    if (field === 'meta_description') { if (!v) return { ok: false, reason: 'توضیحات متا خالی است.' }; const c = Policy.checkMeta(v); return Policy.metaAcceptable(v) ? { ok: true, value: v, warn: c.ok ? '' : c.reason } : { ok: false, reason: c.reason || 'توضیحات متا معتبر نیست.' }; }
    if (field === 'focus_keyword') { if (!v) return { ok: false, reason: 'عبارت کلیدی خالی است.' }; return len(v) <= L.focus.maxChars ? { ok: true, value: v, warn: '' } : { ok: false, reason: 'عبارت کلیدی بیش از ' + L.focus.maxChars + ' نویسه است.' }; }
    if (field === 'excerpt') return v.length >= 20 ? { ok: true, value: v, warn: '' } : { ok: false, reason: 'توضیح کوتاه خیلی کوتاه است.' };
    return { ok: true, value: String(value == null ? '' : value), warn: '' };
  }
  /** از ردیف‌ها + انتخاب کاربر + ویرایش‌ها، فیلدهای نهایی برای ذخیره را می‌سازد. errors: ویرایش‌های نامعتبر. */
  function resolveSelection(rows, sel, edits) {
    const fields = {}, errors = [], warns = [];
    (rows || []).forEach((r) => {
      if (sel && sel[r.field] === false) return;
      const hasEdit = edits && edits[r.field] != null && clean(edits[r.field]) !== clean(r.after);
      if (!hasEdit) { fields[r.field] = r.after; return; }
      const v = validateEdit(r.field, edits[r.field]);
      if (!v.ok) { errors.push({ field: r.field, label: r.label, reason: v.reason }); return; }
      fields[r.field] = v.value; if (v.warn) warns.push(r.label + ': ' + v.warn);
    });
    return { fields, errors, warns };
  }
  /** فیلدهایی که با مجموعهٔ کدهای انتخاب‌شده اجازهٔ تغییر دارند. */
  function allowedFields(codes) {
    const s = new Set(); (codes || []).forEach((c) => (CODE_FIELDS[c] || []).forEach((f) => s.add(f))); return s;
  }
  function filterFields(fields, codes) {
    const ok = allowedFields(codes); const out = {}; Object.keys(fields || {}).forEach((k) => { if (ok.has(k)) out[k] = fields[k]; }); return out;
  }

  /* ---------- ممیزی کل کاتالوگ ---------- */
  const BULK_CODES = ['seo_no_title', 'seo_title_len', 'seo_dup_title', 'seo_no_meta', 'seo_meta_len', 'seo_dup_meta', 'seo_meta_unrelated', 'seo_no_focus', 'seo_focus_absent', 'excerpt_missing', 'typo_text', 'seo_markup'];
  const WRITE_CODES = ['content_empty', 'content_thin'];
  const DEFAULT_ON = ['seo_no_title', 'seo_no_meta', 'seo_no_focus', 'seo_title_len', 'seo_meta_len', 'seo_dup_title', 'seo_dup_meta', 'seo_focus_absent', 'seo_meta_unrelated', 'excerpt_missing', 'typo_text', 'seo_markup'];
  /** diagnoses: R.scan.all (فقط type=product نگه داشته می‌شود). defs: SI.Repair.DEF. */
  function bulkAudit(diagnoses, defs) {
    const D = defs || {}; const rows = (diagnoses || []).filter((d) => (d.type || 'product') === 'product'); const n = rows.length;
    const bands = { bad: 0, mid: 0, good: 0, great: 0 }; let sum = 0;
    const byCode = {}; const areas = {};
    rows.forEach((d) => {
      sum += d.score; bands[grade(d.score).id]++;
      (d.problems || []).forEach((p) => {
        if (!BULK_CODES.concat(WRITE_CODES).includes(p.code)) return;
        const e = byCode[p.code] || (byCode[p.code] = { code: p.code, label: p.label || (D[p.code] || {}).label || p.code, n: 0, pen: (D[p.code] || {}).pen || 0, fix: p.fix || (D[p.code] || {}).fix || 'manual', severity: p.severity || (D[p.code] || {}).sev || 'low', write: WRITE_CODES.includes(p.code) });
        e.n++;
      });
    });
    const issues = Object.keys(byCode).map((c) => { const e = byCode[c]; e.pct = n ? Math.round(e.n / n * 100) : 0; e.gain = n ? Math.round(e.n * e.pen / n * 10) / 10 : 0; e.area = areaOf(c); return e; })
      .sort((a, b) => b.gain - a.gain || b.n - a.n);
    issues.forEach((e) => { (areas[e.area] = areas[e.area] || { id: e.area, n: 0, gain: 0 }); areas[e.area].n += e.n; areas[e.area].gain += e.gain; });
    const avg = n ? Math.round(sum / n) : 0;
    const fixableGain = issues.filter((e) => e.fix === 'auto' || e.fix === 'approve').reduce((s, e) => s + e.gain, 0);
    return { total: n, avg, grade: grade(avg), bands, issues, areas, flagged: rows.filter((d) => d.problems && d.problems.some((p) => BULK_CODES.includes(p.code))).length, estimatedAfter: Math.min(100, Math.round(avg + fixableGain)), worst: rows.slice().sort((a, b) => a.score - b.score).slice(0, 5).map((d) => ({ id: d.id, title: d.title, score: d.score })) };
  }
  /** هدف‌های اجرای گروهی. scope: all | weak (امتیاز زیر ۶۰) | noseo (بدون عنوان یا متا). codes فقط محصولاتی را نگه می‌دارد که حداقل یکی از آن مشکل‌ها را دارند. */
  function pickTargets(diagnoses, o) {
    const x = o || {}; const codes = new Set(x.codes || []); const scope = x.scope || 'all'; const max = Math.max(1, Number(x.max) || 50);
    const rows = (diagnoses || []).filter((d) => (d.type || 'product') === 'product' && d.problems && d.problems.some((p) => codes.has(p.code)));
    const f = scope === 'weak' ? rows.filter((d) => d.score < 60) : scope === 'noseo' ? rows.filter((d) => d.noSeo) : rows;
    return { total: f.length, targets: f.slice().sort((a, b) => a.score - b.score).slice(0, max) };
  }
  /** برآورد زمان باقی‌مانده بر اساس سرعت واقعی همین اجرا. */
  function eta(startMs, done, total, nowMs) {
    const now = nowMs == null ? Date.now() : nowMs; const el = Math.max(0, now - startMs); const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
    if (!done || !total || el < 1500) return { pct, elapsedSec: Math.round(el / 1000), remainSec: null };
    return { pct, elapsedSec: Math.round(el / 1000), remainSec: Math.max(0, Math.round(el / done * (total - done) / 1000)) };
  }
  function durationFa(sec) {
    if (sec == null) return 'در حال برآورد…'; const m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + ' دقیقه' + (s ? ' و ' + s + ' ثانیه' : '') : s + ' ثانیه';
  }

  /* ---------- خروجی CSV ---------- */
  function csvCell(v) { const s = String(v == null ? '' : v).replace(/\r?\n/g, ' '); return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  /** entries: [{id,title,url,status,fields:{k:{before,after}}}] → سطر به‌ازای هر فیلد تغییر‌کرده. */
  function changeRows(entries) {
    const rows = [];
    (entries || []).forEach((e) => ORDER.forEach((k) => { if (e.fields && e.fields[k]) { const c = e.fields[k]; const b = k === 'content' ? '(متن محصول؛ جزئیات در تب «تغییرات»)' : c.before; const a = k === 'content' ? '(متن محصول؛ جزئیات در تب «تغییرات»)' : c.after; rows.push({ id: e.id, title: e.title, url: e.url || '', status: e.status || '', field: FIELD_LABEL[k] || k, before: b, after: a }); } }));
    return rows;
  }
  function toCsv(rows, columns) {
    const cols = columns || [['id', 'شناسه'], ['title', 'محصول'], ['url', 'آدرس'], ['status', 'وضعیت'], ['field', 'فیلد'], ['before', 'قبل'], ['after', 'بعد']];
    return '\uFEFF' + [cols.map((c) => csvCell(c[1])).join(',')].concat((rows || []).map((r) => cols.map((c) => csvCell(r[c[0]])).join(','))).join('\r\n');
  }
  /** خروجی ممیزی کل کاتالوگ (هر محصول یک سطر). */
  function auditCsv(diagnoses) {
    const rows = (diagnoses || []).filter((d) => (d.type || 'product') === 'product').map((d) => ({ id: d.id, title: d.title, url: d.url || '', score: d.score, problems: (d.problems || []).map((p) => p.label).join(' | '), auto: (d.problems || []).filter((p) => p.fix === 'auto').length }));
    return toCsv(rows.sort((a, b) => a.score - b.score), [['id', 'شناسه'], ['title', 'محصول'], ['url', 'آدرس'], ['score', 'امتیاز'], ['auto', 'مشکل خودکارقابل‌اصلاح'], ['problems', 'مشکلات']]);
  }

  return { FIELD_LABEL, CODE_FIELDS, AREAS, BULK_CODES, WRITE_CODES, DEFAULT_ON, areaOf, serp, clip, crumbs, meter, groupFindings, grade, proposals, validateEdit, resolveSelection, allowedFields, filterFields, bulkAudit, pickTargets, eta, durationFa, changeRows, toCsv, auditCsv };
});

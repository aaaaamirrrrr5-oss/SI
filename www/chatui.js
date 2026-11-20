/* Site Inspector — chatui.js (v1.72.0)  SI.ChatUI
 * منطق خالص بخش «دستیار» (بدون DOM و شبکه، قابل‌آزمون با Node):
 *  - renderMarkdown: رندر امن Markdown (تیتر، فهرست شماره‌دار/نقطه‌ای، جدول، نقل‌قول، لینک https، کد، پررنگ/کج، <small> مجاز)
 *  - makeSource / renderSource: «مبنای پاسخ» (موتور، مدل، شواهد، تازگی داده، ممیز عدد) برای شفافیت و دقت
 *  - freshness: سن بازرسی و هشدار کهنگی
 *  - transcript: خروجی Markdown گفتگو
 *  - trimHistory: نگه‌داشتن آخرین پیام‌ها (حذف ورودی‌های خراب)
 *  - clampInput / withTimeout / canRegenerate: کمک‌های ورودی و اجرا
 *  - suggest / COMMANDS: پالت دستورها هنگام تایپ (با وضعیت «آماده / نیازمند …»)
 *  - upsertSession / removeSession / titleOf: تاریخچهٔ گفتگوها (نشست‌ها)
 *  - shouldCollapse / elapsedLabel: جمع‌کردن پاسخ بلند و زمان‌سنج پیشرفت
 * همهٔ خروجی‌های HTML از esc عبور می‌کنند؛ فقط لینک https و برچسب‌های ثابت مجازند. UMD. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SI = root.SI || {}, root.SI.ChatUI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DAY = 86400000;
  const MAX_INPUT = 2000;
  const MAX_HISTORY = 60;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const fa = (n) => String(n).replace(/\d/g, (d) => FA[d]);

  /* ------------------------------------------------------------------ Markdown */
  const SAFE_URL = /^https?:\/\/[^\s<>"'`\u0000-\u001f]+$/i;
  function linkHtml(url, label) {
    // url از قبل escape شده است (&amp; …)؛ برای اعتبارسنجی نسخهٔ خام را می‌سنجیم.
    const raw = url.replace(/&amp;/g, '&');
    if (!SAFE_URL.test(raw)) return label;
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + label + '</a>';
  }
  function inline(s) {
    const hold = [];
    const keep = (h) => { hold.push(h); return '\u0001' + (hold.length - 1) + '\u0001'; };
    // کد درون‌خطی: هیچ قالب‌بندی دیگری داخلش اعمال نشود
    s = s.replace(/`([^`\n]+)`/g, (m, c) => keep('<code>' + c + '</code>'));
    // لینک [متن](https://…)
    s = s.replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, (m, t, u) => keep(linkHtml(u, t)));
    // نشانی خام
    s = s.replace(/(^|[\s(،؛:])(https?:\/\/[^\s<>()\u0001]+)/g, (m, pre, u) => {
      let tail = ''; const t = u.match(/[.,;:!؟،؛)]+$/); if (t) { tail = t[0]; u = u.slice(0, -tail.length); }
      return pre + keep(linkHtml(u, u)) + tail;
    });
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    s = s.replace(/(^|[\s(«])_([^_\n]+)_(?=$|[\s).,،؛:!؟»])/g, '$1<i>$2</i>');
    s = s.replace(/(^|[\s(«])\*([^*\n]+)\*(?=$|[\s).,،؛:!؟»])/g, '$1<i>$2</i>');
    // <small> مجاز (پس از escape به‌صورت &lt;small&gt; است)
    s = s.replace(/&lt;small&gt;([\s\S]*?)&lt;\/small&gt;/g, '<small>$1</small>');
    return s.replace(/\u0001(\d+)\u0001/g, (m, i) => hold[+i]);
  }
  const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.indexOf('-') >= 0 && l.indexOf('|') >= 0;
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const reOl = /^\s*(?:\d+|[۰-۹]+)[.)]\s+(.*)$/;
  const reUl = /^\s*[-*•]\s+(.*)$/;

  /**
   * @param {string} text
   * @param {{code?:(src:string)=>string}} [opts]  code: رندرکنندهٔ بلوک کد (برای دکمهٔ کپی در برنامه)
   */
  function renderMarkdown(text, opts) {
    opts = opts || {};
    const blocks = [];
    let t = String(text == null ? '' : text).replace(/\r\n?/g, '\n').trim().replace(/\n{3,}/g, '\n\n');
    t = t.replace(/```[^\n]*\n?([\s\S]*?)```/g, (m, c) => { blocks.push(c.replace(/\n$/, '')); return '\n\u0000' + (blocks.length - 1) + '\u0000\n'; });
    const lines = esc(t).split('\n');
    const out = [];
    let i = 0;
    const flushPara = (buf) => { if (buf.length) out.push('<p>' + buf.map(inline).join('<br>') + '</p>'); };
    let para = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { flushPara(para); para = []; i++; continue; }
      let m;
      if ((m = l.match(/^\u0000(\d+)\u0000$/))) { flushPara(para); para = []; out.push('\u0000' + m[1] + '\u0000'); i++; continue; }
      if ((m = l.match(/^\s{0,3}(#{1,4})\s+(.+)$/))) { flushPara(para); para = []; out.push('<h4 class="md-h">' + inline(m[2].replace(/\s*#+\s*$/, '')) + '</h4>'); i++; continue; }
      if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) { flushPara(para); para = []; out.push('<hr>'); i++; continue; }
      if (/^\s*&gt;\s?/.test(l)) {
        flushPara(para); para = []; const q = [];
        while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*&gt;\s?/, '')); i++; }
        out.push('<blockquote>' + q.map(inline).join('<br>') + '</blockquote>'); continue;
      }
      if (l.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flushPara(para); para = [];
        const head = cells(l); i += 2; const rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') >= 0) { rows.push(cells(lines[i])); i++; }
        const n = head.length;
        out.push('<div class="md-tbl"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + Array.from({ length: n }, (_, k) => '<td>' + inline(r[k] || '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      if (reOl.test(l) || reUl.test(l)) {
        flushPara(para); para = [];
        const ordered = reOl.test(l); const re = ordered ? reOl : reUl; const items = [];
        while (i < lines.length) {
          const mm = lines[i].match(re);
          if (mm) { items.push([mm[1]]); i++; }
          else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length && !reOl.test(lines[i]) && !reUl.test(lines[i])) { items[items.length - 1].push(lines[i].trim()); i++; } // ادامهٔ همان مورد
          else break;
        }
        out.push('<' + (ordered ? 'ol' : 'ul') + ' class="md-list">' + items.map((it) => '<li>' + it.map(inline).join('<br>') + '</li>').join('') + '</' + (ordered ? 'ol' : 'ul') + '>');
        continue;
      }
      para.push(l); i++;
    }
    flushPara(para);
    const codeHtml = opts.code || ((src) => '<div class="code"><pre dir="ltr">' + esc(src) + '</pre></div>');
    return out.join('').replace(/\u0000(\d+)\u0000/g, (m, k) => codeHtml(blocks[+k]));
  }

  /** متن ساده برای کپی/خروجی: برچسب‌ها و نشانه‌گذاری Markdown ساده حذف می‌شود، کد حفظ می‌شود. */
  function plainText(content) {
    return String(content == null ? '' : content).replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<[^>]+>/g, '').replace(/\*\*([^*\n]+)\*\*/g, '$1').trim();
  }

  /* ------------------------------------------------------------------ تازگی داده */
  function freshness(report, now) {
    if (!report || !report.at) return null;
    const days = Math.max(0, Math.floor(((now || Date.now()) - report.at) / DAY));
    const label = days === 0 ? 'امروز' : days === 1 ? 'دیروز' : fa(days) + ' روز پیش';
    return { days, stale: days > 14, label };
  }

  /* ------------------------------------------------------------------ مبنای پاسخ */
  const MODES = { rules: 'موتور قاعده‌محور داخلی', model: 'مدل زبانی روی گوشی', research: 'پژوهش وب + جمع‌بندی', action: 'اجرای دستور' };
  /**
   * @param {{mode:string, modelName?:string, evidence?:Array, ctx?:string[], report?:object, badNumbers?:string[], note?:string, now?:number, sourcesCount?:number}} o
   */
  function makeSource(o) {
    o = o || {};
    const fr = freshness(o.report, o.now);
    const ev = (o.evidence || []).slice(0, 8).map((e) => ({
      title: String(e.title || e.url || '').slice(0, 140), url: /^https?:\/\//i.test(e.url || '') ? String(e.url).slice(0, 400) : '',
      type: String(e.sourceType || e.type || '').slice(0, 40), verified: !!e.verified,
    }));
    return {
      mode: MODES[o.mode] ? o.mode : 'rules', model: o.modelName ? String(o.modelName).slice(0, 80) : '',
      ctx: (o.ctx || []).slice(0, 6).map((x) => String(x).slice(0, 60)), evidence: ev,
      fresh: fr ? { days: fr.days, stale: fr.stale, label: fr.label } : null,
      bad: (o.badNumbers || []).slice(0, 8).map(String),
      numbersChecked: o.mode === 'model' ? true : false,
      note: o.note ? String(o.note).slice(0, 300) : '', sources: o.sourcesCount != null ? Number(o.sourcesCount) : null,
    };
  }
  function renderSource(src) {
    if (!src) return '';
    const rows = [];
    rows.push('<li><b>روش پاسخ:</b> ' + esc(MODES[src.mode] || '') + (src.model ? ' · ' + esc(src.model) : '') + (src.mode === 'model' || src.mode === 'rules' ? ' · روی همین دستگاه' : '') + '</li>');
    if (src.ctx && src.ctx.length) rows.push('<li><b>دادهٔ مورد استفاده:</b> ' + src.ctx.map(esc).join('، ') + '</li>');
    if (src.fresh) rows.push('<li><b>تازگی بازرسی:</b> ' + esc(src.fresh.label) + (src.fresh.stale ? ' — قدیمی است؛ پیش از تصمیم دوباره بازرسی کن' : '') + '</li>');
    else if (src.mode !== 'research') rows.push('<li><b>تازگی بازرسی:</b> دادهٔ بازرسی در دسترس نبود؛ پاسخ عمومی است.</li>');
    if (src.numbersChecked) rows.push('<li><b>ممیز عدد:</b> ' + (src.bad && src.bad.length ? 'این عددها در داده نبودند و ممکن است تقریبی باشند: ' + src.bad.map(esc).join('، ') : 'همهٔ عددهای مهم پاسخ در داده‌ها پیدا شد.') + '</li>');
    if (src.sources != null) rows.push('<li><b>منابع بیرونی:</b> ' + esc(fa(src.sources)) + ' مورد؛ فهرست کامل در متن پاسخ است. دریافت متن، صحت مستقل ادعاها را تضمین نمی‌کند.</li>');
    if (src.evidence && src.evidence.length) {
      rows.push('<li><b>شواهد بازیابی‌شده:</b><ul>' + src.evidence.map((e) => '<li>' + (e.url ? linkHtml(esc(e.url), esc(e.title || e.url)) : esc(e.title)) + (e.type ? ' <small>(' + esc(e.type) + (e.verified ? ' · تأییدشده' : ' · تأییدنشده') + ')</small>' : '') + '</li>').join('') + '</ul></li>');
    }
    if (src.note) rows.push('<li class="msrc-note">' + esc(src.note) + '</li>');
    const flag = (src.bad && src.bad.length) || (src.fresh && src.fresh.stale);
    return '<details class="msrc' + (flag ? ' warn' : '') + '"><summary>مبنای پاسخ' + (flag ? ' · نیاز به دقت' : '') + '</summary><ul>' + rows.join('') + '</ul></details>';
  }

  /* ------------------------------------------------------------------ تاریخچه و خروجی */
  function trimHistory(chat, max) {
    max = max || MAX_HISTORY; let a = (chat || []).filter((m) => m && typeof m.content === 'string');
    if (a.length > max) a = a.slice(a.length - max);
    return a;
  }
  function transcript(chat, o) {
    o = o || {}; const rows = (chat || []).filter((m) => m && m.content);
    const head = '# گفتگوی دستیار Site Inspector' + (o.site ? ' — ' + o.site : '') + '\n' + 'خروجی: ' + new Date(o.now || Date.now()).toISOString().slice(0, 16).replace('T', ' ') + ' · ' + fa(rows.length) + ' پیام\n';
    const body = rows.map((m) => {
      const who = m.role === 'user' ? '**شما**' : '**دستیار**';
      const when = m.at ? ' (' + new Date(m.at).toISOString().slice(11, 16) + ')' : '';
      return who + when + '\n\n' + plainText(m.content) + (m.src ? '\n\n_مبنا: ' + (MODES[m.src.mode] || '') + (m.src.model ? ' · ' + m.src.model : '') + '_' : '');
    }).join('\n\n---\n\n');
    return head + '\n' + body + '\n';
  }

  /* ------------------------------------------------------------------ ورودی و اجرا */
  function clampInput(text, max) {
    let s = String(text == null ? '' : text).replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
    max = max || MAX_INPUT; const a = [...s]; if (a.length > max) s = a.slice(0, max).join('');
    return s;
  }
  function withTimeout(promise, ms, message) {
    let timer; const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(message || 'زمان پاسخ تمام شد.')), ms); });
    return Promise.race([promise, t]).finally(() => clearTimeout(timer));
  }
  /** بازتولید فقط برای پاسخی که آخرین پیام است، پیام پیشین کاربر است و آن پیام «دستور اجرایی» نبوده. */
  function canRegenerate(chat, index) {
    const c = chat || []; if (index !== c.length - 1) return false;
    const m = c[index], u = c[index - 1];
    return !!(m && m.role === 'assistant' && u && u.role === 'user' && !u.act && u.content);
  }

  /* ------------------------------------------------------------------ پالت دستورها (پیشنهاد هنگام تایپ) */
  // needs: report | log | bridge — برای نمایش وضعیت «آمادهٔ اجرا / نیازمند …»؛ همهٔ موارد با تست روی Brain/Research راستی‌آزمایی می‌شوند.
  const COMMANDS = [
    { g: 'تحلیل', t: 'گزارش کلی بده', k: 'خلاصه وضعیت سایت امتیاز', needs: 'report' },
    { g: 'تحلیل', t: 'برنامهٔ اقدام بده', k: 'اولویت کارها ۷ روزه ۳۰ روزه', needs: 'report' },
    { g: 'تحلیل', t: 'قدم بعدی چیست؟', k: 'بعدش چه کنم', needs: null },
    { g: 'تحلیل', t: 'سریع‌ترین کارها چیست؟', k: 'کار سریع آسان', needs: 'report' },
    { g: 'تحلیل', t: 'گزارش مشتری بده', k: 'گزارش قابل ارسال مدیر', needs: 'report' },
    { g: 'ترافیک', t: 'چرا ترافیک کم شده؟', k: 'افت بازدید کاهش', needs: 'log' },
    { g: 'ترافیک', t: 'روند ترافیک من چطور است؟', k: 'روند بازدید نمودار', needs: 'log' },
    { g: 'ترافیک', t: 'رباتان AI من را می‌بینند؟', k: 'gptbot claude perplexity خزنده هوش مصنوعی', needs: 'report' },
    { g: 'اجرا', t: 'سئو را همین الان خودکار اجرا کن', k: 'اصلاح عنوان متا بازسازی', needs: 'bridge' },
    { g: 'اجرا', t: 'غلط‌های املایی متن‌ها را اصلاح کن', k: 'ویراستاری نیم‌فاصله نگارش', needs: 'bridge' },
    { g: 'اجرا', t: 'محصولات را خودکار ترمیم کن', k: 'ترمیم محصول بدون سئو توضیح', needs: 'bridge' },
    { g: 'اجرا', t: 'آخرین تغییر را برگردان', k: 'بازگردانی undo', needs: 'bridge' },
    { g: 'محصولات', t: 'وضعیت محصولات چیست؟', k: 'بررسی محصول ووکامرس', needs: 'bridge' },
    { g: 'قوانین', t: 'قوانین GEO', k: 'geo aeo گوگل قانون', needs: null },
    { g: 'قوانین', t: 'خرافه‌های سئو', k: 'باور نادرست افسانه', needs: null },
    { g: 'قوانین', t: 'آیا llms.txt لازم است؟', k: 'llms گوگل', needs: null },
    { g: 'قوانین', t: 'رعایت قوانین را بسنج', k: 'امتیاز رعایت', needs: 'report' },
    { g: 'ساخت', t: 'robots.txt بساز', k: 'ربات فایل', needs: 'report' },
    { g: 'ساخت', t: 'llms.txt بساز', k: 'فایل', needs: 'report' },
    { g: 'ساخت', t: 'اسکیمای JSON-LD بساز', k: 'schema ساختاریافته', needs: 'report' },
    { g: 'ساخت', t: 'چک‌لیست انتشار مقاله', k: 'مقاله انتشار', needs: null },
    { g: 'پژوهش', t: 'از منابع خارجی درباره آخرین تغییرات SEO GEO AEO تحقیق کن', k: 'پژوهش وب اینترنت', needs: 'bridge' },
    { g: 'راهنما', t: 'دستیار چه کارهایی بلد است؟', k: 'راهنما قابلیت help', needs: null },
  ];
  const NEED_LABEL = { report: 'نیاز به بازرسی', log: 'نیاز به داده ترافیک', bridge: 'نیاز به افزونه' };
  const normQ = (s) => String(s == null ? '' : s).toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064b-\u065f\u0640\u200c\u200f]/g, '').replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[?؟!.،,:؛]/g, ' ').replace(/\s+/g, ' ').trim();
  /**
   * پیشنهاد دستور هنگام تایپ. با «/» همهٔ دستورها؛ بدون آن حداقل ۲ نویسه و همهٔ واژه‌ها باید در عنوان/کلیدواژه باشند.
   * @param {string} query  @param {{report?:any, log?:any, bridge?:any, recent?:string[]}} ctx @returns {Array<{t,g,ready,need,recent}>}
   */
  function suggest(query, ctx, max) {
    ctx = ctx || {}; max = max || 5; let raw = String(query == null ? '' : query).trim(); const slash = raw[0] === '/'; if (slash) raw = raw.slice(1);
    if (raw.indexOf('\n') >= 0) return [];
    const q = normQ(raw); if (!slash && [...q].length < 2) return [];
    const toks = q.split(' ').filter(Boolean);
    const state = { report: !!ctx.report, log: !!ctx.log, bridge: !!ctx.bridge };
    const pool = COMMANDS.map((c) => ({ t: c.t, g: c.g, hay: normQ(c.t + ' ' + c.k), needs: c.needs }))
      .concat((ctx.recent || []).slice(0, 12).map((r) => ({ t: String(r), g: 'اخیر', hay: normQ(r), needs: null, recent: true })));
    const seen = new Set(); const out = [];
    pool.forEach((c, idx) => {
      if (seen.has(c.t)) return;
      const nt = normQ(c.t); if (q && nt === q) return; // دقیقاً همان متن تایپ‌شده
      let score = 0;
      if (!toks.length) score = c.recent ? 0 : 1;
      else if (toks.every((w) => c.hay.indexOf(w) >= 0)) score = 2 + (nt.indexOf(q) === 0 ? 3 : 0) + (nt.indexOf(q) > 0 ? 1 : 0) + (c.recent ? 0.5 : 0);
      else return;
      seen.add(c.t); out.push({ c, score, idx });
    });
    out.sort((a, b) => b.score - a.score || a.idx - b.idx);
    return out.slice(0, max).map(({ c }) => ({ t: c.t, g: c.g, recent: !!c.recent, ready: !c.needs || state[c.needs], need: c.needs && !state[c.needs] ? NEED_LABEL[c.needs] : '' }));
  }

  /* ------------------------------------------------------------------ نشست‌های گفتگو (تاریخچه) */
  const MAX_SESSIONS = 15, SESSION_MSGS = 40, SESSION_TEXT = 8000;
  const hasContent = (chat) => (chat || []).some((m) => m && m.role === 'user' && m.content);
  function titleOf(chat) {
    const u = (chat || []).find((m) => m && m.role === 'user' && m.content); const s = u ? plainText(u.content).split('\n')[0].trim() : '';
    const a = [...s]; return a.length > 48 ? a.slice(0, 47).join('') + '…' : (s || 'گفتگوی بدون عنوان');
  }
  const slim = (m) => { const o = { role: m.role, content: String(m.content).slice(0, SESSION_TEXT), at: m.at }; if (m.err) o.err = true; if (m.stopped) o.stopped = true; if (m.act) o.act = m.act; if (m.src) o.src = m.src; return o; };
  function newSessionId(now) { return 's' + (now || Date.now()).toString(36) + Math.random().toString(36).slice(2, 6); }
  /** ذخیرهٔ گفتگوی جاری در فهرست نشست‌ها (جدیدترین اول، سقف ۱۵). گفتگوی بدون پیام کاربر ذخیره نمی‌شود. */
  function upsertSession(sessions, id, chat, now) {
    if (!id || !hasContent(chat)) return (sessions || []).slice(0, MAX_SESSIONS);
    now = now || Date.now(); const prev = (sessions || []).find((s) => s.id === id);
    const msgs = (chat || []).filter((m) => m && typeof m.content === 'string').slice(-SESSION_MSGS).map(slim);
    const entry = { id, title: titleOf(chat), at: prev ? prev.at : now, updated: now, n: msgs.length, msgs };
    return [entry].concat((sessions || []).filter((s) => s.id !== id)).slice(0, MAX_SESSIONS);
  }
  const removeSession = (sessions, id) => (sessions || []).filter((s) => s.id !== id);
  function sessionLabel(s, now) {
    const f = freshness({ at: s.updated }, now); return (f ? f.label : '') + ' · ' + fa(s.n) + ' پیام';
  }

  /* ------------------------------------------------------------------ نمایش: جمع‌کردن پاسخ‌های بلند و زمان‌سنج */
  function shouldCollapse(content) { const p = plainText(content); return [...p].length > 1200 || p.split('\n').length > 22; }
  function elapsedLabel(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)); if (s < 60) return fa(s) + ' ثانیه';
    return fa(Math.floor(s / 60)) + ' دقیقه و ' + fa(s % 60) + ' ثانیه';
  }
  return { renderMarkdown, plainText, freshness, makeSource, renderSource, trimHistory, transcript, clampInput, withTimeout, canRegenerate, suggest, COMMANDS, upsertSession, removeSession, newSessionId, titleOf, hasContent, sessionLabel, shouldCollapse, elapsedLabel, MODES, MAX_INPUT, MAX_HISTORY, MAX_SESSIONS, esc };
});

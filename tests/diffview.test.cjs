'use strict';
const assert = require('assert'); const D = require('../www/diffview.js');
// tokenizer is lossless
const html = '<h2>عنوان</h2>\n<p>كتاب   خوب <img src="a.jpg"></p>';
assert.strictEqual(D.tokenize(html).join(''), html);
// exact change: Arabic kaf fixed, alt added, heading level changed
const before = '<p>' + 'متن بلند '.repeat(40) + 'كتاب خوب</p><h4>تیتر</h4><img src="a.jpg"><p>' + 'پایان '.repeat(40) + '</p>';
const after = before.replace('كتاب', 'کتاب').replace('<h4>تیتر</h4>', '<h3>تیتر</h3>').replace('<img src="a.jpg">', '<img src="a.jpg" alt="تصویر">');
const ch = D.fieldChange('content', before, after);
assert.ok(!ch.same && ch.kind === 'text'); assert.strictEqual(ch.stats.hunks >= 3, true);
assert.ok(ch.segs.some((g) => g.t === 'gap'), 'long unchanged text collapsed');
const dels = ch.segs.filter((g) => g.t === 'del').map((g) => g.s).join('|'), ins = ch.segs.filter((g) => g.t === 'ins').map((g) => g.s).join('|');
assert.ok(dels.includes('كتاب') && ins.includes('کتاب')); assert.ok(dels.includes('<h4>') && ins.includes('<h3>')); assert.ok(ins.includes('alt='));
assert.ok(!ch.segs.filter((g) => g.t === 'del').some((g) => g.s.includes('متن بلند')), 'unchanged text is not marked');
// value fields + identical fields are dropped
const d = D.fieldsDiff({ metaTitle: '', metaDescription: 'x', focusKeyword: 'k', excerpt: 'e' }, { seo_title: 'T', meta_description: 'x', focus_keyword: 'k2', excerpt: 'e' });
assert.deepStrictEqual(d.map((x) => x.field), ['seo_title', 'focus_keyword']); assert.ok(d[0].empty && d[1].before === 'k');
// render escapes
const html2 = D.renderSegs(D.diffTokens('<b>a</b>', '<i>a</i>')); assert.ok(html2.includes('&lt;b&gt;') && html2.includes('<del') && html2.includes('<ins') && !html2.includes('<b>'));
// compact keeps size small
const big = D.fieldChange('content', 'الف '.repeat(5000), 'ب '.repeat(5000)); const c = D.compact(big, 1000); assert.ok(JSON.stringify(c).length < 3000);
// huge block fallback does not blow up
const t0 = Date.now(); D.diffTokens('a '.repeat(20000), 'b '.repeat(20000)); assert.ok(Date.now() - t0 < 1500);
console.log('diffview ok');

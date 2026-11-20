const assert = require('node:assert/strict');
const F = require('../www/fatext.js');

/* normalization */
assert.equal(F.normalize('كتاب ي ۱۲۳ ٤٥'), 'کتاب ی 123 45');
assert.equal(F.normalize('سلـــام'), 'سلام');
assert.equal(F.normalize('a\u200c\u200cb'), 'a\u200cb');

/* stemming: plural / comparative / verb prefix unify */
assert.equal(F.stem('کتاب‌ها'), 'کتاب');
assert.equal(F.stem('کتابها'), 'کتاب');
assert.equal(F.stem('کتاب‌های'), 'کتاب');
assert.equal(F.stem('بزرگ‌تر'), 'بزرگ');
assert.equal(F.stem('می‌شود'), 'شود');
assert.equal(F.stem('قهوه'), 'قهوه');
assert.equal(F.stem('ماشین'), 'ماشین');
assert.equal(F.stem('shoes'), 'shoe');
assert.equal(F.stem('cities'), 'city');

/* tokens: stop-words dropped, forms unified */
const t = F.tokens('قهوه‌های تازه و دانه‌ی قهوه برای صبح');
assert.ok(t.includes('قهوه') && !t.includes('و') && !t.includes('برای'));
assert.equal(t.filter((x) => x === 'قهوه').length, 2);
assert.deepEqual(F.tokens('The best coffee beans'), ['best', 'coffee', 'bean']);

/* key phrases */
const kp = F.keyPhrases('دانه قهوه عربیکا طعم عالی دارد. دانه قهوه عربیکا را از اینجا بخرید. بهترین دانه قهوه عربیکا کدام است؟');
assert.ok(kp.length && /دانه قهوه/.test(kp[0].phrase), JSON.stringify(kp));

/* tf-idf / bm25 */
const docs = [
  { id: 'a', text: 'قهوه اسپرسو دانه قهوه تازه برشته' },
  { id: 'b', text: 'چای سبز و چای سیاه و دمنوش گیاهی' },
  { id: 'c', text: 'قهوه ترک و دانه قهوه برای دم‌آوری' },
];
const C = F.buildCorpus(docs);
assert.ok(C.cosine('a', 'c') > C.cosine('a', 'b'));
assert.ok(Math.abs(C.cosine('a', 'a') - 1) < 1e-9);
assert.equal(C.search('قهوه')[0].id === 'a' || C.search('قهوه')[0].id === 'c', true);
assert.equal(C.search('چای')[0].id, 'b');
assert.ok(C.topTerms('b', 3).some((x) => x.term === 'چای'));
assert.ok(C.idf('چای') > C.idf('قهوه'));

/* simhash / near-duplicate */
const base = 'ما در فروشگاه خود انواع دانه قهوه تازه برشته را با بهترین کیفیت و قیمت مناسب به مشتریان عزیز عرضه می‌کنیم و ارسال سریع به سراسر کشور انجام می‌شود '.repeat(3);
const near = base.replace('عزیز', 'گرامی');
const other = 'راهنمای کامل دم کردن چای سبز در خانه شامل دمای آب مدت زمان خیساندن و انتخاب برگ مناسب برای طعمی متعادل و ملایم است '.repeat(3);
assert.ok(F.hamming(F.simhash(base), F.simhash(near)) <= 6);
assert.ok(F.hamming(F.simhash(base), F.simhash(other)) > 15);
assert.ok(F.jaccardShingles(base, near) > 0.8);
assert.ok(F.jaccardShingles(base, other) < 0.1);
assert.equal(F.simhash(''), null);
assert.equal(F.hamming(null, [1, 2]), 64);

/* readability */
const easy = 'قهوه خوشمزه است. ما آن را تازه برشته می‌کنیم. ارسال سریع انجام می‌شود. قیمت‌ها مناسب‌اند. همین امروز سفارش بده. کیفیت برای ما مهم است. دانه‌ها را خودمان انتخاب می‌کنیم.';
const hard = ('این مجموعه با بهره‌گیری از تجربهٔ چندین‌ساله و همچنین استفاده از تجهیزات پیشرفتهٔ صنعتی و نیروهای متخصص و آموزش‌دیده در زمینهٔ فرآوری محصولات کشاورزی و تبدیل آن‌ها به فرآورده‌های باکیفیت و استاندارد که مطابق با نیازهای متنوع بازار داخلی و خارجی باشد فعالیت می‌کند ').repeat(3);
const re = F.readability(easy), rh = F.readability(hard);
assert.ok(re.ok && rh.ok && re.score > rh.score, JSON.stringify([re.score, rh.score]));
assert.equal(F.readability('کوتاه').ok, false);

/* html helpers */
assert.equal(F.htmlToText('<p>سلام <b>دنیا</b></p><script>x=1</script><p>خوبی&nbsp;؟</p>'), 'سلام دنیا\nخوبی ؟');
const ratio = F.textToCodeRatio('<div><p>' + 'متن '.repeat(50) + '</p></div>');
assert.ok(ratio > 0.5 && ratio <= 1);
console.log('fatext (normalize, stem, TF-IDF/BM25, SimHash, readability) tests OK');

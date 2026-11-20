const assert = require('assert'); const X = require('../www/seoextra.js');
const item = { id: 5, type: 'product', title: 'قهوه عربیکا اتیوپی', url: 'https://a.ir/product/قهوه-عربیکا-اتیوپی-ممتاز-با-رست-متوسط-و-عطر-میوه-ای-و-طعم-شیرین-2/', seo_title: 'قهوه عربیکا اتیوپی | فروشگاه نمونه', meta_description: 'قهوه عربیکا اتیوپی با رست متوسط و عطر میوه‌ای برای اسپرسو و فیلتر مناسب است.', focus_keyword: 'قهوه عربیکا',
  categories: [{ name: 'قهوه' }], product: { sku: 'C1', price: '450000', currency: 'irr', stock_status: 'instock', weight: '250', weight_unit: 'g', attributes: [{ name: 'رست', options: ['متوسط'] }, { name: 'جنس', options: ['عربیکا'] }], images: [{ id: 1, url: 'https://a.ir/1.jpg', alt: '' }, { id: 2, url: 'https://a.ir/2.jpg', alt: '' }, { id: 3, url: 'https://a.ir/3.jpg', alt: 'موجود' }] } };
const a = X.planAlt(item); assert.strictEqual(a.items.length, 2); assert.strictEqual(a.items[0].proposed, 'قهوه عربیکا اتیوپی'); assert.ok(/نمای 2/.test(a.items[1].proposed));
assert.ok(X.planOg(item).fields.og_title && X.planOg(Object.assign({}, item, { og_title: 'x' })).fields.og_title === undefined);
const sl = X.proposeSlug(item); assert.ok(sl && sl.needs_redirect && sl.tier === 'review' && sl.proposed.split('-').length <= 5, JSON.stringify(sl));
assert.strictEqual(X.proposeSlug(Object.assign({}, item, { url: 'https://a.ir/product/قهوه-ترک/' })), null);
const s = X.buildSchema(item); assert.ok(s.ok && s.jsonld.offers.priceCurrency === 'IRR' && s.jsonld.sku === 'C1' && s.breadcrumb && s.faq);
const noPrice = X.buildSchema(Object.assign({}, item, { product: { sku: 'x' } })); assert.ok(!noPrice.ok && noPrice.skipped.length, 'no offers → no schema');
const t = X.planTerm({ name: 'قهوه اسپرسو و دم‌آوری', description: '', count: 4 }, [{ title: 'قهوه عربیکا' }, { title: 'دانه روبوستا' }, { title: 'پودر ترک' }], { brand: 'فروشگاه' });
assert.ok(t.fields.seo_title && t.fields.meta_description && /عربیکا/.test(t.fields.meta_description), JSON.stringify(t));
assert.ok(X.planTerm({ name: 'چای سبز ممتاز و تازه', description: '' }, [], {}).skipped.length);
const p = X.plan(item); assert.ok(p.requires === 'bridge_extra_fields' && p.count >= 4);
console.log('seoextra tests OK');

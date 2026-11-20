const assert = require('assert');
const G = require('../www/growth.js');
const products = [
 {id:1,type:'simple',name:'آسیاب قهوه دستی',description:'توضیح کامل محصول با ویژگی ها و کاربردهای واقعی که به اندازه کافی دقیق و مفید است.',short_description:'آسیاب دستی برای آماده سازی قهوه در منزل',sku:'GR-1',images:[{src:'https://x.test/a.jpg',alt:'آسیاب دستی'}],categories:['آسیاب'],attributes:[{name:'جنس',options:['استیل']}],stock_status:'instock',price:'20'},
 {id:2,type:'variable',name:'ماگ سرامیکی',description:'',short_description:'',sku:'',images:[],categories:[],attributes:[],stock_status:'',price:''}
];
const audit = G.auditCommerceCatalog(products);
assert.strictEqual(audit.total, 2);
assert.ok(audit.average > 0 && audit.average < 100);
assert.ok(audit.results[0].issues.length > 0);
const graph = G.buildKnowledgeGraph([
 {id:1,title:'راهنمای آسیاب قهوه',url:'https://x.test/a',contentPreview:'انتخاب آسیاب قهوه و اندازه ذرات برای دم آوری'},
 {id:2,title:'انواع آسیاب قهوه',url:'https://x.test/b',excerpt:'راهنمای انتخاب آسیاب برای دم آوری قهوه'},
 {id:3,title:'کفش ورزشی',url:'https://x.test/c',excerpt:'کفش مناسب دویدن'}
]);
assert.ok(graph.nodeCount === 3);
assert.ok(graph.edgeCount >= 1);
const links = G.suggestInternalLinks({id:1,title:'راهنمای آسیاب قهوه',content:'انتخاب آسیاب قهوه و اندازه ذرات برای دم آوری'}, [
 {id:2,title:'انواع آسیاب قهوه',url:'https://x.test/b',excerpt:'انتخاب آسیاب و دم آوری قهوه'}
]);
assert.ok(links.length && links[0].score > 0);
const cannibal = G.detectCannibalization([
 {id:1,title:'خرید آسیاب',url:'/a',focusKeyword:'آسیاب قهوه'},
 {id:2,title:'راهنمای آسیاب',url:'/b',focusKeyword:'آسیاب قهوه'}
]);
assert.strictEqual(cannibal.length, 1);
const snapshots = [
 {ts:1,metrics:{clicks:100,impressions:1000}},
 {ts:2,metrics:{clicks:98,impressions:990}},
 {ts:3,metrics:{clicks:102,impressions:1010}},
 {ts:4,metrics:{clicks:40,impressions:500}}
];
const anomaly = G.detectPerformanceAnomalies(snapshots);
assert.ok(anomaly.ready && anomaly.anomalies.some((x) => x.metric === 'clicks' && x.direction === 'drop'));
assert.strictEqual(G.detectPerformanceAnomalies([]).ready, false);
assert.strictEqual(G.preflight({bridgeConnected:true,https:true,backupReady:false}).readyForAutomaticWrites, false);
assert.ok(G.buildEventPlaybook().some((x) => x.event === 'product.created'));
console.log('growth intelligence tests OK');

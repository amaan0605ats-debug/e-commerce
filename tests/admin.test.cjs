const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('frontend/src/pages/admin-data.js','utf8').replace(/export /g,'')+'\nglobalThis.api={flag,filterRecords,dashboardMetrics,monthCounts,csvCell,inventoryPayload};',context);const api=context.api;
test('dashboard counts actual stages and delivered dates without counting archived inquiries',()=>{
 const now=new Date(2026,8,13);const result=api.dashboardMetrics([{status:'pending'},{status:'pending',isDeleted:1},{status:'quote_sent'},{status:'read'}],[{status:'delivered',createdAt:'2026-08-01',updatedAt:'2026-09-12'},{status:'shipped',updatedAt:'2026-09-12'},{status:'delivered',updatedAt:'2026-08-12'}],[{status:'active'},{status:'pending'}],now);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{inquiries:1,quotes:1,deliveries:1,partners:1});
});
test('inquiry chart handles the year boundary and ignores invalid dates',()=>{
 const result=api.monthCounts([{createdAt:'2025-12-12'},{createdAt:'2026-01-12'},{createdAt:'invalid'},{createdAt:'2025-01-12'}],new Date(2026,0,13));
 assert.equal(result.length,6);assert.equal(result[4].label,'Dec');assert.equal(result[4].count,1);assert.equal(result[5].label,'Jan');assert.equal(result[5].count,1);
});
test('admin search combines status with trimmed case-insensitive queries',()=>{
 const records=[{id:'a',name:'Valley Farms',status:'pending'},{id:'b',name:'Valley Labs',status:'active'}];
 assert.equal(api.filterRecords(records,'  VALLEY  ','pending',['name']).length,1);assert.equal(api.filterRecords(records,'missing','all',['name']).length,0);
});
test('CSV exports neutralize spreadsheet formulas while preserving commas and quotes',()=>{
 for(const value of ['=SUM(A1)',' +command','-1+2','@something','\tformula'])assert.ok(api.csvCell(value).startsWith('"\''));
 assert.equal(api.csvCell('Supplier, "North"'),'"Supplier, ""North"""');assert.equal(api.csvCell(null),'""');
});
test('inventory saves retain zero threshold and allow stock above the old slider limit',()=>{
 const data=new Map([['inventoryCount','0'],['lowStockThreshold','0'],['stockStatus','automatic'],['visible','on']]);let result=api.inventoryPayload(data);assert.equal(result.inventoryCount,0);assert.equal(result.lowStockThreshold,0);assert.equal(result.stockStatus,'out-of-stock');
 data.set('inventoryCount','900');result=api.inventoryPayload(data);assert.equal(result.inventoryCount,900);assert.equal(result.stockStatus,'in-stock');assert.equal(result.visible,true);
});
test('invalid inventory cannot silently become zero or a partial integer',()=>{
 for(const value of ['','-1','1.5','12bad','Infinity','2147483648'])assert.throws(()=>api.inventoryPayload(new Map([['inventoryCount',value],['lowStockThreshold','0']])));
});
test('database boolean flags distinguish archived records and hidden offerings',()=>{assert.equal(api.flag('0'),false);assert.equal(api.flag(0),false);assert.equal(api.flag('1'),true);assert.equal(api.flag(1),true);});

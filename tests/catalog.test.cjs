const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function setup(){
 const cards=[{slug:'kitchen',name:'Kitchen',category:'Core Supply',search:'Kitchen Core Supply wood'},{slug:'cold',name:'Cold Storage',category:'Engineering',search:'Cold Storage Engineering refrigeration'},{slug:'hidden',name:'Secret',category:'Core Supply',search:'Secret Core Supply wood',dbHidden:'true'}].map(dataset=>({dataset,hidden:false}));
 const search={value:''},sort={value:'featured'},button={dataset:{filter:'all'}},status={},empty={},grid={appendChild(card){cards.splice(cards.indexOf(card),1);cards.push(card);}};
 const host={querySelector:s=>({'#catalog-search':search,'#catalog-sort':sort,'.filter-btn.active':button,'#catalog-count':status,'#catalog-empty':empty,'.catalog-grid':grid}[s]),querySelectorAll:()=>[...cards]};
 const context=vm.createContext({document:{querySelector:()=>host},services:cards.map(c=>({slug:c.dataset.slug}))});
 const source=fs.readFileSync('frontend/src/pages/service.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');vm.runInContext(source+'\nglobalThis.filter=filterCatalog;',context);
 return {cards,search,sort,button,status,empty,run:context.filter};
}
test('catalog search combines categories and never reveals database-hidden offerings',()=>{const x=setup();x.search.value='wood';x.run();assert.deepEqual(x.cards.filter(c=>!c.hidden).map(c=>c.dataset.slug),['kitchen']);x.button.dataset.filter='Engineering';x.run();assert.equal(x.empty.hidden,false);assert.equal(x.status.textContent,'0 offerings to explore');});
test('catalog sorts both directions and restores featured ordering',()=>{const x=setup();x.sort.value='az';x.run();assert.equal(x.cards[0].dataset.slug,'cold');x.sort.value='za';x.run();assert.equal(x.cards[0].dataset.slug,'hidden');x.sort.value='featured';x.run();assert.equal(x.cards[0].dataset.slug,'kitchen');});
test('catalog search ignores action labels and accepts trimmed case-insensitive terms',()=>{const x=setup();x.search.value='  COLD  ';x.run();assert.equal(x.status.textContent,'1 offering to explore');x.search.value='quote list';x.run();assert.equal(x.status.textContent,'0 offerings to explore');});

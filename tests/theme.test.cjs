const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(saved,blocked=false) {
 const values={},events={};const document={documentElement:{dataset:{}},querySelector:()=>({setAttribute(key,value){values.meta=value;}})};
 const localStorage={getItem(){if(blocked)throw Error('blocked');return saved;},setItem(key,value){if(blocked)throw Error('blocked');values.saved=value;}};
 const button={setAttribute(key,value){values[key]=value;},addEventListener(type,fn){events[type]=fn;}};
 const ctx=vm.createContext({document,localStorage,window:{addEventListener(type,fn){events[type]=fn;}}});
 vm.runInContext(fs.readFileSync('frontend/public/theme-init.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync('frontend/src/theme.js','utf8').replace('export function','function'),ctx);ctx.initTheme(button);
 return {document,values,events};
}
test('saved dark theme is applied before app initialization and switch exposes its state',()=>{const s=setup('dark');assert.equal(s.document.documentElement.dataset.theme,'dark');assert.equal(s.values['aria-checked'],'true');s.events.click();assert.equal(s.values.saved,'light');assert.equal(s.values['aria-checked'],'false');});
test('theme switch works when storage is blocked and ignores invalid stored values',()=>{for(const s of [setup('invalid'),setup(null,true)]){assert.equal(s.document.documentElement.dataset.theme,'light');assert.doesNotThrow(()=>s.events.click());assert.equal(s.document.documentElement.dataset.theme,'dark');}});
test('theme synchronizes between tabs and resets when preference is cleared',()=>{const s=setup('light');s.events.storage({key:'algani-theme',newValue:'dark'});assert.equal(s.values['aria-checked'],'true');s.events.storage({key:null,newValue:null});assert.equal(s.values['aria-checked'],'false');});

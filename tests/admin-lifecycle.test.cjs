const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function setup(){
 const elements=new Map();for(const id of ['#office-sync','#office-content','#office-dialog','#office-notice','#office-inquiry-count'])elements.set(id,{textContent:'',dataset:{},hidden:true,open:false,setAttribute(){},contains(){return false;},close(){this.open=false;}});
 const pending=[];const context=vm.createContext({document:{querySelector:s=>elements.get(s),activeElement:null},AbortController,AbortSignal,clearTimeout,setTimeout,services:[],request:(url,{signal}={})=>new Promise((resolve,reject)=>{pending.push({url,signal,resolve,reject});}),console});
 let source=fs.readFileSync('frontend/src/pages/admin.js','utf8').replace(/^import[^;]+;\s*/gm,'').replace(/export /g,'');
 vm.runInContext(source+`\nrenderContent=()=>{};state={panel:'dashboard',errors:{},loading:false,busy:false};lifecycle=new AbortController();globalThis.api={refresh,save,cleanupAdmin,getState:()=>state};`,context);
 return{...context.api,elements,pending,resolveReads(value=[]){for(const p of pending.splice(0))p.resolve(value);}};
}
test('a saved change invalidates an older in-flight dashboard refresh',async()=>{
 const x=setup();const first=x.refresh();assert.equal(x.pending.length,6);const old=x.pending.splice(0);const form={querySelectorAll:()=>[],querySelector:()=>null};const saving=x.save(form,async()=>{},'Saved');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(old[0].signal.aborted,true);assert.equal(x.pending.length,6);
 x.resolveReads([]);await saving;old.forEach(p=>p.resolve([{id:'stale'}]));await first;
 assert.equal(x.getState().inquiries.length,0);assert.equal(x.getState().loading,false);
});
test('leaving the admin aborts pending reads and prevents late UI updates',async()=>{
 const x=setup();const first=x.refresh();const old=x.pending.splice(0);x.cleanupAdmin();assert.equal(old[0].signal.aborted,true);old.forEach(p=>p.resolve([{id:'stale'}]));await first;assert.equal(x.getState(),null);
});
test('failed admin saves preserve the form and restore its controls',async()=>{
 const x=setup();const error={hidden:true,textContent:''},button={disabled:false};const form={querySelectorAll:()=>[button],querySelector:()=>error};
 await x.save(form,async()=>{throw new Error('Save failed');},'Saved');assert.equal(error.hidden,false);assert.equal(error.textContent,'Save failed');assert.equal(button.disabled,false);assert.equal(x.getState().busy,false);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const timers = new Map(); let sequence = 0;
  const app = {innerHTML: '', classList: {add(){}, remove(){}}, querySelector(){return null;}};
  const context = vm.createContext({
    window: {location:{hash:'#/'}, addEventListener(){}, scrollTo(){}},
    document: {getElementById:()=>app, querySelectorAll:()=>[]},
    setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},
    clearTimeout:id=>timers.delete(id),
    IntersectionObserver:class { observe(){} unobserve(){} disconnect(){} },
  });
  vm.runInContext(fs.readFileSync('frontend/src/router.js','utf8').replace('export class Router','class Router')+'\nglobalThis.Router = Router;',context);
  const router = new context.Router([{path:'/',render:()=> 'home'},{path:'/contact',render:()=> 'contact'}]);
  return {router,context,app,flush(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}};
}
test('rapid navigation cancels stale rendering and initializes only the final page',()=>{
  const {router,context,app,flush}=setup(); let initialized=0;
  router.onRendered=()=>{initialized++;assert.equal(app.innerHTML,'contact');};
  router.handleRoute();context.window.location.hash='#/contact';router.handleRoute();flush();
  assert.equal(app.innerHTML,'contact');assert.equal(initialized,1);
});
test('query parameters do not prevent route matching',()=>{
  const {router,context,app,flush}=setup();context.window.location.hash='#/contact?service=cold-storage-engineering';router.handleRoute();flush();assert.equal(app.innerHTML,'contact');
});
test('parameter routes match one path segment only',()=>{
  const {router}=setup();assert.equal(router.matchRoute('/services/:slug','/services/cold-storage').params.slug,'cold-storage');assert.equal(router.matchRoute('/services/:slug','/services/cold-storage/other'),null);
});

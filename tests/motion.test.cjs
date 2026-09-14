const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup({reduced=false,fine=true,failAnimation=false}={}) {
 const media={reduce:{matches:reduced,addEventListener(_type,fn){this.change=fn;}},pointer:{matches:fine,addEventListener(_type,fn){this.change=fn;}}};
 const nodes=[],observers=[],animations=[],listeners={};
 const style=()=>({removeProperty(key){delete this[key];}});
 const item={hidden:false,style:style(),matches:()=>false,animate(){if(failAnimation)throw Error('unsupported');const animation={finished:new Promise(()=>{}),cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;}};
 item.parentElement={children:[item]};
 const button={style:style(),addEventListener(type,fn){listeners[type]=fn;},getBoundingClientRect:()=>({left:0,top:0,width:100,height:40})};
 const root={querySelectorAll(selector){if(selector.startsWith('h1,'))return [item];if(selector==='.btn-primary')return [button];return [];},addEventListener(){}};
 const context=vm.createContext({AbortController,matchMedia:query=>query.includes('reduced')?media.reduce:media.pointer,innerHeight:800,scrollY:0,requestAnimationFrame:()=>1,cancelAnimationFrame(){},window:{addEventListener(){}},document:{getElementById:()=>root,documentElement:{scrollHeight:2000},body:{classList:{contains:()=>false},append(node){nodes.push(node);}},createElement:()=>({style:style(),setAttribute(){},remove(){nodes.splice(nodes.indexOf(this),1);}})},IntersectionObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}unobserve(){}disconnect(){this.disconnected=true;}}});
 vm.runInContext(fs.readFileSync('frontend/src/motion.js','utf8').replaceAll('export function','function')+'\nthis.init=initMotion;this.cleanup=cleanupMotion;',context);
 return {context,media,nodes,observers,animations,item,button,listeners};
}
test('motion teardown cancels active reveals and prevents duplicate progress indicators',()=>{
 const s=setup();s.context.init();s.observers[0].callback([{isIntersecting:true,target:s.item}]);assert.equal(s.animations.length,1);
 s.context.init();assert.equal(s.animations[0].cancelled,true);assert.equal(s.observers[0].disconnected,true);assert.equal(s.nodes.length,1);
 s.context.cleanup();assert.equal(s.nodes.length,0);
});
test('reduced motion cancels ongoing animation and removes scroll effects immediately',()=>{
 const s=setup();s.context.init();s.observers[0].callback([{isIntersecting:true,target:s.item}]);s.media.reduce.matches=true;s.media.reduce.change();
 assert.equal(s.animations[0].cancelled,true);assert.equal(s.nodes.length,0);assert.equal(s.observers.length,1);
});
test('animation API failure leaves content visible and touch pointers cannot move buttons',()=>{
 const s=setup({fine:false,failAnimation:true});s.context.init();assert.doesNotThrow(()=>s.observers[0].callback([{isIntersecting:true,target:s.item}]));
 assert.equal(s.item.hidden,false);assert.equal(s.item.style.opacity,undefined);
 s.listeners.pointermove({pointerType:'touch',clientX:99,clientY:30});assert.equal(s.button.style.translate,undefined);
 s.context.cleanup();
});

test('missing scroll observer keeps the original content visible',()=>{
 const s=setup();delete s.context.IntersectionObserver;s.context.init();assert.equal(s.observers.length,0);assert.equal(s.item.hidden,false);assert.equal(s.item.style.opacity,undefined);s.context.cleanup();
});

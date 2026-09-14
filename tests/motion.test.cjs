const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup({reduced=false,top=1000,fail=false}={}) {
 const media={matches:reduced,addEventListener(_type,fn){this.change=fn;}};
 const observers=[],animations=[],observed=[];
 const item={getBoundingClientRect:()=>({top}),animate(frames,options){if(fail)throw Error('unsupported');const animation={frames,options,finished:new Promise(()=>{}),cancel(){this.cancelled=true;}};animations.push(animation);return animation;}};
 const context=vm.createContext({AbortController,matchMedia:()=>media,innerHeight:800,document:{getElementById:()=>({querySelectorAll:()=>[item]}),body:{classList:{contains:()=>false}}},IntersectionObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(node){observed.push(node);}unobserve(){}disconnect(){this.disconnected=true;}}});
 vm.runInContext(fs.readFileSync('frontend/src/motion.js','utf8').replaceAll('export function','function')+'\nthis.init=initMotion;this.cleanup=cleanupMotion;',context);
 return {context,media,observers,animations,observed,item};
}
test('already visible content never restarts an entrance',()=>{const s=setup({top:100});s.context.init();assert.equal(s.observed.length,0);});
test('reveals never hide content or introduce delayed backwards fill',()=>{const s=setup();s.context.init();s.observers[0].callback([{isIntersecting:true,target:s.item}]);assert.equal(s.animations.length,1);assert.ok(s.animations[0].frames.every(frame=>!('opacity' in frame)));assert.equal(s.animations[0].options.fill,undefined);s.context.cleanup();assert.equal(s.animations[0].cancelled,true);});
test('changing reduced motion cancels animation immediately',()=>{const s=setup();s.context.init();s.observers[0].callback([{isIntersecting:true,target:s.item}]);s.media.matches=true;s.media.change();assert.equal(s.animations[0].cancelled,true);assert.equal(s.observers[0].disconnected,true);assert.equal(s.observers.length,1);});
test('unsupported animation and observer APIs leave content usable',()=>{const s=setup({fail:true});s.context.init();assert.doesNotThrow(()=>s.observers[0].callback([{isIntersecting:true,target:s.item}]));delete s.context.IntersectionObserver;assert.doesNotThrow(()=>s.context.init());});

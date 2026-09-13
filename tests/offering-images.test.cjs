const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('custom gallery URLs appear in offering cards and built-in images remain available',()=>{
 const services=[{slug:'flooring',gallery:[{caption:'Built-in image'}]}];const context=vm.createContext({services,getServiceBySlug:slug=>services.find(s=>s.slug===slug),URL});vm.runInContext(fs.readFileSync('frontend/src/components/offering-card.js','utf8').replace(/^import[^;]+;\s*/gm,'').replace(/export /g,'')+'\nglobalThis.image=serviceImage;',context);
 assert.equal(context.image('flooring'),'/images/flooring.webp');
 services.push({slug:'workbench',gallery:['https://example.com/first.webp',{url:'https://example.com/second.webp'}]});
 assert.equal(context.image('workbench'),'https://example.com/first.webp');assert.equal(context.image('workbench','-2'),'https://example.com/second.webp');
 assert.equal(context.image('workbench','-3'),'/images/general-commercial-supplies.webp');
 services[1].gallery=['javascript:alert(1)'];assert.equal(context.image('workbench'),'/images/general-commercial-supplies.webp');
 services[1].gallery=['https://example.com/image?x="quoted"'];assert.ok(!context.image('workbench').includes('"'));
});

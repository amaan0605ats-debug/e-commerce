const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const template=fs.readFileSync('frontend/index.html','utf8');
test('public pages provide unique server-rendered content and canonical URLs before JavaScript',async()=>{
 const p=await import('../backend/lib/public-pages.mjs');
 for(const path of ['/','/about','/services','/contact',...p.catalog().map(s=>'/services/'+s.slug)]){
  const result=p.renderPublicPage(template,path);
  assert.equal(result.status,200,path);assert.match(result.html,/<h1[ >]/);assert.ok(result.html.includes('href="https://algani.co.in'+path+'"'));assert.doesNotMatch(result.html,/href="#\//);assert.equal((result.html.match(/rel="canonical"/g)||[]).length,1);
 }
});
test('unknown pages return 404 and private pages stay outside search results',async()=>{
 const p=await import('../backend/lib/public-pages.mjs');
 for(const path of ['/missing','/services/missing','/admin','/admin/login','/quote']){const result=p.renderPublicPage(template,path);assert.equal(result.status,path.includes('missing')?404:200);assert.equal(result.noindex,true);assert.match(result.html,/noindex,follow/);}
});
test('sitemap includes custom offerings while excluding hidden offerings and private pages',async()=>{
 const p=await import('../backend/lib/public-pages.mjs');
 const items=p.catalog([{slug:'new-item',name:'New',features:'[]',gallery:'[]'}],[{slug:'modular-kitchens',visible:0}]);
 const xml=p.sitemap(items);assert.match(xml,/\/services\/new-item/);assert.doesNotMatch(xml,/modular-kitchens|#|\/admin|\/quote/);
});
test('metadata escapes untrusted catalog titles and uses a real fallback preview',async()=>{
 const {seoForPath,seoHtml}=await import('../frontend/src/seo.js');
 const seo=seoForPath('/services/new-item',[{slug:'new-item',name:'</script><script>alert(1)</script>',shortDesc:'" & <bad>'}]);
 const html=seoHtml(template,seo);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/\\u003c/);assert.ok(seo.image.endsWith('/modular-kitchens.webp'));
});

test('favicon is a genuine multi-resolution ICO and declarations point at valid square PNG files',()=>{
 const ico=fs.readFileSync('frontend/public/favicon.ico');
 assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 for(let i=0;i<3;i++){
  const entry=6+i*16,size=ico[entry],length=ico.readUInt32LE(entry+8),offset=ico.readUInt32LE(entry+12);
  const data=ico.subarray(offset,offset+length);assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);
 }
 const manifest=JSON.parse(fs.readFileSync('frontend/public/site.webmanifest','utf8'));
 const icons=[...template.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
 for(const icon of [...icons,...manifest.icons.map(i=>i.src)])assert.ok(fs.existsSync('frontend/public'+new URL(icon,'https://algani.co.in').pathname),icon);
 for(const icon of manifest.icons){const data=fs.readFileSync('frontend/public'+icon.src);assert.equal(icon.sizes,`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`);}
});

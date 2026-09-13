import { services } from './data/services.js';
const builtInSlugs=new Set(services.map(s=>s.slug));
export const SITE_URL='https://algani.co.in';
const company={ '@type':'LocalBusiness','@id':SITE_URL+'/#business',name:'Al Gani General Suppliers',url:SITE_URL+'/',telephone:'+91-7780901374',email:'alganigeneralsupplier@gmail.com',logo:SITE_URL+'/images/algani-icon-512.png',image:SITE_URL+'/images/modular-kitchens.webp',address:{'@type':'PostalAddress',streetAddress:'Bagati Kanipora, Nowgam',addressLocality:'Kashmir',postalCode:'190019',addressCountry:'IN'},areaServed:[{'@type':'Place',name:'Kashmir Valley'},{'@type':'Place',name:'Leh'}]};
export function seoForPath(path, catalog=services) {
 const clean=('/'+String(path||'/').replace(/^\/+/, '')).split('?')[0].replace(/\/+$/,'')||'/';
 const pages={
  '/':['General Suppliers in Kashmir & Leh | Al Gani','Source interior materials, modular kitchens, agricultural equipment and commercial supplies in Kashmir and Leh. Explore Al Gani and request a project quote.'],
  '/about':['About Al Gani | General Suppliers in Kashmir','Meet Al Gani General Suppliers in Nowgam, serving businesses in Kashmir Valley and Leh with interior materials, equipment and commercial supplies.'],
  '/services':['Supplies & Equipment in Kashmir and Leh | Al Gani','Explore modular kitchens, flooring, interior paneling, agriculture implements, cold storage and commercial equipment. Build your Al Gani quote list.'],
  '/contact':['Contact Al Gani | Suppliers in Kashmir & Leh','Discuss supply requirements, quantities and delivery with Al Gani in Nowgam, Kashmir. Call +91 7780901374 or send a project inquiry.'],
  '/quote':['Your Project Quote List | Al Gani','Prepare a project inquiry with your selected Al Gani offerings.'],
  '/admin':['Admin Workspace | Al Gani','Al Gani business administration.'],
  '/admin/login':['Admin Sign In | Al Gani','Sign in to the Al Gani business workspace.']
 };
 const service=clean.startsWith('/services/')?catalog.find(s=>s.slug===clean.slice(10)):null;
 let pair=pages[clean];if(service)pair=[`${service.name} in Kashmir & Leh | Al Gani`,String(service.shortDesc||`Discuss ${service.name} specifications, quantities and delivery with Al Gani in Kashmir and Leh.`).replace(/\s+/g,' ').slice(0,160)];
 const noindex=!pair||['/quote','/admin','/admin/login'].includes(clean);
 pair ||= ['Page Not Found | Al Gani','Explore supplies and equipment from Al Gani in Kashmir and Leh.'];
 let image=SITE_URL+'/images/modular-kitchens.webp';const first=service?.gallery?.[0], candidate=typeof first==='string'?first:first?.url;
 if(candidate){try{const url=new URL(candidate);if(['https:','http:'].includes(url.protocol))image=url.href;}catch{}}
 else if(service && builtInSlugs.has(service.slug))image=SITE_URL+`/images/${service.slug}.webp`;
 const structuredData=noindex?null:{'@context':'https://schema.org','@graph':[company,{'@type':'WebSite','@id':SITE_URL+'/#website',url:SITE_URL+'/',name:'Al Gani',alternateName:'Al Gani General Suppliers',publisher:{'@id':company['@id']}},{'@type':service?'Service':'WebPage','@id':SITE_URL+clean+'#page',name:pair[0],description:pair[1],url:SITE_URL+clean,...(service?{serviceType:service.name,provider:{'@id':company['@id']},areaServed:company.areaServed}:{about:{'@id':company['@id']}})}]};
 return {path:clean,title:pair[0],description:pair[1],url:SITE_URL+clean,image,noindex,structuredData};
}
export function updateSeo(path) {
 const seo=seoForPath(path);document.title=seo.title;
 const set=(selector,attrs)=>{let el=document.head.querySelector(selector);if(!el){el=document.createElement(selector.startsWith('link')?'link':'meta');document.head.appendChild(el);}for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);};
 set('meta[name="description"]',{name:'description',content:seo.description});set('link[rel="canonical"]',{rel:'canonical',href:seo.url});set('meta[name="robots"]',{name:'robots',content:seo.noindex?'noindex,follow':'index,follow,max-image-preview:large'});
 for(const [property,content] of Object.entries({'og:title':seo.title,'og:description':seo.description,'og:url':seo.url,'og:type':'website','og:site_name':'Al Gani General Suppliers','og:image':seo.image,'og:image:alt':'Al Gani supplies and equipment','twitter:card':'summary_large_image','twitter:title':seo.title,'twitter:description':seo.description,'twitter:image':seo.image}))set(`meta[${property.startsWith('twitter:')?'name':'property'}="${property}"]`,{[property.startsWith('twitter:')?'name':'property']:property,content});
 let schema=document.getElementById('site-structured-data');if(!schema){schema=document.createElement('script');schema.id='site-structured-data';schema.type='application/ld+json';document.head.appendChild(schema);}schema.textContent=JSON.stringify(seo.structuredData||{});
}
export const escapeMarkup=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function seoHtml(template,seo) {
 const attributes={'description':seo.description,'robots':seo.noindex?'noindex,follow':'index,follow,max-image-preview:large','twitter:card':'summary_large_image','twitter:title':seo.title,'twitter:description':seo.description,'twitter:image':seo.image};
 const social={'og:title':seo.title,'og:description':seo.description,'og:type':'website','og:url':seo.url,'og:site_name':'Al Gani General Suppliers','og:image':seo.image,'og:image:alt':'Al Gani supplies and equipment'};
 let html=template.replace(/<title>[\s\S]*?<\/title>/i,()=>`<title>${escapeMarkup(seo.title)}</title>`).replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi,'').replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'').replace(/<script\b[^>]*id=["']site-structured-data["'][^>]*>[\s\S]*?<\/script>/gi,'');
 const head=Object.entries(attributes).map(([name,content])=>`<meta name="${name}" content="${escapeMarkup(content)}">`).join('\n')+Object.entries(social).map(([property,content])=>`<meta property="${property}" content="${escapeMarkup(content)}">`).join('\n')+`<link rel="canonical" href="${escapeMarkup(seo.url)}">`+(seo.structuredData?`<script id="site-structured-data" type="application/ld+json">${JSON.stringify(seo.structuredData).replace(/</g,'\\u003c')}</script>`:'');
 return html.replace('</head>',head+'\n</head>');
}

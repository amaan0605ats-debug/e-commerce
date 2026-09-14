import { services } from '../../frontend/src/data/services.js';
import { renderHome } from '../../frontend/src/pages/home.js';
import { renderPrivacy } from '../../frontend/src/pages/privacy.js';
import { renderAbout } from '../../frontend/src/pages/about.js';
import { renderServicesIndex, renderService } from '../../frontend/src/pages/service.js';
import { renderContact } from '../../frontend/src/pages/contact.js';
import { seoForPath, seoHtml, SITE_URL, escapeMarkup } from '../../frontend/src/seo.js';
const defaults=structuredClone(services);
const array=value=>{try{const parsed=typeof value==='string'?JSON.parse(value):value;return Array.isArray(parsed)?parsed:[];}catch{return [];}};
export function catalog(custom=[],products=[]) {
 const merged=structuredClone(defaults);
 for(const row of custom){const entry={...row,features:array(row.features),gallery:array(row.gallery)};const i=merged.findIndex(s=>s.slug===row.slug);if(i<0)merged.push(entry);else merged[i]={...merged[i],...entry};}
 const hidden=new Set(products.filter(p=>Number(p.visible)===0).map(p=>p.slug));
 return merged.filter(s=>!hidden.has(s.slug));
}
export function sitemap(items=catalog()) {
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/about','/services','/contact','/privacy',...items.map(s=>'/services/'+encodeURIComponent(s.slug))].map(p=>'<url><loc>'+escapeMarkup(SITE_URL+p)+'</loc></url>').join('')+'</urlset>';
}
export function renderPublicPage(template,path,items=catalog()) {
 services.splice(0,services.length,...items);
 const seo=seoForPath(path,items);
 const routes={'/':renderHome,'/about':renderAbout,'/privacy':renderPrivacy,'/services':renderServicesIndex,'/contact':renderContact};
 const privatePage=['/admin','/admin/login','/quote'].includes(seo.path);
 let body=routes[seo.path]?.();
 if(!body && seo.path.startsWith('/services/') && !seo.noindex)body=renderService({slug:seo.path.slice(10)});
 const status=body||privatePage?200:404;
 if(!body && !privatePage)body='<section class="editorial-section"><h1>Page not found</h1><p>Explore our supplies and equipment.</p><a href="/services">View offerings</a></section>';
 let html=seoHtml(template,seo);
 if(body){
  const nav='<nav data-server-shell aria-label="Main navigation" style="padding:24px 6%;display:flex;gap:24px;flex-wrap:wrap"><a href="/">AL GANI</a><a href="/about">About</a><a href="/services">Offerings</a><a href="/contact">Contact</a></nav>';
  const footer='<footer data-server-shell style="padding:32px 6%">Al Gani General Suppliers · Bagati Kanipora, Nowgam, Kashmir · <a href="tel:+917780901374">+91 7780901374</a></footer>';
  html=html.replace(/<main id="app-content"[^>]*>[\s\S]*?<\/main>/,()=>nav+'<main id="app-content" tabindex="-1">'+body+'</main>'+footer).replace('<body>','<body class="redesign" data-theme="light">');
 }
 return {html,status,noindex:seo.noindex};
}

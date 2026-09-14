import './style.css';
import './redesign.css';
import './quote.css';
import './motion.css';
import './theme.css';
import { initTheme } from './theme.js';
import { initMotion, cleanupMotion } from './motion.js';
import { Router } from './router.js';
import { createNavbar } from './components/navbar.js';
import { createFooter } from './components/footer.js';
import { renderHome, initHome, cleanupHome } from './pages/home.js';
import { renderPrivacy } from './pages/privacy.js';
import { renderAbout } from './pages/about.js';
import { renderService, renderServicesIndex, initServicesIndex, initServiceDetail, filterCatalog } from './pages/service.js';
import { renderContact, initContact, refreshContactPrefill } from './pages/contact.js';
import { renderAdminLogin, initAdminLogin } from './pages/admin-login.js';
let adminModule;
const loadAdmin=()=>import('./pages/admin.js').then(module=>{adminModule=module;return module;});
import { auth, onAuthStateChanged, getCachedProducts } from './firebase.js';
import { services, serviceCategories } from './data/services.js';
import { initQuoteList } from './components/quote-list.js';
import { renderQuote, initQuote } from './pages/quote.js';
import { offeringCard, applyProductStatus } from './components/offering-card.js';
import { updateSeo } from './seo.js';

document.body.classList.add('redesign');
document.body.dataset.theme = 'light';
document.getElementById('preloader')?.remove();
const app=document.getElementById('app');
const navbar=createNavbar();
initTheme(navbar.querySelector('.theme-switch'));
const footer=createFooter();
document.querySelectorAll('[data-server-shell]').forEach(el=>el.remove());app.prepend(navbar);app.appendChild(footer);
const support=document.createElement('a');
support.className='support-link';support.href='https://wa.me/919419014741';support.target='_blank';support.rel='noopener noreferrer';support.setAttribute('aria-label','Chat with Al Gani on WhatsApp');
support.innerHTML='<span aria-hidden="true">↗</span> WhatsApp us';app.appendChild(support);
initQuoteList();
const path=()=> ((location.hash.startsWith('#/')?location.hash.slice(1):(location.pathname||'/')+(location.search||'')).split('?')[0].replace(/\/+$/, '') || '/');
const router=new Router([
  {path:'/',render:renderHome}, {path:'/about',render:renderAbout}, {path:'/privacy',render:renderPrivacy},
  {path:'/services',render:renderServicesIndex}, {path:'/services/:slug',render:renderService},
  {path:'/quote',render:renderQuote}, {path:'/contact',render:renderContact},
  {path:'/admin/login',render:renderAdminLogin},
  {path:'/admin',render:()=>{if(!auth.currentUser){location.hash='#/admin/login';return '';}if(adminModule)return adminModule.renderAdmin();loadAdmin().then(()=>{if(path()==='/admin')router.handleRoute();}).catch(()=>{if(path()!=='/admin')return;document.getElementById('app-content').innerHTML='<section class="editorial-section"><h1>Workspace could not load</h1><p>Check your connection and reload the page.</p></section>';});return '<section class="editorial-section"><h1>Opening your workspace…</h1></section>';}},
]);
const originalHandleRoute=router.handleRoute.bind(router);
router.handleRoute=()=>{
  cleanupMotion();adminModule?.cleanupAdmin();cleanupHome();
  const admin=path()==='/admin'||path()==='/admin/login';
  document.body.classList.toggle('admin-view',admin);
  navbar.hidden=admin;footer.hidden=admin;support.hidden=admin;
  document.querySelector('#image-dialog')?.close();
  originalHandleRoute();
};
router.onRendered=()=>{
  const current=path();
  updateSeo(current);
  initQuoteList();
  if(current==='/')initHome();
  if(current==='/services')initServicesIndex();
  if(current.startsWith('/services/'))initServiceDetail(document.querySelector('.detail-page')?.dataset.service);
  if(current==='/quote')initQuote();
  if(current==='/admin/login')initAdminLogin();
  if(current==='/admin'&&auth.currentUser)adminModule?.initAdmin();
  if(current==='/contact')initContact();
  try { initMotion(); } catch { cleanupMotion(); }
  document.querySelectorAll('.counter').forEach(el=>{el.textContent=(el.dataset.target||'')+(el.dataset.suffix||'');});
};
onAuthStateChanged(auth,user=>{if(path()==='/admin'&&!user)location.hash='#/admin/login';});
router.handleRoute();

// Load custom offerings without holding the initial page behind a network request.
(async()=>{
  try {
    const response=await fetch('/api/custom-services',{signal:AbortSignal.timeout(5000)});
    if(!response.ok)return;
    const rows=await response.json();if(!Array.isArray(rows))return;
    const added=[];
    for(const row of rows){
      if(!row||!/^([a-z0-9]+-)*[a-z0-9]+$/.test(row.slug)||typeof row.name!=='string')continue;
      const existing=services.findIndex(s=>s.slug===row.slug);
      const service={id:existing>=0?services[existing].id:services.length+1,slug:row.slug,name:row.name,icon:typeof row.icon==='string'?row.icon:'',category:String(row.category||'Core Supply'),tag:String(row.tag||'Offering'),shortDesc:String(row.shortDesc||''),longDesc:String(row.longDesc||''),features:Array.isArray(row.features)?row.features.filter(f=>typeof f==='string'):[],gallery:Array.isArray(row.gallery)?row.gallery:[]};
      if(existing>=0)services[existing]=service;else services.push(service);
      const category=serviceCategories.find(c=>c.name===row.category);if(category&&!category.services.includes(row.slug))category.services.push(row.slug);
      added.push(service);
    }
    if(added.length){
      const grid=document.querySelector('.catalog-grid') || document.querySelector('.home-offerings');
      if(grid){
        for(const service of added){const holder=document.createElement('div');holder.innerHTML=offeringCard(service);const previous=[...grid.children].find(card=>card.dataset.slug===service.slug);if(previous)previous.replaceWith(holder.firstElementChild);else if(grid.classList.contains('catalog-grid'))grid.appendChild(holder.firstElementChild);}
        filterCatalog();
        getCachedProducts().then(products=>{if(!grid.isConnected)return;grid.querySelectorAll('.offering-card').forEach(card=>applyProductStatus(card,products.find(p=>p.slug===card.dataset.slug)));filterCatalog();});
      }
      const select=document.getElementById('form-service');
      if(select){for(const service of added){let option=[...select.options].find(o=>o.value===service.slug);if(!option){option=document.createElement('option');option.value=service.slug;select.appendChild(option);}option.textContent=service.name;}}
      refreshContactPrefill();
      initQuoteList();
      document.dispatchEvent(new CustomEvent('quotechange',{detail:{reason:'catalog'}}));
      if(document.querySelector('.missing-offering'))router.handleRoute();
      else if(document.querySelector('.detail-page')&&added.some(s=>s.slug===document.querySelector('.detail-page').dataset.service))router.handleRoute();
    }
  }catch{/* The built-in catalog remains available if the API is offline. */}
})();

document.querySelector('.skip-link')?.addEventListener('click',event=>{event.preventDefault();document.getElementById('app-content')?.focus();});

document.addEventListener('click',event=>{
  const gallery=event.target.closest('[data-lightbox]');
  if(!gallery)return;
  let dialog=document.getElementById('image-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='image-dialog';dialog.className='image-dialog';dialog.setAttribute('aria-label','Enlarged offering image');dialog.innerHTML='<button type="button" class="image-dialog-close" aria-label="Close image">×</button><img alt="">';document.body.appendChild(dialog);dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
  const img=dialog.querySelector('img');img.src=gallery.dataset.lightbox;img.alt=gallery.querySelector('img')?.alt||'Offering image';img.onerror=()=>{img.onerror=null;img.src='/images/general-commercial-supplies.webp';};dialog.showModal();
});

document.addEventListener('error', event => {const image=event.target;if(image instanceof HTMLImageElement && !image.dataset.fallback){image.dataset.fallback='true';image.removeAttribute('srcset');image.src='/images/general-commercial-supplies.webp';}},true);

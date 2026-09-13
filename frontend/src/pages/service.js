import { getServiceBySlug, getRelatedServices, services, serviceCategories } from '../data/services.js';
import { getCachedProducts } from '../firebase.js';
import { offeringCard, escapeHtml, serviceImage, applyProductStatus } from '../components/offering-card.js';

export function renderServicesIndex() {
  return `<div class="catalog-page"><section class="catalog-intro editorial-section"><div class="eyebrow">THE AL GANI COLLECTION</div><div class="section-heading-row"><h1>Find your<br><em>next possibility.</em></h1><p>From considered interiors to hardworking equipment.<br>Explore the range and build a quote for your project.</p></div></section>
    <section class="catalog-toolbar" aria-label="Filter offerings"><div class="catalog-search"><label for="catalog-search">Search the collection</label><div class="search-input-wrap"><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" placeholder="Try kitchens, agriculture, cold storage…" autocomplete="off"></div></div><div class="catalog-sort"><label for="catalog-sort">Sort by</label><select id="catalog-sort"><option value="featured">Featured</option><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option></select></div><div class="filter-tabs"><button class="filter-btn active" data-filter="all" aria-pressed="true">All offerings</button>${serviceCategories.map(c=>`<button class="filter-btn" data-filter="${escapeHtml(c.name)}" aria-pressed="false">${escapeHtml(c.name)}</button>`).join('')}</div></section>
    <section class="editorial-section catalog-results"><div class="results-heading"><p id="catalog-count" role="status" aria-live="polite"></p><button type="button" id="catalog-reset" class="text-link">Reset filters ↺</button></div><div id="catalog-empty" class="catalog-empty" hidden><span aria-hidden="true">⌕</span><h2>No matches. Still possibilities.</h2><p>Try a broader term or let us help source what you need.</p><a href="#/contact" class="btn btn-primary">Ask our team ↗</a></div><div class="offering-grid catalog-grid">${services.map(offeringCard).join('')}</div></section></div>`;
}
export function filterCatalog() {
  const host=document.querySelector('.catalog-page'); if(!host) return;
  const term=host.querySelector('#catalog-search').value.trim().toLowerCase();
  const category=host.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const sort=host.querySelector('#catalog-sort').value;
  const cards=[...host.querySelectorAll('.offering-card')];
  const ordered=sort==='featured'?cards.sort((a,b)=>services.findIndex(s=>s.slug===a.dataset.slug)-services.findIndex(s=>s.slug===b.dataset.slug)):cards.sort((a,b)=>a.dataset.name.localeCompare(b.dataset.name)*(sort==='za'?-1:1));
  let count=0;
  ordered.forEach(card=>{const show=card.dataset.dbHidden!=='true' && (category==='all'||card.dataset.category===category) && card.dataset.search.toLowerCase().includes(term);card.hidden=!show;if(show)count++;host.querySelector('.catalog-grid').appendChild(card);});
  host.querySelector('#catalog-count').textContent=`${count} ${count===1?'offering':'offerings'} to explore`;
  host.querySelector('#catalog-empty').hidden=count>0;
}
export async function initServicesIndex() {
  const host=document.querySelector('.catalog-page'); if(!host)return;
  const query=new URLSearchParams(location.hash.split('?')[1]||'');
  host.querySelector('#catalog-search').value=query.get('q')||'';
  const selectCategory=value=>host.querySelectorAll('.filter-btn').forEach(b=>{const active=b.dataset.filter===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(serviceCategories.some(c=>c.name===query.get('category'))) selectCategory(query.get('category'));
  host.querySelector('#catalog-search').addEventListener('input',filterCatalog);
  host.querySelector('#catalog-sort').addEventListener('change',filterCatalog);
  host.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{selectCategory(b.dataset.filter);filterCatalog();}));
  host.querySelector('#catalog-reset').addEventListener('click',()=>{host.querySelector('#catalog-search').value='';host.querySelector('#catalog-sort').value='featured';selectCategory('all');filterCatalog();});
  filterCatalog();
  const products=await getCachedProducts(); if(!host.isConnected)return;
  host.querySelectorAll('.offering-card').forEach(card=>applyProductStatus(card,products.find(p=>p.slug===card.dataset.slug)));
  filterCatalog();
}
export function renderService(params) {
  const s=getServiceBySlug(params.slug);
  if(!s)return `<section class="editorial-section missing-offering"><div class="eyebrow">OFFERING NOT FOUND</div><h1>Let’s find<br><em>a better fit.</em></h1><p>This offering is no longer available at this address.</p><a class="btn btn-primary" href="#/services">Browse the collection ↗</a></section>`;
  const name=escapeHtml(s.name), slug=escapeHtml(s.slug);
  return `<div class="detail-page" data-service="${slug}"><div class="detail-breadcrumb"><a href="#/services">Collection</a><span>/</span><span>${name}</span></div>
    <section class="detail-hero"><div class="detail-gallery"><button class="gallery-main" type="button" data-lightbox="${serviceImage(s.slug)}" aria-label="Enlarge ${name} image"><img id="detail-main-image" src="${serviceImage(s.slug)}" alt="${name}" width="1024" height="1024" onerror="this.onerror=null;this.src='/images/general-commercial-supplies.webp'"><span>View image ↗</span></button><div class="gallery-thumbnails">${['','-2','-3'].map((v,i)=>`<button type="button" class="gallery-thumb ${i===0?'active':''}" data-gallery-src="${serviceImage(s.slug,v)}" aria-label="View ${name} image ${i+1}" aria-pressed="${i===0}"><img src="${serviceImage(s.slug,v)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/general-commercial-supplies.webp'"></button>`).join('')}</div><p class="image-disclaimer">Illustrative imagery. Confirm specifications and available models with our team.</p></div><div class="detail-copy"><div class="eyebrow">${escapeHtml(s.category)}</div><h1>${name}</h1><p class="detail-lead">${escapeHtml(s.shortDesc)}</p><div class="detail-availability" role="status">Availability and pricing confirmed on inquiry</div><div class="detail-actions"><button type="button" class="btn btn-primary" data-quote-add="${slug}"><span data-quote-label>Add to quote list</span><span aria-hidden="true">+</span></button><a class="btn btn-outline" href="#/contact?service=${slug}">Ask about this offering ↗</a></div><dl class="detail-facts"><div><dt>Supply region</dt><dd>Kashmir & Leh</dd></div><div><dt>Project requirements</dt><dd>Discuss quantities & specifications</dd></div><div><dt>Need assistance?</dt><dd><a href="tel:+917780901374">+91 7780901374 ↗</a></dd></div></dl></div></section>
    <section class="editorial-section detail-information"><div><div class="eyebrow">THE DETAILS</div><h2>A closer <em>look.</em></h2>${String(s.longDesc||'').split('\n\n').map(p=>`<p>${escapeHtml(p.trim())}</p>`).join('')}</div><aside><h3>What to expect</h3><ul>${(Array.isArray(s.features)?s.features:[]).map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul></aside></section>
    <section class="editorial-section"><div class="section-heading-row"><div><div class="eyebrow">KEEP EXPLORING</div><h2>More for <em>your project.</em></h2></div><a class="text-link" href="#/services">All offerings ↗</a></div><div class="offering-grid related-offerings">${getRelatedServices(s.slug,3).map(offeringCard).join('')}</div></section></div>`;
}
export async function initServiceDetail(slug) {
  const host=document.querySelector('.detail-page');if(!host)return;
  host.querySelectorAll('[data-gallery-src]').forEach(button=>button.addEventListener('click',()=>{
    host.querySelector('#detail-main-image').src=button.dataset.gallerySrc;
    host.querySelector('.gallery-main').dataset.lightbox=button.dataset.gallerySrc;
    host.querySelectorAll('[data-gallery-src]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  }));
  const products=await getCachedProducts();if(!host.isConnected)return;
  const product=products.find(p=>p.slug===slug);
  if(product){
    const label=host.querySelector('.detail-availability');
    label.textContent=({'in-stock':'In stock · Confirm quantity and delivery with our team','low-stock':'Limited availability · Please confirm before ordering','out-of-stock':'Currently unavailable · Ask about alternatives'})[product.stockStatus]||'Availability confirmed on inquiry';
    if(product.visible===0||product.visible===false){label.textContent='This offering is currently unavailable. Please contact us for alternatives.';host.querySelector('[data-quote-add]').disabled=true;}
  }
  host.querySelectorAll('.offering-card').forEach(card=>applyProductStatus(card,products.find(p=>p.slug===card.dataset.slug)));
}

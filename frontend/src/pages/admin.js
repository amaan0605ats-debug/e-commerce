import './admin.css';
import { services } from '../data/services.js';
import { auth, signOut, request, changePassword, getCachedProducts } from '../firebase.js';
import { escapeHtml as esc, serviceImage } from '../components/offering-card.js';
import { inquiryStatuses, orderStatuses, stockStatuses, flag, filterRecords, dashboardMetrics, monthCounts, csvCell, inventoryPayload } from './admin-data.js';

const panels = { dashboard:['Overview','Your business, at a glance.'], inquiries:['Inquiries','A good conversation starts here.'], catalog:['Catalog','Everything you supply.'], deliveries:['Deliveries','Keep every order moving.'], partners:['Partners','Better business, together.'], settings:['Settings','Your workspace. Your controls.'] };
const sources = { inquiries:'inquiries', orders:'orders', products:'products', partners:'partners', alerts:'alerts', custom:'custom-services' };
let state, lifecycle, reads, timer, version = 0;
const $ = selector => document.querySelector(selector);
const endpoint = (kind,id,suffix='') => `/api/${kind}/${encodeURIComponent(id)}${suffix}`;
const options = (values,selected='') => Object.entries(values).map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');
const badge = (status,labels=inquiryStatuses) => `<span class="office-badge status-${esc(status)}">${esc(labels[status] || status || 'Pending')}</span>`;
const date = value => { const d=new Date(value); return value && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'; };
const action = (label,kind,id='',className='') => `<button type="button" class="office-button ${className}" data-action="${kind}" data-id="${esc(id)}">${label}</button>`;
const field = (name,label,value='',type='text',extra='') => `<label class="office-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select = (name,label,values,value='',extra='') => `<label class="office-field"><span>${label}</span><select name="${name}" ${extra}>${options(values,value)}</select></label>`;
const area = (name,label,value='',extra='') => `<label class="office-field office-wide"><span>${label}</span><textarea name="${name}" rows="4" ${extra}>${esc(value)}</textarea></label>`;
const empty = (title,copy) => `<div class="office-empty"><span aria-hidden="true">↗</span><h3>${title}</h3><p>${copy}</p></div>`;
function catalog() { const all=new Map(services.map(s=>[s.slug,s])); for(const s of state.custom || [])all.set(s.slug,s); return [...all.values()]; }
function offeringName(slug) { return catalog().find(s=>s.slug===slug)?.name || slug || 'General inquiry'; }
function notice(message,error=false) { const el=$('#office-notice'); if(el){el.hidden=false;el.textContent=message;el.dataset.error=String(error);el.setAttribute('role',error?'alert':'status');} }
function dataError(keys) { const errors=keys.filter(key=>state.errors[key]); return errors.length ? `<div class="office-error" role="alert">${errors.map(key=>`${esc(key)}: ${esc(state.errors[key])}`).join('<br>')} ${action('Retry connection','refresh')}</div>` : ''; }
function usable(keys) { return keys.every(key=>Array.isArray(state[key])); }

export function renderAdmin() {
  return `<div class="office"><aside class="office-sidebar"><a class="office-brand" href="#/" aria-label="Al Gani website"><img src="/images/algani-mark-192.png" alt="" width="42" height="42"><span>AL GANI<small>BUSINESS WORKSPACE</small></span></a><span class="office-nav-label">WORKSPACE</span><nav aria-label="Administration">${Object.entries(panels).map(([key,[name]],i)=>`<button type="button" data-panel="${key}" ${key==='dashboard'?'aria-current="page"':''}><span class="office-nav-symbol" aria-hidden="true">${['◈','↗','▦','→','◎','⚙'][i]}</span>${name}${key==='inquiries'?'<span id="office-inquiry-count"></span>':''}</button>`).join('')}</nav><div class="office-sidebar-bottom"><p>Rooted in Kashmir.<br>Ready for more.</p><a href="#/">View website ↗</a><button type="button" data-action="logout">Sign out ↗</button></div></aside>
  <div class="office-workspace"><header class="office-topbar"><span><span class="office-dot"></span> AL GANI / <strong id="office-breadcrumb">OVERVIEW</strong></span><div><span id="office-user">${esc(auth.currentUser?.displayName || auth.currentUser?.email || 'Administrator')}</span><span class="office-avatar">${esc((auth.currentUser?.displayName || 'AG').slice(0,2).toUpperCase())}</span></div></header>
  <div class="office-body"><div class="office-heading"><div><p class="office-eyebrow" id="office-eyebrow">A CLEAR VIEW OF WHAT'S NEXT</p><h1 id="office-title">Your business,<br><em>at a glance.</em></h1></div><div class="office-heading-actions"><span id="office-sync" role="status">Connecting…</span>${action('Refresh ↻','refresh')}</div></div>
  <div id="office-notice" class="office-notice" role="status" hidden></div><div id="office-toolbar"></div><div id="office-content" aria-busy="true">${empty('Opening your workspace…','Loading your business records securely.')}</div><footer class="office-footnote">Al Gani General Suppliers <span>Kashmir Valley · Leh Region</span></footer></div></div>
  <dialog id="office-dialog" class="office-dialog" aria-labelledby="office-dialog-title"><header><div><p class="office-eyebrow">AL GANI WORKSPACE</p><h2 id="office-dialog-title"></h2></div><button type="button" class="office-close" data-action="close-dialog" aria-label="Close dialog">×</button></header><div id="office-dialog-content"></div></dialog></div>`;
}
function showPanel(panel,focus=false) {
  if(!panels[panel])return;
  state.panel=panel; state.search='';state.filter='all';
  document.querySelectorAll('.office-sidebar [data-panel]').forEach(el=>{if(el.dataset.panel===panel)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('#office-breadcrumb').textContent=panels[panel][0].toUpperCase();
  $('#office-title').textContent=panels[panel][1];
  $('#office-eyebrow').textContent=panel==='dashboard'?"A CLEAR VIEW OF WHAT'S NEXT":panels[panel][0].toUpperCase();
  document.title=`${panels[panel][0]} | Al Gani Workspace`;
  toolbar();renderContent();
  if(focus){$('#office-title').tabIndex=-1;$('#office-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function toolbar() {
  const panel=state.panel;
  if(['dashboard','settings'].includes(panel)){$('#office-toolbar').innerHTML='';return;}
  const filters=panel==='inquiries'?{all:'Current inquiries',...inquiryStatuses,archived:'Archived'}:panel==='deliveries'?{all:'All deliveries',...orderStatuses}:panel==='catalog'?{all:'All offerings',...stockStatuses,hidden:'Hidden on website'}:{all:'All partners',pending:'Pending approval',active:'Active'};
  $('#office-toolbar').innerHTML=`<div class="office-toolbar"><label class="office-search"><span class="sr-only">Search ${panel}</span><span aria-hidden="true">⌕</span><input id="office-search" type="search" placeholder="Search ${panel}…" autocomplete="off"></label><label class="office-filter"><span class="sr-only">Filter ${panel}</span><select id="office-filter">${options(filters,'all')}</select></label><div class="office-toolbar-actions">${action('Export CSV ↓','export')}${panel!=='inquiries'?action('+ '+({catalog:'New offering',deliveries:'New delivery',partners:'New partner'}[panel]),'create','','office-primary'):''}</div></div>`;
}
function filtered() {
  if(state.panel==='catalog')return catalog().map(s=>({...s,...(state.products || []).find(p=>p.slug===s.slug)})).filter(s=>`${s.name} ${s.category} ${s.slug}`.toLowerCase().includes(state.search.toLowerCase().trim()) && (state.filter==='all'||state.filter==='hidden'&&!flag(s.visible ?? true)||s.stockStatus===state.filter));
  const rows=state[state.panel==='deliveries'?'orders':state.panel] || [];
  const active=state.panel==='inquiries'?rows.filter(row=>state.filter==='archived'?flag(row.isDeleted):!flag(row.isDeleted)):rows;
  return filterRecords(active,state.search,state.filter==='archived'?'all':state.filter,['id','name','clientName','email','phone','service','productName','subject','message','location','region','type']);
}
function renderContent() {
  if(!state || !$('#office-content'))return;
  const panel=state.panel, keys=panel==='dashboard'?['inquiries','orders','partners','products','alerts']:panel==='catalog'?['products','custom']:panel==='deliveries'?['orders']:[panel];
  $('#office-content').setAttribute('aria-busy',String(state.loading));
  if(panel==='settings'){$('#office-content').innerHTML=settings();return;}
  if(!usable(keys)){$('#office-content').innerHTML=dataError(keys)||empty('Loading records…','Your data will appear here when the connection completes.');return;}
  if(panel==='dashboard'){$('#office-content').innerHTML=dataError(keys)+dashboard();return;}
  const rows=filtered();
  $('#office-content').innerHTML=dataError(keys)+`<div class="office-result-count" role="status">${rows.length} ${panel==='catalog'?'offerings':'records'}${state.search?' matching your search':''}</div>`+(rows.length ? ({inquiries:inquiryTable,deliveries:deliveryTable,partners:partnerTable,catalog:productGrid}[panel])(rows) : empty('A little room for possibilities.','No records match this view. Try another search or filter.'));
}
function dashboard() {
  const m=dashboardMetrics(state.inquiries,state.orders,state.partners);
  const months=monthCounts(state.inquiries), peak=Math.max(1,...months.map(m=>m.count));
  const active=state.inquiries.filter(i=>!flag(i.isDeleted)), recent=[...active].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
  const low=state.products.filter(p=>p.inventoryCount<=p.lowStockThreshold);
  const pending=state.orders.filter(o=>o.status!=='delivered');
  const unread=state.alerts.filter(a=>a.status==='unread');
  return `<div class="office-stats">${[['New inquiries',m.inquiries,'Awaiting your first response','inquiries'],['Quotes sent',m.quotes,'Current inquiries at quote stage','inquiries'],['Delivered this month',m.deliveries,'Based on delivery status updates','deliveries'],['Active partners',m.partners,'Approved business relationships','partners']].map(([label,n,caption,panel],i)=>`<button class="office-stat ${i===0?'featured':''}" data-panel="${panel}"><span>${label} <span aria-hidden="true">↗</span></span><strong>${n}</strong><small>${caption}</small></button>`).join('')}</div>
  <div class="office-dashboard-grid"><section class="office-card"><div class="office-card-heading"><div><p class="office-eyebrow">THE BIGGER PICTURE</p><h2>Inquiry activity</h2></div><span>Last six months</span></div><div class="office-chart" role="img" aria-label="${esc(months.map(m=>`${m.label}: ${m.count} inquiries`).join(', '))}">${months.map(m=>`<div><strong>${m.count}</strong><div class="office-bar-track"><span style="height:${m.count/peak*100}%"></span></div><small>${m.label}</small></div>`).join('')}</div><p class="office-chart-note">Based on recorded inquiry dates, including archived inquiries.</p></section>
  <section class="office-card office-attention"><p class="office-eyebrow">MAKE YOUR NEXT MOVE</p><h2>A little attention.<br><em>A lot of progress.</em></h2><button data-panel="inquiries"><span><b>${m.inquiries}</b> new inquiries</span><span>↗</span></button><button data-panel="deliveries"><span><b>${pending.length}</b> open deliveries</span><span>↗</span></button><button data-panel="catalog"><span><b>${low.length}</b> items at stock threshold</span><span>↗</span></button><button data-panel="partners"><span><b>${state.partners.filter(p=>p.status==='pending').length}</b> partners to review</span><span>↗</span></button></section></div>
  ${unread.length?`<section class="office-card office-alerts"><div class="office-card-heading"><h2>Inventory alerts</h2><span>${unread.length} unread</span></div>${unread.slice(0,5).map(a=>`<div class="office-alert-row"><p>${esc(a.message)}<small>${date(a.createdAt)}</small></p>${action('Mark read','read-alert',a.id)}</div>`).join('')}</section>`:''}
  <section class="office-card office-recent"><div class="office-card-heading"><h2>Latest conversations</h2><button class="office-text-button" data-panel="inquiries">View all inquiries ↗</button></div>${recent.length?inquiryTable(recent):empty('Your next conversation awaits.','New website inquiries will appear here.')}</section>`;
}
function table(headers,body){return `<div class="office-table-wrap"><table class="office-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;}
function inquiryTable(rows){return table(['Customer','Requirement','Received','Status','Action'],rows.map(i=>`<tr><td><strong>${esc(i.name)}</strong><small>${esc(i.email)}</small></td><td>${esc(i.productName||offeringName(i.service))}<small>${esc(i.location||'Location not provided')}</small></td><td>${date(i.createdAt)}</td><td>${badge(i.status)}</td><td>${action('Open ↗','inquiry',i.id)}</td></tr>`).join(''));}
function deliveryTable(rows){return table(['Customer / order','Offering','Region','Status','Action'],rows.map(o=>`<tr><td><strong>${esc(o.clientName)}</strong><small>${esc(o.id.slice(-8))} · ${date(o.createdAt)}</small></td><td>${esc(o.productName||offeringName(o.service))}</td><td>${esc(o.region)}</td><td>${badge(o.status,orderStatuses)}</td><td>${action('Manage ↗','delivery',o.id)}</td></tr>`).join(''));}
function partnerTable(rows){return table(['Organization','Business type','Status','Actions'],rows.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.type||'Not specified')}</td><td>${badge(p.status,{active:'Active',pending:'Pending approval'})}</td><td><div class="office-row-actions">${p.status!=='active'?action('Approve','approve-partner',p.id):''}${action('Remove','remove-partner',p.id,'office-danger')}</div></td></tr>`).join(''));}
function productGrid(rows){return `<div class="office-product-grid">${rows.map(s=>`<article class="office-product"><img src="${serviceImage(s.slug)}" alt="${esc(s.name)}" loading="lazy" onerror="this.onerror=null;this.src='/images/general-commercial-supplies.webp'"><div><span class="office-eyebrow">${esc(s.category)}</span><h2>${esc(s.name)}</h2><div class="office-row-actions">${badge(s.stockStatus||'Not configured',stockStatuses)}<span class="office-visibility">${flag(s.visible??true)?'Visible on website':'Hidden on website'}</span></div><dl><div><dt>Stock</dt><dd>${s.inventoryCount ?? '—'}</dd></div><div><dt>Alert at</dt><dd>${s.lowStockThreshold ?? '—'}</dd></div></dl><div class="office-product-actions">${action('Edit inventory','product',s.slug)}${action('Edit details','edit-offering',s.slug)}<a href="#/services/${esc(s.slug)}">View ↗</a></div></div></article>`).join('')}</div>`;}
function settings(){return `<div class="office-settings-grid"><section class="office-card"><p class="office-eyebrow">ACCOUNT SECURITY</p><h2>Change your password</h2><p>Signed in as ${esc(auth.currentUser?.email)}.</p><form id="office-password-form" class="office-form">${field('currentPassword','Current password','','password','required autocomplete="current-password"')}${field('newPassword','New password','','password','required minlength="8" maxlength="72" autocomplete="new-password"')}${field('confirmPassword','Confirm new password','','password','required minlength="8" maxlength="72" autocomplete="new-password"')}<p class="office-form-help">Use at least 8 characters. Maximum 72 UTF-8 bytes.</p><div class="office-form-error" role="alert" hidden></div><button class="office-button office-primary" type="submit">Update password ↗</button></form></section><section class="office-card"><p class="office-eyebrow">WORKSPACE PREFERENCES</p><h2>Stay in the loop.</h2><label class="office-switch"><input id="office-auto-refresh" type="checkbox" ${state.auto?'checked':''}> Refresh records every 30 seconds</label><p>Refreshing pauses while you edit a form or work in a dialog.</p><hr><h3>Customer notifications</h3><p>Accepted inquiries and approved or delivered orders can trigger the configured email service. Review each action before saving.</p><p>Mail credentials are managed in your hosting settings. This workspace does not change email delivery configuration.</p><a class="office-text-button" href="#/">Open the website ↗</a></section></div>`;}
function openDialog(title,html){ const dialog=$('#office-dialog');$('#office-dialog-title').textContent=title;$('#office-dialog-content').innerHTML=html;dialog.showModal(); }
function formDialog(title,kind,id,html,label='Save changes') {openDialog(title,`<form class="office-form office-form-grid" data-form="${kind}" data-id="${esc(id)}">${html}<div class="office-form-error office-wide" role="alert" hidden></div><footer class="office-form-actions office-wide">${action('Cancel','close-dialog')}<button type="submit" class="office-button office-primary">${label} ↗</button></footer></form>`);}
function inquiryDialog(id){const i=state.inquiries.find(i=>i.id===id);if(!i)return;openDialog('Inquiry details',`<div class="office-detail"><div class="office-detail-heading"><h3>${esc(i.name)}</h3>${badge(i.status)}</div><dl><div><dt>Email</dt><dd><a href="mailto:${esc(i.email)}">${esc(i.email)}</a></dd></div><div><dt>Phone</dt><dd>${esc(i.phone||'Not provided')}</dd></div><div><dt>Offering</dt><dd>${esc(i.productName||offeringName(i.service))}</dd></div><div><dt>Location</dt><dd>${esc(i.location||'Not provided')}</dd></div><div><dt>Received</dt><dd>${date(i.createdAt)}</dd></div></dl><h3>${esc(i.subject||'Requirements')}</h3><p class="office-message">${esc(i.message)}</p><form data-form="inquiry-status" data-id="${esc(id)}" class="office-form">${select('status','Inquiry status',inquiryStatuses,i.status)}<p class="office-form-help">Accepting an inquiry can notify the customer by email.</p><div class="office-form-error" role="alert" hidden></div><button class="office-button office-primary" type="submit">Update status</button></form><hr><div class="office-row-actions">${!flag(i.isDeleted)&&!flag(i.convertedToOrder)?action('Create delivery ↗','convert',id):flag(i.convertedToOrder)?'<span class="office-form-help">A delivery is already linked to this inquiry.</span>':''}${action(flag(i.isDeleted)?'Restore inquiry':'Archive inquiry','archive-inquiry',id)}</div><p class="office-form-help">Archived inquiries stay available under the Archived filter.</p></div>`);}
function deliveryForm(inquiry){const values=Object.fromEntries(catalog().map(s=>[s.slug,s.name]));formDialog(inquiry?'Create linked delivery':'New delivery','new-order',inquiry?.id||'',`${field('clientName','Customer name',inquiry?.name||'','text','required maxlength="200"')}${field('customerEmail','Customer email',inquiry?.email||'','email','maxlength="254"')}${select('service','Offering',{'':'Select an offering',...values},inquiry?.service||'','required')}${field('region','Delivery region',inquiry?.location||'','text','required maxlength="200"')}${area('notes','Requirements / delivery notes',inquiry?.message||'','maxlength="5000"')}<p class="office-form-help office-wide">Confirm the offering and destination. Creating this delivery does not deduct inventory.</p>`,'Create delivery');}
function deliveryDialog(id){const o=state.orders.find(o=>o.id===id);if(!o)return;formDialog(`Delivery for ${o.clientName}`,'order-status',id,`<div class="office-wide office-detail"><p>${esc(o.productName||offeringName(o.service))} · ${esc(o.region)}</p><p class="office-message">${esc(o.notes||'No notes added.')}</p><p>Created ${date(o.createdAt)} · Updated ${date(o.updatedAt)}</p></div>${select('status','Fulfillment status',orderStatuses,o.status)}<p class="office-form-help office-wide">Approved and Delivered can send a customer notification. Shipped remains a separate stage.</p>`);}
function inventoryDialog(slug){const s=catalog().find(s=>s.slug===slug),p=state.products.find(p=>p.slug===slug)||{};if(!s)return;formDialog(s.name,'inventory',slug,`${field('inventoryCount','Stock quantity',p.inventoryCount??0,'number','required min="0" max="2147483647" step="1"')}${field('lowStockThreshold','Low-stock threshold',p.lowStockThreshold??10,'number','required min="0" max="2147483647" step="1"')}${select('stockStatus','Availability',{'automatic':'Calculate from quantity',...stockStatuses},p.stockStatus||'automatic')}${field('supplierEmail','Supplier email',p.supplierEmail||'','email','maxlength="250"')}<label class="office-switch office-wide"><input name="visible" type="checkbox" ${flag(p.visible??true)?'checked':''}>Visible on the website</label><p class="office-form-help office-wide">Changes go live when you save. Zero stock and a zero threshold are supported.</p>`);}
function offeringForm(slug=''){const s=catalog().find(s=>s.slug===slug)||{};formDialog(slug?'Edit offering details':'Create an offering','offering',slug,`${field('name','Offering name',s.name||'','text','required maxlength="200"')}${select('category','Category',Object.fromEntries(['Core Supply','Automated Solutions','Specialized & Engineering'].map(v=>[v,v])),s.category)}${area('shortDesc','Short description',s.shortDesc||'','required maxlength="1000"')}${area('longDesc','Full description',s.longDesc||'','required maxlength="5000"')}${area('features','Features (one per line)',(s.features||[]).join('\n'),'maxlength="15000"')}${area('gallery','Image URLs (one per line)',(s.gallery||[]).map(g=>typeof g==='string'?g:g.url||'').filter(Boolean).join('\n'),'placeholder="https://…"')}<p class="office-form-help office-wide">Use public HTTPS image URLs. Leave blank to use the general supply image. New offerings start with zero stock; edit inventory after creation.</p>` ,slug?'Save details':'Create offering');}
function partnerForm(){formDialog('New business partner','partner','',`${field('name','Organization name','','text','required maxlength="200"')}${field('type','Business type','','text','maxlength="200"')}${select('status','Approval status',{pending:'Pending approval',active:'Active'},'pending')}`,'Add partner');}
function confirmation(title,message,kind,id){formDialog(title,kind,id,`<p class="office-wide">${esc(message)}</p>`,'Confirm');}
async function refresh(manual=false){
  if(!state || state.loading || state.busy)return;
  const current=state, generation=++version;
  current.loading=true;$('#office-sync').textContent='Refreshing…';
  reads=new AbortController();
  const signal=AbortSignal.any([lifecycle.signal,reads.signal]);
  const results=await Promise.allSettled(Object.values(sources).map(path=>request(`/api/${path}`,{signal})));
  if(state!==current||generation!==version)return;
  Object.keys(sources).forEach((key,index)=>{const result=results[index];if(result.status==='fulfilled'&&Array.isArray(result.value)){current[key]=result.value;delete current.errors[key];}else current.errors[key]=result.reason?.message||'Invalid response from server.';});
  current.loading=false;current.updated=new Date();
  $('#office-sync').textContent=Object.keys(current.errors).length?'Connection needs attention':`Updated ${current.updated.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`;
  if(current.inquiries)$('#office-inquiry-count').textContent=current.inquiries.filter(i=>i.status==='pending'&&!flag(i.isDeleted)).length||'';
  for(const row of current.custom||[]){const index=services.findIndex(s=>s.slug===row.slug);if(index<0)services.push(row);else services[index]={...services[index],...row};}
  if(!$('#office-dialog').open && (manual || !$('#office-content').contains(document.activeElement)))renderContent();
  $('#office-content').setAttribute('aria-busy','false');
}
async function save(form,work,message){if(state.busy)return;const current=state;current.busy=true;version++;reads?.abort();current.loading=false;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);const error=form.querySelector('.office-form-error');if(error)error.hidden=true;try{await work();if(state!==current)return;if($('#office-dialog').open)$('#office-dialog').close();notice(message);current.busy=false;await refresh(true);}catch(err){if(state!==current)return;if(error){error.hidden=false;error.textContent=err.message;}else notice(err.message,true);}finally{if(state===current)current.busy=false;buttons.forEach(b=>b.disabled=false);}}
function exportRows(){const rows=filtered();if(!rows.length){notice('There are no matching records to export.');return;}const columns=state.panel==='inquiries'?['id','name','email','phone','service','location','message','status','createdAt']:state.panel==='deliveries'?['id','clientName','service','region','notes','status','createdAt']:state.panel==='partners'?['id','name','type','status']:['slug','name','category','inventoryCount','lowStockThreshold','stockStatus','visible','supplierEmail'];const csv=[columns,...rows.map(row=>columns.map(key=>row[key]))].map(row=>row.map(csvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`AlGani-${state.panel}-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice(`Exported ${rows.length} matching records.`);}
export function initAdmin(){
  cleanupAdmin();if(!$('.office'))return;
  lifecycle=new AbortController();state={panel:'dashboard',search:'',filter:'all',errors:{},auto:true,loading:false,busy:false};
  const root=$('.office');
  root.addEventListener('click',async event=>{
    const panel=event.target.closest('[data-panel]');if(panel){showPanel(panel.dataset.panel,true);return;}
    const button=event.target.closest('[data-action]');if(!button||state.busy)return;
    const {action:kind,id}=button.dataset;
    if(kind==='logout'){await signOut();location.hash='#/admin/login';return;}
    if(kind==='refresh'){await refresh(true);return;}
    if(kind==='close-dialog'){$('#office-dialog').close();return;}
    if(kind==='export'){exportRows();return;}
    if(kind==='create'){if(state.panel==='catalog')offeringForm();else if(state.panel==='partners')partnerForm();else deliveryForm();return;}
    if(kind==='inquiry')inquiryDialog(id);
    if(kind==='delivery')deliveryDialog(id);
    if(kind==='product')inventoryDialog(id);
    if(kind==='edit-offering')offeringForm(id);
    if(kind==='convert'){const i=state.inquiries.find(i=>i.id===id);$('#office-dialog').close();deliveryForm(i);}
    if(kind==='archive-inquiry'){const i=state.inquiries.find(i=>i.id===id);$('#office-dialog').close();confirmation(flag(i.isDeleted)?'Restore inquiry':'Archive inquiry',flag(i.isDeleted)?'Return this inquiry to your current inbox?':'Move this inquiry to the archive? You can restore it later.','archive',id);}
    if(kind==='approve-partner')confirmation('Approve partner','Mark this organization as an active business partner?','approve',id);
    if(kind==='remove-partner')confirmation('Remove partner',`Permanently remove ${state.partners.find(p=>p.id===id)?.name}? This cannot be undone.`,'remove',id);
    if(kind==='read-alert')await save(button.parentElement,()=>request(endpoint('alerts',id,'/read'),{method:'PUT',signal:lifecycle.signal}),'Alert marked as read.');
  },{signal:lifecycle.signal});
  root.addEventListener('input',event=>{if(event.target.id==='office-search'){state.search=event.target.value;renderContent();}},{signal:lifecycle.signal});
  root.addEventListener('change',event=>{if(event.target.id==='office-filter'){state.filter=event.target.value;renderContent();}if(event.target.id==='office-auto-refresh')state.auto=event.target.checked;},{signal:lifecycle.signal});
  $('#office-dialog').addEventListener('cancel',event=>{if(state.busy)event.preventDefault();},{signal:lifecycle.signal});
  root.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('form'))return;event.preventDefault();
    const data=new FormData(form), kind=form.dataset.form, id=form.dataset.id;
    save(form,async()=>{
      const send=(url,method,body)=>request(url,{method,data:body,signal:lifecycle.signal});
      if(form.id==='office-password-form'){if(data.get('newPassword')!==data.get('confirmPassword'))throw new Error('The new passwords do not match.');if(new TextEncoder().encode(data.get('newPassword')).length>72)throw new Error('Your new password exceeds 72 UTF-8 bytes.');await changePassword(auth.currentUser.email,data.get('currentPassword'),data.get('newPassword'));form.reset();return;}
      if(kind==='inventory'){await send(endpoint('products',id),'PUT',inventoryPayload(data));await getCachedProducts(true);}
      if(kind==='inquiry-status')await send(endpoint('inquiries',id),'PUT',{status:data.get('status')});
      if(kind==='order-status')await send(endpoint('orders',id),'PUT',{status:data.get('status')});
      if(kind==='archive')await send(endpoint('inquiries',id),'PUT',{isDeleted:!flag(state.inquiries.find(i=>i.id===id).isDeleted)});
      if(kind==='new-order'){const body=Object.fromEntries(data);for(const key of Object.keys(body))body[key]=body[key].trim();if(id)body.inquiryId=id;body.productName=offeringName(body.service);await send('/api/orders','POST',body);}
      if(kind==='partner')await send('/api/partners','POST',Object.fromEntries(data));
      if(kind==='approve')await send(endpoint('partners',id,'/approve'),'PUT');
      if(kind==='remove')await send(endpoint('partners',id),'DELETE');
      if(kind==='offering'){const body=Object.fromEntries(data);body.features=body.features.split('\n').map(v=>v.trim()).filter(Boolean);body.gallery=body.gallery.split('\n').map(v=>v.trim()).filter(Boolean);await send(id?endpoint('custom-services',id):'/api/custom-services',id?'PUT':'POST',body);}
    },'Changes saved successfully.');
  },{signal:lifecycle.signal});
  showPanel('dashboard');refresh();
  const poll=async()=>{if(!state)return;if(state.auto&&!state.busy&&!$('#office-dialog')?.open&&!$('#office-content')?.contains(document.activeElement))await refresh();if(state)timer=setTimeout(poll,30000);};timer=setTimeout(poll,30000);
}
export function cleanupAdmin(){version++;clearTimeout(timer);reads?.abort();lifecycle?.abort();$('#office-dialog')?.close();state=null;}

import { getServiceBySlug } from '../data/services.js';
import {
  escapeQuoteHtml as escapeHtml, getQuoteItems, updateQuoteQuantity,
  removeQuoteItem, QUOTE_UNITS, QUOTE_MAX_QUANTITY,
} from '../components/quote-list.js';

let initialized = false;

function renderQuoteContents() {
  const items = getQuoteItems();
  if (!items.length) return `
    <div class="quote-empty">
      <span class="quote-empty-mark" aria-hidden="true">＋</span>
      <h2>Every project starts<br>with a possibility.</h2>
      <p>Explore our offerings and save what interests you. Bring everything together here before you start a conversation.</p>
      <a class="quote-primary" href="#/services">Explore the collection <span aria-hidden="true">↗</span></a>
    </div>`;

  return `
    <div class="quote-layout">
      <div class="quote-items-column">
        <div class="quote-list-heading"><h2>Your selected offerings</h2><span>${items.length} ${items.length === 1 ? 'offering' : 'offerings'}</span></div>
        <ul class="quote-items" aria-label="Your shortlisted offerings">
          ${items.map((item, index) => {
            const service = getServiceBySlug(item.slug);
            const slug = escapeHtml(item.slug);
            const name = escapeHtml(service.name);
            return `
              <li class="quote-item" data-quote-item="${slug}">
                <span class="quote-item-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
                <div class="quote-item-info">
                  <span class="quote-item-category">${escapeHtml(service.category)}</span>
                  <h3><a href="#/services/${encodeURIComponent(item.slug)}">${name} <span aria-hidden="true">↗</span></a></h3>
                  <div class="quote-item-controls">
                    <div class="quote-field">
                      <label for="quote-qty-${slug}">Approx. quantity</label>
                      <input id="quote-qty-${slug}" data-quote-quantity="${slug}" type="number" inputmode="numeric" min="1" max="${QUOTE_MAX_QUANTITY}" step="1" value="${item.quantity}" aria-label="Approximate quantity for ${name}">
                    </div>
                    <div class="quote-field">
                      <label for="quote-unit-${slug}">Measure</label>
                      <select id="quote-unit-${slug}" data-quote-unit="${slug}" aria-label="Quantity measure for ${name}">
                        ${Object.entries(QUOTE_UNITS).map(([value, label]) => `<option value="${value}"${item.unit === value ? ' selected' : ''}>${label}</option>`).join('')}
                      </select>
                    </div>
                  </div>
                </div>
                <button class="quote-remove" type="button" data-quote-remove="${slug}" aria-label="Remove ${name} from shortlist">Remove <span aria-hidden="true">×</span></button>
              </li>`;
          }).join('')}
        </ul>
        <a class="quote-continue" href="#/services"><span aria-hidden="true">＋</span> Add more offerings</a>
      </div>
      <aside class="quote-summary" aria-labelledby="quote-next-title">
        <span class="quote-eyebrow">The next step</span>
        <h2 id="quote-next-title">A little detail.<br>A better starting point.</h2>
        <p>Tell us where your project is, what you need, and when you need it. We’ll use your list to understand the scope.</p>
        <ul class="quote-checklist">
          <li><span aria-hidden="true">01</span> Your selected offerings</li>
          <li><span aria-hidden="true">02</span> Location &amp; project timeline</li>
          <li><span aria-hidden="true">03</span> Dimensions &amp; specifications</li>
        </ul>
        <a class="quote-primary" href="#/contact?quote=1">Prepare an inquiry <span aria-hidden="true">↗</span></a>
        <p class="quote-footnote">Review your message before sending. Availability, specifications, pricing, and delivery are confirmed by our team.</p>
      </aside>
    </div>`;
}

export function renderQuote() {
  return `
    <section class="quote-page" id="quote-page" aria-labelledby="quote-title">
      <div class="quote-container">
        <nav class="quote-breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Project shortlist</span></nav>
        <header class="quote-header">
          <div><span class="quote-eyebrow">Made for your project</span><h1 id="quote-title">Good ideas,<br><em>all in one place.</em></h1></div>
          <p>Your working list of materials, equipment, and possibilities. Fine-tune it, then let’s talk about making it happen.</p>
        </header>
        <div id="quote-content">${renderQuoteContents()}</div>
        <p class="quote-storage-note">Your shortlist stays in this browser when storage is available. Nothing is sent until you submit an inquiry.</p>
        <p class="quote-screen-reader" id="quote-page-status" role="status" aria-live="polite"></p>
      </div>
    </section>`;
}

function updateQuotePage(event) {
  const content = document.getElementById('quote-content');
  if (!content) return;
  if (event?.detail?.reason === 'quantity') {
    // Avoid replacing a clicked link or control when an input commits on blur.
    for (const item of getQuoteItems()) {
      const quantityInput = document.getElementById(`quote-qty-${item.slug}`);
      const unitInput = document.getElementById(`quote-unit-${item.slug}`);
      if (quantityInput) quantityInput.value = item.quantity;
      if (unitInput) unitInput.value = item.unit;
    }
    return;
  }
  const activeId = content.contains(document.activeElement) ? document.activeElement.id : '';
  content.innerHTML = renderQuoteContents();
  if (activeId) document.getElementById(activeId)?.focus();
}

export function initQuote() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('quotechange', updateQuotePage);
  document.addEventListener('change', event => {
    const input = event.target.closest?.('[data-quote-quantity], [data-quote-unit]');
    if (!input || !input.closest('#quote-page')) return;
    const slug = input.dataset.quoteQuantity || input.dataset.quoteUnit;
    const quantityInput = document.getElementById(`quote-qty-${slug}`);
    const unitInput = document.getElementById(`quote-unit-${slug}`);
    updateQuoteQuantity(slug, quantityInput.value, unitInput.value);
    const status = document.getElementById('quote-page-status');
    if (status) status.textContent = 'Shortlist updated.';
  });
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-quote-remove]');
    if (!button || !button.closest('#quote-page')) return;
    const slug = button.dataset.quoteRemove;
    const row = button.closest('[data-quote-item]');
    const nextSlug = row.nextElementSibling?.dataset.quoteItem || row.previousElementSibling?.dataset.quoteItem;
    const name = getServiceBySlug(slug)?.name || 'Offering';
    removeQuoteItem(slug);
    if (nextSlug) document.getElementById(`quote-qty-${nextSlug}`)?.focus();
    else document.querySelector('#quote-content .quote-primary')?.focus();
    const status = document.getElementById('quote-page-status');
    if (status) status.textContent = `${name} removed from your shortlist.`;
  });
}

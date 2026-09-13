export function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function serviceImage(slug, variant = '') {
  return /^[a-z0-9-]+$/.test(slug) ? `/images/${slug}${variant}.webp` : '/images/general-commercial-supplies.webp';
}
export function offeringCard(service) {
  const name = escapeHtml(service.name);
  const slug = escapeHtml(service.slug);
  return `<article class="offering-card" data-slug="${slug}" data-category="${escapeHtml(service.category)}" data-name="${name}" data-search="${escapeHtml(`${service.name} ${service.category} ${service.shortDesc}`)}">
    <a class="offering-image" href="#/services/${slug}" aria-label="Explore ${name}"><img src="${serviceImage(service.slug)}" alt="${name}" loading="lazy" width="600" height="480" onerror="this.onerror=null;this.src='/images/general-commercial-supplies.webp'"><span class="image-arrow" aria-hidden="true">↗</span></a>
    <div class="offering-copy"><span class="offering-category">${escapeHtml(service.category)}</span><h3><a href="#/services/${slug}">${name}</a></h3><p>${escapeHtml(service.shortDesc)}</p><div class="offering-bottom"><span class="offering-stock">Availability on inquiry</span><button type="button" class="save-offering" data-quote-add="${slug}" aria-label="Add ${name} to quote list"><span data-quote-label>+ Quote list</span></button></div></div>
  </article>`;
}
export function applyProductStatus(card, product) {
  if (!card || !product) return;
  card.dataset.dbHidden = String(product.visible === 0 || product.visible === false);
  if (card.dataset.dbHidden === 'true') card.hidden = true;
  const label = card.querySelector('.offering-stock');
  const labels = {'in-stock':'In stock','low-stock':'Limited availability','out-of-stock':'Currently unavailable'};
  if (label) label.textContent = labels[product.stockStatus] || 'Availability on inquiry';
}

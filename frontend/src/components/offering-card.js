import { getServiceBySlug, services } from '../data/services.js';
const builtInImageSlugs = new Set(services.map(service => service.slug));

export function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function serviceImage(slug, variant = '') {
  const gallery = getServiceBySlug(slug)?.gallery;
  const index = variant ? Number(variant.slice(1)) - 1 : 0;
  const image = gallery?.[index];
  const url = typeof image === 'string' ? image : image?.url;
  if (url) {
    try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) return escapeHtml(parsed.href); } catch { /* Use the local image fallback. */ }
  }
  return builtInImageSlugs.has(slug) && /^[a-z0-9-]+$/.test(slug) ? `/images/${slug}${variant}.webp` : '/images/general-commercial-supplies.webp';
}
export function offeringCard(service) {
  const image = serviceImage(service.slug);
  const responsive = image.startsWith('/images/') && builtInImageSlugs.has(service.slug)
    ? `srcset="/images/thumbs/${escapeHtml(service.slug)}.webp 480w, ${image} 1024w" sizes="(max-width:600px) 90vw, (max-width:900px) 45vw, 46vw"` : '';
  const name = escapeHtml(service.name);
  const slug = escapeHtml(service.slug);
  return `<article class="offering-card" data-slug="${slug}" data-category="${escapeHtml(service.category)}" data-name="${name}" data-search="${escapeHtml(`${service.name} ${service.category} ${service.shortDesc}`)}">
    <a class="offering-image" href="/services/${slug}" aria-label="Explore ${name}"><img src="${image}" ${responsive} alt="${name}" loading="lazy" decoding="async" width="600" height="480"><span class="image-arrow" aria-hidden="true">↗</span></a>
    <div class="offering-copy"><span class="offering-category">${escapeHtml(service.category)}</span><h3><a href="/services/${slug}">${name}</a></h3><p>${escapeHtml(service.shortDesc)}</p><div class="offering-bottom"><span class="offering-stock">Availability on inquiry</span><button type="button" class="save-offering" data-quote-add="${slug}" aria-label="Add ${name} to quote list"><span data-quote-label>+ Quote list</span></button></div></div>
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

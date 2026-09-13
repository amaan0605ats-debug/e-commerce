import { getServiceBySlug } from '../data/services.js';

export const QUOTE_STORAGE_KEY = 'algani-quote-v1';
export const QUOTE_MAX_QUANTITY = 99999;
export const QUOTE_UNITS = Object.freeze({ units: 'units', sqm: 'm²', sets: 'sets', projects: 'projects' });
const MAX_ITEMS = 40;
// Leaves room for project details inside the contact form's 5,000-character limit.
const MAX_SUMMARY_NAME_LENGTH = 80;
let memoryItems = [];
let memoryOnly = false;
let initialized = false;
let noticeTimer;

export function escapeQuoteHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function quantity(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return 1;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(QUOTE_MAX_QUANTITY, Math.max(1, Math.floor(number))) : 1;
}

function safeSlug(slug) {
  return typeof slug === 'string' && slug.length <= 200 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function validSlug(slug) {
  return safeSlug(slug) && Boolean(getServiceBySlug(slug));
}

function validUnit(unit) {
  return typeof unit === 'string' && Object.hasOwn(QUOTE_UNITS, unit);
}

function sanitizeItems(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Set();
  const result = [];
  let resolvedCount = 0;
  let pendingCount = 0;
  for (const item of value) {
    if (!item || !safeSlug(item.slug) || unique.has(item.slug)) continue;
    unique.add(item.slug);
    // Custom offerings arrive asynchronously. Retain their safe identifiers until
    // the catalog can resolve them, without exposing saved names or arbitrary HTML.
    const resolved = Boolean(getServiceBySlug(item.slug));
    if (resolved ? resolvedCount >= MAX_ITEMS : pendingCount >= MAX_ITEMS) continue;
    if (resolved) resolvedCount++;
    else pendingCount++;
    result.push({
      slug: item.slug,
      quantity: quantity(item.quantity),
      unit: validUnit(item.unit) ? item.unit : 'units',
    });
  }
  return result;
}

function readStoredItems() {
  if (memoryOnly) {
    // The asynchronous catalog can change which cached entries are resolved.
    memoryItems = sanitizeItems(memoryItems);
    return memoryItems.map(item => ({ ...item }));
  }
  try {
    const raw = globalThis.localStorage.getItem(QUOTE_STORAGE_KEY);
    memoryItems = sanitizeItems(raw ? JSON.parse(raw) : []);
  } catch {
    // Private browsing, storage quotas, and corrupted saved data must not block inquiry creation.
    memoryItems = sanitizeItems(memoryItems);
    memoryOnly = true;
  }
  return memoryItems.map(item => ({ ...item }));
}

export function getQuoteItems() {
  return readStoredItems().filter(item => validSlug(item.slug));
}

function saveItems(items, reason = 'items') {
  memoryItems = sanitizeItems(items);
  try {
    globalThis.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(memoryItems));
    memoryOnly = false;
  } catch {
    // Keep this session usable when persistent storage is unavailable.
    memoryOnly = true;
  }
  if (typeof document !== 'undefined') {
    refreshQuoteIndicators();
    document.dispatchEvent(new CustomEvent('quotechange', { detail: { reason } }));
  }
}

export function addQuoteItem(slug) {
  if (!validSlug(slug)) return false;
  const items = readStoredItems();
  if (items.some(item => item.slug === slug) || items.filter(item => validSlug(item.slug)).length >= MAX_ITEMS) return false;
  saveItems([...items, { slug, quantity: 1, unit: 'units' }]);
  return true;
}

export function updateQuoteQuantity(slug, value, unit) {
  const items = readStoredItems();
  const item = items.find(entry => entry.slug === slug);
  if (!item) return false;
  item.quantity = quantity(value);
  if (validUnit(unit)) item.unit = unit;
  saveItems(items, 'quantity');
  return true;
}

export function removeQuoteItem(slug) {
  saveItems(readStoredItems().filter(item => item.slug !== slug));
}

export function getQuoteSummary() {
  const items = getQuoteItems();
  if (!items.length) return '';
  const lines = items.map((item, index) => {
    const fullName = String(getServiceBySlug(item.slug)?.name || item.slug).replace(/\s+/g, ' ').trim();
    const name = fullName.length > MAX_SUMMARY_NAME_LENGTH
      ? `${fullName.slice(0, MAX_SUMMARY_NAME_LENGTH - 1)}…`
      : fullName;
    return `${index + 1}. ${name} — approx. ${item.quantity} ${QUOTE_UNITS[item.unit]}`;
  });
  return `I'd like to discuss a quote for:\n\n${lines.join('\n')}\n\nProject location:\nRequired by:\nSpecifications / dimensions:\n`;
}

function refreshQuoteIndicators() {
  const items = getQuoteItems();
  document.querySelectorAll('[data-quote-count]').forEach(element => {
    element.textContent = String(items.length);
    element.setAttribute('aria-label', `${items.length} ${items.length === 1 ? 'offering' : 'offerings'} in your shortlist`);
  });
  const selected = new Set(items.map(item => item.slug));
  document.querySelectorAll('[data-quote-add]').forEach(button => {
    const isAdded = selected.has(button.dataset.quoteAdd);
    button.classList.toggle('is-shortlisted', isAdded);
    button.dataset.quoteAdded = String(isAdded);
    button.title = isAdded ? 'Already in your shortlist' : 'Add to your project shortlist';
    const label = button.querySelector('[data-quote-label]');
    if (label) {
      label.dataset.originalLabel ||= label.textContent;
      label.textContent = isAdded ? 'Shortlisted' : label.dataset.originalLabel;
    }
  });
}

function showNotice(message) {
  let notice = document.getElementById('quote-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'quote-notice';
    notice.className = 'quote-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    document.body.appendChild(notice);
  }
  notice.replaceChildren();
  const text = document.createElement('span');
  text.textContent = message;
  const link = document.createElement('a');
  link.href = '#/quote';
  link.textContent = 'View shortlist →';
  notice.append(text, link);
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    // Keep the link available when a keyboard user is interacting with it.
    if (!notice.contains(document.activeElement)) notice.hidden = true;
  }, 5500);
}

export function initQuoteList() {
  refreshQuoteIndicators();
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-quote-add]');
    if (!button || button.disabled) return;
    event.preventDefault();
    const slug = button.dataset.quoteAdd;
    if (!validSlug(slug)) return;
    const name = String(getServiceBySlug(slug).name);
    const exists = getQuoteItems().some(item => item.slug === slug);
    const added = addQuoteItem(slug);
    showNotice(added ? `${name} added.` : exists ? `${name} is already shortlisted.` : 'Your shortlist is full. Review it to make room.');
  });
  window.addEventListener('storage', event => {
    if (event.key !== QUOTE_STORAGE_KEY && event.key !== null) return;
    memoryOnly = false;
    refreshQuoteIndicators();
    document.dispatchEvent(new CustomEvent('quotechange'));
  });
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(raw = null, { failRead = false, failWrite = false } = {}) {
  const catalog = [
    { slug: 'interior-paneling', name: 'Interior Paneling', category: 'Core Supply' },
    { slug: 'flooring-solutions', name: 'Flooring Solutions', category: 'Core Supply' },
  ];
  let saved = raw;
  const context = vm.createContext({
    getServiceBySlug: slug => catalog.find(service => service.slug === slug),
    localStorage: {
      getItem() { if (failRead) throw new Error('Storage blocked'); return saved; },
      setItem(key, value) { if (failWrite) throw new Error('Quota exceeded'); saved = value; },
    },
  });
  const source = fs.readFileSync('frontend/src/components/quote-list.js', 'utf8')
    .replace(/^import[^;]+;\s*/gm, '')
    .replace(/^export /gm, '');
  vm.runInContext(`${source}\nglobalThis.api = {getQuoteItems, addQuoteItem, updateQuoteQuantity, removeQuoteItem, getQuoteSummary, escapeQuoteHtml};`, context);
  return { api: context.api, context, catalog, saved: () => saved };
}

test('shortlist validates saved slugs, deduplicates items, and clamps quantities', () => {
  const { api } = setup(JSON.stringify([
    { slug: 'interior-paneling', quantity: -4, unit: 'sqm' },
    { slug: 'interior-paneling', quantity: 70 },
    { slug: 'flooring-solutions', quantity: 1e20, unit: '__proto__' },
    { slug: '<img src=x onerror=alert(1)>', quantity: 1 },
    { slug: 'does-not-exist', quantity: 1 }, null,
  ]));
  const items = JSON.parse(JSON.stringify(api.getQuoteItems()));
  assert.deepEqual(items, [
    { slug: 'interior-paneling', quantity: 1, unit: 'sqm' },
    { slug: 'flooring-solutions', quantity: 99999, unit: 'units' },
  ]);
});

test('shortlist mutations persist, avoid duplicates, and produce an inquiry summary', () => {
  const { api, saved } = setup();
  assert.equal(api.addQuoteItem('interior-paneling'), true);
  assert.equal(api.addQuoteItem('interior-paneling'), false);
  assert.equal(api.addQuoteItem('not-a-service'), false);
  api.updateQuoteQuantity('interior-paneling', 25, 'sqm');
  assert.match(api.getQuoteSummary(), /Interior Paneling — approx\. 25 m²/);
  assert.equal(JSON.parse(saved())[0].quantity, 25);
  const items = api.getQuoteItems();
  items[0].quantity = 10;
  assert.equal(api.getQuoteItems()[0].quantity, 25, 'callers cannot mutate saved state');
  api.removeQuoteItem('interior-paneling');
  assert.equal(api.getQuoteSummary(), '');
  assert.equal(api.getQuoteItems().length, 0);
});

test('blocked and corrupted storage keep a usable session shortlist', () => {
  for (const fixture of [
    setup(null, { failRead: true, failWrite: true }),
    setup('invalid-json'),
    setup('[]', { failWrite: true }),
    setup('{"slug":"interior-paneling"}'),
  ]) {
    assert.equal(fixture.api.getQuoteItems().length, 0);
    fixture.api.addQuoteItem('interior-paneling');
    fixture.api.updateQuoteQuantity('interior-paneling', 9, 'sets');
    assert.equal(fixture.api.getQuoteItems()[0].quantity, 9);
    assert.match(fixture.api.getQuoteSummary(), /9 sets/);
  }
});

test('invalid quantities cannot become zero, negative, fractional, or infinite', () => {
  const { api } = setup();
  api.addQuoteItem('interior-paneling');
  for (const value of [0, -12, '', 'invalid', NaN, Infinity, { valueOf: null, toString: null }]) {
    api.updateQuoteQuantity('interior-paneling', value);
    assert.equal(api.getQuoteItems()[0].quantity, 1);
  }
  api.updateQuoteQuantity('interior-paneling', 2.9);
  assert.equal(api.getQuoteItems()[0].quantity, 2);
});

test('late custom catalog hydration preserves pending selections across mutations', () => {
  const { api, catalog, saved } = setup(JSON.stringify([
    { slug: 'custom-workbenches', quantity: 8, unit: 'sets', name: '<script>saved content</script>' },
  ]));
  assert.equal(api.getQuoteItems().length, 0, 'unresolved identifiers are never displayed');
  assert.equal(api.getQuoteSummary(), '');
  api.addQuoteItem('interior-paneling');
  api.updateQuoteQuantity('interior-paneling', 12, 'sqm');
  assert.equal(JSON.parse(saved()).find(item => item.slug === 'custom-workbenches').quantity, 8);
  api.removeQuoteItem('interior-paneling');
  assert.equal(JSON.parse(saved())[0].slug, 'custom-workbenches');
  assert.ok(!saved().includes('<script>'), 'storage retains identifiers and quantities only');
  catalog.push({ slug: 'custom-workbenches', name: 'Custom Workbenches', category: 'Laboratory' });
  assert.equal(api.getQuoteItems().length, 1);
  assert.match(api.getQuoteSummary(), /Custom Workbenches — approx\. 8 sets/);
});

test('pending unknown identifiers cannot block adding a resolved offering', () => {
  const { api } = setup(JSON.stringify(Array.from({ length: 70 }, (_, index) => ({ slug: `pending-${index}`, quantity: 1 }))));
  assert.equal(api.addQuoteItem('interior-paneling'), true);
  assert.equal(api.getQuoteItems().length, 1);
});

test('a maximum-size quote fits the contact message limit with space for project details', () => {
  const { api, catalog } = setup();
  for (let index = 0; index < 41; index++) {
    const slug = `custom-service-${index}`;
    catalog.push({ slug, name: `Offering ${index} ${'Long custom catalog name '.repeat(20)}`, category: 'Custom' });
    assert.equal(api.addQuoteItem(slug), index < 40);
    api.updateQuoteQuantity(slug, 99999, 'projects');
  }
  const summary = api.getQuoteSummary();
  assert.equal(api.getQuoteItems().length, 40);
  assert.ok(summary.length <= 4500, `Expected at least 500 characters for project details; got ${summary.length}`);
  assert.equal((summary.match(/approx\. 99999 projects/g) || []).length, 40);
  assert.ok(summary.endsWith('Specifications / dimensions:\n'));
});

test('malformed saved units fall back safely without dropping valid selections', () => {
  const { api } = setup(JSON.stringify([
    { slug: 'interior-paneling', quantity: 18, unit: { valueOf: null, toString: null } },
    { slug: 'flooring-solutions', quantity: 24, unit: 'sqm' },
  ]));
  assert.equal(api.getQuoteItems().length, 2);
  assert.equal(api.getQuoteItems()[0].unit, 'units');
  api.updateQuoteQuantity('flooring-solutions', 30, { valueOf: null, toString: null });
  assert.equal(api.getQuoteItems()[1].unit, 'sqm');
  assert.match(api.getQuoteSummary(), /30 m²/);
});

test('late hydration keeps the resolved limit consistent when storage writes are blocked', () => {
  const pending = Array.from({ length: 40 }, (_, index) => ({ slug: `custom-${index}`, quantity: 1 }));
  const { api, catalog } = setup(JSON.stringify(pending), { failWrite: true });
  api.addQuoteItem('interior-paneling');
  for (const item of pending) catalog.push({ slug: item.slug, name: item.slug, category: 'Custom' });
  assert.equal(api.getQuoteItems().length, 40);
  assert.ok(api.getQuoteSummary().length <= 5000);
});

test('quantity commits before inquiry navigation without replacing the clicked link', () => {
  const { api, context } = setup();
  api.addQuoteItem('interior-paneling');
  const handlers = {};
  let replacedContent = 0;
  const input = { value: '32', dataset: { quoteQuantity: 'interior-paneling' }, closest: () => input };
  const unit = { value: 'sqm' };
  const content = { set innerHTML(value) { replacedContent++; } };
  context.document = {
    addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
    dispatchEvent(event) { for (const handler of handlers[event.type] || []) handler(event); },
    querySelectorAll() { return []; },
    getElementById(id) {
      return { 'quote-content': content, 'quote-qty-interior-paneling': input, 'quote-unit-interior-paneling': unit, 'quote-page-status': {} }[id];
    },
  };
  context.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
  const pageSource = fs.readFileSync('frontend/src/pages/quote.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*/gm, '')
    .replace(/^let initialized = false;/m, '')
    .replace(/^export /gm, '');
  vm.runInContext(`const escapeHtml = escapeQuoteHtml;\n${pageSource}\ninitQuote();`, context);
  for (const handler of handlers.change) handler({ target: input });
  assert.match(api.getQuoteSummary(), /32 m²/);
  assert.equal(replacedContent, 0);
});

test('quote page escapes catalog content and keeps inquiry preparation on the site', () => {
  const { api, context, catalog } = setup();
  catalog[0].name = 'Panels <script>alert(1)</script> "custom"';
  catalog[0].category = 'Core & supply';
  api.addQuoteItem('interior-paneling');
  const pageSource = fs.readFileSync('frontend/src/pages/quote.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*/gm, '')
    .replace(/^let initialized = false;/m, '')
    .replace(/^export /gm, '');
  vm.runInContext(`const escapeHtml = escapeQuoteHtml;\n${pageSource}\nglobalThis.renderQuotePage = renderQuote;`, context);
  const html = context.renderQuotePage();
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &quot;custom&quot;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Core &amp; supply'));
  assert.ok(html.includes('href="#/contact?quote=1"'));
  assert.ok(html.includes('aria-label="Approximate quantity'));
});

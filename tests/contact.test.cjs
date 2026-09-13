const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ hash = '#/contact', summary = '' } = {}) {
  const saved = [];
  let quoteSummary = summary;
  const formListeners = new Map();

  function field(id, value = '', { required = false, maxLength = -1, options } = {}) {
    const listeners = new Map();
    const element = {
      id, value, required, maxLength, options, validationMessage: '',
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(handler);
      },
      setCustomValidity(message) { this.validationMessage = message; },
      get selectedIndex() { return this.options?.findIndex(option => option.value === this.value) ?? -1; },
      edit(value, type = 'input') {
        this.value = value;
        const event = { target: this };
        for (const listener of listeners.get(type) || []) listener(event);
        // Native input and change events bubble from fields to their form.
        for (const listener of formListeners.get(type) || []) listener(event);
      },
    };
    return element;
  }

  const fields = {
    'form-name': field('form-name', '  Sample Buyer  ', { required: true, maxLength: 100 }),
    'form-email': field('form-email', 'buyer@example.com', { required: true, maxLength: 254 }),
    'form-phone': field('form-phone'),
    'form-message': field('form-message', '  Please supply materials for my project.  ', { required: true, maxLength: 5000 }),
    'form-location': field('form-location'),
    'form-service': field('form-service', '', { options: [
      { value: '', text: 'Select a service' },
      { value: 'flooring-solutions', text: 'Flooring Solutions' },
    ] }),
    'form-subject': field('form-subject', '', { options: [
      { value: '', text: 'Select a subject' },
      { value: 'supply', text: 'Supply Inquiry / Purchase' },
      { value: 'partnership', text: 'Distribution Partnership' },
    ] }),
    'form-submit-btn': { disabled: false, innerHTML: 'Send Message' },
  };
  const form = {
    addEventListener(type, handler) {
      if (!formListeners.has(type)) formListeners.set(type, []);
      formListeners.get(type).push(handler);
    },
    querySelector: selector => selector.startsWith('#') ? fields[selector.slice(1)] : null,
    closest: () => null,
    reportValidity() {
      // Native required validation accepts spaces; custom validation must reject them.
      return Object.values(fields).every(element => !element.validationMessage && (!element.required || element.value.length > 0));
    },
    async submit() {
      const event = { target: this, preventDefault() {} };
      for (const handler of formListeners.get('submit') || []) await handler(event);
    },
  };
  const context = vm.createContext({
    document: { getElementById: id => id === 'contact-form' ? form : fields[id] },
    location: { hash }, URLSearchParams,
    services: [{ slug: 'flooring-solutions', name: 'Flooring Solutions' }],
    db: {}, collection: (_, name) => name,
    addDoc: async (collectionName, payload) => { saved.push({ collectionName, payload }); return { id: 'saved-inquiry' }; },
    serverTimestamp: () => 'test-timestamp',
    getQuoteSummary: () => quoteSummary,
  });
  const source = fs.readFileSync('frontend/src/pages/contact.js', 'utf8')
    .replace(/^import[^;]+;\s*/gm, '')
    .replace(/^export /gm, '');
  vm.runInContext(`${source}\nglobalThis.api = { refreshContactPrefill, initContact };`, context);
  return {
    ...context.api, form, fields, saved,
    setSummary(value) { quoteSummary = value; },
    addCustomService() { fields['form-service'].options.push({ value: 'custom-workbenches', text: 'Custom Workbenches' }); },
  };
}

test('late custom service hydration restores the requested service selection', () => {
  const fixture = setup({ hash: '#/contact?service=custom-workbenches' });
  fixture.refreshContactPrefill();
  assert.equal(fixture.fields['form-service'].value, '', 'an unknown option is not selected before it is available');
  fixture.addCustomService();
  fixture.refreshContactPrefill();
  assert.equal(fixture.fields['form-service'].value, 'custom-workbenches');
});

test('late catalog hydration preserves manually changed or cleared service selections', () => {
  for (const selection of ['flooring-solutions', '']) {
    const fixture = setup({ hash: '#/contact?service=custom-workbenches' });
    fixture.refreshContactPrefill();
    fixture.fields['form-service'].edit(selection, 'change');
    fixture.addCustomService();
    fixture.refreshContactPrefill();
    assert.equal(fixture.fields['form-service'].value, selection);
  }
});

test('new quote summary fills an untouched form when custom items finish loading', () => {
  const fixture = setup({ hash: '#/contact?quote=1' });
  fixture.refreshContactPrefill();
  assert.equal(fixture.fields['form-message'].value, '');
  assert.equal(fixture.fields['form-subject'].value, 'supply');
  fixture.setSummary('Custom Workbenches — approx. 8 sets');
  fixture.refreshContactPrefill();
  assert.equal(fixture.fields['form-message'].value, 'Custom Workbenches — approx. 8 sets');
});

test('hydration preserves user message and subject edits while updating untouched fields', () => {
  const fixture = setup({ hash: '#/contact?quote=1&service=custom-workbenches', summary: 'Original quote' });
  fixture.refreshContactPrefill();
  fixture.fields['form-message'].edit('My project needs delivery next month.');
  fixture.fields['form-subject'].edit('partnership', 'change');
  fixture.addCustomService();
  fixture.setSummary('Updated catalog quote');
  fixture.refreshContactPrefill();
  assert.equal(fixture.fields['form-message'].value, 'My project needs delivery next month.');
  assert.equal(fixture.fields['form-subject'].value, 'partnership');
  assert.equal(fixture.fields['form-service'].value, 'custom-workbenches');
});

test('explicitly clearing quote fields is preserved during later prefill refreshes', () => {
  const fixture = setup({ hash: '#/contact?quote=1', summary: 'Original quote' });
  fixture.refreshContactPrefill();
  fixture.fields['form-message'].edit('');
  fixture.fields['form-subject'].edit('', 'change');
  fixture.setSummary('Refreshed quote');
  fixture.refreshContactPrefill();
  assert.equal(fixture.fields['form-message'].value, '');
  assert.equal(fixture.fields['form-subject'].value, '');
});

test('a whitespace-only name is rejected before saving an inquiry', async () => {
  const fixture = setup();
  fixture.initContact();
  fixture.fields['form-name'].value = ' \t\n ';
  await fixture.form.submit();
  assert.notEqual(fixture.fields['form-name'].validationMessage, '');
  assert.equal(fixture.saved.length, 0);
  assert.equal(fixture.fields['form-submit-btn'].disabled, false);
});

test('a whitespace-only message is rejected before saving an inquiry', async () => {
  const fixture = setup();
  fixture.initContact();
  fixture.fields['form-message'].value = ' \n\t ';
  await fixture.form.submit();
  assert.notEqual(fixture.fields['form-message'].validationMessage, '');
  assert.equal(fixture.saved.length, 0);
  assert.equal(fixture.fields['form-submit-btn'].disabled, false);
});

test('correcting invalid fields clears custom validation and saves trimmed inquiry text', async () => {
  const fixture = setup();
  fixture.initContact();
  fixture.fields['form-name'].value = ' ';
  fixture.fields['form-message'].value = ' ';
  await fixture.form.submit();
  assert.equal(fixture.saved.length, 0);
  fixture.fields['form-name'].edit('  Sample Buyer  ');
  fixture.fields['form-message'].edit('  Please quote for 20 square metres of flooring.  ');
  assert.equal(fixture.fields['form-name'].validationMessage, '');
  assert.equal(fixture.fields['form-message'].validationMessage, '');
  await fixture.form.submit();
  assert.equal(fixture.saved.length, 1);
  assert.equal(fixture.saved[0].collectionName, 'inquiries');
  assert.equal(fixture.saved[0].payload.name, 'Sample Buyer');
  assert.equal(fixture.saved[0].payload.message, 'Please quote for 20 square metres of flooring.');
});

test('programmatically overlong names and quote messages are rejected before saving', async () => {
  for (const id of ['form-name', 'form-message']) {
    const fixture = setup();
    fixture.initContact();
    const field = fixture.fields[id];
    field.value = 'x'.repeat(field.maxLength + 1);
    await fixture.form.submit();
    assert.notEqual(field.validationMessage, '');
    assert.equal(fixture.saved.length, 0);
  }
});

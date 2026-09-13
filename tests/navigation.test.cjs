const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ reducedMotion = false, observerAvailable = true } = {}) {
  const timers = new Map();
  const navLinks = [];
  const reveals = [];
  const observers = [];
  let sequence = 0;
  let focused = 0;
  const heading = { textContent: 'A page', setAttribute() {}, focus() { focused++; } };
  const app = { innerHTML: '', classList: { add() {}, remove() {} }, querySelector: () => heading };
  const context = vm.createContext({
    window: {
      location: { hash: '#/' }, addEventListener() {}, scrollTo() {},
      matchMedia: () => ({ matches: reducedMotion }),
    },
    document: {
      getElementById: () => app,
      querySelectorAll: selector => selector === '.nav-link' ? navLinks : selector === '.animate-on-scroll' ? reveals : [],
    },
    setTimeout: fn => { timers.set(++sequence, fn); return sequence; },
    clearTimeout: id => timers.delete(id),
    ...(observerAvailable ? {
      IntersectionObserver: class {
        constructor() { this.disconnected = false; observers.push(this); }
        observe() {}
        unobserve() {}
        disconnect() { this.disconnected = true; }
      },
    } : {}),
  });
  vm.runInContext(fs.readFileSync('frontend/src/router.js', 'utf8').replace('export class Router', 'class Router') + '\nglobalThis.Router = Router;', context);
  const router = new context.Router([
    { path: '/', render: () => 'home' },
    { path: '/contact', render: () => 'contact' },
    { path: '/services', render: () => 'offerings' },
    { path: '/services/:slug', render: ({ slug }) => slug },
  ]);
  return {
    router, context, app, navLinks, reveals, observers,
    focusCount: () => focused,
    flush() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } },
  };
}

test('an unknown URL renders a recovery page without interpolating the URL', () => {
  const { router, context, app, flush } = setup();
  context.window.location.hash = '#/missing/<script>alert(1)</script>';
  router.handleRoute();
  flush();
  assert.match(app.innerHTML, /404/);
  assert.match(app.innerHTML, /href="#\/services"/);
  assert.match(app.innerHTML, /href="#\/"/);
  assert.doesNotMatch(app.innerHTML, /<script>/);
  assert.notEqual(app.innerHTML, 'home');
});

test('focus is retained on initial load and announced when changing page', () => {
  const { router, context, flush, focusCount } = setup();
  router.handleRoute();
  flush();
  assert.equal(focusCount(), 0);
  context.window.location.hash = '#/contact';
  router.handleRoute();
  flush();
  assert.equal(focusCount(), 1);
  router.handleRoute();
  flush();
  assert.equal(focusCount(), 1, 'refreshing the same route should not steal focus');
});

test('a synchronous route redirect does not replace or initialize the previous page', () => {
  const { router, context, app, flush, focusCount } = setup();
  router.handleRoute();
  flush();
  let initialized = 0;
  router.onRendered = () => initialized++;
  router.routes.push({ path: '/redirect', render: () => {
    context.window.location.hash = '#/contact';
    return 'redirect intermediary';
  } });
  context.window.location.hash = '#/redirect';
  router.handleRoute();
  flush();
  assert.equal(app.innerHTML, 'home');
  assert.equal(initialized, 0);
  assert.equal(focusCount(), 0);
  router.handleRoute(); // The destination's queued hashchange event.
  flush();
  assert.equal(app.innerHTML, 'contact');
  assert.equal(initialized, 1);
  assert.equal(focusCount(), 1);
});

test('a changed URL cancels a pending render even before hashchange is dispatched', () => {
  const { router, context, app, flush } = setup();
  router.handleRoute();
  flush();
  let initialized = 0;
  router.onRendered = () => initialized++;
  context.window.location.hash = '#/services';
  router.handleRoute();
  context.window.location.hash = '#/contact';
  flush();
  assert.equal(app.innerHTML, 'home');
  assert.equal(initialized, 0);
  router.handleRoute();
  flush();
  assert.equal(app.innerHTML, 'contact');
  assert.equal(initialized, 1);
});

test('trailing slashes and query parameters preserve route and active navigation', () => {
  const { router, context, app, navLinks, flush } = setup();
  const attributes = new Map([['href', '#/contact']]);
  let active = false;
  navLinks.push({
    getAttribute: name => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    classList: { toggle: (name, value) => { if (name === 'active') active = value; } },
  });
  context.window.location.hash = '#/contact/?service=flooring';
  router.handleRoute();
  flush();
  assert.equal(app.innerHTML, 'contact');
  assert.equal(active, true);
  assert.equal(attributes.get('aria-current'), 'page');
  context.window.location.hash = '#/contactless';
  router.handleRoute();
  flush();
  assert.equal(active, false, 'unrelated URLs sharing a prefix are not active');
  assert.equal(attributes.has('aria-current'), false);
});

test('malformed URL encoding does not throw or render a service', () => {
  const { router, context, app, flush } = setup();
  context.window.location.hash = '#/services/%E0%A4%A';
  assert.doesNotThrow(() => { router.handleRoute(); flush(); });
  assert.match(app.innerHTML, /404/);
  assert.equal(router.matchRoute('/services/:slug', '/services/modular%20kitchens').params.slug, 'modular kitchens');
});

test('page navigation disconnects the previous scroll observer', () => {
  const { router, context, observers, flush } = setup();
  router.handleRoute();
  flush();
  assert.equal(observers.length, 1);
  context.window.location.hash = '#/contact';
  router.handleRoute();
  assert.equal(observers[0].disconnected, true);
  flush();
  assert.equal(observers.length, 2);
  assert.equal(observers[1].disconnected, false);
});

test('content is visible with reduced motion or without IntersectionObserver', () => {
  for (const options of [{ reducedMotion: true }, { observerAvailable: false }]) {
    const { router, reveals, observers } = setup(options);
    let visible = false;
    reveals.push({ classList: { add: name => { visible = name === 'animate-visible'; } } });
    router.initScrollAnimations();
    assert.equal(visible, true);
    assert.equal(observers.length, 0);
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ fetch, saved = null, blockedStorage = false } = {}) {
  const timers = new Map();
  let sequence = 0;
  const context = vm.createContext({
    fetch: fetch || (async () => new Response('[]')),
    AbortController, atob, console: { error() {} },
    setTimeout: (callback, delay) => { timers.set(++sequence, { callback, delay }); return sequence; },
    clearTimeout: id => timers.delete(id),
    sessionStorage: {
      getItem() { if (blockedStorage) throw new Error('Access blocked'); return saved; },
      setItem(_key, value) { if (blockedStorage) throw new Error('Access blocked'); saved = value; },
      removeItem() { if (blockedStorage) throw new Error('Access blocked'); saved = null; },
    },
  });
  const source = fs.readFileSync('frontend/src/firebase.js', 'utf8').replace(/export\s*\{[\s\S]*?\};?\s*$/, '');
  vm.runInContext(source + '\nglobalThis.api = { auth, onSnapshot, collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, getCachedProducts, signOut, signInWithEmailAndPassword, changePassword };', context);
  return { api: context.api, timers, stored: () => saved };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('password updates end the invalidated browser session only after server success', async () => {
  for (const status of [200,400]) {
    const token=`x.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.x`;
    const client=setup({saved:JSON.stringify({uid:'1',email:'admin@example.invalid',token}),fetch:async()=>new Response(JSON.stringify(status===200?{success:true}:{error:'Incorrect password'}),{status})});
    if(status===200){await client.api.changePassword('admin@example.invalid','old','new');assert.equal(client.api.auth.currentUser,null);assert.equal(client.stored(),null);}
    else {await assert.rejects(client.api.changePassword('admin@example.invalid','old','new'),/Incorrect password/);assert.ok(client.api.auth.currentUser);}
  }
});

test('blocked browser storage and malformed sessions do not crash public pages', () => {
  assert.equal(setup({ blockedStorage: true }).api.auth.currentUser, null);
  const client = setup({ saved: '{broken' });
  assert.equal(client.api.auth.currentUser, null);
  assert.equal(client.stored(), null);
});

test('expired restored admin sessions are discarded', () => {
  const token = `x.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.x`;
  const client = setup({ saved: JSON.stringify({ uid: '1', email: 'admin@example.com', token }) });
  assert.equal(client.api.auth.currentUser, null);
  assert.equal(client.stored(), null);
});

test('unsubscribe cancels an in-flight dashboard refresh and suppresses late rendering', async () => {
  let resolveFetch;
  let signal;
  let callbacks = 0;
  const client = setup({ fetch: (_url, options) => { signal = options.signal; return new Promise(resolve => { resolveFetch = resolve; }); } });
  const unsubscribe = client.api.onSnapshot(client.api.collection(null, 'orders'), () => callbacks++);
  unsubscribe();
  assert.equal(signal.aborted, true);
  resolveFetch(new Response('[{"id":"late-order"}]'));
  await flush();
  assert.equal(callbacks, 0);
  assert.equal(client.timers.size, 0);
});

test('public product cache never requests internal admin inventory', async () => {
  const requested = [];
  const client = setup({ fetch: async (url, options) => { requested.push({ url, options }); return new Response('[{"slug":"furniture","visible":1}]'); } });
  client.api.auth.currentUser = { uid: '1', token: 'admin-token' };
  await client.api.getCachedProducts();
  await client.api.signOut();
  await client.api.getCachedProducts();
  assert.equal(requested.filter(r=>r.url==='/api/products/public').length, 1);
  assert.equal(requested.filter(r=>r.url==='/api/auth/logout').length,1);
  assert.equal(requested[0].url, '/api/products/public');
  assert.equal(requested[0].options.headers.Authorization, undefined);
});

test('an older availability request cannot overwrite a forced visibility refresh', async () => {
  const responses = [];
  const client = setup({ fetch: () => new Promise(resolve => responses.push(resolve)) });
  const older = client.api.getCachedProducts();
  const refreshed = client.api.getCachedProducts(true);
  responses[1](new Response('[{"slug":"furniture","visible":0}]'));
  assert.equal((await refreshed)[0].visible, 0);
  responses[0](new Response('[{"slug":"furniture","visible":1}]'));
  assert.equal((await older)[0].visible, 0);
  assert.equal((await client.api.getCachedProducts())[0].visible, 0);
});

test('API errors retain actionable server validation messages', async () => {
  const client = setup({ fetch: async () => new Response('{"error":"Inventory must be a non-negative whole number"}', { status: 400 }) });
  await assert.rejects(client.api.updateDoc(client.api.doc(null, 'products', 'furniture'), { inventoryCount: -1 }), /Inventory must be a non-negative whole number/);
});

test('expired API sessions clear auth, and missing documents remain distinguishable from errors', async () => {
  const client = setup({ fetch: async () => new Response('{"code":"auth/invalid-token","error":"Session expired"}', { status: 401 }) });
  client.api.auth.currentUser = { uid: '1', token: 'expired-token' };
  await assert.rejects(client.api.getDocs(client.api.collection(null, 'orders')), /Session expired/);
  assert.equal(client.api.auth.currentUser, null);
  const missing = setup({ fetch: async () => new Response('{"error":"Not found"}', { status: 404 }) });
  assert.equal((await missing.api.getDoc(missing.api.doc(null, 'orders', 'missing'))).exists(), false);
});

test('collection queries apply their filters and sorting instead of silently ignoring them', async () => {
  const client = setup({ fetch: async () => new Response('[{"id":"1","status":"new","createdAt":"2026-01-01"},{"id":"2","status":"new","createdAt":"2026-02-01"},{"id":"3","status":"delivered","createdAt":"2026-03-01"}]') });
  const reference = client.api.query(client.api.collection(null, 'orders'), client.api.where('status', '==', 'new'), client.api.orderBy('createdAt', 'desc'));
  const result = await client.api.getDocs(reference);
  assert.equal(result.docs.map(doc => doc.id).join(','), '2,1');
});

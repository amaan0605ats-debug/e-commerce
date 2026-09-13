const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Execute real route handlers with a recorded database adapter. No credentials,
// database connections, listening sockets, or customer emails are used.
function setup(query = async () => [[]], { resolveProductName = async (_pool, data) => data.productName || data.slug } = {}) {
  const routes = new Map();
  const middleware = [];
  const emails = [];
  const calls = [];
  const events = [];
  const database = {
    query: async (sql, args) => { calls.push({ sql, args }); return query(sql, args); },
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  };
  database.getConnection = async () => database;
  const app = { use: (...args) => middleware.push(args), set() {}, listen() { throw new Error('Tests must not start a server'); } };
  for (const method of ['get', 'post', 'put', 'delete']) app[method] = (route, ...handlers) => routes.set(`${method} ${route}`, handlers);
  const express = Object.assign(() => app, { json: () => () => {}, static: () => () => {} });
  const filename = path.resolve('backend/server.cjs');
  const localRequire = createRequire(filename);
  const sandbox = {
    require: name => {
      if (name === 'express') return express;
      if (name === 'cors' || name === 'helmet' || name === 'express-rate-limit') return () => () => {};
      if (name === 'dotenv') return { config: () => ({ parsed: {} }) };
      if (name === './lib/emailService.cjs') return {
        resolveProductName,
        enqueueOrderStatusEmail: payload => emails.push(payload),
        slugToDisplayName: value => value || 'your selected product',
        isEmailConfigured: () => false,
      };
      return localRequire(name);
    },
    module: { exports: {} }, __dirname: path.dirname(filename),
    process: { env: { NODE_ENV: 'test', JWT_SECRET: 'local-test-secret' } },
    console: { log() {}, warn() {}, error() {} }, Buffer, URL,
    testDatabase: database,
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\npool = testDatabase; databaseReady = true;', sandbox, { filename });
  async function invoke(method, route, body = {}, params = {}, admin = { id: 'admin-1', email: 'aftab@algani' }) {
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
    const handler = routes.get(`${method} ${route}`).at(-1);
    await handler({ body, params, admin }, response);
    return response;
  }
  return { invoke, calls, events, emails, middleware };
}

test('invalid inventory and status inputs are rejected before database mutation', async () => {
  const app = setup();
  for (const data of [{ inventoryCount: -1 }, { inventoryCount: '12abc' }, { inventoryCount: 1.5 }, { lowStockThreshold: null }, { visible: 'false' }, { stockStatus: 'unknown' }]) {
    assert.equal((await app.invoke('put', '/api/products/:slug', data, { slug: 'furniture' })).statusCode, 400);
  }
  assert.equal((await app.invoke('put', '/api/orders/:id', {}, { id: 'ord-1' })).statusCode, 400);
  assert.equal(app.calls.length, 0);
});

test('a public inquiry saves the request without changing stock or waiting for email delivery', async () => {
  const app = setup();
  const response = await app.invoke('post', '/api/inquiries', { name: 'Buyer', email: 'buyer@example.com', message: 'Please quote 8 units.', service: 'furniture' });
  assert.equal(response.statusCode, 201);
  assert.equal(app.calls.length, 1);
  assert.match(app.calls[0].sql, /^INSERT INTO inquiries/);
  assert.equal(app.emails[0].statusKey, 'pending');
});

test('a saved inquiry responds without waiting for a second catalog database lookup', async () => {
  const app = setup(undefined, { resolveProductName: () => new Promise(() => {}) });
  let response;
  const saved = app.invoke('post', '/api/inquiries', { name: 'Buyer', email: 'buyer@example.com', message: 'Please quote.', service: 'furniture', productName: 'Office furniture' })
    .then(result => { response = result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(response?.statusCode, 201, 'A completed insert must not wait for an unrelated lookup');
  assert.equal(app.emails[0].productName, 'Office furniture');
  await saved;
});

test('shipping an order does not mark its inquiry as delivered or email a delivery confirmation', async () => {
  const app = setup(async sql => sql.startsWith('SELECT * FROM orders') ? [[{ id: 'ord-1', status: 'approved', inquiryId: 'inq-1' }]] : [[]]);
  const response = await app.invoke('put', '/api/orders/:id', { status: 'shipped' }, { id: 'ord-1' });
  assert.equal(response.statusCode, 200);
  assert.equal(app.emails.length, 0);
  assert.equal(app.calls.some(call => call.sql.startsWith('UPDATE inquiries')), false);
});

test('delivering a shipped order sends the actual delivery confirmation', async () => {
  const app = setup(async sql => sql.startsWith('SELECT * FROM orders') ? [[{ id: 'ord-1', status: 'shipped', inquiryId: 'inq-1', customerEmail: 'buyer@example.com', service: 'furniture' }]] : [[]]);
  assert.equal((await app.invoke('put', '/api/orders/:id', { status: 'delivered' }, { id: 'ord-1' })).statusCode, 200);
  assert.equal(app.emails[0].statusKey, 'delivered');
  assert.equal(app.calls.some(call => call.sql.startsWith('UPDATE inquiries')), true);
});

test('offering creation preserves zero stock and a zero threshold', async () => {
  const app = setup();
  const response = await app.invoke('post', '/api/custom-services', { name: 'New Offering', category: 'Supplies', shortDesc: 'Description', longDesc: 'Description', inventoryCount: 0, lowStockThreshold: 0 });
  assert.equal(response.statusCode, 201);
  const inserted = app.calls.find(call => call.sql.startsWith('INSERT INTO products'));
  assert.equal(inserted.args[1], 'out-of-stock');
  assert.equal(inserted.args[2], 0);
  assert.equal(inserted.args[3], 0);
  assert.deepEqual(app.events, ['begin', 'commit', 'release']);
});

test('delivery status rolls back and sends no email if the linked inquiry update fails', async () => {
  const app = setup(async sql => {
    if (sql.startsWith('SELECT * FROM orders')) return [[{ id: 'ord-1', status: 'shipped', inquiryId: 'inq-1' }]];
    if (sql.startsWith('UPDATE inquiries')) throw new Error('Database write failed');
    return [[]];
  });
  assert.equal((await app.invoke('put', '/api/orders/:id', { status: 'delivered' }, { id: 'ord-1' })).statusCode, 500);
  assert.deepEqual(app.events, ['begin', 'rollback', 'release']);
  assert.equal(app.emails.length, 0);
});

test('offering creation rolls back if its inventory profile cannot be saved', async () => {
  const app = setup(async sql => {
    if (sql.startsWith('INSERT INTO products')) throw Object.assign(new Error('Duplicate slug'), { code: 'ER_DUP_ENTRY' });
    return [[]];
  });
  assert.equal((await app.invoke('post', '/api/custom-services', { name: 'Offering', category: 'Supplies', shortDesc: 'Description', longDesc: 'Description' })).statusCode, 409);
  assert.deepEqual(app.events, ['begin', 'rollback', 'release']);
});

test('an inquiry cannot create a second delivery and the lock is released', async () => {
  const app = setup(async sql => sql.includes('FROM inquiries') ? [[{ id: 'inq-1', convertedToOrder: 1 }]] : [[]]);
  const response = await app.invoke('post', '/api/orders', { clientName: 'Buyer', service: 'furniture', region: 'Srinagar', inquiryId: 'inq-1' });
  assert.equal(response.statusCode, 409);
  assert.match(app.calls[0].sql, /FOR UPDATE/);
  assert.equal(app.calls.some(call => call.sql.startsWith('INSERT')), false);
  assert.deepEqual(app.events, ['begin', 'rollback', 'release']);
});

test('delivery creation atomically marks its inquiry converted without inventing quantities', async () => {
  const app = setup(async sql => sql.includes('FROM inquiries') ? [[{ id: 'inq-1', convertedToOrder: 0, email: 'buyer@example.com' }]] : [[]]);
  const response = await app.invoke('post', '/api/orders', { clientName: 'Buyer', service: 'furniture', region: 'Srinagar', inquiryId: 'inq-1' });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.customerEmail, 'buyer@example.com');
  assert.equal(app.calls.some(call => call.sql.includes('UPDATE inquiries SET convertedToOrder')), true);
  assert.equal(app.calls.some(call => call.sql.includes('UPDATE products')), false);
  assert.deepEqual(app.events, ['begin', 'commit', 'release']);
});

test('password changes cannot target another administrator or truncate long UTF-8 passwords', async () => {
  const app = setup();
  assert.equal((await app.invoke('put', '/api/auth/change-password', { email: 'other@example.com', currentPassword: 'old-password', newPassword: 'new-password' })).statusCode, 403);
  assert.equal((await app.invoke('put', '/api/auth/change-password', { email: 'aftab@algani', currentPassword: 'old-password', newPassword: '🔒'.repeat(20) })).statusCode, 400);
  assert.equal(app.calls.length, 0);
});

test('missing request bodies and malformed JSON return useful 400 responses', () => {
  const app = setup();
  const guard = app.middleware.find(args => args[0] === '/api')[1];
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
  guard({ method: 'POST', body: undefined }, response, () => assert.fail('Invalid body passed validation'));
  assert.equal(response.statusCode, 400);
  const errors = app.middleware.at(-1)[0];
  errors({ type: 'entity.parse.failed' }, {}, response, () => {});
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /JSON/);
});

test('bodyless dashboard actions reach their handlers while data updates still require JSON', () => {
  const app = setup();
  const guard = app.middleware.find(args => args[0] === '/api')[1];
  for (const path of ['/alerts/alt-123/read', '/partners/pt-123/approve']) {
    let called = false;
    guard({ method: 'PUT', path, body: undefined }, { status: () => assert.fail('Bodyless action rejected') }, () => { called = true; });
    assert.equal(called, true);
  }
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() {} };
  guard({ method: 'PUT', path: '/products/furniture', body: undefined }, response, () => assert.fail('Missing product data accepted'));
  assert.equal(response.statusCode, 400);
});

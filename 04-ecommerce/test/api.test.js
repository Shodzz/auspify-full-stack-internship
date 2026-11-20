import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

let server, base, db;

before(async () => {
  db = openDb(':memory:');
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin@test.local', ?, 'admin')").run(bcrypt.hashSync('adminpass1', 4));
  const add = db.prepare('INSERT INTO products (slug, name, category, price_cents, stock) VALUES (?, ?, ?, ?, ?)');
  add.run('mug', 'Mug', 'Kitchen', 1400, 5);
  add.run('lamp', 'Lamp', 'Home', 4000, 1);
  add.run('pen', 'Pen', 'Desk', 2100, 0);
  server = createApp(db, { jwtSecret: crypto.randomBytes(32).toString('hex'), authLimit: 1000 }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
}

const ship = { name: 'Test Buyer', phone: '555 0100', address: '1 Example Street', city: 'Testville', postcode: 'ab1 2cd' };
const id = (slug) => db.prepare('SELECT id FROM products WHERE slug = ?').get(slug).id;
const stock = (slug) => db.prepare('SELECT stock FROM products WHERE slug = ?').get(slug).stock;

test('catalog: list, filter, search, sort, detail', async () => {
  const c = client();
  const all = await c('GET', '/products');
  assert.equal(all.body.total, 3);
  assert.equal((await c('GET', '/products?category=Kitchen')).body.items[0].slug, 'mug');
  assert.equal((await c('GET', '/products?q=lam')).body.total, 1);
  const cheap = await c('GET', '/products?sort=price-asc');
  assert.deepEqual(cheap.body.items.map((p) => p.slug), ['mug', 'pen', 'lamp']);
  assert.equal((await c('GET', '/products/mug')).body.product.name, 'Mug');
  assert.equal((await c('GET', '/products/nope')).status, 404);
});

test('guests see me = null', async () => {
  const res = await client()('GET', '/auth/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.user, null);
});

test('cart quote uses server prices and reports stock problems', async () => {
  const c = client();
  const q = await c('POST', '/cart/quote', { items: [{ productId: id('mug'), qty: 2, price_cents: 1 }, { productId: id('pen'), qty: 1 }] });
  assert.equal(q.body.subtotal, 2 * 1400 + 2100);
  assert.equal(q.body.shipping, 499, 'under the free shipping threshold');
  assert.equal(q.body.problems.length, 1);
  assert.match(q.body.problems[0].message, /out of stock/);
});

test('checkout needs login, valid address and stock', async () => {
  const c = client();
  const items = [{ productId: id('mug'), qty: 2 }];
  assert.equal((await c('POST', '/orders', { items, shipping: ship })).status, 401);

  await c('POST', '/auth/register', { name: 'Buyer', email: 'buyer@test.local', password: 'buyerpass1' });
  const badAddr = await c('POST', '/orders', { items, shipping: { ...ship, postcode: '!' } });
  assert.equal(badAddr.status, 400);
  assert.ok(badAddr.body.fields.postcode);

  const tooMany = await c('POST', '/orders', { items: [{ productId: id('lamp'), qty: 2 }], shipping: ship });
  assert.equal(tooMany.status, 409);
  assert.equal(stock('lamp'), 1, 'failed order must not touch stock');

  const before = stock('mug');
  const ok = await c('POST', '/orders', { items, shipping: ship });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.order.total_cents, 2800 + 499);
  assert.equal(ok.body.order.ship_postcode, 'AB1 2CD');
  assert.equal(ok.body.order.items[0].qty, 2);
  assert.equal(stock('mug'), before - 2);

  const mine = await c('GET', '/orders');
  assert.equal(mine.body.orders.length, 1);
  assert.equal(mine.body.orders[0].item_count, 2);

  // customer can cancel while still "placed", and stock comes back
  const cancelled = await c('POST', `/orders/${ok.body.order.id}/cancel`, {});
  assert.equal(cancelled.body.order.status, 'cancelled');
  assert.equal(stock('mug'), before);
  assert.equal((await c('POST', `/orders/${ok.body.order.id}/cancel`, {})).status, 409);
});

test('free shipping over the threshold', async () => {
  const c = client();
  await c('POST', '/auth/register', { name: 'Big Spender', email: 'big@test.local', password: 'bigspend1' });
  const res = await c('POST', '/orders', { items: [{ productId: id('lamp'), qty: 1 }, { productId: id('mug'), qty: 1 }], shipping: ship });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.shipping_cents, 0);
  assert.equal(stock('lamp'), 0);
});

test("customers can't read other people's orders or use admin routes", async () => {
  const a = client();
  const b = client();
  await a('POST', '/auth/register', { name: 'Ann', email: 'ann@test.local', password: 'annpass11' });
  await b('POST', '/auth/register', { name: 'Ben', email: 'ben@test.local', password: 'benpass11' });
  const order = await a('POST', '/orders', { items: [{ productId: id('mug'), qty: 1 }], shipping: ship });
  assert.equal((await b('GET', `/orders/${order.body.order.id}`)).status, 404);
  assert.equal((await b('POST', `/orders/${order.body.order.id}/cancel`, {})).status, 404);
  assert.equal((await b('GET', '/admin/orders')).status, 403);
  assert.equal((await b('POST', '/admin/products', { name: 'Hack' })).status, 403);
  assert.equal((await client()('GET', '/admin/stats')).status, 401);
});

test('admin: products and order status flow', async () => {
  const admin = client();
  assert.equal((await admin('POST', '/auth/login', { email: 'admin@test.local', password: 'adminpass1' })).status, 200);

  const bad = await admin('POST', '/admin/products', { name: 'X', category: 'Cars', price: '0', stock: -1 });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields.name && bad.body.fields.category && bad.body.fields.price && bad.body.fields.stock);

  const created = await admin('POST', '/admin/products', { name: 'Brass Lamp', category: 'Home', price: '45.50', stock: 3, description: 'Test' });
  assert.equal(created.status, 201);
  assert.equal(created.body.product.slug, 'brass-lamp');
  assert.equal(created.body.product.price_cents, 4550);

  const dupSlug = await admin('POST', '/admin/products', { name: 'Brass Lamp', category: 'Home', price: '1', stock: 1 });
  assert.equal(dupSlug.status, 409);

  const pid = created.body.product.id;
  const edited = await admin('PUT', `/admin/products/${pid}`, { name: 'Brass Lamp', category: 'Home', price: '39', stock: 3, featured: true });
  assert.equal(edited.body.product.price_cents, 3900);
  assert.equal(edited.body.product.featured, 1);

  assert.equal((await admin('DELETE', `/admin/products/${pid}`)).status, 204);
  assert.equal((await admin('GET', '/products/brass-lamp')).status, 404, 'hidden products leave the shop');

  const list = await admin('GET', '/admin/orders');
  const target = list.body.orders.find((o) => o.status === 'placed');
  assert.ok(target);
  assert.equal((await admin('PATCH', `/admin/orders/${target.id}`, { status: 'delivered' })).status, 409, 'cannot skip steps');
  assert.equal((await admin('PATCH', `/admin/orders/${target.id}`, { status: 'processing' })).body.order.status, 'processing');
  assert.equal((await admin('PATCH', `/admin/orders/${target.id}`, { status: 'shipped' })).body.order.status, 'shipped');
  assert.equal((await admin('PATCH', `/admin/orders/${target.id}`, { status: 'cancelled' })).status, 409, 'shipped orders cannot be cancelled');

  const stats = await admin('GET', '/admin/stats');
  assert.ok(stats.body.revenue > 0);
  assert.equal(typeof stats.body.lowStock, 'number');
});

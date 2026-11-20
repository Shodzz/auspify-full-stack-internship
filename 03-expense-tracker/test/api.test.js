import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { toCents } from '../server/rules.js';

let server, base;

before(async () => {
  const app = createApp(openDb(':memory:'), { jwtSecret: crypto.randomBytes(32).toString('hex'), authLimit: 1000 });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

// tiny client that remembers the session cookie, like a browser would
function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }), ...headers },
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* csv or empty */ }
    return { status: res.status, body: json, text, headers: res.headers };
  };
}

const user = (n) => ({ name: `User ${n}`, email: `user${n}@example.com`, password: 'secret123', currency: 'EUR' });

test('toCents parses amounts carefully', () => {
  assert.equal(toCents('12.5'), 1250);
  assert.equal(toCents('0.01'), 1);
  assert.equal(toCents(19.99), 1999);
  assert.equal(toCents('0'), null);
  assert.equal(toCents('-5'), null);
  assert.equal(toCents('1.234'), null);
  assert.equal(toCents('1e3'), null);
  assert.equal(toCents(''), null);
});

test('register, me, logout, login', async () => {
  const c = client();
  const reg = await c('POST', '/auth/register', user(1));
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.email, 'user1@example.com');
  assert.equal(reg.body.user.password_hash, undefined, 'hash must never be sent');
  assert.match(reg.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(reg.headers.get('set-cookie'), /SameSite=Strict/i);

  assert.equal((await c('GET', '/auth/me')).body.user.name, 'User 1');
  assert.equal((await c('POST', '/auth/logout', {})).status, 204);
  assert.equal((await c('GET', '/auth/me')).status, 401);

  assert.equal((await c('POST', '/auth/login', { email: 'USER1@example.com', password: 'wrongpass1' })).status, 401);
  const ok = await c('POST', '/auth/login', { email: 'USER1@example.com', password: 'secret123' });
  assert.equal(ok.status, 200);
  assert.equal((await c('GET', '/auth/me')).status, 200);
});

test('registration rules', async () => {
  const c = client();
  const weak = await c('POST', '/auth/register', { ...user(2), password: 'password' });
  assert.equal(weak.status, 400);
  assert.ok(weak.body.fields.password);

  await c('POST', '/auth/register', user(3));
  const dup = await c('POST', '/auth/register', user(3));
  assert.equal(dup.status, 409);
});

test('protected routes need a session', async () => {
  const c = client();
  assert.equal((await c('GET', '/transactions')).status, 401);
  assert.equal((await c('POST', '/transactions', { type: 'expense' })).status, 401);
  assert.equal((await c('GET', '/reports/summary?month=2025-01')).status, 401);
  const forged = await c('GET', '/transactions', undefined, { Cookie: 'et_session=not.a.jwt' });
  assert.equal(forged.status, 401);
});

test('writes must be JSON', async () => {
  const c = client();
  await c('POST', '/auth/register', user(4));
  const res = await c('POST', '/transactions', 'type=expense&amount=5', { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.equal(res.status, 415);
});

test('transaction CRUD, totals and reports', async () => {
  const c = client();
  await c('POST', '/auth/register', user(5));

  const bad = await c('POST', '/transactions', { type: 'expense', amount: '-1', category: 'Salary', date: '2025-13-01' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields.amount && bad.body.fields.category && bad.body.fields.date);

  const salary = await c('POST', '/transactions', { type: 'income', amount: '3000', category: 'Salary', date: '2025-03-01', note: 'March pay' });
  assert.equal(salary.status, 201);
  assert.equal(salary.body.amount_cents, 300000);

  const rent = await c('POST', '/transactions', { type: 'expense', amount: '1200.50', category: 'Rent', date: '2025-03-02' });
  await c('POST', '/transactions', { type: 'expense', amount: '45.25', category: 'Food', date: '2025-03-10', note: 'groceries' });
  await c('POST', '/transactions', { type: 'expense', amount: '30', category: 'Food', date: '2025-02-27' });

  const march = await c('GET', '/transactions?month=2025-03');
  assert.equal(march.body.items.length, 3);
  assert.deepEqual(march.body.totals, { income: 300000, expense: 124575 });

  const food = await c('GET', '/transactions?month=all&category=Food');
  assert.equal(food.body.items.length, 2);

  const search = await c('GET', '/transactions?q=grocer');
  assert.equal(search.body.items.length, 1);

  const upd = await c('PUT', `/transactions/${rent.body.id}`, { type: 'expense', amount: '1100', category: 'Rent', date: '2025-03-02' });
  assert.equal(upd.body.amount_cents, 110000);

  const rep = await c('GET', '/reports/summary?month=2025-03');
  assert.equal(rep.status, 200);
  assert.equal(rep.body.totals.expense, 114525);
  assert.equal(rep.body.byCategory[0].category, 'Rent');
  assert.equal(rep.body.trend.length, 6);
  assert.equal(rep.body.trend.at(-1).month, '2025-03');
  assert.equal(rep.body.trend.at(-2).expense, 3000);
  assert.equal(rep.body.largest.amount_cents, 110000);
  assert.equal(rep.body.allTimeBalance, 300000 - 110000 - 4525 - 3000);

  assert.equal((await c('GET', '/reports/summary?month=March')).status, 400);

  assert.equal((await c('DELETE', `/transactions/${rent.body.id}`)).status, 204);
  assert.equal((await c('DELETE', `/transactions/${rent.body.id}`)).status, 404);
});

test("users can't see or touch each other's data", async () => {
  const alice = client();
  const bob = client();
  await alice('POST', '/auth/register', user(6));
  await bob('POST', '/auth/register', user(7));

  const tx = await alice('POST', '/transactions', { type: 'expense', amount: '10', category: 'Food', date: '2025-05-05' });
  assert.equal((await bob('GET', '/transactions?month=all')).body.items.length, 0);
  assert.equal((await bob('PUT', `/transactions/${tx.body.id}`, { type: 'expense', amount: '99', category: 'Food', date: '2025-05-05' })).status, 404);
  assert.equal((await bob('DELETE', `/transactions/${tx.body.id}`)).status, 404);
  assert.equal((await alice('GET', '/transactions?month=all')).body.items[0].amount_cents, 1000);
});

test('CSV export escapes formulas and quotes', async () => {
  const c = client();
  await c('POST', '/auth/register', user(8));
  await c('POST', '/transactions', { type: 'expense', amount: '5', category: 'Other', date: '2025-06-01', note: '=HYPERLINK("x")' });
  const res = await c('GET', '/transactions/export.csv?month=2025-06');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.text, /"'=HYPERLINK\(""x""\)"/);
});

test('profile update changes currency', async () => {
  const c = client();
  await c('POST', '/auth/register', user(9));
  const res = await c('PATCH', '/auth/me', { currency: 'INR' });
  assert.equal(res.body.user.currency, 'INR');
  assert.equal((await c('PATCH', '/auth/me', { currency: 'XXX' })).status, 400);
});

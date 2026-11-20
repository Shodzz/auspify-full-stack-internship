import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

let server, base, db;

before(async () => {
  db = openDb(':memory:');
  server = createApp(db, { contactLimit: 50 }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const post = (body) =>
  fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('serves the home page', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /id="contactForm"/);
});

test('stores a valid message', async () => {
  const res = await post({ name: 'Test Person', email: 'Test@Example.com', message: 'Hello, this is a test message.' });
  assert.equal(res.status, 201);
  const row = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 1').get();
  assert.equal(row.email, 'test@example.com');
});

test('rejects bad input with per-field errors', async () => {
  const res = await post({ name: 'A', email: 'nope', message: 'short' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.fields.name && body.fields.email && body.fields.message);
});

test('honeypot submissions are accepted but not stored', async () => {
  const before = db.prepare('SELECT COUNT(*) n FROM messages').get().n;
  const res = await post({ name: 'Bot', email: 'bot@example.com', message: 'Buy cheap things now!!', website: 'spam.example' });
  assert.equal(res.status, 201);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM messages').get().n, before);
});

test('malformed JSON gets a 400, not a crash', async () => {
  const res = await post('{"name": ');
  assert.equal(res.status, 400);
});

test('rate limit kicks in', async () => {
  const s = createApp(openDb(':memory:'), { contactLimit: 2 }).listen(0);
  await new Promise((r) => s.once('listening', r));
  const url = `http://localhost:${s.address().port}/api/contact`;
  const send = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await send();
  await send();
  assert.equal((await send()).status, 429);
  s.close();
});

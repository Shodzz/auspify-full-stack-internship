import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

let server, base;

before(async () => {
  server = createApp(openDb(':memory:')).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

const sample = (over = {}) => ({
  roll_no: 'cs24-001',
  first_name: 'Test',
  last_name: 'Student',
  email: 'test.student@example.edu',
  phone: '555-0100',
  course: 'Computer Science',
  year: 2,
  enrolled_on: '2024-08-01',
  status: 'active',
  ...over,
});

test('full CRUD cycle', async () => {
  const created = await call('POST', '/students', sample());
  assert.equal(created.status, 201);
  assert.equal(created.body.roll_no, 'CS24-001', 'roll number is upper-cased');
  const id = created.body.id;

  const fetched = await call('GET', `/students/${id}`);
  assert.equal(fetched.body.email, 'test.student@example.edu');

  const updated = await call('PUT', `/students/${id}`, sample({ year: 3, status: 'on leave' }));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.year, 3);
  assert.equal(updated.body.status, 'on leave');

  const del = await call('DELETE', `/students/${id}`);
  assert.equal(del.status, 204);
  assert.equal((await call('GET', `/students/${id}`)).status, 404);
  assert.equal((await call('DELETE', `/students/${id}`)).status, 404);
});

test('validation errors come back per field', async () => {
  const res = await call('POST', '/students', { roll_no: '!', email: 'x', course: 'Astrology', year: 9, enrolled_on: '2024-02-30' });
  assert.equal(res.status, 400);
  for (const f of ['roll_no', 'first_name', 'last_name', 'email', 'course', 'year', 'enrolled_on']) {
    assert.ok(res.body.fields[f], `expected an error for ${f}`);
  }
});

test('future enrollment date is rejected', async () => {
  const res = await call('POST', '/students', sample({ roll_no: 'FUT-1', email: 'f@example.edu', enrolled_on: '2999-01-01' }));
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.enrolled_on);
});

test('duplicate roll number or email gives 409', async () => {
  await call('POST', '/students', sample({ roll_no: 'DUP-1', email: 'dup@example.edu' }));
  const res = await call('POST', '/students', sample({ roll_no: 'dup-1', email: 'DUP@example.edu' }));
  assert.equal(res.status, 409);
  assert.ok(res.body.fields.roll_no && res.body.fields.email);
});

test('editing a student keeps its own roll number without a clash', async () => {
  const { body } = await call('POST', '/students', sample({ roll_no: 'SELF-1', email: 'self@example.edu' }));
  const res = await call('PUT', `/students/${body.id}`, sample({ roll_no: 'SELF-1', email: 'self@example.edu', first_name: 'Renamed' }));
  assert.equal(res.status, 200);
});

test('list supports search, filter, sort and paging', async () => {
  for (let i = 0; i < 12; i++) {
    await call('POST', '/students', sample({ roll_no: `PG-${100 + i}`, email: `pg${i}@example.edu`, last_name: `Zed${String.fromCharCode(65 + i)}`, course: i % 2 ? 'Mathematics' : 'Computer Science' }));
  }
  const page2 = await call('GET', '/students?q=pg-&limit=5&page=2&sort=roll_no');
  assert.equal(page2.body.total, 12);
  assert.equal(page2.body.items.length, 5);
  assert.equal(page2.body.items[0].roll_no, 'PG-105');

  const maths = await call('GET', '/students?q=pg-&course=Mathematics&sort=name&dir=desc');
  assert.equal(maths.body.total, 6);
  assert.ok(maths.body.items.every((s) => s.course === 'Mathematics'));
  assert.equal(maths.body.items[0].last_name, 'ZedL');

  // unknown sort keys fall back instead of reaching SQL
  const weird = await call('GET', '/students?sort=1;DROP TABLE students');
  assert.equal(weird.status, 200);

  // % in a search is treated literally
  const pct = await call('GET', '/students?q=%25');
  assert.equal(pct.body.total, 0);
});

test('meta returns counts by status', async () => {
  const { body } = await call('GET', '/meta');
  assert.ok(body.courses.length > 0);
  assert.equal(typeof body.counts.active, 'number');
  assert.equal(body.total, Object.values(body.counts).reduce((a, b) => a + b, 0));
});

test('bad ids are 404s', async () => {
  assert.equal((await call('GET', '/students/abc')).status, 404);
  assert.equal((await call('PUT', '/students/0', sample())).status, 404);
});

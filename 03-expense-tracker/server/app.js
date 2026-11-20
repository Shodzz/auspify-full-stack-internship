import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAuth } from './auth.js';
import { CATEGORIES, CURRENCIES, MONTH_RE, checkLogin, checkProfile, checkRegister, checkTransaction } from './rules.js';

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
const fail = (status, message, fields) => { throw new HttpError(status, message, fields); };

// 'YYYY-MM' -> ['YYYY-MM-01', first day of the following month]
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return [`${month}-01`, `${next}-01`];
}
function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

// Quote for CSV and stop spreadsheet apps from treating a cell as a formula.
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Dummy hash so a login for an unknown email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // same cost as real hashes so timing matches

export function createApp(db, { jwtSecret, secureCookies = false, authLimit = 20 }) {
  const app = express();
  const auth = makeAuth({ secret: jwtSecret, secureCookies });

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: '20kb' }));

  // Writes must be JSON. A plain HTML form on another site can't send that
  // without a CORS preflight, which adds a second layer on top of SameSite cookies.
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      return res.status(415).json({ error: 'Send the request body as JSON.' });
    }
    next();
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Wait a few minutes and try again.' },
  });

  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT id, name, email, currency, created_at FROM users WHERE id = ?'),
    insertUser: db.prepare('INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)'),
    txById: db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?'),
    insertTx: db.prepare(`INSERT INTO transactions (user_id, type, amount_cents, category, note, date)
                          VALUES (:user_id, :type, :amount_cents, :category, :note, :date)`),
    updateTx: db.prepare(`UPDATE transactions SET type = :type, amount_cents = :amount_cents, category = :category,
                          note = :note, date = :date, updated_at = datetime('now') WHERE id = :id AND user_id = :user_id`),
    deleteTx: db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?'),
  };

  /* ---------- auth ---------- */

  app.get('/api/config', (req, res) => res.json({ categories: CATEGORIES, currencies: CURRENCIES }));

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { data, errors } = checkRegister(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    if (q.userByEmail.get(data.email)) fail(409, 'An account with this email already exists.', { email: 'Already registered. Try logging in.' });

    const hash = await bcrypt.hash(data.password, 12);
    const { lastInsertRowid } = q.insertUser.run(data.name, data.email, hash, data.currency);
    auth.signIn(res, lastInsertRowid);
    res.status(201).json({ user: q.userById.get(lastInsertRowid) });
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const { data, errors } = checkLogin(req.body);
    if (errors) fail(400, 'Enter your email and password.', errors);
    const user = q.userByEmail.get(data.email);
    const ok = await bcrypt.compare(data.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) fail(401, 'Email or password is incorrect.');
    auth.signIn(res, user.id);
    res.json({ user: q.userById.get(user.id) });
  });

  app.post('/api/auth/logout', (req, res) => {
    auth.signOut(res);
    res.status(204).end();
  });

  app.get('/api/auth/me', auth.required, (req, res) => {
    const user = q.userById.get(req.userId);
    if (!user) {
      auth.signOut(res);
      fail(401, 'Account not found.');
    }
    res.json({ user });
  });

  app.patch('/api/auth/me', auth.required, (req, res) => {
    const { data, errors } = checkProfile(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    const sets = Object.keys(data);
    if (sets.length) {
      db.prepare(`UPDATE users SET ${sets.map((k) => `${k} = :${k}`).join(', ')} WHERE id = :id`).run({ ...data, id: req.userId });
    }
    res.json({ user: q.userById.get(req.userId) });
  });

  /* ---------- transactions ---------- */

  const tx = express.Router();
  tx.use(auth.required);

  function filters(query, userId) {
    const where = ['user_id = ?'];
    const params = [userId];
    const month = String(query.month ?? '');
    if (month && month !== 'all') {
      if (!MONTH_RE.test(month)) fail(400, 'month must look like 2025-01.');
      const [from, to] = monthRange(month);
      where.push('date >= ? AND date < ?');
      params.push(from, to);
    }
    if (query.type === 'income' || query.type === 'expense') {
      where.push('type = ?');
      params.push(query.type);
    }
    if (query.category) {
      where.push('category = ?');
      params.push(String(query.category));
    }
    const search = String(query.q ?? '').trim().slice(0, 60);
    if (search) {
      where.push("note LIKE ? ESCAPE '\\'");
      params.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
    }
    return { sql: where.join(' AND '), params };
  }

  tx.get('/', (req, res) => {
    const { sql, params } = filters(req.query, req.userId);
    const items = db.prepare(`SELECT * FROM transactions WHERE ${sql} ORDER BY date DESC, id DESC LIMIT 1000`).all(...params);
    const totals = { income: 0, expense: 0 };
    for (const r of db.prepare(`SELECT type, SUM(amount_cents) t FROM transactions WHERE ${sql} GROUP BY type`).all(...params)) {
      totals[r.type] = r.t;
    }
    res.json({ items, totals });
  });

  tx.get('/export.csv', (req, res) => {
    const { sql, params } = filters(req.query, req.userId);
    const rows = db.prepare(`SELECT date, type, category, amount_cents, note FROM transactions WHERE ${sql} ORDER BY date, id`).all(...params);
    const lines = [['Date', 'Type', 'Category', 'Amount', 'Note'].join(',')];
    for (const r of rows) {
      lines.push([r.date, r.type, r.category, (r.amount_cents / 100).toFixed(2), r.note].map(csvCell).join(','));
    }
    const name = `transactions-${/^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : 'all'}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${name}"`);
    res.send(lines.join('\r\n') + '\r\n');
  });

  const idParam = (raw) => {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) fail(404, 'Transaction not found.');
    return id;
  };

  tx.post('/', (req, res) => {
    const { data, errors } = checkTransaction(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    const { lastInsertRowid } = q.insertTx.run({ ...data, user_id: req.userId });
    res.status(201).json(q.txById.get(lastInsertRowid, req.userId));
  });

  tx.put('/:id', (req, res) => {
    const id = idParam(req.params.id);
    const { data, errors } = checkTransaction(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    const { changes } = q.updateTx.run({ ...data, id, user_id: req.userId });
    if (!changes) fail(404, 'Transaction not found.');
    res.json(q.txById.get(id, req.userId));
  });

  tx.delete('/:id', (req, res) => {
    const { changes } = q.deleteTx.run(idParam(req.params.id), req.userId);
    if (!changes) fail(404, 'Transaction not found.');
    res.status(204).end();
  });

  app.use('/api/transactions', tx);

  /* ---------- reports ---------- */

  app.get('/api/reports/summary', auth.required, (req, res) => {
    const month = String(req.query.month ?? '');
    if (!MONTH_RE.test(month)) fail(400, 'month must look like 2025-01.');
    const [from, to] = monthRange(month);
    const uid = req.userId;

    const totals = { income: 0, expense: 0 };
    for (const r of db.prepare('SELECT type, SUM(amount_cents) t, COUNT(*) n FROM transactions WHERE user_id = ? AND date >= ? AND date < ? GROUP BY type').all(uid, from, to)) {
      totals[r.type] = r.t;
    }

    const byCategory = db
      .prepare(`SELECT category, SUM(amount_cents) total, COUNT(*) count FROM transactions
                WHERE user_id = ? AND type = 'expense' AND date >= ? AND date < ?
                GROUP BY category ORDER BY total DESC`)
      .all(uid, from, to);

    const incomeByCategory = db
      .prepare(`SELECT category, SUM(amount_cents) total FROM transactions
                WHERE user_id = ? AND type = 'income' AND date >= ? AND date < ?
                GROUP BY category ORDER BY total DESC`)
      .all(uid, from, to);

    // last 6 months including the selected one, months with no data filled with zeros
    const start = shiftMonth(month, -5);
    const trendRows = db
      .prepare(`SELECT substr(date, 1, 7) m, type, SUM(amount_cents) t FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ? GROUP BY m, type`)
      .all(uid, `${start}-01`, to);
    const trend = Array.from({ length: 6 }, (_, i) => ({ month: shiftMonth(start, i), income: 0, expense: 0 }));
    for (const r of trendRows) {
      const slot = trend.find((t) => t.month === r.m);
      if (slot) slot[r.type] = r.t;
    }

    const largest = db
      .prepare(`SELECT id, amount_cents, category, note, date FROM transactions
                WHERE user_id = ? AND type = 'expense' AND date >= ? AND date < ?
                ORDER BY amount_cents DESC LIMIT 1`)
      .get(uid, from, to) ?? null;

    const allTime = db
      .prepare(`SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE -amount_cents END), 0) balance
                FROM transactions WHERE user_id = ?`)
      .get(uid).balance;

    res.json({ month, totals, byCategory, incomeByCategory, trend, largest, allTimeBalance: allTime });
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  /* ---------- front end ---------- */

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    app.get('/', (req, res) =>
      res.type('text').send('Front end not built yet. Run "npm run build" and restart, or use "npm run dev".')
    );
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message;
    if (err.type === 'entity.parse.failed') message = 'Invalid JSON body.';
    if (status >= 500) {
      console.error(err);
      message = 'Unexpected server error.';
    }
    res.status(status).json({ error: message, ...(err.fields && { fields: err.fields }) });
  });

  return app;
}

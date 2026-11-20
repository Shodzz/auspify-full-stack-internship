import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAuth } from './auth.js';
import { makeOrders } from './orders.js';
import { errorHandler, fail, parseId } from './errors.js';
import {
  CATEGORIES, FREE_SHIPPING_FROM, MAX_QTY, NEXT_STATUS, ORDER_STATUSES, SHIPPING_FEE,
  checkCartItems, checkLogin, checkProduct, checkRegister, checkShipping,
} from './rules.js';

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12); // same cost as real hashes so timing matches

const PRODUCT_SORTS = {
  featured: 'featured DESC, id',
  newest: 'created_at DESC, id DESC',
  'price-asc': 'price_cents, id',
  'price-desc': 'price_cents DESC, id',
  name: 'name COLLATE NOCASE',
};

export function createApp(db, { jwtSecret, secureCookies = false, authLimit = 20 }) {
  const app = express();
  const auth = makeAuth(db, { secret: jwtSecret, secureCookies });
  const orders = makeOrders(db);

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: '50kb' }));

  // JSON-only writes (see expense tracker README for the reasoning)
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

  /* ---------------- auth ---------------- */

  const userByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const publicUser = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?');

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { data, errors } = checkRegister(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    if (userByEmail.get(data.email)) fail(409, 'An account with this email already exists.', { email: 'Already registered. Try logging in.' });
    const hash = await bcrypt.hash(data.password, 12);
    const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(data.name, data.email, hash);
    auth.signIn(res, lastInsertRowid);
    res.status(201).json({ user: publicUser.get(lastInsertRowid) });
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const { data, errors } = checkLogin(req.body);
    if (errors) fail(400, 'Enter your email and password.', errors);
    const user = userByEmail.get(data.email);
    const ok = await bcrypt.compare(data.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) fail(401, 'Email or password is incorrect.');
    auth.signIn(res, user.id);
    res.json({ user: publicUser.get(user.id) });
  });

  app.post('/api/auth/logout', (req, res) => {
    auth.signOut(res);
    res.status(204).end();
  });

  // 200 with user:null when logged out, so the shop can render for guests without a console error
  app.get('/api/auth/me', auth.optional, (req, res) => res.json({ user: req.user }));

  /* ---------------- catalog ---------------- */

  app.get('/api/meta', (req, res) =>
    res.json({ categories: CATEGORIES, statuses: ORDER_STATUSES, freeShippingFrom: FREE_SHIPPING_FROM, shippingFee: SHIPPING_FEE, maxQty: MAX_QTY })
  );

  app.get('/api/products', (req, res) => {
    const where = ['active = 1'];
    const params = [];
    const q = String(req.query.q ?? '').trim().slice(0, 60);
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
      params.push(like, like);
    }
    if (CATEGORIES.includes(req.query.category)) {
      where.push('category = ?');
      params.push(req.query.category);
    }
    const order = PRODUCT_SORTS[req.query.sort] ?? PRODUCT_SORTS.featured;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 48);
    const total = db.prepare(`SELECT COUNT(*) n FROM products WHERE ${where.join(' AND ')}`).get(...params).n;
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
    const items = db
      .prepare(`SELECT id, slug, name, description, category, price_cents, stock, hue, featured FROM products
                WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);
    res.json({ items, total, page, pages });
  });

  app.get('/api/products/:slug', (req, res) => {
    const p = db
      .prepare('SELECT id, slug, name, description, category, price_cents, stock, hue, featured FROM products WHERE slug = ? AND active = 1')
      .get(String(req.params.slug));
    if (!p) fail(404, 'Product not found.');
    const related = db
      .prepare('SELECT id, slug, name, category, price_cents, stock, hue FROM products WHERE category = ? AND id != ? AND active = 1 ORDER BY featured DESC, id LIMIT 4')
      .all(p.category, p.id);
    res.json({ product: p, related });
  });

  /* ---------------- cart + orders ---------------- */

  app.post('/api/cart/quote', (req, res) => {
    const cart = checkCartItems(req.body?.items);
    if (cart.error) return res.json({ lines: [], problems: [], subtotal: 0, shipping: 0, total: 0 });
    const q = orders.quote(cart.items);
    res.json({
      lines: q.lines.map((l) => ({ ...l.product, qty: l.qty, line_cents: l.line_cents })),
      problems: q.problems,
      subtotal: q.subtotal,
      shipping: q.shipping,
      total: q.total,
    });
  });

  app.post('/api/orders', auth.required, (req, res) => {
    const cart = checkCartItems(req.body?.items);
    if (cart.error) fail(400, cart.error);
    const { data: ship, errors } = checkShipping(req.body?.shipping);
    if (errors) fail(400, 'Check the delivery details.', errors);
    const order = orders.place(req.user.id, cart.items, ship);
    res.status(201).json({ order });
  });

  app.get('/api/orders', auth.required, (req, res) => {
    const rows = db
      .prepare(`SELECT o.id, o.status, o.total_cents, o.created_at,
                  (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) item_count
                FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC`)
      .all(req.user.id);
    res.json({ orders: rows });
  });

  const loadOwnOrder = (req) => {
    const order = orders.getOrder(parseId(req.params.id, 'Order'));
    // 404 rather than 403 so ids of other people's orders aren't confirmed
    if (!order || (order.user_id !== req.user.id && req.user.role !== 'admin')) fail(404, 'Order not found.');
    return order;
  };

  app.get('/api/orders/:id', auth.required, (req, res) => res.json({ order: loadOwnOrder(req) }));

  app.post('/api/orders/:id/cancel', auth.required, (req, res) => {
    const order = loadOwnOrder(req);
    if (order.status !== 'placed') fail(409, 'This order is already being processed and can no longer be cancelled.');
    res.json({ order: orders.cancel(order) });
  });

  /* ---------------- admin ---------------- */

  const admin = express.Router();
  admin.use(auth.admin);

  admin.get('/stats', (req, res) => {
    const s = db
      .prepare(`SELECT COUNT(*) orders,
                  COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_cents END), 0) revenue,
                  COALESCE(SUM(status IN ('placed', 'processing')), 0) open
                FROM orders`)
      .get();
    const lowStock = db.prepare('SELECT COUNT(*) n FROM products WHERE active = 1 AND stock <= 5').get().n;
    const customers = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'customer'").get().n;
    res.json({ ...s, lowStock, customers });
  });

  admin.get('/products', (req, res) => {
    res.json({ products: db.prepare('SELECT * FROM products ORDER BY active DESC, category, name').all() });
  });

  admin.get('/products/:id', (req, res) => {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(parseId(req.params.id, 'Product'));
    if (!p) fail(404, 'Product not found.');
    res.json({ product: p });
  });

  const slugTaken = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?');

  admin.post('/products', (req, res) => {
    const { data, errors } = checkProduct(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    if (slugTaken.get(data.slug, 0)) fail(409, 'Slug already in use.', { slug: 'Another product already uses this URL slug.' });
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO products (slug, name, description, category, price_cents, stock, hue, featured, active)
                VALUES (:slug, :name, :description, :category, :price_cents, :stock, :hue, :featured, :active)`)
      .run(data);
    res.status(201).json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(lastInsertRowid) });
  });

  admin.put('/products/:id', (req, res) => {
    const id = parseId(req.params.id, 'Product');
    const { data, errors } = checkProduct(req.body);
    if (errors) fail(400, 'Some fields need fixing.', errors);
    if (slugTaken.get(data.slug, id)) fail(409, 'Slug already in use.', { slug: 'Another product already uses this URL slug.' });
    const { changes } = db
      .prepare(`UPDATE products SET slug = :slug, name = :name, description = :description, category = :category,
                  price_cents = :price_cents, stock = :stock, hue = :hue, featured = :featured, active = :active,
                  updated_at = datetime('now') WHERE id = :id`)
      .run({ ...data, id });
    if (!changes) fail(404, 'Product not found.');
    res.json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(id) });
  });

  // "delete" hides the product; order history still points at it
  admin.delete('/products/:id', (req, res) => {
    const { changes } = db
      .prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?")
      .run(parseId(req.params.id, 'Product'));
    if (!changes) fail(404, 'Product not found.');
    res.status(204).end();
  });

  admin.get('/orders', (req, res) => {
    const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : null;
    const rows = db
      .prepare(`SELECT o.id, o.status, o.total_cents, o.created_at, o.ship_name, o.ship_city, u.email,
                  (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) item_count
                FROM orders o JOIN users u ON u.id = o.user_id
                ${status ? 'WHERE o.status = ?' : ''} ORDER BY o.id DESC LIMIT 200`)
      .all(...(status ? [status] : []));
    res.json({ orders: rows });
  });

  admin.patch('/orders/:id', (req, res) => {
    const order = orders.getOrder(parseId(req.params.id, 'Order'));
    if (!order) fail(404, 'Order not found.');
    const next = String(req.body?.status ?? '');
    if (!NEXT_STATUS[order.status].includes(next)) {
      fail(409, `Can't move an order from "${order.status}" to "${next || 'nothing'}".`);
    }
    res.json({ order: orders.updateStatus(order, next) });
  });

  app.use('/api/admin', admin);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  /* ---------------- front end ---------------- */

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    app.get('/', (req, res) => res.type('text').send('Front end not built. Run "npm run build" first, or use "npm run dev".'));
  }

  app.use(errorHandler);
  return app;
}

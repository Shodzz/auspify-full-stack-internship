// Pricing and order placement live here so the checkout route and the
// cart quote route use exactly the same maths.
import { transaction } from './db.js';
import { fail } from './errors.js';
import { shippingFor } from './rules.js';

export function makeOrders(db) {
  const productById = db.prepare('SELECT id, slug, name, category, price_cents, stock, hue, active FROM products WHERE id = ?');
  const takeStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND active = 1 AND stock >= ?');
  const giveStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, subtotal_cents, shipping_cents, total_cents, ship_name, ship_phone, ship_address, ship_city, ship_postcode)
    VALUES (:user_id, :subtotal, :shipping, :total, :name, :phone, :address, :city, :postcode)`);
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, price_cents, qty) VALUES (?, ?, ?, ?, ?)');
  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?');
  const orderItems = db.prepare(`
    SELECT oi.product_id, oi.name, oi.price_cents, oi.qty, p.slug, p.hue, p.category
    FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`);
  const setStatus = db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?");

  // Current prices for a cart. Never trusts prices sent by the browser.
  function quote(items) {
    const lines = [];
    const problems = [];
    for (const { productId, qty } of items) {
      const p = productById.get(productId);
      if (!p || !p.active) {
        problems.push({ productId, message: 'This product is no longer available.' });
        continue;
      }
      if (p.stock < qty) {
        problems.push({
          productId,
          message: p.stock === 0 ? `${p.name} is out of stock.` : `Only ${p.stock} of ${p.name} left.`,
          available: p.stock,
        });
      }
      lines.push({ product: p, qty, line_cents: p.price_cents * qty });
    }
    const subtotal = lines.reduce((s, l) => s + l.line_cents, 0);
    const shipping = shippingFor(subtotal);
    return { lines, problems, subtotal, shipping, total: subtotal + shipping };
  }

  function getOrder(id) {
    const order = orderRow.get(id);
    if (!order) return null;
    return { ...order, items: orderItems.all(id) };
  }

  function place(userId, items, ship) {
    return transaction(db, () => {
      const q = quote(items);
      if (q.problems.length) fail(409, q.problems[0].message, { cart: q.problems });

      const { lastInsertRowid: orderId } = insertOrder.run({
        user_id: userId,
        subtotal: q.subtotal,
        shipping: q.shipping,
        total: q.total,
        ...ship,
      });
      for (const l of q.lines) {
        // the WHERE stock >= ? guard means two buyers can't both take the last one
        const { changes } = takeStock.run(l.qty, l.product.id, l.qty);
        if (!changes) fail(409, `${l.product.name} just sold out.`);
        insertItem.run(orderId, l.product.id, l.product.name, l.product.price_cents, l.qty);
      }
      return getOrder(orderId);
    });
  }

  function cancel(order) {
    return transaction(db, () => {
      for (const it of order.items) giveStock.run(it.qty, it.product_id);
      setStatus.run('cancelled', order.id);
      return getOrder(order.id);
    });
  }

  function updateStatus(order, status) {
    if (status === 'cancelled') return cancel(order);
    setStatus.run(status, order.id);
    return getOrder(order.id);
  }

  return { quote, place, getOrder, cancel, updateStatus };
}

// Resets the store: removes orders, products and the two demo accounts, then
// inserts the sample catalog and the demo admin + customer.
// Usage: npm run seed
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { openDb } from '../server/db.js';

const gen = () => crypto.randomBytes(6).toString('base64url') + '9x';
const adminPass = process.env.SEED_ADMIN_PASSWORD || gen();
const customerPass = process.env.SEED_CUSTOMER_PASSWORD || gen();

// [name, category, price, stock, hue, featured, description]
const products = [
  ['Speckled Stoneware Mug', 'Kitchen', 14.0, 40, 28, 1, 'Wheel-thrown look, 350 ml, dishwasher safe. The speckles vary from mug to mug.'],
  ['Linen Tea Towels (set of 2)', 'Kitchen', 18.5, 25, 140, 0, 'Stonewashed linen that dries fast and gets softer with each wash.'],
  ['Olive Wood Spoon', 'Kitchen', 9.0, 60, 35, 0, 'Hand-finished cooking spoon, 30 cm. Oil it now and then and it will last for years.'],
  ['Glass Storage Jar 1L', 'Kitchen', 11.5, 4, 190, 0, 'Borosilicate jar with a bamboo lid and silicone seal. Good for pasta, oats or coffee.'],
  ['Cast Iron Trivet', 'Kitchen', 16.0, 18, 0, 0, 'Heavy round trivet with felt feet so it does not scratch the table.'],

  ['Dot-Grid Notebook A5', 'Desk', 12.0, 80, 220, 1, '160 numbered pages of 100 gsm paper, lay-flat binding, two ribbon markers.'],
  ['Walnut Desk Tray', 'Desk', 32.0, 12, 25, 1, 'Solid walnut tray for pens, keys and the other small things that end up on a desk.'],
  ['Aluminium Pen', 'Desk', 21.0, 30, 210, 0, 'Machined aluminium body, takes standard G2 refills. Comes with a black 0.5 mm refill.'],
  ['Felt Laptop Sleeve 14"', 'Desk', 29.0, 0, 260, 0, 'Thick wool felt with a leather tab closure. Fits most 13-14 inch laptops.'],
  ['Brass Bookmark Set', 'Desk', 8.5, 45, 48, 0, 'Three thin brass bookmarks that develop a patina over time.'],

  ['Ribbed Glass Vase', 'Home', 24.0, 15, 175, 1, 'Heavy-bottomed vase, 22 cm tall, works with a single stem or a full bunch.'],
  ['Wool Throw Blanket', 'Home', 68.0, 6, 12, 0, 'Lambswool throw, 130 x 180 cm, with a simple herringbone weave.'],
  ['Soy Candle, Cedar', 'Home', 19.0, 3, 95, 0, 'About 40 hours of burn time. Cotton wick, reusable amber glass jar.'],
  ['Cotton Rope Basket', 'Home', 27.5, 20, 40, 0, 'Coiled cotton basket for blankets, toys or laundry. 35 cm across.'],

  ['Enamel Camp Mug', 'Outdoors', 13.0, 50, 205, 0, 'Lightweight steel mug with an enamel finish. Fine on a camp stove.'],
  ['Canvas Tote Bag', 'Outdoors', 22.0, 35, 70, 1, 'Heavy 16 oz canvas with an inside pocket. Holds a full grocery run.'],
  ['Insulated Water Bottle 750ml', 'Outdoors', 26.0, 22, 185, 0, 'Double-wall steel, keeps drinks cold for about a day.'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const db = openDb();
db.exec('BEGIN');
db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM products;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('orders', 'order_items', 'products')");
db.prepare("DELETE FROM users WHERE email IN ('admin@example.com', 'customer@example.com')").run();

const addUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
addUser.run('Admin User', 'admin@example.com', bcrypt.hashSync(adminPass, 12), 'admin');
addUser.run('Demo Customer', 'customer@example.com', bcrypt.hashSync(customerPass, 12), 'customer');

const addProduct = db.prepare(`
  INSERT INTO products (slug, name, description, category, price_cents, stock, hue, featured, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
products.forEach(([name, cat, price, stock, hue, featured, desc], i) => {
  addProduct.run(slug(name), name, desc, cat, Math.round(price * 100), stock, hue, featured, `-${products.length - i} days`);
});

db.exec('COMMIT');

console.log(`Inserted ${products.length} products.`);
console.log('Demo accounts (local use only):');
console.log(`  admin@example.com     ${process.env.SEED_ADMIN_PASSWORD ? '(password from SEED_ADMIN_PASSWORD)' : adminPass}`);
console.log(`  customer@example.com  ${process.env.SEED_CUSTOMER_PASSWORD ? '(password from SEED_CUSTOMER_PASSWORD)' : customerPass}`);

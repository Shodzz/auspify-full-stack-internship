export const CATEGORIES = ['Kitchen', 'Desk', 'Home', 'Outdoors'];
export const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

// which status an admin may move an order to from its current one
export const NEXT_STATUS = {
  placed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const FREE_SHIPPING_FROM = 5000; // cents
export const SHIPPING_FEE = 499;
export const MAX_QTY = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const obj = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? b : {});
const done = (data, e) => ({ data, errors: Object.keys(e).length ? e : null });

export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

export function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function toCents(value) {
  const s = typeof value === 'number' ? String(value) : str(value);
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ''] = s.split('.');
  const c = Number(w) * 100 + Number(f.padEnd(2, '0'));
  return c > 0 ? c : null;
}

export function checkRegister(body) {
  const b = obj(body);
  const d = { name: str(b.name), email: str(b.email).toLowerCase(), password: typeof b.password === 'string' ? b.password : '' };
  const e = {};
  if (d.name.length < 2 || d.name.length > 60) e.name = 'Name should be 2-60 characters.';
  if (!EMAIL_RE.test(d.email) || d.email.length > 120) e.email = 'Enter a valid email address.';
  if (d.password.length < 8) e.password = 'Use at least 8 characters.';
  else if (d.password.length > 72) e.password = 'Keep it under 72 characters.';
  else if (!/[a-zA-Z]/.test(d.password) || !/\d/.test(d.password)) e.password = 'Include at least one letter and one number.';
  return done(d, e);
}

export function checkLogin(body) {
  const b = obj(body);
  const d = { email: str(b.email).toLowerCase(), password: typeof b.password === 'string' ? b.password : '' };
  const e = {};
  if (!d.email) e.email = 'Enter your email.';
  if (!d.password) e.password = 'Enter your password.';
  return done(d, e);
}

// [{ productId, qty }] -> merged list, or an error string
export function checkCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { error: 'Your cart is empty.' };
  if (items.length > 50) return { error: 'Too many different items in one order.' };
  const merged = new Map();
  for (const it of items) {
    const id = Number(it?.productId);
    const qty = Number(it?.qty);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1) return { error: 'Cart contains an invalid item.' };
    merged.set(id, Math.min((merged.get(id) || 0) + qty, MAX_QTY));
  }
  return { items: [...merged].map(([productId, qty]) => ({ productId, qty })) };
}

export function checkShipping(body) {
  const b = obj(body);
  const d = {
    name: str(b.name),
    phone: str(b.phone),
    address: str(b.address),
    city: str(b.city),
    postcode: str(b.postcode).toUpperCase(),
  };
  const e = {};
  if (d.name.length < 2 || d.name.length > 80) e.name = 'Enter the recipient name.';
  if (!/^[0-9+()\s-]{7,20}$/.test(d.phone)) e.phone = 'Enter a phone number for the courier.';
  if (d.address.length < 5 || d.address.length > 160) e.address = 'Enter a street address.';
  if (d.city.length < 2 || d.city.length > 60) e.city = 'Enter a city.';
  if (!/^[A-Z0-9 -]{3,10}$/.test(d.postcode)) e.postcode = 'Enter a valid postal code.';
  return done(d, e);
}

export function checkProduct(body) {
  const b = obj(body);
  const d = {
    name: str(b.name),
    slug: slugify(str(b.slug) || str(b.name)),
    description: str(b.description),
    category: str(b.category),
    price_cents: toCents(b.price),
    stock: Number(b.stock),
    hue: Number(b.hue ?? 200),
    featured: b.featured ? 1 : 0,
    active: b.active === false || b.active === 0 ? 0 : 1,
  };
  const e = {};
  if (d.name.length < 2 || d.name.length > 80) e.name = 'Name should be 2-80 characters.';
  if (!d.slug) e.slug = 'Slug can only use letters, numbers and dashes.';
  if (d.description.length > 1000) e.description = 'Description is limited to 1000 characters.';
  if (!CATEGORIES.includes(d.category)) e.category = 'Pick a category.';
  if (d.price_cents === null) e.price = 'Enter a price above 0, up to 2 decimals.';
  if (!Number.isInteger(d.stock) || d.stock < 0 || d.stock > 100000) e.stock = 'Stock must be a whole number, 0 or more.';
  if (!Number.isInteger(d.hue) || d.hue < 0 || d.hue > 359) e.hue = 'Hue must be 0-359.';
  return done(d, e);
}

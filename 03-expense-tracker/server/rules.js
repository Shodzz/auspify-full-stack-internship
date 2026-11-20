export const CATEGORIES = {
  expense: ['Food', 'Rent', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'],
  income: ['Salary', 'Freelance', 'Gifts', 'Interest', 'Other'],
};

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'AED'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const obj = (b) => (b && typeof b === 'object' ? b : {});
const done = (data, errors) => ({ data, errors: Object.keys(errors).length ? errors : null });

export function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// "12.5" -> 1250. Returns null for anything that isn't a positive amount with at most 2 decimals.
export function toCents(value) {
  const s = typeof value === 'number' ? String(value) : str(value);
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return cents > 0 ? cents : null;
}

export function checkRegister(body) {
  const b = obj(body);
  const data = { name: str(b.name), email: str(b.email).toLowerCase(), password: typeof b.password === 'string' ? b.password : '', currency: str(b.currency) || 'USD' };
  const e = {};
  if (data.name.length < 2 || data.name.length > 60) e.name = 'Name should be 2-60 characters.';
  if (!EMAIL_RE.test(data.email) || data.email.length > 120) e.email = 'Enter a valid email address.';
  if (data.password.length < 8) e.password = 'Use at least 8 characters.';
  else if (data.password.length > 72) e.password = 'Keep it under 72 characters.';
  else if (!/[a-zA-Z]/.test(data.password) || !/\d/.test(data.password)) e.password = 'Include at least one letter and one number.';
  if (!CURRENCIES.includes(data.currency)) e.currency = 'Pick a currency from the list.';
  return done(data, e);
}

export function checkLogin(body) {
  const b = obj(body);
  const data = { email: str(b.email).toLowerCase(), password: typeof b.password === 'string' ? b.password : '' };
  const e = {};
  if (!data.email) e.email = 'Enter your email.';
  if (!data.password) e.password = 'Enter your password.';
  return done(data, e);
}

export function checkProfile(body) {
  const b = obj(body);
  const data = {};
  const e = {};
  if ('name' in b) {
    data.name = str(b.name);
    if (data.name.length < 2 || data.name.length > 60) e.name = 'Name should be 2-60 characters.';
  }
  if ('currency' in b) {
    data.currency = str(b.currency);
    if (!CURRENCIES.includes(data.currency)) e.currency = 'Pick a currency from the list.';
  }
  return done(data, e);
}

export function checkTransaction(body) {
  const b = obj(body);
  const data = {
    type: str(b.type),
    amount_cents: toCents(b.amount),
    category: str(b.category),
    note: str(b.note),
    date: str(b.date),
  };
  const e = {};
  if (!['income', 'expense'].includes(data.type)) e.type = 'Choose income or expense.';
  if (data.amount_cents === null) e.amount = 'Enter an amount above 0 with up to 2 decimals.';
  else if (data.amount_cents > 1_000_000_000) e.amount = 'Amounts are capped at 10,000,000.';
  if (!CATEGORIES[data.type]?.includes(data.category)) e.category = 'Pick a category.';
  if (data.note.length > 140) e.note = 'Notes are limited to 140 characters.';
  if (!isRealDate(data.date)) e.date = 'Enter a valid date.';
  else if (data.date < '2000-01-01' || data.date > '2100-12-31') e.date = 'Date is out of range.';
  return done(data, e);
}

// Creates (or resets) a demo account with six months of made-up transactions.
// Usage: npm run seed
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { openDb } from '../server/db.js';

const EMAIL = 'demo@example.com';
const password = process.env.SEED_PASSWORD || crypto.randomBytes(6).toString('base64url') + '7a';

const db = openDb();

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100); // -> cents

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();

db.exec('BEGIN');
db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
const { lastInsertRowid: userId } = db
  .prepare('INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)')
  .run('Demo User', EMAIL, bcrypt.hashSync(password, 12), 'USD');

const add = db.prepare('INSERT INTO transactions (user_id, type, amount_cents, category, note, date) VALUES (?, ?, ?, ?, ?, ?)');
let count = 0;

for (let back = 5; back >= 0; back--) {
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const lastDay = back === 0 ? now.getDate() : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const day = (n) => `${ym}-${pad(Math.min(n, lastDay))}`;
  const put = (type, cents, cat, note, dd) => { add.run(userId, type, cents, cat, note, day(dd)); count++; };

  put('income', 320000, 'Salary', 'Monthly salary', 1);
  if (rand() > 0.5) put('income', between(150, 600), 'Freelance', 'Website fix for a client', 12);
  if (back === 2) put('income', 5000, 'Gifts', 'Birthday', 18);
  put('income', between(2, 9), 'Interest', 'Savings interest', 28);

  put('expense', 110000, 'Rent', 'Apartment rent', 2);
  put('expense', between(60, 95), 'Utilities', 'Electricity + water', 6);
  put('expense', 4500, 'Utilities', 'Internet', 9);
  for (const dd of [3, 8, 14, 20, 26]) put('expense', between(35, 90), 'Food', 'Groceries', dd);
  for (const dd of [5, 16, 23]) put('expense', between(12, 40), 'Food', 'Eating out', dd);
  put('expense', between(40, 70), 'Transport', 'Transit pass', 1);
  if (rand() > 0.4) put('expense', between(15, 35), 'Transport', 'Taxi', 19);
  put('expense', between(20, 160), 'Shopping', rand() > 0.5 ? 'Clothes' : 'Household stuff', 11);
  put('expense', between(10, 45), 'Entertainment', 'Cinema / streaming', 15);
  if (rand() > 0.6) put('expense', between(25, 120), 'Health', 'Pharmacy', 21);
  if (back % 3 === 0) put('expense', between(30, 90), 'Education', 'Online course', 24);
}

db.exec('COMMIT');

console.log(`Demo account ready: ${EMAIL}`);
console.log(process.env.SEED_PASSWORD ? 'Password: the SEED_PASSWORD from your .env' : `Password: ${password}   (set SEED_PASSWORD in .env to choose your own)`);
console.log(`${count} sample transactions added.`);

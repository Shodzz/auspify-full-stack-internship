# Expense Tracker (Pocket Ledger)

A personal finance log. You create an account, record income and expenses, and
the app shows monthly totals, a six-month trend and where the money went by
category. Built with React on the front end and Express + SQLite behind it.

## Features

**Accounts**
- Register, log in, log out. Passwords are hashed with bcrypt (cost 12).
- The session is a signed JWT in an `httpOnly`, `SameSite=Strict` cookie, so
  page scripts can't read it and other sites can't send it.
- Login and register are rate limited (20 tries per 15 minutes per IP).
- A failed login for an unknown email takes the same time as a wrong password,
  so the endpoint doesn't reveal which emails have accounts.
- Each user picks a display currency, which can be changed later from the header.

**Transactions**
- Add, edit and delete income or expense entries (amount, category, date, note)
- Entries grouped by day, newest first
- Filter by month, type and category; search inside notes
- Delete shows an Undo button for a few seconds
- Export the current view to CSV. Cells that start with `=`, `+`, `-` or `@` are
  prefixed so Excel doesn't run them as formulas.

**Reports** (per month)
- Income, expenses, net and the all-time balance
- Savings rate, average daily spend, largest expense
- Six-month income vs expense bar chart (plain SVG, no chart library)
- Spending by category and income by source

**Everywhere**
- Loading skeletons, empty states, error states with retry, toasts
- Works from 360px phones up; on phones a floating + button adds an entry
- Follows the OS light/dark setting

## Stack

React 19, Vite, Node.js 22.13+ (tested on Node 26), Express 5, SQLite through
`node:sqlite`, bcryptjs, jsonwebtoken, helmet, express-rate-limit.

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to a long random string. This command makes one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then build the front end and start the server:

```bash
npm run build
npm start
```

Open http://localhost:3003.

### Demo data (optional)

```bash
npm run seed
```

This creates `demo@example.com` with six months of made-up transactions. The
password is `SEED_PASSWORD` from `.env`; if that's empty, a random one is
generated and printed in the terminal. Running the seed again resets the demo
account. Other accounts aren't touched.

### Development

```bash
npm run dev
```

Starts the API with auto-restart and the Vite dev server with hot reload at
http://localhost:5173 (API calls are proxied to port 3003).

| Command | What it does |
|---------|--------------|
| `npm run dev` | API + Vite dev server together |
| `npm run build` | Build the React app into `dist/` |
| `npm start` | Serve the API and the built app on one port |
| `npm run seed` | Create/reset the demo account |
| `npm test` | API tests (in-memory database) |

## API

All routes except `/api/config` and the auth routes need the session cookie.
Request bodies must be JSON (`415` otherwise).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/config` | Categories and currencies |
| POST | `/api/auth/register` | `{ name, email, password, currency }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | Current user or 401 |
| PATCH | `/api/auth/me` | `{ name?, currency? }` |
| GET | `/api/transactions` | Query: `month` (`YYYY-MM` or `all`), `type`, `category`, `q` |
| POST | `/api/transactions` | `{ type, amount, category, date, note }` |
| PUT | `/api/transactions/:id` | Same body as POST |
| DELETE | `/api/transactions/:id` | |
| GET | `/api/transactions/export.csv` | Same filters as the list |
| GET | `/api/reports/summary?month=YYYY-MM` | Totals, categories, trend, largest expense |

Every transaction query includes `user_id = ?` with the logged-in user's id,
so one user can't read or change another user's entries. Asking for someone
else's id returns 404. There's a test for this.

## How money is stored

Amounts are kept as whole cents (`INTEGER`). The server parses strings like
`"12.50"` itself instead of using `parseFloat`, which avoids rounding errors
like `0.1 + 0.2`.

## Project layout

```
client/              React app (Vite root)
  src/components/    Dashboard, TransactionList, Reports, AuthScreen, ...
  src/api.js         fetch wrapper
server/
  app.js             routes
  auth.js            cookie + JWT helpers
  rules.js           validation and allowed values
  db.js              schema
scripts/
  dev.js             runs API + Vite together
  seed.js            demo data
test/api.test.js
```

## Limitations

- No password reset. That needs an email service.
- No recurring transactions or budgets.
- Runs locally only, with no deployment. For a real deployment, set
  `NODE_ENV=production`, `COOKIE_SECURE=true` and serve over HTTPS.
- SQLite instead of MySQL/MongoDB (neither was installed). The queries are
  plain SQL and would move to MySQL with the `mysql2` driver.

## Author

Shady Mamdouh Kamal Labib Zaki, Full Stack Development Intern at Auspify Technologies (Cairo, Egypt)

- GitHub: https://github.com/Shodzz
- Repository: this project is the `03-expense-tracker/` folder of the internship projects repository, which holds all four projects. See the [root README](../README.md) for the overview and the repository link.

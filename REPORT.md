# Internship Project Report

| | |
|---|---|
| **Intern** | Shady Mamdouh Kamal Labib Zaki |
| **Role** | Full Stack Development Intern |
| **Organisation** | Auspify Technologies |
| **Offer letter ID** | AT/INT/2043639 |
| **Location** | Cairo, Egypt |
| **Email** | shadoshady409@gmail.com |
| **GitHub** | https://github.com/Shodzz |
| **Date** | November 20, 2026 |
| **GitHub repository** | PENDING: URL to be added once the repository is created |

### Repository

All four projects are kept in **one GitHub repository**, each in its own folder:

| Project | Folder in the repository |
|---------|--------------------------|
| 1. Portfolio | `01-portfolio/` |
| 2. Student Management System | `02-student-management/` |
| 3. Expense Tracker | `03-expense-tracker/` |
| 4. E-Commerce | `04-ecommerce/` |

The repository root also holds the overview `README.md`, this report,
`PLAN.md`, `screenshots/` and `checks/`. A single root `.gitignore` keeps
`.env` files, databases, `node_modules` and build output out of the repository.

## 1. Tasks chosen

| # | Task | Why |
|---|------|-----|
| 1 | Personal Portfolio Website | Covers responsive design and frontend polish, and doubles as a showcase for the other three. |
| 2 | Student Management System | The core CRUD task: REST API, validation, database, search/sort/paging. |
| 3 | Expense Tracker | Adds authentication, per-user data and reporting queries. |
| 4 | E-Commerce Website | The largest of the four: catalog, cart, accounts, checkout, orders and an admin role. |

Together they cover frontend (plain JS and React), backend (Express REST APIs),
database design, authentication with roles, and responsive layouts.

**Not chosen:** Job Portal and Learning Management System. Both are mostly
listings + roles + admin tools, which the e-commerce project already covers.
I spent the time on finishing four projects properly instead.

## 2. Stack and why

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 26 | Installed on the machine; everything targets Node 22.13+ |
| Server | Express 5 | From the suggested list; async errors are handled without extra wrappers |
| Database | SQLite via built-in `node:sqlite` | MongoDB and MySQL were not installed and Docker was not available. SQLite needs no setup and the SQL is portable to MySQL (notes in each README). |
| Frontend | Plain HTML/CSS/JS (projects 1-2), React 19 + Vite (projects 3-4) | Shows both approaches; React where there is more state to manage |
| Auth | bcryptjs + jsonwebtoken in an httpOnly cookie | Keeps tokens away from page scripts |
| Security headers | helmet | Sets CSP and other headers |
| Rate limiting | express-rate-limit | Contact form and login endpoints |
| Tests | `node:test` + `fetch` | Built into Node, no extra test framework |

Config is read from `.env` with Node's `--env-file-if-exists` flag, so there's
no dotenv dependency. Only `.env.example` files are included.

## 3. What each project does

### 3.1 Portfolio (`01-portfolio`)
- Home, About, Projects and Contact sections on one responsive page
- Project cards with a technology filter and a details dialog; thumbnails are
  real screenshots of projects 2-4
- Light/dark theme (follows the OS until changed)
- Contact form with browser and server validation, loading state, success and
  error messages, honeypot field, rate limit; messages saved to SQLite and
  listed with `npm run messages`
- All personal details sit in one file (`public/js/profile.js`)

### 3.2 Student Management System (`02-student-management`)
- Add, view, edit, delete students (modal form, confirm before delete)
- Search, filter by course/status, sort by any column, pagination
- Filter state kept in the URL
- Server-side validation with per-field messages; duplicate roll number or
  email returns 409 naming the field
- Summary cards (total / active / on leave / graduated) that also filter
- Mobile layout turns table rows into cards

### 3.3 Expense Tracker (`03-expense-tracker`)
- Register / log in / log out, per-user data isolation
- Income and expense CRUD with categories, notes and dates; amounts stored as cents
- Month switcher, filters, note search, delete with undo, CSV export
- Reports: savings rate, average daily spend, largest expense, six-month SVG
  bar chart, spending by category, income by source
- Currency preference per user

### 3.4 E-Commerce (`04-ecommerce`)
- Catalog with categories, search, sort, pagination; product pages
- Cart in localStorage, re-priced by the server; stock problems shown with a fix button
- Login-gated checkout with delivery form; orders placed in a single DB
  transaction with safe stock decrement
- Order history, order tracking steps, customer cancel while `placed`
- Admin: stats, order status workflow, product create/edit/hide

## 4. Setup

General steps (details in each project's README):

```bash
cd <project folder>
npm install
cp .env.example .env        # projects 3 and 4: set JWT_SECRET (and seed passwords if you want fixed ones)
npm run seed                # optional sample data (projects 2-4)
npm run build               # projects 3 and 4 only
npm start
```

| Project | URL |
|---------|-----|
| Portfolio | http://localhost:3001 |
| Student Management | http://localhost:3002 |
| Expense Tracker | http://localhost:3003 |
| E-Commerce | http://localhost:3004 |

Sample data is made up: random name combinations, `example.com` /
`example.edu` emails, fictional 555-01xx phone numbers, invented products.

## 5. Checks performed

Everything below was actually run on this machine (Windows 11, Node 26.13, Chrome headless).

**API tests** (`npm test` in each folder, in-memory database): 30 tests, all passing.

| Project | Tests | What they cover |
|---------|-------|-----------------|
| Portfolio | 6 | page served, valid/invalid messages, honeypot, bad JSON, rate limit |
| Students | 8 | full CRUD, validation, future dates, duplicates, search/filter/sort/paging, SQL-injection attempt in sort param, literal `%` search |
| Expense Tracker | 9 | amount parsing, auth cycle, cookie flags, weak passwords, protected routes, JSON-only writes, CRUD + report maths, cross-user access, CSV formula escaping, profile update |
| E-Commerce | 7 | catalog queries, cart quote with stock problems, checkout rules, free shipping, stock restore on cancel, cross-user and admin access control, admin product + order workflow |

**Browser walk-through** (`checks/browser-check.mjs`, headless Chrome): 48 checks,
all passing. It clicks through each app at 1366px and 390px wide: creating,
editing and deleting records, validation messages, login/logout, checkout as
a guest then as a customer, admin status changes, dark mode, and checks
that no page scrolls sideways on a phone and no console errors are logged.

**Dependency audit:** `npm audit` reports 0 vulnerabilities in all four projects.

**Builds:** `npm run build` succeeds for both React projects.

**Bugs found by these checks and fixed:**
- Shop product pages crashed when opened from the catalog. Cause: an effect
  written as `useEffect(() => window.scrollTo(0, 0))`; current Chrome returns a
  Promise from `scrollTo`, which React then tried to call as a cleanup function.
- The shop's header search kept the selected category, so searching "mug"
  while viewing Desk found nothing. The header search now covers the whole store.
- Invalid `font` shorthand in two stylesheets made some buttons fall back to the default font.
- A global SVG icon style was overriding stroke widths in the chart and the product drawings.
- The student table's action cell used `display: flex`, which broke the row borders.
- Chart axis ticks fell on odd values (1.3k, 3.8k); now they fall on round numbers.
- Login timing leak (found in the final review): in the expense tracker and the
  shop, a login for an unknown email was checked against a bcrypt hash of cost
  10 while real accounts use cost 12, so unknown emails answered about 4x
  faster (79 ms vs 316 ms measured). That would let someone work out which
  emails have accounts. The dummy hash now uses cost 12; measured afterwards,
  both cases take about 320 ms.

**Final re-check before submission (20 November 2026):** the ZIP was extracted
into an empty folder, then `npm ci`, `npm test` and `npm run build` were run
in each project. The browser walk-through was run against that copy, and the
API tests were run again after the login timing fix. Results: 30/30 tests,
48/48 browser checks, both builds succeed, `npm audit` reports 0 vulnerabilities.

**Secrets check:** no `.env` files, databases, `node_modules` or `dist`
folders are in the submission ZIP (checked by listing the archive).

## 6. Limitations and next steps

| Item | Status | What would be needed |
|------|--------|----------------------|
| MongoDB / MySQL | Not used; SQLite instead | Install MySQL, swap `node:sqlite` for `mysql2`, adjust a few column types (notes in READMEs) |
| Online payment (shop) | Not implemented, pay-on-delivery only | A payment provider account and API keys (e.g. Stripe test mode) |
| Emails (contact form, order confirmations, password reset) | Not implemented | SMTP or an email API account |
| Deployment | Not deployed; runs locally only | A hosting account; set `NODE_ENV=production`, `COOKIE_SECURE=true`, HTTPS |
| Product photos | Generated drawings instead | Image upload + storage |
| Login for the student system | Not added (internal admin tool) | Same cookie/JWT approach as projects 3-4 |
| Demo video | Not recorded | Screen recording of the flows |
| GitHub repository | Pending, not created yet | Create one repository and push this folder as it is (the root `.gitignore` already excludes `.env` files, databases and builds) |

## 7. Pending items

1. Create the GitHub repository, then add its URL in three places: the
   "GitHub repository" row at the top of this report, the "Repository" row in
   the root `README.md`, and `REPO_URL` in `01-portfolio/public/js/profile.js`.
   The portfolio's "Source" links to each project folder are built from it.

## 8. Submission contents

The submission ZIP holds the same files as the repository:

```
01-portfolio/            source, README, .env.example, tests
02-student-management/   source, README, .env.example, tests
03-expense-tracker/      source, README, .env.example, tests
04-ecommerce/            source, README, .env.example, tests
screenshots/             screenshots from the running apps
checks/                  browser walk-through script
README.md, REPORT.md, PLAN.md, .gitignore
```

Project links / demo: none yet. The projects are not deployed, and the
repository URL is pending (see the top of this report).

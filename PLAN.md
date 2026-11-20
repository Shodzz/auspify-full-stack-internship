# Implementation plan

## Tasks picked

| # | Task | Why it's in the set |
|---|------|---------------------|
| 1 | Personal Portfolio Website | Responsive layout and frontend polish, plus a small API for the contact form |
| 2 | Student Management System | Classic CRUD: REST API, validation, database, table UI with search/sort/paging |
| 3 | Expense Tracker | Authentication, per-user data, aggregation queries and reports |
| 4 | E-Commerce Website | Biggest one: catalog, cart, accounts, checkout, orders and an admin area |

Job Portal and LMS were skipped. They overlap heavily with the e-commerce
project (roles, listings, admin tools) and four projects already cover
frontend, backend, database, auth and responsive design.

## Stack

- **Node.js 26 + Express 5** for every backend.
- **SQLite** via Node's built-in `node:sqlite` module. MongoDB and MySQL are
  not installed on this machine and Docker isn't available, so SQLite keeps
  each project runnable with just `npm install`. The SQL is plain and would
  port to MySQL with small changes (see each README).
- **Frontend**: plain HTML/CSS/JS for the portfolio and the student system,
  **React + Vite** for the expense tracker and the shop.
- **Auth**: bcrypt password hashes, JWT stored in an httpOnly, SameSite=Strict cookie.
- **Config**: `.env` files loaded with Node's `--env-file-if-exists`, no dotenv package.
  Only `.env.example` files are committed.
- **Tests**: `node:test` + `fetch`, run against an in-memory database.

## Order of work

1. Portfolio (static site + `/api/contact`)
2. Student management (REST API + vanilla JS client)
3. Expense tracker (auth, transactions, reports)
4. E-commerce (catalog, cart, checkout, orders, admin)
5. Run tests and a production build for each, click through every flow,
   take screenshots with headless Edge
6. Write REPORT.md, build `submission/` and zip it

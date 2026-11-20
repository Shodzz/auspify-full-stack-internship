# Full Stack Development Internship Projects – Auspify Technologies

This repository holds the four projects I built during the **Full Stack
Development Internship at Auspify Technologies**. Each project is a complete
web app with its own REST API, database, front end, tests and README, and it
lives in its own folder.

| | |
|---|---|
| **Intern** | Shady Mamdouh Kamal Labib Zaki |
| **Role** | Full Stack Development Intern, Auspify Technologies |
| **Offer letter ID** | AT/INT/2043639 |
| **Location** | Cairo, Egypt |
| **GitHub** | https://github.com/Shodzz |
| **Repository** | CREATED : https://github.com/Shodzz/auspify-full-stack-internship |

## Projects

| # | Project | Folder | Stack | Local URL |
|---|---------|--------|-------|-----------|
| 1 | Personal Portfolio Website | [`01-portfolio/`](01-portfolio) | HTML, CSS, JavaScript, Express, SQLite | http://localhost:3001 |
| 2 | Student Management System | [`02-student-management/`](02-student-management) | Vanilla JS, Express, SQLite | http://localhost:3002 |
| 3 | Expense Tracker | [`03-expense-tracker/`](03-expense-tracker) | React, Express, SQLite, JWT auth | http://localhost:3003 |
| 4 | E-Commerce Website (Corner Store) | [`04-ecommerce/`](04-ecommerce) | React, React Router, Express, SQLite, JWT auth | http://localhost:3004 |

1. **[Portfolio](01-portfolio/README.md):** a responsive one-page site with a
   light/dark theme, project cards with a technology filter, and a contact form
   validated in the browser and on the server, with messages stored in SQLite.
2. **[Student Management System](02-student-management/README.md):** add, view,
   edit and delete students; search, filters, sortable columns and pagination;
   per-field validation and duplicate checks on the server.
3. **[Expense Tracker](03-expense-tracker/README.md):** accounts with hashed
   passwords and an httpOnly JWT cookie; income and expense entries per user;
   monthly reports, a six-month chart and CSV export.
4. **[E-Commerce Website](04-ecommerce/README.md):** a catalog, a cart re-priced
   on the server, and a login-gated checkout that places orders in one database
   transaction. Customers get order history; an admin area handles products and
   the order status workflow.

Each project folder has its own README with features, setup, API and file layout.

## Documentation

| File | Contents |
|------|----------|
| [REPORT.md](REPORT.md) | Internship report: tasks chosen, stack, what each project does, checks performed, limitations |
| [PLAN.md](PLAN.md) | The plan written before starting |
| [`screenshots/`](screenshots) | Screenshots of each app, one folder per project |
| [`checks/`](checks) | The headless-browser script that clicks through every app's main flows |

## Repository structure

```
.
├── README.md                 this file
├── REPORT.md                 internship report
├── PLAN.md                   implementation plan
├── .gitignore                keeps .env files, databases, node_modules and builds out of git
├── 01-portfolio/             Project 1: Portfolio (Express + vanilla JS)
│   ├── public/               HTML, CSS, JS, images
│   ├── server/               Express app, validation, SQLite
│   ├── scripts/              list contact-form messages
│   ├── test/                 API tests
│   └── README.md
├── 02-student-management/    Project 2: Student Management System
│   ├── public/               vanilla JS front end
│   ├── server/               REST API, validation, SQLite schema
│   ├── scripts/              sample-data seed
│   ├── test/                 API tests
│   └── README.md
├── 03-expense-tracker/       Project 3: Expense Tracker
│   ├── client/               React app (Vite)
│   ├── server/               REST API, auth, reports, SQLite schema
│   ├── scripts/              dev runner, demo-data seed
│   ├── test/                 API tests
│   └── README.md
├── 04-ecommerce/             Project 4: E-Commerce Website
│   ├── client/               React app (Vite, React Router)
│   ├── server/               REST API, auth, orders, SQLite schema
│   ├── scripts/              dev runner, catalog seed
│   ├── test/                 API tests
│   └── README.md
├── screenshots/              portfolio/, student-management/, expense-tracker/, ecommerce/
└── checks/                   browser-check.mjs + README
```

## Requirements

- Node.js **22.13 or newer** (built and tested on Node 26). The projects use
  Node's built-in SQLite module (`node:sqlite`), so you don't need to install a
  database server.
- npm

## Quick start

Each project is installed and run from its own folder:

```bash
cd 02-student-management
npm install
npm run seed      # optional sample data
npm start
```

Projects 03 and 04 need a `.env` file first (copy `.env.example` to `.env` and
fill in `JWT_SECRET`) and a front-end build (`npm run build`). Their READMEs
have the exact steps. `npm test` runs a project's API tests against an
in-memory database.

## Verification

Results from the last full run (details in [REPORT.md](REPORT.md#5-checks-performed)):

- API tests: 30/30 passing (portfolio 6, students 8, expense tracker 9, e-commerce 7)
- Production builds: both React projects build successfully
- `npm audit`: 0 vulnerabilities in all four projects
- Browser walk-through: 48/48 checks passing at desktop and phone widths

## Author

**Shady Mamdouh Kamal Labib Zaki**, Full Stack Development Intern at Auspify
Technologies, Cairo, Egypt. GitHub: https://github.com/Shodzz

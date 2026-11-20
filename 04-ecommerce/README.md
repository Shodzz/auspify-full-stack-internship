# E-Commerce Website (Corner Store)

A small online shop selling homeware. Customers browse the catalog, fill a
cart, create an account and check out. An admin manages products and moves
orders through their statuses. React + React Router on the front end,
Express + SQLite on the back end.

## Features

**Catalog**
- Product grid with category filter, search, sorting and pagination
- Product page with stock status, quantity picker and related items
- Product images are generated SVG drawings, so the project ships without
  stock photos or copyrighted images

**Cart and checkout**
- Cart stored in `localStorage`, works for guests and syncs between tabs
- The cart page asks the server for current prices and stock (`/api/cart/quote`)
  and flags anything that changed or sold out, with a one-click fix
- Free delivery over $50, otherwise $4.99
- Checkout needs an account. Guests are sent to log in and brought back to checkout.
- Placing an order runs in one database transaction: it re-checks every price and
  stock level on the server, writes the order and items, and decrements stock with
  `UPDATE ... WHERE stock >= qty`, so two buyers can't both get the last item
- Payment is **pay on delivery** only (see limitations)

**Accounts and orders**
- Register / log in / log out (bcrypt + JWT in an httpOnly SameSite=Strict cookie)
- "My orders" list and order detail with a progress tracker
- Customers can cancel while an order is still `placed`. Stock is returned.

**Admin** (`role = 'admin'`)
- Stats: revenue (excluding cancelled orders), open orders, customers, low stock
- Orders table with status filter. Statuses can only move forward:
  placed -> processing -> shipped -> delivered, with cancel allowed before
  shipping. Cancelling returns stock.
- Product list; add and edit products with validation and a live preview
- "Hide" instead of delete, so old orders still point at a real product

**Security**
- Admin routes check the role on the server, not just in the UI
- The user is looked up from the database on every request, so a role change
  or deleted account takes effect immediately
- Customers get 404 (not 403) for other people's orders, so order ids can't be probed
- JSON-only request bodies, helmet headers, rate-limited login
- Login redirect (`?next=`) only accepts paths on this site

## Stack

React 19, React Router 7, Vite, Node.js 22.13+ (tested on Node 26), Express 5,
SQLite through `node:sqlite`, bcryptjs, jsonwebtoken, helmet, express-rate-limit.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `JWT_SECRET`: a long random string, for example from
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD`: passwords for the demo
  accounts. Leave them empty to have the seed script generate and print them.

```bash
npm run seed     # sample products + demo admin and customer
npm run build
npm start
```

Open http://localhost:3004.

Demo accounts created by the seed (local use only):

| Email | Role |
|-------|------|
| `admin@example.com` | admin |
| `customer@example.com` | customer |

`npm run seed` **wipes all products and orders** and recreates the two demo
accounts. Other customer accounts are kept.

| Command | What it does |
|---------|--------------|
| `npm run dev` | API + Vite dev server (http://localhost:5174) |
| `npm run build` | Build the React app into `dist/` |
| `npm start` | Serve everything on port 3004 |
| `npm run seed` | Reset catalog, orders and demo accounts |
| `npm test` | API tests (in-memory database) |

## API overview

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/products?q=&category=&sort=&page=` | anyone |
| GET | `/api/products/:slug` | anyone |
| POST | `/api/cart/quote` | anyone |
| POST | `/api/auth/register`, `/login`, `/logout` | anyone |
| GET | `/api/auth/me` | anyone (`user: null` if logged out) |
| POST | `/api/orders` | customer |
| GET | `/api/orders`, `/api/orders/:id` | owner (or admin) |
| POST | `/api/orders/:id/cancel` | owner, while `placed` |
| GET | `/api/admin/stats` | admin |
| GET/POST | `/api/admin/products` | admin |
| GET/PUT/DELETE | `/api/admin/products/:id` | admin (DELETE hides) |
| GET | `/api/admin/orders?status=` | admin |
| PATCH | `/api/admin/orders/:id` | admin, `{ status }` |

## Database

`users`, `products`, `orders`, `order_items`. Each order item copies the
product name and price at the time of purchase, so editing a product later
doesn't rewrite old receipts. The full schema is in `server/db.js`.

## Layout

```
client/src/
  pages/            Catalog, ProductPage, CartPage, Checkout, Orders, OrderDetail, AuthPage
  pages/admin/      Admin dashboard, ProductForm
  context/          AuthContext, CartContext
  components/       Header, ProductCard, ProductArt, shared ui bits
server/
  app.js            routes
  orders.js         pricing, placing and cancelling orders
  auth.js           session cookie + role checks
  rules.js          validation, statuses, shipping rules
  db.js             schema + transaction helper
scripts/            dev runner, seed
test/api.test.js
```

## Limitations

- **No online payment.** Card payments need a provider account (Stripe,
  Razorpay, etc.) and API keys, which this project doesn't have. Checkout
  records the order as pay-on-delivery. Adding a provider would mean creating a
  payment intent in `POST /api/orders` and confirming it with a webhook before
  moving the order to `processing`.
- No order emails (needs an email service).
- No product photo uploads; products use generated drawings, one design per category.
- Runs locally only, with no deployment.
- SQLite instead of MySQL/MongoDB (neither was installed on the machine).

## Author

Shady Mamdouh Kamal Labib Zaki, Full Stack Development Intern at Auspify Technologies (Cairo, Egypt)

- GitHub: https://github.com/Shodzz
- Repository: this project is the `04-ecommerce/` folder of the internship projects repository, which holds all four projects. See the [root README](../README.md) for the overview and the repository link.

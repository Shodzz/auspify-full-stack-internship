// Clicks through the main flows of all four apps in headless Chrome and saves
// screenshots to ../screenshots. See checks/README.md for how to run it.
// Usage: node browser-check.mjs <workspaceDir> [thumbs|students|expenses|shop|portfolio ...]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.argv[2];
const only = process.argv.slice(3);
const OUT = path.join(ROOT, 'screenshots');
const BROWSER = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DESKTOP = { width: 1366, height: 860 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const env = (proj) =>
  Object.fromEntries(
    fs.readFileSync(path.join(ROOT, proj, '.env'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
  );

const results = [];
const check = (cond, msg) => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) console.log('FAIL', msg);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport = DESKTOP, scheme = 'light') {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/40[134]|409|Failed to load resource/.test(m.text()) && page.errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  return page;
}

async function shot(page, project, name, fullPage = false, keepToasts = false) {
  fs.mkdirSync(path.join(OUT, project), { recursive: true });
  // let earlier toasts expire so they don't cover the page
  if (!keepToasts) await page.waitForFunction(() => !document.querySelector('.toast'), { timeout: 9000, polling: 200 }).catch(() => {});
  await sleep(350);
  await page.screenshot({ path: path.join(OUT, project, name), fullPage });
}

// click the first visible element matching selector whose text includes `text`
async function clickText(page, selector, text) {
  await page.bringToFront();
  const handle = await page.waitForFunction(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().includes(t) && el.offsetParent !== null),
    { timeout: 8000, polling: 100 }, selector, text
  );
  await handle.asElement().click();
}
const textOf = (page, sel) => page.$eval(sel, (el) => el.textContent.trim());
const waitText = async (page, text, timeout = 8000) => {
  await page.bringToFront();
  return page.waitForFunction((t) => document.body.innerText.includes(t), { timeout, polling: 100 }, text);
};
async function fill(page, sel, value) {
  await page.click(sel, { count: 3 });
  await page.keyboard.press('Backspace');
  if (value) await page.type(sel, value);
}

/* ---------------- students ---------------- */
async function students(browser) {
  const P = 'student-management';
  const page = await newPage(browser);
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle0' });
  check((await page.$$('#rows tr:not(.skeleton)')).length === 10, 'students: first page shows 10 rows');
  check((await textOf(page, '[data-count="total"]')) === '24', 'students: total card shows 24');
  await shot(page, P, '01-student-list.png');

  await page.type('#search', 'Patel');
  await sleep(600);
  const rows = await page.$$eval('#rows tr .name strong', (els) => els.map((e) => e.textContent));
  check(rows.length > 0 && rows.every((n) => n.includes('Patel')), `students: search filters rows (${rows.length})`);
  await fill(page, '#search', '');
  await sleep(500);

  await page.click('.sort[data-sort="year"]');
  await sleep(400);
  const years = await page.$$eval('#rows tr td:nth-child(4)', (els) => els.map((e) => parseInt(e.textContent)));
  check(years.join() === [...years].sort((a, b) => a - b).join(), 'students: sort by year ascending');

  await page.click('#addBtn');
  await page.click('#saveBtn');
  await sleep(200);
  const errs = await page.$$eval('#studentForm .err', (els) => els.filter((e) => e.textContent).length);
  check(errs >= 4, `students: empty form shows field errors (${errs})`);
  await shot(page, P, '02-add-form-validation.png');

  await page.type('#roll_no', 'qa26-900');
  await page.type('#first_name', 'Sample');
  await page.type('#last_name', 'Learner');
  await page.type('#email', 'sample.learner@example.edu');
  await page.select('#course', 'Mathematics');
  await page.select('#year', '2');
  await page.click('#saveBtn');
  await waitText(page, 'Added Sample Learner');
  await shot(page, P, '03-student-added.png', false, true);
  check(true, 'students: create works and shows toast');

  // duplicate email
  await page.click('#addBtn');
  await page.type('#roll_no', 'QA26-901');
  await page.type('#first_name', 'Dup');
  await page.type('#last_name', 'Check');
  await page.type('#email', 'sample.learner@example.edu');
  await page.select('#course', 'Mathematics');
  await page.click('#saveBtn');
  await waitText(page, 'Another student already uses this email');
  check(true, 'students: duplicate email rejected with field message');
  await page.click('#formDialog [data-close]');

  await fill(page, '#search', 'QA26-900');
  await sleep(600);
  await page.click('[data-edit]');
  await page.select('#status', 'on leave');
  await page.click('#saveBtn');
  await waitText(page, 'Updated Sample Learner');
  await page.waitForSelector('#rows .pill');
  check((await textOf(page, '#rows .pill')) === 'on leave', 'students: edit saved');

  await page.click('[data-delete]');
  await sleep(300);
  await shot(page, P, '04-delete-confirm.png');
  await page.click('#confirmBtn');
  await waitText(page, 'Deleted Sample Learner');
  await sleep(400);
  check(!(await page.$eval('#emptyState', (e) => e.hidden)), 'students: row deleted, "no matches" state shown');
  await shot(page, P, '05-empty-search.png');

  const m = await newPage(browser, PHONE);
  await m.goto('http://localhost:3002/', { waitUntil: 'networkidle0' });
  await shot(m, P, '06-mobile.png');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, 'students: no horizontal scroll at 390px');
  check(page.errors.length + m.errors.length === 0, `students: no console errors ${[...page.errors, ...m.errors].join(' | ')}`);
  await page.close();
  await m.close();
}

/* ---------------- expenses ---------------- */
async function expenses(browser) {
  const P = 'expense-tracker';
  const { SEED_PASSWORD } = env('03-expense-tracker');
  const ctx = await browser.createBrowserContext();
  const page = await newPage(ctx);
  await page.goto('http://localhost:3003/', { waitUntil: 'networkidle0' });
  await shot(page, P, '01-login.png');

  await page.type('input[type=email]', 'demo@example.com');
  await page.type('input[type=password]', 'wrong-password-1');
  await page.click('form button.btn-primary');
  await waitText(page, 'Email or password is incorrect');
  check(true, 'expenses: wrong password rejected');

  await fill(page, 'input[type=password]', SEED_PASSWORD);
  await page.click('form button.btn-primary');
  await page.waitForSelector('.tx-list .tx:not(.skeleton)', { timeout: 10000 });
  await sleep(500);
  await shot(page, P, '02-transactions.png');
  check(true, 'expenses: login lands on dashboard');

  const before = await textOf(page, '.stat-card:nth-child(2) strong');
  await clickText(page, 'button', '+ Add');
  await page.waitForSelector('dialog[open]');
  await page.type('dialog input[inputmode=decimal]', '42.80');
  await page.select('dialog select', 'Transport');
  await page.type('dialog input[placeholder^="e.g."]', 'Train tickets');
  await shot(page, P, '03-add-transaction.png');
  await clickText(page, 'dialog button', 'Add');
  await waitText(page, 'Train tickets');
  await sleep(500);
  const after = await textOf(page, '.stat-card:nth-child(2) strong');
  check(before !== after, `expenses: expense total updated (${before} -> ${after})`);

  // filter by category
  await page.select('.filters select[aria-label=Category]', 'Transport');
  await sleep(600);
  const cats = await page.$$eval('.tx-main strong', (els) => els.map((e) => e.textContent));
  check(cats.length > 0 && cats.every((c) => c === 'Transport'), 'expenses: category filter');
  await page.select('.filters select[aria-label=Category]', '');
  await sleep(400);

  // delete then undo
  const count = async () => page.$$eval('.tx-main', (els) => els.filter((e) => e.textContent.includes('Train tickets')).length);
  const row = await page.waitForFunction(() => [...document.querySelectorAll('.tx')].find((li) => li.textContent.includes('Train tickets')), { polling: 100 });
  await row.asElement().hover();
  await (await row.asElement().$('.icon-btn.danger')).click();
  await waitText(page, 'Transaction deleted');
  await sleep(500);
  check((await count()) === 0, 'expenses: delete removes row');
  await clickText(page, '.toast-action', 'Undo');
  await waitText(page, 'Train tickets');
  check((await count()) === 1, 'expenses: undo restores row');

  await clickText(page, '.tabs button', 'Reports');
  await page.waitForSelector('.chart');
  await sleep(500);
  await shot(page, P, '04-reports.png', true);
  const bars = await page.$$eval('.chart rect', (r) => r.length);
  check(bars === 12, `expenses: trend chart has 12 bars (${bars})`);

  // CSV export
  const csv = await page.evaluate(async () => (await fetch('/api/transactions/export.csv?month=all')).text());
  check(csv.startsWith('Date,Type,Category,Amount,Note') && csv.includes('Train tickets'), 'expenses: CSV export contains data');

  // previous month navigation
  await page.click('button[aria-label="Previous month"]');
  await sleep(600);
  check((await textOf(page, '.month-switch h1')) !== '', 'expenses: month navigation');

  const m = await newPage(ctx, PHONE);
  await m.goto('http://localhost:3003/', { waitUntil: 'networkidle0' });
  await m.waitForSelector('.tx-list .tx:not(.skeleton)');
  await shot(m, P, '05-mobile.png');
  check(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'expenses: no horizontal scroll at 390px');

  const d = await newPage(ctx, DESKTOP, 'dark');
  await d.goto('http://localhost:3003/#reports', { waitUntil: 'networkidle0' });
  await d.waitForSelector('.chart');
  await shot(d, P, '06-reports-dark.png');

  // logout
  await clickText(page, 'button', 'Log out');
  await page.waitForSelector('input[type=email]');
  const me = await page.evaluate(async () => (await fetch('/api/auth/me')).status);
  check(me === 401, 'expenses: logout clears the session');

  check(page.errors.length + m.errors.length + d.errors.length === 0, `expenses: no console errors ${[...page.errors, ...m.errors, ...d.errors].join(' | ')}`);
  await ctx.close();
}

/* ---------------- shop ---------------- */
async function shop(browser) {
  const P = 'ecommerce';
  const { SEED_ADMIN_PASSWORD, SEED_CUSTOMER_PASSWORD } = env('04-ecommerce');
  const ctx = await browser.createBrowserContext();
  const page = await newPage(ctx);
  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.product-card:not(.skeleton)');
  await shot(page, P, '01-catalog.png');
  check((await page.$$('.product-card')).length === 12, 'shop: first page shows 12 products');

  await clickText(page, '.chip', 'Desk');
  await sleep(600);
  const cats = await page.$$eval('.product-card .eyebrow', (els) => els.map((e) => e.textContent));
  check(cats.length > 0 && cats.every((c) => c === 'Desk'), 'shop: category filter');

  await page.type('.search input', 'mug');
  await page.keyboard.press('Enter');
  await sleep(700);
  const names = await page.$$eval('.product-card h3', (els) => els.map((e) => e.textContent));
  check(names.length === 2 && names.every((n) => /mug/i.test(n)), `shop: search "mug" (${names.join(', ')})`);

  await clickText(page, '.product-card h3 a', 'Speckled Stoneware Mug');
  await page.waitForSelector('.detail-info');
  await page.click('button[aria-label="Increase quantity"]');
  await shot(page, P, '02-product-page.png');
  await clickText(page, 'button', 'Add to cart');
  await waitText(page, '2 in your cart');
  check((await textOf(page, '.cart-count')) === '2', 'shop: cart badge shows 2');

  await page.goto('http://localhost:3004/product/glass-storage-jar-1l', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.detail-info');
  check((await textOf(page, '.stock')) === 'Only 4 left', 'shop: low stock note');
  await clickText(page, 'button', 'Add to cart');

  await page.click('.cart-link');
  await page.waitForSelector('.totals');
  await sleep(400);
  await shot(page, P, '03-cart.png');
  const total = await textOf(page, '.totals .grand dd');
  check(total === '$44.49', `shop: cart total incl. shipping (${total})`);

  await clickText(page, 'button', 'Checkout');
  await page.waitForSelector('.auth-card');
  check(page.url().includes('/login?next=%2Fcheckout'), 'shop: checkout redirects guests to login');
  await page.type('input[type=email]', 'customer@example.com');
  await page.type('input[type=password]', SEED_CUSTOMER_PASSWORD);
  await page.click('.auth-card button.btn-primary');
  await page.waitForSelector('.checkout-form');
  check(page.url().endsWith('/checkout'), 'shop: returns to checkout after login');

  await clickText(page, '.checkout-form button.btn-primary', 'Place order');
  await sleep(300);
  const errs = await page.$$eval('.checkout-form .f-err', (e) => e.length);
  check(errs >= 3, `shop: empty delivery form is blocked (${errs} errors)`);
  await shot(page, P, '04-checkout-validation.png');

  await page.type('input[autocomplete=tel]', '555 0142');
  await page.type('input[autocomplete=street-address]', '12 Sample Road');
  await page.type('input[autocomplete=address-level2]', 'Exampleton');
  await page.type('input[autocomplete=postal-code]', 'EX1 2AM');
  await clickText(page, '.checkout-form button.btn-primary', 'Place order');
  await page.waitForSelector('.notice.success', { timeout: 10000 });
  await sleep(300);
  await shot(page, P, '05-order-placed.png');
  check(!(await page.$('.cart-count')), 'shop: cart emptied after order');
  const orderUrl = page.url().split('?')[0];

  await page.goto('http://localhost:3004/orders', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.order-row');
  check((await page.$$('.order-row')).length >= 1, 'shop: order appears in My orders');

  // log out, log in as admin
  await clickText(page, '.nav-btn', 'Log out');
  await page.goto('http://localhost:3004/admin', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.auth-card');
  await page.type('input[type=email]', 'admin@example.com');
  await page.type('input[type=password]', SEED_ADMIN_PASSWORD);
  await page.click('.auth-card button.btn-primary');
  await page.waitForSelector('.table tbody tr');
  await clickText(page, 'td button', 'Mark processing');
  await waitText(page, 'is now processing');
  await sleep(500);
  await shot(page, P, '06-admin-orders.png', false, true);
  check(true, 'shop: admin can move an order to processing');

  await clickText(page, '.chip', 'Products');
  await page.waitForSelector('.prod-cell');
  await shot(page, P, '07-admin-products.png', true);

  await page.goto('http://localhost:3004/admin/products/new', { waitUntil: 'networkidle0' });
  await page.waitForSelector('form .form-grid');
  await page.type('.form-grid input:not([type])', 'Ceramic Plant Pot');
  await page.$$eval('.form-grid select', (s) => s);
  await page.select('.form-grid select', 'Home');
  await fill(page, 'input[inputmode=decimal]', '17.25');
  await fill(page, 'input[inputmode=numeric]', '9');
  await page.type('textarea', 'Matte glaze, drainage hole and saucer.');
  await shot(page, P, '08-admin-new-product.png');
  await clickText(page, 'button', 'Create product');
  await waitText(page, 'Product created');
  const res = await page.evaluate(async () => (await fetch('/api/products/ceramic-plant-pot')).status);
  check(res === 200, 'shop: admin-created product is live in the shop');

  // the customer order now cannot be cancelled by the customer (processing)
  const cancelRes = await page.evaluate(async (u) => (await fetch(`/api/orders/${u.split('/').pop()}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, orderUrl);
  check(cancelRes === 409, 'shop: processing orders cannot be cancelled');

  // a customer is blocked from admin
  const ctx2 = await browser.createBrowserContext();
  const guest = await newPage(ctx2);
  const status = await guest.goto('http://localhost:3004/api/admin/orders').then((r) => r.status());
  check(status === 401, 'shop: admin API refuses guests');

  const m = await newPage(ctx2, PHONE);
  await m.goto('http://localhost:3004/', { waitUntil: 'networkidle0' });
  await m.waitForSelector('.product-card:not(.skeleton)');
  await shot(m, P, '09-mobile-catalog.png');
  check(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'shop: no horizontal scroll at 390px');
  await m.click('.menu-btn');
  await sleep(200);
  await shot(m, P, '10-mobile-menu.png');

  check(page.errors.length + m.errors.length === 0, `shop: no console errors ${[...page.errors, ...m.errors].join(' | ')}`);
  await ctx.close();
  await ctx2.close();
}

/* ---------------- portfolio ---------------- */
async function portfolio(browser) {
  const P = 'portfolio';
  const page = await newPage(browser);
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await shot(page, P, '01-home.png');
  await shot(page, P, '02-full-page.png', true);
  check((await page.$$('.project')).length === 4, 'portfolio: four project cards');
  const imgs = await page.$$eval('.project-thumb img', (els) => els.map((i) => i.naturalWidth > 0));
  check(imgs.length === 3 && imgs.every(Boolean), 'portfolio: project screenshots load');

  await clickText(page, '.filter', 'React');
  await sleep(200);
  check((await page.$$('.project')).length === 2, 'portfolio: React filter shows 2');
  await clickText(page, '.filter', 'All');

  await clickText(page, '.link-btn', 'Details');
  await page.waitForSelector('dialog[open]');
  await shot(page, P, '03-project-details.png');
  await page.keyboard.press('Escape');

  await page.click('#sendBtn');
  await sleep(200);
  const errs = await page.$$eval('.field.invalid', (e) => e.length);
  check(errs === 3, `portfolio: empty form shows 3 errors (${errs})`);
  await page.$eval('#contact', (e) => e.scrollIntoView());
  await shot(page, P, '04-contact-validation.png');

  await page.type('#f-name', 'Test Visitor');
  await page.type('#f-email', 'visitor@example.com');
  await page.type('#f-subject', 'Question about the shop project');
  await page.type('#f-message', 'Hi, I had a look at the e-commerce demo and wanted to ask how stock is handled.');
  await page.click('#sendBtn');
  await waitText(page, 'your message is in');
  await shot(page, P, '05-contact-sent.png');
  check(true, 'portfolio: contact form submits');

  const d = await newPage(browser, DESKTOP, 'dark');
  await d.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await shot(d, P, '06-dark-mode.png');

  const m = await newPage(browser, PHONE);
  await m.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await shot(m, P, '07-mobile.png');
  await m.click('#menuBtn');
  await shot(m, P, '08-mobile-menu.png');
  check(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'portfolio: no horizontal scroll at 390px');

  check(page.errors.length + d.errors.length + m.errors.length === 0, `portfolio: no console errors ${[...page.errors, ...d.errors, ...m.errors].join(' | ')}`);
  await page.close();
  await d.close();
  await m.close();
}

/* thumbnails for the portfolio project cards */
async function thumbs(browser) {
  const out = path.join(ROOT, '01-portfolio', 'public', 'img');
  fs.mkdirSync(out, { recursive: true });
  const vp = { width: 1280, height: 800 };
  const page = await newPage(browser, vp);
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle0' });
  await sleep(400);
  await page.screenshot({ path: path.join(out, 'students.png') });

  const ctx = await browser.createBrowserContext();
  const p2 = await newPage(ctx, vp);
  await p2.goto('http://localhost:3003/', { waitUntil: 'networkidle0' });
  await p2.type('input[type=email]', 'demo@example.com');
  await p2.type('input[type=password]', env('03-expense-tracker').SEED_PASSWORD);
  await p2.click('form button.btn-primary');
  await p2.waitForSelector('.tx-list .tx:not(.skeleton)');
  await clickText(p2, '.tabs button', 'Reports');
  await p2.waitForSelector('.chart');
  await sleep(500);
  await p2.screenshot({ path: path.join(out, 'expenses.png') });
  await ctx.close();

  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.product-card:not(.skeleton)');
  await sleep(400);
  await page.screenshot({ path: path.join(out, 'shop.png') });
  await page.close();
  check(true, 'thumbnails captured');
}

const steps = { thumbs, students, expenses, shop, portfolio };
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'browser-check-')), args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions'] });
try {
  for (const [name, fn] of Object.entries(steps)) {
    if (only.length && !only.includes(name)) continue;
    try {
      await fn(browser);
    } catch (err) {
      check(false, `${name}: crashed - ${err.message.split('\n')[0]}`);
    }
  }
} finally {
  await browser.close();
}
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

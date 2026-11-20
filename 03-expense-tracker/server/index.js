import { openDb } from './db.js';
import { createApp } from './app.js';
import { resolveSecret } from './auth.js';

const port = Number(process.env.PORT) || 3003;

const app = createApp(openDb(), {
  jwtSecret: resolveSecret(),
  secureCookies: process.env.COOKIE_SECURE === 'true',
});

app.listen(port, () => {
  console.log(`Expense Tracker API on http://localhost:${port}`);
});

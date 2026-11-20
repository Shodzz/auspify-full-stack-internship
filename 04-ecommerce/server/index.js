import { openDb } from './db.js';
import { createApp } from './app.js';
import { resolveSecret } from './auth.js';

const port = Number(process.env.PORT) || 3004;

createApp(openDb(), {
  jwtSecret: resolveSecret(),
  secureCookies: process.env.COOKIE_SECURE === 'true',
}).listen(port, () => {
  console.log(`Corner Store running at http://localhost:${port}`);
});

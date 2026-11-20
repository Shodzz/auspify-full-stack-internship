import { openDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3002;

createApp(openDb()).listen(port, () => {
  console.log(`Student Management running at http://localhost:${port}`);
});

import { openDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3001;
const app = createApp(openDb());

app.listen(port, () => {
  console.log(`Portfolio running at http://localhost:${port}`);
});

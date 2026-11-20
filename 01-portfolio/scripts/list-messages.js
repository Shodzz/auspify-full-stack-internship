// Prints the messages people sent through the contact form.
// Usage: npm run messages
import { openDb } from '../server/db.js';

const rows = openDb()
  .prepare('SELECT id, name, email, subject, message, created_at FROM messages ORDER BY id DESC')
  .all();

if (!rows.length) {
  console.log('No messages yet.');
} else {
  for (const r of rows) {
    console.log(`#${r.id}  ${r.created_at}  ${r.name} <${r.email}>`);
    if (r.subject) console.log(`  Subject: ${r.subject}`);
    console.log(`  ${r.message.replace(/\n/g, '\n  ')}\n`);
  }
}

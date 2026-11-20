import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContact } from './validate.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp(db, { contactLimit = 5 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  app.use(express.static(publicDir, { extensions: ['html'] }));

  const insertMessage = db.prepare(
    'INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: contactLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many messages from your address. Please try again in a few minutes.' },
  });

  app.post('/api/contact', limiter, (req, res) => {
    const { data, errors } = checkContact(req.body);

    // Bot filled the hidden field. Answer like it worked and drop it.
    if (data.website) return res.status(201).json({ ok: true });

    if (errors) {
      return res.status(400).json({ error: 'Some fields need fixing.', fields: errors });
    }

    insertMessage.run(data.name, data.email, data.subject, data.message);
    res.status(201).json({ ok: true });
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const msg = err.type === 'entity.parse.failed' ? 'Invalid JSON body.' : status >= 500 ? 'Something went wrong on our side.' : err.message;
    res.status(status).json({ error: msg });
  });

  return app;
}

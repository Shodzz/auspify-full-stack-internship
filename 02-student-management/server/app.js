import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkStudent, COURSES, STATUSES } from './rules.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// whitelist: query param value -> ORDER BY clause
const SORTS = {
  name: 'last_name COLLATE NOCASE, first_name COLLATE NOCASE',
  roll_no: 'roll_no',
  course: 'course, last_name COLLATE NOCASE',
  year: 'year',
  enrolled_on: 'enrolled_on',
  status: 'status',
};

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '50kb' }));
  app.use(express.static(publicDir));

  const getById = db.prepare('SELECT * FROM students WHERE id = ?');
  const insert = db.prepare(`
    INSERT INTO students (roll_no, first_name, last_name, email, phone, course, year, enrolled_on, status)
    VALUES (:roll_no, :first_name, :last_name, :email, :phone, :course, :year, :enrolled_on, :status)`);
  const update = db.prepare(`
    UPDATE students SET roll_no = :roll_no, first_name = :first_name, last_name = :last_name, email = :email,
      phone = :phone, course = :course, year = :year, enrolled_on = :enrolled_on, status = :status,
      updated_at = datetime('now')
    WHERE id = :id`);
  const remove = db.prepare('DELETE FROM students WHERE id = ?');
  const findClash = db.prepare('SELECT roll_no, email FROM students WHERE (roll_no = ? OR email = ?) AND id != ?');

  const parseId = (raw) => {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'Student not found.');
    return id;
  };

  // Check unique fields ourselves so we can say which one clashed.
  const assertUnique = (s, id = 0) => {
    const fields = {};
    for (const row of findClash.all(s.roll_no, s.email, id)) {
      if (row.roll_no === s.roll_no) fields.roll_no = 'Another student already has this roll number.';
      if (row.email === s.email) fields.email = 'Another student already uses this email.';
    }
    if (Object.keys(fields).length) throw new HttpError(409, 'Duplicate value.', fields);
  };

  app.get('/api/meta', (req, res) => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const r of db.prepare('SELECT status, COUNT(*) n FROM students GROUP BY status').all()) counts[r.status] = r.n;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json({ courses: COURSES, statuses: STATUSES, counts, total });
  });

  app.get('/api/students', (req, res) => {
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    const course = String(req.query.course ?? '');
    const status = String(req.query.status ?? '');
    const sortKey = SORTS[req.query.sort] ? req.query.sort : 'name';
    const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    let page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const where = [];
    const params = [];
    if (q) {
      // escape % and _ so a search for "50%" means the literal text
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push(`(first_name || ' ' || last_name LIKE ? ESCAPE '\\' OR roll_no LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')`);
      params.push(like, like, like);
    }
    if (course) { where.push('course = ?'); params.push(course); }
    if (status) { where.push('status = ?'); params.push(status); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const total = db.prepare(`SELECT COUNT(*) n FROM students ${whereSql}`).get(...params).n;
    const pages = Math.max(Math.ceil(total / limit), 1);
    page = Math.min(page, pages);

    const order = SORTS[sortKey].split(', ').map((part) => `${part} ${dir}`).join(', ');
    const items = db
      .prepare(`SELECT * FROM students ${whereSql} ORDER BY ${order}, id ${dir} LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    res.json({ items, total, page, pages, limit });
  });

  app.get('/api/students/:id', (req, res) => {
    const row = getById.get(parseId(req.params.id));
    if (!row) throw new HttpError(404, 'Student not found.');
    res.json(row);
  });

  app.post('/api/students', (req, res) => {
    const { student, errors } = checkStudent(req.body);
    if (errors) throw new HttpError(400, 'Some fields need fixing.', errors);
    assertUnique(student);
    const { lastInsertRowid } = insert.run(student);
    res.status(201).json(getById.get(lastInsertRowid));
  });

  app.put('/api/students/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!getById.get(id)) throw new HttpError(404, 'Student not found.');
    const { student, errors } = checkStudent(req.body);
    if (errors) throw new HttpError(400, 'Some fields need fixing.', errors);
    assertUnique(student, id);
    update.run({ ...student, id });
    res.json(getById.get(id));
  });

  app.delete('/api/students/:id', (req, res) => {
    const { changes } = remove.run(parseId(req.params.id));
    if (!changes) throw new HttpError(404, 'Student not found.');
    res.status(204).end();
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message;
    if (err.type === 'entity.parse.failed') message = 'Invalid JSON body.';
    if (status >= 500) {
      console.error(err);
      message = 'Unexpected server error.';
    }
    res.status(status).json({ error: message, ...(err.fields && { fields: err.fields }) });
  });

  return app;
}

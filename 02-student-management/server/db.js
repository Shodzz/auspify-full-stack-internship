import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const schema = `
CREATE TABLE IF NOT EXISTS students (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_no      TEXT    NOT NULL UNIQUE,
  first_name   TEXT    NOT NULL,
  last_name    TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE,
  phone        TEXT    NOT NULL DEFAULT '',
  course       TEXT    NOT NULL,
  year         INTEGER NOT NULL CHECK (year BETWEEN 1 AND 5),
  enrolled_on  TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'active',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
`;

export function openDb(file = process.env.DB_FILE || 'data/students.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(schema);
  return db;
}

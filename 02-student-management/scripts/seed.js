// Replaces all student rows with made-up sample data.
// Names are random combinations, emails use the reserved example.edu domain,
// and phone numbers use the 555-01xx range that is reserved for fiction.
import { openDb } from '../server/db.js';
import { COURSES } from '../server/rules.js';

const first = ['Aarav', 'Maya', 'Leo', 'Zara', 'Noah', 'Isha', 'Omar', 'Lena', 'Kabir', 'Sofia', 'Ethan', 'Anaya', 'Ravi', 'Chloe', 'Yusuf', 'Mei', 'Daniel', 'Priya', 'Lucas', 'Amara', 'Arjun', 'Hana', 'Felix', 'Nadia'];
const last = ['Sharma', 'Okafor', 'Brennan', 'Haddad', 'Kim', 'Patel', 'Novak', 'Silva', 'Mensah', 'Rossi', 'Tanaka', 'Iyer', 'Moreau', 'Ali', 'Fischer', 'Das'];
const codes = { 'Computer Science': 'CS', 'Information Technology': 'IT', 'Electronics & Communication': 'EC', 'Mechanical Engineering': 'ME', 'Business Administration': 'BA', Mathematics: 'MA' };
const statuses = ['active', 'active', 'active', 'on leave', 'on leave', 'withdrawn'];

// small deterministic PRNG so the seed gives the same data every time
let state = 42;
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const db = openDb();
const insert = db.prepare(`
  INSERT INTO students (roll_no, first_name, last_name, email, phone, course, year, enrolled_on, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

db.exec('BEGIN');
db.exec('DELETE FROM students');
db.exec("DELETE FROM sqlite_sequence WHERE name = 'students'");

first.forEach((fn, i) => {
  const ln = pick(last);
  const course = COURSES[i % COURSES.length];
  const year = 1 + Math.floor(rand() * 4);
  // intake is the academic year they started, always in the past
  const intake = new Date().getFullYear() - year;
  const status = year === 4 && rand() > 0.5 ? 'graduated' : pick(statuses);
  insert.run(
    `${codes[course]}${String(intake).slice(2)}-${String(101 + i).padStart(3, '0')}`,
    fn,
    ln,
    `${fn}.${ln}${i}@example.edu`.toLowerCase(),
    rand() > 0.2 ? `555-01${String(10 + i).padStart(2, '0')}` : '',
    course,
    year,
    `${intake}-0${7 + Math.floor(rand() * 3)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
    status
  );
});

db.exec('COMMIT');
console.log(`Seeded ${first.length} sample students.`);

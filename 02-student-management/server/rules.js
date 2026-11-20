// Allowed values and validation for a student record.
// The front end loads COURSES and STATUSES from /api/meta so the lists stay in one place.

export const COURSES = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Business Administration',
  'Mathematics',
];

export const STATUSES = ['active', 'on leave', 'graduated', 'withdrawn'];

const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLL_RE = /^[A-Z0-9-]{3,20}$/;
const PHONE_RE = /^[0-9+()\s-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const text = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function checkStudent(body) {
  const src = body && typeof body === 'object' ? body : {};
  const s = {
    roll_no: text(src.roll_no).toUpperCase(),
    first_name: text(src.first_name).replace(/\s+/g, ' '),
    last_name: text(src.last_name).replace(/\s+/g, ' '),
    email: text(src.email).toLowerCase(),
    phone: text(src.phone),
    course: text(src.course),
    year: Number(src.year),
    enrolled_on: text(src.enrolled_on),
    status: text(src.status).toLowerCase() || 'active',
  };

  const e = {};
  if (!ROLL_RE.test(s.roll_no)) e.roll_no = 'Use 3-20 letters, digits or dashes (e.g. CS24-017).';
  if (!s.first_name || s.first_name.length > 50 || !NAME_RE.test(s.first_name)) e.first_name = 'Enter a first name (letters only, up to 50).';
  if (!s.last_name || s.last_name.length > 50 || !NAME_RE.test(s.last_name)) e.last_name = 'Enter a last name (letters only, up to 50).';
  if (!EMAIL_RE.test(s.email) || s.email.length > 120) e.email = 'Enter a valid email address.';
  if (s.phone && !PHONE_RE.test(s.phone)) e.phone = 'Phone can contain digits, spaces, +, - and brackets.';
  if (!COURSES.includes(s.course)) e.course = 'Pick a course from the list.';
  if (!Number.isInteger(s.year) || s.year < 1 || s.year > 5) e.year = 'Year must be between 1 and 5.';
  if (!isRealDate(s.enrolled_on)) e.enrolled_on = 'Enter a valid date.';
  else if (s.enrolled_on > new Date().toISOString().slice(0, 10)) e.enrolled_on = 'Enrollment date can not be in the future.';
  if (!STATUSES.includes(s.status)) e.status = 'Unknown status.';

  return { student: s, errors: Object.keys(e).length ? e : null };
}

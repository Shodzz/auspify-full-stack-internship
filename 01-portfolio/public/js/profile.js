// All the personal content on the site comes from this file.
// Leave a link as '' to hide it.

// All four internship projects live in ONE GitHub repository, each in its own folder.
// PENDING: the repository has not been created yet. Once it exists, set its URL here,
// e.g. 'https://github.com/Shodzz/<repository-name>'. Each project's "Source" link then
// points to that project's folder (this assumes the default branch is called 'main').
export const REPO_URL = '';
const REPO_BRANCH = 'main';
const repoFolder = (folder) => (REPO_URL ? `${REPO_URL}/tree/${REPO_BRANCH}/${folder}` : '');

export const profile = {
  name: 'Shady Mamdouh Kamal Labib Zaki',
  role: 'Full-Stack Web Developer',
  location: 'Cairo, Egypt',
  email: 'shadoshady409@gmail.com',
  tagline:
    'I build web apps from the database up: REST APIs in Node and Express, interfaces in React or plain JavaScript, and layouts that hold up on a phone.',
  // PENDING: a personal biography can be added here as extra paragraphs.
  about: [
    "I'm a Full Stack Development Intern at Auspify Technologies, based in Cairo, Egypt.",
    'The projects on this page came out of that internship. Each one is a complete app with its own API, database and front end, and each one runs locally with a single install.',
  ],
  facts: [
    ['Based in', 'Cairo, Egypt'],
    ['Focus', 'Full-stack JavaScript'],
    ['Currently', 'Intern at Auspify Technologies'],
  ],
  skills: {
    Frontend: ['HTML', 'CSS', 'JavaScript', 'React', 'Vite', 'Responsive layout'],
    Backend: ['Node.js', 'Express', 'REST APIs', 'JWT auth', 'Input validation'],
    Data: ['SQL', 'SQLite', 'Schema design', 'Aggregate queries'],
    Tools: ['Git', 'npm', 'node:test', 'Browser DevTools'],
  },
  links: {
    github: 'https://github.com/Shodzz',
    linkedin: '',
    resume: '',
  },
};

export const projects = [
  {
    id: 'students',
    title: 'Student Management System',
    summary: 'Add, search, edit and delete student records. Server-side validation, unique roll numbers and emails, paging and sorting.',
    tags: ['Vanilla JS', 'Node.js', 'Express', 'SQL'],
    image: 'img/students.png',
    highlights: [
      'REST API with GET/POST/PUT/DELETE on /api/students',
      'Search, filter by course and status, sortable columns, pagination',
      'Same validation rules on client and server, with per-field error messages',
      'Seed script with clearly fake sample students',
    ],
    repo: repoFolder('02-student-management'),
  },
  {
    id: 'expenses',
    title: 'Expense Tracker',
    summary: 'Personal income and expense log with accounts, monthly summaries, a category breakdown and CSV export.',
    tags: ['React', 'Node.js', 'Express', 'SQL', 'Auth'],
    image: 'img/expenses.png',
    highlights: [
      'Register / log in with bcrypt-hashed passwords and an httpOnly JWT cookie',
      'Every query is scoped to the signed-in user',
      'Reports: six-month trend and spending by category, drawn with plain SVG',
      'Filter by month, type and category; export the result as CSV',
    ],
    repo: repoFolder('03-expense-tracker'),
  },
  {
    id: 'shop',
    title: 'Corner Store (E-Commerce)',
    summary: 'A small online shop: product catalog, cart, checkout, order history and an admin area for products and orders.',
    tags: ['React', 'Node.js', 'Express', 'SQL', 'Auth'],
    image: 'img/shop.png',
    highlights: [
      'Catalog with category filter, search and sort',
      'Cart kept in the browser; prices and stock re-checked on the server at checkout',
      'Orders are written in a single transaction and stock is decremented safely',
      'Admin role can add/edit products and move orders through their statuses',
    ],
    repo: repoFolder('04-ecommerce'),
  },
  {
    id: 'portfolio',
    title: 'This Portfolio',
    summary: 'Responsive single-page site with a light/dark theme and a contact form that stores messages in SQLite.',
    tags: ['Vanilla JS', 'Node.js', 'Express', 'SQL'],
    image: '',
    highlights: [
      'No framework, no external fonts or CDNs',
      'Contact endpoint with validation, rate limiting and a honeypot field',
      'Content driven from a single profile file',
    ],
    repo: repoFolder('01-portfolio'),
  },
];

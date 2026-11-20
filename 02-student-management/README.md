# Student Management System

A small admin console for student records. You can add, view, search, edit and
delete students. The front end is plain JavaScript talking to an Express REST
API, and records are stored in SQLite.

## Features

- Add / edit in a modal form, delete with a confirmation step
- Search by name, roll number or email (debounced as you type)
- Filter by course and status; the summary cards at the top also act as status filters
- Sort by any column, both directions
- Pagination with 10 / 25 / 50 rows per page
- Filters, sort and page are kept in the URL, so refresh and back/forward work
- Validation on both sides. The server is the source of truth and returns
  per-field messages that the form shows under each input.
- Duplicate roll numbers or emails are rejected with a 409 saying which field clashed
- Loading skeleton, empty state, "no matches" state, error state with retry, toast messages
- Table turns into stacked cards on narrow screens

## Stack

Vanilla JS (ES modules), HTML, CSS, Node.js, Express 5, SQLite through `node:sqlite`.

## Run it

```bash
npm install
npm run seed     # optional: 24 made-up students
npm start
```

Open http://localhost:3002.

`npm run seed` **deletes all existing rows** before inserting the sample set.
The sample names are random combinations, the emails use the reserved
`example.edu` domain and phone numbers are in the fictional 555-01xx range.

| Command | What it does |
|---------|--------------|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart |
| `npm run seed` | Reset the database to the sample data |
| `npm test` | API tests against an in-memory database |

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/meta` | Course list, status list, counts per status |
| GET | `/api/students` | Query: `q`, `course`, `status`, `sort` (`name`, `roll_no`, `course`, `year`, `enrolled_on`, `status`), `dir` (`asc`/`desc`), `page`, `limit` (max 100) |
| GET | `/api/students/:id` | One student |
| POST | `/api/students` | Create. 201 with the new record |
| PUT | `/api/students/:id` | Replace all fields |
| DELETE | `/api/students/:id` | 204 on success |

Errors always come back as `{ "error": "message", "fields": { ... } }` with
`fields` present only for validation (400) and duplicate (409) errors.

### Student fields

| Field | Rule |
|-------|------|
| `roll_no` | 3-20 letters/digits/dashes, stored upper-case, unique |
| `first_name`, `last_name` | Letters, spaces, `.`, `'` and `-`, max 50 |
| `email` | Valid format, stored lower-case, unique |
| `phone` | Optional, digits and `+ - ( )` |
| `course` | One of the courses in `server/rules.js` |
| `year` | 1 to 5 |
| `enrolled_on` | Real date in `YYYY-MM-DD`, not in the future |
| `status` | `active`, `on leave`, `graduated` or `withdrawn` |

## Notes on the code

- `ORDER BY` can't use bound parameters, so sort keys go through a whitelist
  in `server/app.js`. Anything else falls back to sorting by name.
- `%` and `_` in the search box are escaped so they match literally.
- There is no login. This is meant as an internal admin tool; adding auth
  would follow the same cookie + JWT approach used in the expense tracker.

## Moving to MySQL

The schema in `server/db.js` is close to standard SQL. For MySQL you would
swap `INTEGER PRIMARY KEY AUTOINCREMENT` for `INT AUTO_INCREMENT PRIMARY KEY`,
use `DATE`/`DATETIME` columns, replace `datetime('now')` with `NOW()`, and use
the `mysql2` package instead of `node:sqlite`.

## Author

Shady Mamdouh Kamal Labib Zaki, Full Stack Development Intern at Auspify Technologies (Cairo, Egypt)

- GitHub: https://github.com/Shodzz
- Repository: this project is the `02-student-management/` folder of the internship projects repository, which holds all four projects. See the [root README](../README.md) for the overview and the repository link.

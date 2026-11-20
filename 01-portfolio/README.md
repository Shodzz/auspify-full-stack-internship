# Portfolio Website

A single-page portfolio with Home, About, Projects and Contact sections. The
contact form posts to a small Express API that saves messages in SQLite.

## Features

- Responsive layout (tested at 390px, 768px and 1366px wide), mobile menu
- Light and dark theme, follows the OS setting until you pick one
- Project cards with a technology filter and a details dialog
- Contact form:
  - checked in the browser and again on the server
  - per-field error messages, loading state on the button, success message
  - honeypot field for basic bot filtering
  - rate limit of 5 messages per 15 minutes per IP
- No external fonts, CDNs or trackers. Helmet sets security headers,
  including a strict Content Security Policy.

## Stack

HTML, CSS, vanilla JavaScript (ES modules), Node.js, Express 5, SQLite
(`node:sqlite`, built into Node 22.13+).

## Run it

```bash
npm install
cp .env.example .env    # optional, defaults are fine
npm start
```

Open http://localhost:3001.

| Command | What it does |
|---------|--------------|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart on file changes |
| `npm run messages` | Print messages received through the contact form |
| `npm test` | Run the API tests (in-memory database) |

## Making it yours

All personal content is in [`public/js/profile.js`](public/js/profile.js):
name, role, intro, skills, links and the project list. Links left as
`''` are hidden. `REPO_URL` at the top of the file is the GitHub repository that
holds all four internship projects; each project card's "Source" link points to
its folder in that repository.

Project thumbnails are screenshots of the other internship projects, stored in
`public/img/`.

## API

`POST /api/contact`

```json
{ "name": "Jane", "email": "jane@example.com", "subject": "Hi", "message": "At least ten characters" }
```

- `201 { "ok": true }` on success
- `400 { "error": "...", "fields": { "email": "..." } }` when validation fails
- `429` when the rate limit is hit

## Files

```
server/
  app.js        routes, middleware, error handler
  db.js         opens SQLite and creates the messages table
  validate.js   contact form rules
  index.js      entry point
public/
  index.html
  css/style.css
  js/main.js    rendering, nav, theme, form handling
  js/profile.js your content
scripts/list-messages.js
test/contact.test.js
```

## Notes

- Messages are stored, not emailed. Sending email needs an SMTP account or a
  service like SendGrid, which isn't set up here. `scripts/list-messages.js`
  is the stand-in.
- There is no deployment. The site runs locally only.

## Author

Shady Mamdouh Kamal Labib Zaki, Full Stack Development Intern at Auspify Technologies (Cairo, Egypt)

- GitHub: https://github.com/Shodzz
- Repository: this project is the `01-portfolio/` folder of the internship projects repository, which holds all four projects. See the [root README](../README.md) for the overview and the repository link.

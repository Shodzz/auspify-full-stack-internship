# Browser check

`browser-check.mjs` opens the four apps in headless Chrome, clicks through
their main flows, prints PASS/FAIL for each step and saves the screenshots
in `../screenshots/`. It also refreshes the project thumbnails in
`01-portfolio/public/img/`.

It is a dev tool, not part of any project, so it isn't in any project's
dependencies.

## Running it

1. Start all four apps (each in its own terminal) after running their seed scripts:
   ```bash
   cd 01-portfolio && npm start
   cd 02-student-management && npm run seed && npm start
   cd 03-expense-tracker && npm run seed && npm run build && npm start
   cd 04-ecommerce && npm run seed && npm run build && npm start
   ```
   Projects 03 and 04 need a `.env` with `JWT_SECRET` and the seed passwords
   filled in, since the script logs in with them.
2. Install the one dependency and run:
   ```bash
   cd checks
   npm init -y && npm install puppeteer-core
   node browser-check.mjs ..
   ```

Set `CHROME_PATH` if Chrome isn't at the default Windows location. The shop
flow places a real order in the local database, so re-run the seed scripts
before running it again if you want the same numbers.

// Runs the API (with --watch) and the Vite dev server together, so `npm run dev`
// is all you need. Ctrl+C stops both.
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const api = spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit', env: process.env });

const vite = await createServer({ configFile: 'vite.config.js' });
await vite.listen();
vite.printUrls();

const stop = async () => {
  api.kill();
  await vite.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => {
  if (code) console.error(`API process exited with code ${code}`);
});

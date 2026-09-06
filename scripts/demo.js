import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = process.env.PORT || '4320';
const child = spawn(process.execPath, ['--env-file-if-exists=.env.local', 'src/server.js'], {
  cwd: root,
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
});

console.log(`Meridian demo starting at http://127.0.0.1:${port}/`);
console.log('Press Ctrl+C to stop. Set PORT or CLOSELOOP_DB to override local defaults.');

const stop = signal => { if (!child.killed) child.kill(signal); };
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

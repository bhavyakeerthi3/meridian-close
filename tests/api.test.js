import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 4398;
const base = `http://127.0.0.1:${port}`;
let dir;
let child;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'closeloop-api-'));
  child = spawn(process.execPath, ['--env-file-if-exists=.env.local', 'src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), CLOSELOOP_DB: join(dir, 'api.sqlite'), TENSORMUX_API_KEY: '', NEATLOGS_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  const ready = new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(() => rejectReady(new Error(`API server did not start: ${output}`)), 10_000);
    child.stdout.on('data', chunk => { output += chunk; if (output.includes('CloseLoop ready')) { clearTimeout(timer); resolveReady(); } });
    child.once('exit', code => rejectReady(new Error(`API server exited (${code}): ${output}`)));
  });
  await ready;
});

after(async () => {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function request(path, options = {}) {
  return fetch(`${base}${path}`, options);
}
const jsonPost = (path, body, extra = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });

test('API state exposes a complete summary and integration statuses', async () => {
  const response = await request('/api/state');
  assert.equal(response.status, 200);
  const state = await response.json();
  assert.equal(state.period, '2026-08');
  assert.equal(state.cases.length, 6);
  assert.ok(state.integrations.tensorMux);
  assert.ok(state.integrations.neatlogs);
});
test('API quality endpoint serves judge evaluation evidence', async () => {
  const response = await request('/api/quality');
  assert.equal(response.status, 200);
  const quality = await response.json();
  assert.ok('arithmetic' in quality);
  assert.ok('live' in quality);
});
test('API serves static application assets and rejects unknown paths', async () => {
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Meridian|CloseLoop/i);
  const missing = await request('/does-not-exist');
  assert.equal(missing.status, 404);
});
test('API rejects writes without JSON content type', async () => {
  const response = await request('/api/run', { method: 'POST', body: '{}' });
  assert.equal(response.status, 415);
  assert.match((await response.json()).error, /JSON request required/);
});
test('API rejects malformed JSON with a bounded error response', async () => {
  const response = await request('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).error);
});
test('API rejects cross-origin writes before running workflows', async () => {
  const response = await jsonPost('/api/run', {}, { origin: 'http://evil.test' });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /Cross-origin/);
});
test('API rejects an unknown run invoice without creating work', async () => {
  const response = await jsonPost('/api/run', { invoiceId: 'UNKNOWN' });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Unknown invoice/);
  const state = await (await request('/api/state')).json();
  assert.equal(state.runs.length, 0);
});
test('API rejects invalid source choices through the controller guardrail', async () => {
  const response = await jsonPost('/api/source-choice', { invoiceId: 'IC-1042' });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /controller|source-selection/i);
});
test('API does not export a workpaper before preparation', async () => {
  const response = await request('/api/export');
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Workpaper not found/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { openStore } from '../src/store.js';
import { runClose, approve, recoverInterrupted } from '../src/workflow.js';

const worker = fileURLToPath(new URL('./fixtures/crash-worker.js', import.meta.url));
const rehearsal = { mode: 'crash test', investigate: async (_, plan) => ({ text: plan.explanation }) };
function cleanup(dir) {
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
  assert.ok(basename(dir).startsWith('closeloop-crash-'));
  rmSync(dir, { recursive: true, force: true });
}

for (const boundary of ['before-commit', 'after-commit']) {
  test(`OS-killed worker ${boundary} recovers with exactly one posting`, { timeout: 20_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'closeloop-crash-'));
    const path = join(dir, 'test.sqlite'); const marker = join(dir, 'boundary.txt');
    let child; let store;
    try {
      store = openStore(path); await runClose(store, rehearsal, 'IC-1042');
      const p = store.read().investigations.at(-1); store.close(); store = null;
      child = spawn(process.execPath, [worker, path, boundary, marker], { stdio: 'ignore', windowsHide: true });
      const ended = once(child, 'exit');
      const deadline = Date.now() + 10_000;
      while (!existsSync(marker) && Date.now() < deadline && child.exitCode === null) await setTimeout(25);
      assert.ok(existsSync(marker), `Worker did not reach ${boundary}`);
      child.kill('SIGKILL'); await ended;
      store = openStore(path); recoverInterrupted(store);
      assert.equal(store.read().journals.filter(j => j.kind === 'correction').length, boundary === 'before-commit' ? 0 : 1);
      const response = approve(store, p.id, { revision: p.revision, reviewer: 'Retry controller', role: 'group_controller' });
      assert.equal(response.duplicate, boundary === 'after-commit');
      assert.equal(store.read().journals.filter(j => j.kind === 'correction').length, 1);
      assert.equal(store.read().events.filter(e => e.type === 'approval.posted').length, 1);
    } finally {
      if (child && child.exitCode === null && !child.killed) { const ended = once(child, 'exit'); child.kill('SIGKILL'); await ended; }
      store?.close(); cleanup(dir);
    }
  });
}

test('two processes race the same approval and only one commits a journal', { timeout: 20_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'closeloop-crash-')); const path = join(dir, 'test.sqlite');
  try {
    const initial = openStore(path); await runClose(initial, rehearsal, 'IC-1042'); initial.close();
    const results = await Promise.all([1, 2].map(() => new Promise((resolveResult, rejectResult) => {
      const child = spawn(process.execPath, [worker, path, 'normal'], { windowsHide: true }); let output = ''; let error = '';
      child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { error += data; });
      child.once('error', rejectResult);
      child.once('exit', code => code === 0 ? resolveResult(JSON.parse(output)) : rejectResult(new Error(error)));
    })));
    assert.deepEqual(results.map(r => r.duplicate).sort(), [false, true]);
    const store = openStore(path);
    assert.equal(store.read().journals.filter(j => j.kind === 'correction').length, 1); store.close();
  } finally { cleanup(dir); }
});

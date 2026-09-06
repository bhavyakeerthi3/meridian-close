import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { event } from './store.js';
import { createRun, safeError } from './workflow.js';
import { hash } from './revisions.js';

export function createRunner(store, databasePath, { workerEnv = process.env } = {}) {
  let active = null;
  const workerPath = fileURLToPath(new URL('./run-worker.js', import.meta.url));
  return {
    start(input = {}) {
      if (active) throw new Error('An investigation worker is already running');
      if (input.mode !== undefined && !['live', 'rehearsal'].includes(input.mode)) throw new Error('Choose live or rehearsal execution');
      if (input.mode === 'live' && !workerEnv.TENSORMUX_API_KEY) throw new Error('TensorMux key required for a live run. Rehearsal is an explicit separate mode.');
      const previous = input.resumeRunId ? store.read().runs.find(r => r.id === input.resumeRunId) : null;
      const requestedMode = input.mode || (previous?.mode === 'deterministic rehearsal' ? 'rehearsal' : previous ? 'live' : undefined);
      if (requestedMode === 'live' && !workerEnv.TENSORMUX_API_KEY) throw new Error('TensorMux key required to resume this live run');
      const rehearsal = requestedMode === 'rehearsal' || !workerEnv.TENSORMUX_API_KEY;
      const mode = rehearsal ? 'deterministic rehearsal' : 'TensorMux live agent';
      const runId = createRun(store, mode, input.invoiceId, { resumeRunId: input.resumeRunId, checkpointDelayMs: input.paced ? 3000 : 0 });
      const options = /** @type {import('node:child_process').ForkOptions & { windowsHide: boolean }} */ ({ stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, execArgv: [], env: workerEnv });
      let child;
      try { child = fork(workerPath, [databasePath, runId, rehearsal ? 'rehearsal' : 'live'], options); }
      catch (error) {
        store.update(s => { const r = s.runs.find(r => r.id === runId); r.status = 'failed'; r.error = safeError(error); r.finishedAt = new Date().toISOString(); event(s, 'run.failed', r.error, { runId }); });
        throw error;
      }
      let finish;
      const done = new Promise(resolve => { finish = resolve; });
      active = { runId, child, done, deliberate: false, beforeLedgerHash: null };
      store.update(s => { const r = s.runs.find(r => r.id === runId); r.workerPid = child.pid; r.execution = 'isolated process'; });
      child.on('message', message => {
        if (message && typeof message === 'object' && 'delivery' in message) store.update(s => { s.runs.find(r => r.id === runId).traceDelivery = message.delivery; });
      });
      child.once('error', error => store.update(s => { const r = s.runs.find(r => r.id === runId); r.error = safeError(error); }));
      child.once('close', (code, signal) => {
        const control = active;
        store.update(s => {
          const run = s.runs.find(r => r.id === runId);
          if (run.status === 'running') {
            run.status = control?.deliberate ? 'interrupted' : 'failed';
            run.finishedAt = new Date().toISOString();
            run.error ||= control?.deliberate ? 'Worker deliberately terminated by the challenge control.' : `Worker exited before finishing (code ${code}, signal ${signal}).`;
            event(s, `run.${run.status}`, run.error, { runId });
          }
          run.workerExit = { code, signal, at: new Date().toISOString() };
          if (control?.deliberate) run.interruptionProof = { mechanism: 'OS process termination', workerPid: child.pid, completedCheckpoints: run.completed, ledgerUnchanged: control.beforeLedgerHash === hash(s.journals), ledgerHash: hash(s.journals), at: new Date().toISOString() };
        });
        active = null; finish();
      });
      return { started: true, runId, mode, workerPid: child.pid };
    },
    async interrupt(runId) {
      if (!active || active.runId !== runId) throw new Error('This run no longer has an active worker');
      const control = active;
      control.deliberate = true; control.beforeLedgerHash = hash(store.read().journals);
      control.child.kill('SIGKILL'); await control.done;
      return store.read().runs.find(r => r.id === runId);
    },
    async stop() { if (active) await this.interrupt(active.runId); },
    get activeRunId() { return active?.runId ?? null; },
  };
}

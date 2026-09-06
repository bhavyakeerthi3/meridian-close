import { openStore } from './store.js';
import { createInvestigator, initializeTracing, traced, stopTracing } from './agent.js';
import { executeRun, safeError } from './workflow.js';
import { flushAllDetailed, getDeliveryDiagnostics } from 'neatlogs';
import { readNeatlogsTrace } from './trace-delivery.js';

const [path, runId, mode] = process.argv.slice(2);
process.once('disconnect', () => process.exit(1));
const store = openStore(path);
try {
  await initializeTracing();
  await traced('CloseLoop investigation run', 'WORKFLOW', { runId, mode }, async span => {
    if (span) store.update(s => { s.runs.find(r => r.id === runId).traceId = span.spanContext().traceId; });
    await executeRun(store, createInvestigator({ forceRehearsal: mode === 'rehearsal' }), runId);
    const run = store.read().runs.find(r => r.id === runId);
    if (run.status === 'failed') span?.setStatus({ code: 2, message: run.error });
    return { status: run.status, completed: run.completed };
  }, { sessionId: runId });
  if (process.env.NEATLOGS_API_KEY) {
    const flush = await flushAllDetailed();
    const diagnostics = getDeliveryDiagnostics();
    const readback = await readNeatlogsTrace(store.read().runs.find(r => r.id === runId).traceId);
    process.send?.({ delivery: { flush: { success: flush.success, outcomes: flush.outcomes.map(o => ({ pipeline: o.pipeline, success: o.success, timedOut: o.timedOut, error: o.error ? safeError(o.error) : undefined })) }, spanExportFailures: diagnostics.spanExportFailures, logExportFailures: diagnostics.logExportFailures, readback, dashboardVerified: false } });
  }
} catch (error) {
  store.update(s => { const r = s.runs.find(r => r.id === runId); r.status = 'failed'; r.error = safeError(error); r.finishedAt = new Date().toISOString(); });
  process.exitCode = 1;
} finally { await stopTracing(); store.close(); process.removeAllListeners('disconnect'); process.disconnect?.(); }

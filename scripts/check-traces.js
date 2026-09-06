import { writeFileSync } from 'node:fs';
import { flush, doctorCapturedLocalV2 } from 'neatlogs';
import { createInvestigator, initializeTracing, traced, stopTracing } from '../src/agent.js';
import { openStore } from '../src/store.js';
import { runClose } from '../src/workflow.js';

// Exercise CloseLoop's real tracing wrapper without exporting or consuming credits.
const store = openStore(':memory:');
try {
  await initializeTracing({ localDiagnostic: true });
  await traced('CloseLoop local tracing verification', 'WORKFLOW', { mode: 'deterministic rehearsal', synthetic: true }, () => runClose(store, createInvestigator({ forceRehearsal: true }), 'IC-1042'));
  await flush();
  const diagnostic = doctorCapturedLocalV2({ flushOutcome: 'success' });
  const result = { checkedAt: new Date().toISOString(), scope: 'Local Neatlogs envelope for a CloseLoop rehearsal. Export disabled; no dashboard delivery or LLM quality verified.', diagnostic };
  writeFileSync('evidence/neatlogs-local.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: diagnostic?.status, spanCount: diagnostic?.capture?.span_count, firstFailure: diagnostic?.first_failure, remoteExport: false }));
  if (!diagnostic || diagnostic.status === 'fail' || diagnostic.capture?.span_count < 6) process.exitCode = 1;
} finally { await stopTracing(); store.close(); }

import { writeFileSync } from 'node:fs';
import { flushAllDetailed } from 'neatlogs';
import { openStore } from '../src/store.js';
import { createInvestigator, initializeTracing, traced, stopTracing } from '../src/agent.js';
import { runClose, approve, addCredit, safeError } from '../src/workflow.js';
import { readNeatlogsTrace } from '../src/trace-delivery.js';

if (!process.env.NEATLOGS_API_KEY) throw new Error('Neatlogs key required; remote verification cannot be replaced by local diagnostics');
const store = openStore(':memory:');
let traceId;
try {
  await runClose(store, createInvestigator({ forceRehearsal: true }), 'IC-1042');
  const proposal = store.read().investigations.at(-1);
  addCredit(store, { invoiceId: 'IC-1042', amount: 25000, reason: 'Deliberate late-evidence challenge for the real approval guardrail' });
  const before = JSON.stringify(store.read().journals);
  await initializeTracing();
  const outcome = await traced('CloseLoop rejected approval challenge', 'WORKFLOW', { scenario: 'Deliberate stale approval; actual guardrail rejection', proposalId: proposal.id }, async span => {
    traceId = span.spanContext().traceId;
    try {
      await traced('Validate stale controller approval', 'GUARDRAIL', { proposalId: proposal.id }, () => approve(store, proposal.id, { revision: proposal.revision, reviewer: 'Automated failure verification', role: 'group_controller' }));
      return { rejected: false };
    } catch (error) { return { rejected: true, reason: safeError(error), ledgerUnchanged: before === JSON.stringify(store.read().journals) }; }
  });
  const flush = await flushAllDetailed(); const remote = await readNeatlogsTrace(traceId);
  const proof = { checkedAt: new Date().toISOString(), scenario: 'Real approval rejection exercised against a stale proposal in an isolated synthetic workspace. Deterministic setup; no LLM or provider outage was simulated.', outcome, flushSuccess: flush.success, trace: remote };
  writeFileSync('evidence/neatlogs-failure-readback.json', JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof));
  if (!outcome.rejected || !outcome.ledgerUnchanged || !remote.verified || !remote.hasError) process.exitCode = 1;
} finally { await stopTracing(); store.close(); }

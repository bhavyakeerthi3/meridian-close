import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { openStore } from '../src/store.js';
import { importCase } from '../src/cases.js';
import { createRunner } from '../src/runner.js';

if (!process.env.TENSORMUX_API_KEY || !process.env.NEATLOGS_API_KEY) {
  console.error('Live verification requires both sponsor keys in .env.local. No rehearsal fallback was run.');
  process.exit(1);
}
const db = resolve('data', `live-verification-${randomUUID().slice(0, 8)}.sqlite`);
const store = openStore(db); const runner = createRunner(store, db);
try {
  const invoiceId = `LIVE-${randomUUID().slice(0, 8)}`;
  const amount = 1274317;
  importCase(store, { invoiceId, sourceId: `${invoiceId}-INV`, title: 'Newly supplied synthetic service invoice', seller: 'US', buyer: 'UK', amount, currency: 'USD', period: '2026-08', body: 'The engineering services were accepted. US recorded the full invoice; UK has not yet recorded it. This source is not authorization to post.', sellerBooked: amount, buyerBooked: 0 });
  const startedAt = Date.now();
  const run = runner.start({ mode: 'live', invoiceId });
  console.log(JSON.stringify({ status: 'started', runId: run.runId, invoiceId, workerPid: run.workerPid }));
  while (runner.activeRunId) {
    if (Date.now() - startedAt > 130000) { await runner.interrupt(run.runId); break; }
    await setTimeout(300);
  }
  const state = store.read(); const result = state.runs.find(r => r.id === run.runId);
  const proposal = state.investigations.find(p => p.runId === run.runId);
  const proof = { checkedAt: new Date().toISOString(), scope: 'Actual TensorMux model calls and Neatlogs export/read-back for a newly imported synthetic case. This is not a judge-supplied or human-reviewed case.', model: process.env.TENSORMUX_MODEL || 'glm-4-7-flash', run: result, finding: proposal ?? null, expectedBuyerAdjustmentMinor: 1019454, actualBuyerAdjustmentMinor: proposal?.sides.find(s => s.side === 'buyer')?.delta, noAutomaticPosting: state.journals.every(j => j.kind !== 'correction'), remotePersistenceVerified: result.traceDelivery?.readback?.verified === true };
  writeFileSync('evidence/live-sponsor-verification.json', JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify({ status: result.status, error: result.error, proposalStatus: proposal?.status, tools: proposal?.trace.map(t => t.name), usage: proposal?.usage, traceId: result.traceId, delivery: result.traceDelivery, processingMs: proposal?.processingMs }));
  if (result.status !== 'completed' || proposal?.status !== 'review' || !proposal.validation.passed || proof.actualBuyerAdjustmentMinor !== proof.expectedBuyerAdjustmentMinor || !result.traceDelivery?.flush.success || !proof.remotePersistenceVerified) process.exitCode = 1;
} finally { await runner.stop(); store.close(); }

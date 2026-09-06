import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { hash } from '../src/revisions.js';

const base = process.env.CLOSELOOP_URL || 'http://127.0.0.1:4320';
const invoiceId = 'JUDGE-LIVE-731';
async function api(path, body) {
  const response = await fetch(base + path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}
async function until(predicate, timeout) {
  const deadline = Date.now() + timeout; let lastProgress = '';
  while (Date.now() < deadline) {
    const state = await api('/api/state'); const run = state.runs.at(-1);
    const progress = `${run.id}:${run.completed}:${run.status}`;
    if (progress !== lastProgress) { console.log(JSON.stringify({ runId: run.id, completed: run.completed, total: run.total, status: run.status })); lastProgress = progress; }
    if (predicate(state)) return state;
    await setTimeout(500);
  }
  throw new Error('Stage verification timed out; inspect the actual run before retrying');
}

const initial = await api('/api/state');
assert.equal(initial.workerActiveRunId, null);
assert.equal(initial.documents.find(d => d.id === 'JUDGE-LIVE-731-CREDIT')?.amount, 25037);
assert.equal(initial.latestReport.stale, true);
const previousReport = await api(`/api/export?id=${initial.latestReport.id}`);
const originalJournals = initial.journals;
const first = await api('/api/run', { mode: 'live', paced: true });
await until(s => s.runs.find(r => r.id === first.runId).completed >= 1 || !s.workerActiveRunId, 110000);
const interruption = await api(`/api/runs/${first.runId}/interrupt`, {});
assert.equal(interruption.status, 'interrupted');
assert.equal(interruption.interruptionProof.ledgerUnchanged, true);
assert.deepEqual((await api('/api/state')).journals, originalJournals);
const resumed = await api('/api/run', { resumeRunId: first.runId });
const investigated = await until(s => !s.workerActiveRunId, 680000);
const completed = investigated.runs.find(r => r.id === resumed.runId);
assert.equal(completed.status, 'completed');
const proposal = investigated.investigations.filter(p => p.invoiceId === invoiceId).at(-1);
assert.equal(proposal.status, 'review'); assert.equal(proposal.validation.passed, true);
assert.equal(proposal.sides.find(s => s.side === 'seller').delta, -25037);
assert.equal(proposal.sides.find(s => s.side === 'buyer').delta, -20030);
const review = { reviewer: 'Automated stage verification', role: 'group_controller', revision: proposal.revision };
await api(`/api/proposals/${proposal.id}/approve`, review);
const afterPosting = await api('/api/state');
const retry = await api(`/api/proposals/${proposal.id}/approve`, review);
assert.equal(retry.duplicate, true);
const afterRetry = await api('/api/state');
assert.deepEqual(afterRetry.journals, afterPosting.journals);
assert.deepEqual(afterRetry.journals.slice(0, originalJournals.length), originalJournals);
const report = await api('/api/report', {});
const final = await api('/api/state'); const invoice = final.cases.find(c => c.invoiceId === invoiceId);
assert.equal(invoice.status, 'matched');
assert.equal(invoice.sides.find(s => s.side === 'seller').current, 1249280);
assert.equal(invoice.sides.find(s => s.side === 'buyer').current, 999424);
assert.equal(final.latestReport.stale, false);
const historical = await api(`/api/export?id=${initial.latestReport.id}`);
assert.deepEqual(historical, previousReport);
const proof = { checkedAt: new Date().toISOString(), scope: 'Automated live stage challenge, synthetic browser-entered case, simulated controller approvals; not human accountant feedback.', invoiceId, lateCreditMinorUSD: 25037, interruptedRun: interruption, resumedRun: completed, completedCheckpointsSkipped: interruption.total - completed.total, originalJournalsPreserved: true, postingRetryDuplicate: retry.duplicate, journalHashAfterPosting: hash(afterPosting.journals), journalHashAfterRetry: hash(afterRetry.journals), finalBalances: invoice.sides, report: { previousVersion: initial.latestReport.version, revisedVersion: report.version, current: !final.latestReport.stale, unresolved: report.unresolved }, historicalReportUnchanged: true, liveInvestigations: final.investigations.filter(p => p.mode === 'TensorMux live agent').map(p => ({ invoiceId: p.invoiceId, runId: p.runId, status: p.status, processingMs: p.processingMs, usage: p.usage, tools: p.trace.map(t => t.name) })) };
writeFileSync('evidence/live-stage-challenge.json', JSON.stringify(proof, null, 2) + '\n');
writeFileSync('evidence/judge-revised-workpaper.json', JSON.stringify(await api('/api/export'), null, 2) + '\n');
console.log(JSON.stringify({ verified: true, interruption: interruption.interruptionProof, resumedCheckpoints: completed.completed, reportVersion: report.version, finalBalances: invoice.sides.map(s => ({ entity: s.entity, currency: s.currency, current: s.current })), duplicatePosting: false }));

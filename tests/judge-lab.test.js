import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { openStore } from '../src/store.js';
import { importCase, chooseInvoiceSource } from '../src/cases.js';
import { investigate, fingerprint, booked } from '../src/accounting.js';
import { runClose, approve, addCredit } from '../src/workflow.js';
import { createRunner } from '../src/runner.js';
import { createStudy, startTrial, assistTrial, finishTrial, recordStudyFeedback, exportStudy, studyView } from '../src/study.js';

const source = { invoiceId: 'JUDGE-731', sourceId: 'UNSEEN-1', title: 'Judge supplied engineering service', seller: 'US', buyer: 'UK', amount: 1274317, currency: 'USD', period: '2026-08', body: 'Service accepted by both entities.', sellerBooked: 1274317, buyerBooked: 0 };
const agent = { mode: 'test deterministic planner', investigate: async (_state, plan) => ({ text: plan.explanation, escalate: plan.status === 'blocked' }) };
const reviewer = p => ({ reviewer: 'Automated test controller', role: 'group_controller', revision: p.revision });
const competing = (id, amount) => { const { sellerBooked, buyerBooked, ...rest } = source; return { ...rest, sourceId: id, amount, sourceOnly: true }; };

test('new judge case handles cents and imports opening balances once', async () => {
  const store = openStore(':memory:');
  try {
    assert.equal(importCase(store, source).replayed, false);
    const journals = store.read().journals;
    assert.equal(importCase(store, source).replayed, true);
    assert.deepEqual(store.read().journals, journals);
    assert.equal(investigate(store.read(), source.invoiceId).sides[1].delta, 1019454);
    await runClose(store, agent, source.invoiceId);
    const proposal = store.read().investigations.at(-1);
    assert.equal(proposal.validation.passed, true);
    approve(store, proposal.id, reviewer(proposal));
    assert.equal(booked(store.read(), source.invoiceId, 'UK', 'IC_PAYABLE'), 1019454);
  } finally { store.close(); }
});

test('malformed imports and source-only balance changes roll back completely', () => {
  const store = openStore(':memory:');
  try {
    importCase(store, source); const before = store.read();
    for (const input of [source, { ...source, sourceId: 'CHANGED', amount: 1.01 }, { ...competing('CHANGED', 1200000), buyerBooked: 42 }, { ...competing('CHANGED', 1200000), seller: 'UK' }]) {
      if (input === source) { assert.throws(() => importCase(store, { ...input, body: 'Different content with same ID' })); }
      else assert.throws(() => importCase(store, input));
      assert.deepEqual(store.read(), before);
    }
  } finally { store.close(); }
});

test('conflicting invoices invalidate approvals and require current controller source authority', async () => {
  const store = openStore(':memory:');
  try {
    importCase(store, source); await runClose(store, agent, source.invoiceId);
    const proposal = store.read().investigations.at(-1); const before = store.read().journals;
    importCase(store, competing('UNSEEN-2', 1400031));
    assert.equal(investigate(store.read(), source.invoiceId).status, 'blocked');
    assert.throws(() => approve(store, proposal.id, reviewer(proposal)));
    assert.throws(() => addCredit(store, { invoiceId: source.invoiceId, amount: 100, reason: 'Credit during conflict' }));
    assert.deepEqual(store.read().journals, before);
    const choice = { invoiceId: source.invoiceId, selectedSourceId: source.sourceId, sourceFingerprint: fingerprint(store.read(), source.invoiceId), reviewer: 'Test controller', role: 'group_controller', reason: 'Counterparty confirmed the original signed invoice.' };
    assert.throws(() => chooseInvoiceSource(store, { ...choice, role: 'entity_accountant' }));
    assert.throws(() => chooseInvoiceSource(store, { ...choice, sourceFingerprint: proposal.fingerprint }));
    chooseInvoiceSource(store, choice);
    assert.equal(investigate(store.read(), source.invoiceId).status, 'review');
    await runClose(store, agent, source.invoiceId); const resolved = store.read().investigations.at(-1);
    assert.equal(resolved.validation.passed, true);
    importCase(store, competing('UNSEEN-3', 1450041));
    assert.equal(investigate(store.read(), source.invoiceId).status, 'blocked');
    assert.equal(store.read().documents.filter(d => d.invoiceId === source.invoiceId).length, 3);
    assert.throws(() => approve(store, resolved.id, reviewer(resolved)));
  } finally { store.close(); }
});

async function until(predicate, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) { if (Date.now() > deadline) throw new Error('Timed out waiting for worker checkpoint'); await setTimeout(25); }
}

test('real process termination retains checkpoints and resume skips completed work', { timeout: 25000 }, async () => {
  const folder = mkdtempSync(join(tmpdir(), 'closeloop-worker-test-')); const db = join(folder, 'state.sqlite');
  const store = openStore(db); const runner = createRunner(store, db, { workerEnv: { ...process.env, TENSORMUX_API_KEY: '', NEATLOGS_API_KEY: '' } });
  try {
    const original = store.read().journals;
    const run = runner.start({ mode: 'rehearsal', paced: true });
    assert.ok(run.workerPid > 0); assert.notEqual(run.workerPid, process.pid);
    await until(() => store.read().runs.at(-1).completed >= 1);
    const interrupted = await runner.interrupt(run.runId);
    assert.equal(interrupted.status, 'interrupted');
    assert.equal(interrupted.interruptionProof.mechanism, 'OS process termination');
    assert.equal(interrupted.interruptionProof.ledgerUnchanged, true);
    const retained = store.read().investigations.filter(p => p.runId === run.runId);
    const resumed = runner.start({ resumeRunId: run.runId });
    await until(() => !runner.activeRunId);
    const result = store.read().runs.find(r => r.id === resumed.runId);
    assert.equal(result.status, 'completed'); assert.equal(result.total, 6 - retained.length);
    assert.ok(retained.every(p => !result.invoiceIds.includes(p.invoiceId)));
    assert.deepEqual(store.read().journals, original);
    const proposal = store.read().investigations.find(p => p.status === 'review');
    approve(store, proposal.id, reviewer(proposal)); const posted = store.read().journals;
    assert.equal(approve(store, proposal.id, reviewer(proposal)).duplicate, true);
    assert.deepEqual(store.read().journals, posted);
    assert.equal(store.read().events.at(-1).type, 'approval.replayed');
  } finally {
    await runner.stop(); store.close();
    const checked = resolve(folder);
    assert.equal(dirname(checked), resolve(tmpdir())); assert.ok(basename(checked).startsWith('closeloop-worker-test-'));
    rmSync(checked, { recursive: true, force: true });
  }
});

test('review study hides answers, enforces order, measures actual time and excludes test feedback', async () => {
  const store = openStore(':memory:');
  try {
    const session = createStudy(store, { participant: 'Automated test participant', role: 'other', isTest: true });
    assert.equal(session.trials[0].packet, null); assert.equal(session.trials[1].packet, null);
    assert.throws(() => startTrial(store, session.id, 1));
    assert.throws(() => recordStudyFeedback(store, session.id, { usefulness: 3, trust: 3, comment: 'Premature automated feedback', concerns: '' }));
    for (let index = 0; index < 2; index++) {
      const active = startTrial(store, session.id, index); const trial = active.trials[index];
      assert.equal(trial.packet.expected, undefined);
      if (trial.mode === 'manual') await assert.rejects(assistTrial(store, session.id, index, agent));
      else { const assistance = await assistTrial(store, session.id, index, agent); assert.equal(assistance.mode, agent.mode); }
      const invoice = trial.packet.documents.find(d => d.kind === 'invoice'); const credit = trial.packet.documents.find(d => d.kind === 'credit_note');
      const response = { sellerDelta: -credit.amount, buyerDelta: (invoice.amount - credit.amount) * 4 / 5, requiresApproval: true, followedProtocol: true };
      assert.throws(() => finishTrial(store, session.id, index, { ...response, followedProtocol: false }));
      await setTimeout(20);
      const finished = finishTrial(store, session.id, index, response);
      assert.equal(finished.trials[index].correct, true); assert.ok(finished.trials[index].elapsedMs >= 20);
      assert.throws(() => finishTrial(store, session.id, index, response));
    }
    recordStudyFeedback(store, session.id, { usefulness: 3, trust: 3, comment: 'Automated protocol test; this is not an accountant opinion.', concerns: 'Real human review is still required.' });
    const exported = exportStudy(store.read());
    assert.equal(exported.humanReviewsCompleted, 0);
    assert.equal(exported.sessions[0].isTest, true);
    assert.equal(studyView(store.read().studySessions[0]).trials[0].packet.expected, undefined);
  } finally { store.close(); }
});

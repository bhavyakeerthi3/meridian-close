import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.js';
import { brandWorkspace, decisionCard, draftEvidenceRequest } from '../src/decisions.js';
import { fingerprint } from '../src/accounting.js';
import { runClose, approve, addCredit } from '../src/workflow.js';
const agent = { mode: 'test', investigate: async (_s, p) => ({ text: p.explanation, escalate: p.status === 'blocked' }) };

test('Meridian display migration preserves all accounting fingerprints and runs only once', () => {
  const s = openStore(':memory:');
  try { const before = s.read(); brandWorkspace(s); assert.equal(fingerprint(s.read()), fingerprint(before)); assert.deepEqual(s.read().journals, before.journals); const branded = s.read(); brandWorkspace(s); assert.deepEqual(s.read(), branded); } finally { s.close(); }
});

test('decision eligibility tracks fresh proposal, posted ledger and changed sources', async () => {
  const s = openStore(':memory:');
  try {
    assert.equal(decisionCard(s.read(), 'IC-1042').eligible, false);
    await runClose(s, agent, 'IC-1042');
    const p = s.read().investigations.at(-1);
    assert.equal(decisionCard(s.read(), 'IC-1042').eligible, true);
    approve(s, p.id, { revision: p.revision, reviewer: 'Test', role: 'group_controller' });
    assert.equal(decisionCard(s.read(), 'IC-1042').kind, 'no_action');
    addCredit(s, { invoiceId: 'IC-1042', amount: 5, reason: 'Late evidence' });
    assert.equal(decisionCard(s.read(), 'IC-1042').eligible, false);
    assert.equal(decisionCard(s.read(), 'IC-1042').kind, 'investigate');
  } finally { s.close(); }
});

test('evidence request is a revision-bound draft, never source acceptance or an outbound message', () => {
  const s = openStore(':memory:');
  try {
    const before = s.read(); const input = { invoiceId: 'IC-1047', sourceFingerprint: fingerprint(before, 'IC-1047'), owner: 'Service owner', reviewer: 'Test' };
    const r = draftEvidenceRequest(s, input);
    assert.equal(r.sent, false); assert.equal(r.status, 'draft');
    assert.deepEqual(s.read().documents, before.documents); assert.deepEqual(s.read().journals, before.journals);
    assert.equal(decisionCard(s.read(), 'IC-1047').kind, 'missing_evidence');
    assert.equal(draftEvidenceRequest(s, input).replayed, true);
    assert.equal(s.read().evidenceRequests.length, 1);
    assert.throws(() => draftEvidenceRequest(s, { ...input, sourceFingerprint: 'stale' }));
  } finally { s.close(); }
});

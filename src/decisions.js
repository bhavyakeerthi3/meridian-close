import { randomUUID } from 'node:crypto';
import { investigate, summary, fingerprint, hash } from './accounting.js';
import { validateProposal } from './validator.js';
import { selectedInvoices } from './source-selection.js';
import { event } from './store.js';

export function brandWorkspace(store) {
  if (store.read().branding?.version === 1) return;
  store.update(state => {
    state.branding = { version: 1, group: 'Meridian Group', entityNames: { US: 'Meridian US', UK: 'Meridian UK', IN: 'Meridian India' } };
    state.group = 'Meridian Group';
    event(state, 'workspace.branded', 'Meridian display identity applied. Original evidence, entity records, approvals and frozen workpapers retained.');
  });
}

// This second pass executes code against current sources. It is not a second LLM.
export function decisionCard(state, invoiceId) {
  const current = investigate(state, invoiceId);
  const caseState = summary(state).cases.find(c => c.invoiceId === invoiceId);
  if (!caseState) throw new Error('Unknown invoice');
  const proposal = caseState.investigation;
  const docs = state.documents.filter(d => d.invoiceId === invoiceId);
  const invoices = docs.filter(d => d.kind === 'invoice');
  const authoritative = selectedInvoices(state, invoiceId);
  const choice = state.sourceDecisions?.filter(c => c.invoiceId === invoiceId).at(-1);
  const conflict = authoritative.length !== 1;
  const checks = validateProposal(state, current);
  const fresh = Boolean(proposal && proposal.fingerprint === current.fingerprint);
  const eligible = Boolean(proposal?.status === 'review' && fresh && validateProposal(state, proposal).passed);
  const kind = conflict ? 'source_authority' : current.status === 'blocked' ? 'missing_evidence' : eligible ? 'approve_correction' : caseState.status === 'matched' ? 'no_action' : 'investigate';
  const wording = {
    source_authority: ['Choose the authoritative invoice', 'Conflicting sources cannot establish an accounting obligation.', 'Record a controller source decision, then investigate the revised evidence.'],
    missing_evidence: ['Keep open and request evidence', current.explanation, 'Draft a specific request. The exception stays open until the source facts support a correction.'],
    approve_correction: ['Review the prepared correction', current.explanation, 'Approval commits the displayed journal lines to the sandbox. Review every currency separately.'],
    no_action: ['No correction needed', 'Current ledger balances agree with supported source obligations.', 'Retain the evidence and include this pair in the next workpaper.'],
    investigate: ['Prepare a current finding', caseState.explanation, 'Run the investigator before a controller can approve any correction.'],
  }[kind];
  return { invoiceId, kind, decision: wording[0], reason: wording[1], consequence: wording[2], fingerprint: current.fingerprint, eligible, proposalFresh: fresh, proposalId: proposal?.id ?? null,
    validation: checks, sourceIds: docs.map(d => d.id), authoritativeSourceId: !conflict ? authoritative[0]?.id : null,
    sourceChoice: !conflict && invoices.length > 1 ? choice : null, competingSourceIds: invoices.filter(d => d.id !== authoritative[0]?.id || conflict).map(d => d.id),
    challenge: { method: 'Deterministic independent checks; not another model', status: conflict || current.status === 'blocked' || !checks.passed ? 'blocked' : 'passed',
      result: conflict ? 'Arithmetic cannot select authority. Controller source decision required.' : current.status === 'blocked' ? current.explanation : checks.passed ? 'Source obligations, policy, accounts and currency balances agree. Human approval is still required for any posting.' : 'Independent ledger or source checks failed.' },
    net: current.net, sides: current.sides,
    requests: (state.evidenceRequests || []).filter(r => r.invoiceId === invoiceId).map(r => ({ ...r, stale: r.sourceFingerprint !== current.fingerprint })) };
}

export function decisionDesk(state) {
  return summary(state).cases.map(c => decisionCard(state, c.invoiceId));
}

export function draftEvidenceRequest(store, { invoiceId, sourceFingerprint, owner, reviewer }) {
  if (typeof owner !== 'string' || !owner.trim() || owner.length > 120 || typeof reviewer !== 'string' || !reviewer.trim() || reviewer.length > 80) throw new Error('Provide a reviewer and an evidence owner');
  return store.update(state => {
    const card = decisionCard(state, invoiceId);
    if (sourceFingerprint !== fingerprint(state, invoiceId)) throw new Error('Evidence changed. Refresh the request before saving.');
    if (!['missing_evidence', 'source_authority', 'investigate'].includes(card.kind)) throw new Error('This invoice has no unresolved evidence request to prepare');
    const idempotencyKey = hash({ invoiceId, sourceFingerprint, owner: owner.trim(), reviewer: reviewer.trim() });
    const existing = state.evidenceRequests?.find(r => r.idempotencyKey === idempotencyKey);
    if (existing) return { ...existing, replayed: true };
    const text = card.kind === 'source_authority'
      ? `Please confirm which invoice is authoritative for ${invoiceId} and explain the discrepancy between ${card.sourceIds.join(', ')}. Retain the competing documents and provide supporting authorization.`
      : `Please provide service acceptance or other source support resolving this exception for ${invoiceId}: ${card.reason} Refer to ${card.sourceIds.join(', ')} and identify the period, parties and supported amount.`;
    const request = { id: randomUUID(), invoiceId, sourceFingerprint, idempotencyKey, owner: owner.trim(), reviewer: reviewer.trim(), status: 'draft', text, createdAt: new Date().toISOString(), sent: false };
    (state.evidenceRequests ??= []).push(request);
    event(state, 'evidence.request_drafted', `Evidence request drafted for ${invoiceId}. No message sent and no source facts changed.`, { invoiceId, requestId: request.id });
    return request;
  });
}

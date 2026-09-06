import { randomUUID } from 'node:crypto';
import { event } from './store.js';
import { fingerprint, investigate, invoiceIds, summary } from './accounting.js';
import { validateProposal } from './validator.js';
import { integer } from './money.js';

export function recoverInterrupted(store) {
  store.update(state => {
    for (const run of state.runs.filter(r => r.status === 'running')) {
      run.status = 'interrupted';
      run.finishedAt = new Date().toISOString();
      event(state, 'run.interrupted', 'Worker restarted. Committed ledger entries remain intact; resume safely.', { runId: run.id });
    }
  });
}

export async function runClose(store, agent, selectedInvoiceId, { resumeRunId = undefined } = {}) {
  const snapshot = store.read();
  if (snapshot.runs.some(r => r.status === 'running')) throw new Error('A close investigation is already running');
  let ids = selectedInvoiceId ? [selectedInvoiceId] : invoiceIds(snapshot);
  if (resumeRunId) {
    const previousRun = snapshot.runs.find(r => r.id === resumeRunId);
    if (!previousRun || !['failed', 'interrupted'].includes(previousRun.status)) throw new Error('Only a failed or interrupted run can be resumed');
    const completed = new Set(snapshot.investigations.filter(p => p.runId === resumeRunId && p.fingerprint === fingerprint(snapshot, p.invoiceId)).map(p => p.invoiceId));
    ids = (previousRun.invoiceIds || invoiceIds(snapshot)).filter(id => !completed.has(id));
  }
  if (ids.some(id => !invoiceIds(snapshot).includes(id))) throw new Error('Unknown invoice');
  const runId = randomUUID();
  store.update(state => {
    state.runs.push({ id: runId, status: 'running', startedAt: new Date().toISOString(), mode: agent.mode, total: ids.length, completed: 0, invoiceIds: ids, resumedFrom: resumeRunId ?? null });
    event(state, resumeRunId ? 'run.resumed' : 'run.started', `Investigating ${ids.length} invoice bundles in ${agent.mode} mode.${resumeRunId ? ' Current completed checkpoints were retained.' : ''}`, { runId, resumedFrom: resumeRunId ?? null });
  });
  try {
    for (const invoiceId of ids) {
      const current = store.read();
      const plan = investigate(current, invoiceId);
      const trace = [];
      const record = (name, detail, kind = 'tool') => {
        const item = { name, detail, kind, at: new Date().toISOString() };
        trace.push(item);
        store.update(state => event(state, `agent.${kind}`, detail, { runId, invoiceId, step: name }));
      };
      const review = await agent.investigate(current, plan, record);
      store.update(state => {
        const run = state.runs.find(r => r.id === runId);
        if (run.status !== 'running') throw new Error('Run was interrupted');
        if (plan.fingerprint !== fingerprint(state, invoiceId)) {
          event(state, 'investigation.superseded', 'Evidence changed during investigation. Run this invoice again.', { invoiceId, runId });
          run.completed++;
          return;
        }
        const previous = state.investigations.filter(p => p.invoiceId === invoiceId).at(-1);
        if (previous?.status === 'review') previous.status = 'superseded';
        const proposal = { ...plan, id: randomUUID(), runId, revision: (previous?.revision ?? 0) + 1, createdAt: new Date().toISOString(), mode: agent.mode, trace, narrative: review.text, usage: review.usage ?? null, validation: null };
        if (review.escalate && plan.status !== 'blocked') { proposal.status = 'blocked'; proposal.diagnosis = 'Agent requests human investigation'; }
        proposal.validation = validateProposal(state, proposal);
        if (['review', 'matched'].includes(proposal.status) && !proposal.validation.passed) { proposal.status = 'blocked'; proposal.diagnosis = 'Independent validation failed'; }
        state.investigations.push(proposal);
        run.completed++;
        event(state, 'investigation.completed', `${invoiceId}: ${proposal.diagnosis}`, { runId, invoiceId, proposalId: proposal.id, mode: agent.mode });
      });
    }
    store.update(state => {
      const run = state.runs.find(r => r.id === runId);
      run.status = 'completed'; run.finishedAt = new Date().toISOString();
      event(state, 'run.completed', 'Investigation complete. Corrections await human approval.', { runId });
    });
  } catch (error) {
    store.update(state => {
      const run = state.runs.find(r => r.id === runId);
      run.status = 'failed'; run.finishedAt = new Date().toISOString();
      run.error = safeError(error);
      event(state, 'run.failed', run.error, { runId });
    });
  }
  return runId;
}

export function safeError(error) {
  return String(error?.message ?? error).replace(/(?:tmx_|sk-|nlw_|nl_)[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 400);
}

export function approve(store, id, { revision, reviewer, role }) {
  if (role !== 'group_controller' || !reviewer?.trim() || reviewer.length > 80) throw new Error('Select the group controller role and enter a reviewer name');
  return store.update(state => {
    const proposal = state.investigations.find(p => p.id === id);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.revision !== revision) throw new Error('Approval revision does not match');
    // Retries return the original posting even if later source changes exist.
    if (proposal.status === 'posted') return { proposal, duplicate: true };
    if (proposal.status !== 'review') throw new Error('Only a current proposal awaiting review can be approved');
    const validation = validateProposal(state, proposal);
    if (!validation.passed) throw new Error('Approval rejected: source or ledger changed, or accounting validation failed. Investigate again.');
    const idempotencyKey = `approve:${id}:${revision}`;
    if (state.journals.some(j => j.idempotencyKey === idempotencyKey)) throw new Error('Inconsistent posting state; review required');
    const journal = { id: randomUUID(), idempotencyKey, invoiceId: proposal.invoiceId, proposalId: id, proposalRevision: revision, kind: 'correction', entries: structuredClone(proposal.entries), createdAt: new Date().toISOString(), reviewer: reviewer.trim(), role, evidenceIds: proposal.evidenceIds, sourceFingerprint: proposal.fingerprint, policyVersion: proposal.policyVersion };
    state.journals.push(journal);
    proposal.status = 'posted';
    proposal.approval = { reviewer: reviewer.trim(), role, at: journal.createdAt, journalId: journal.id };
    proposal.validation = validation;
    event(state, 'approval.posted', `${reviewer.trim()} approved revision ${revision} of ${proposal.invoiceId}. Sandbox journal posted atomically.`, { invoiceId: proposal.invoiceId, proposalId: id, journalId: journal.id });
    return { proposal, duplicate: false };
  });
}

export function reject(store, id, { reviewer, reason }) {
  if (!reviewer?.trim() || !reason?.trim() || reason.length > 1000 || reviewer.length > 80) throw new Error('Reviewer name and a reason (up to 1,000 characters) are required');
  return store.update(state => {
    const proposal = state.investigations.find(p => p.id === id);
    if (!proposal || proposal.status !== 'review') throw new Error('Proposal is not awaiting review');
    proposal.status = 'rejected';
    proposal.rejection = { reviewer, reason, at: new Date().toISOString() };
    state.feedback.push({ proposalId: id, invoiceId: proposal.invoiceId, reviewer, reason, trace: proposal.trace, policyChanged: false });
    event(state, 'approval.rejected', `Reviewer rejected ${proposal.invoiceId}: ${reason}`, { invoiceId: proposal.invoiceId });
    return proposal;
  });
}

export function invalidate(state, invoiceId, sourceId) {
  const affected = [];
  for (const proposal of state.investigations.filter(p => p.invoiceId === invoiceId)) {
    if (['review', 'matched', 'blocked'].includes(proposal.status)) proposal.status = 'stale';
    proposal.sourceChanged = true;
    affected.push({ id: proposal.id, kind: 'investigation', label: `${invoiceId} · revision ${proposal.revision}` });
    if (proposal.approval) affected.push({ id: proposal.approval.journalId, kind: 'approval', label: 'Historical approval retained; additional correction needs fresh review' });
  }
  for (const report of state.reports) {
    report.stale = true;
    affected.push({ id: report.id, kind: 'report', label: `Close workpaper v${report.version}` });
  }
  state.lastChange = { at: new Date().toISOString(), sourceId, invoiceId, affected, unchangedInvoices: invoiceIds(state).filter(id => id !== invoiceId) };
  event(state, 'evidence.changed', `${sourceId} changed ${invoiceId}. Affected conclusions require review; historical entries are preserved.`, { invoiceId, sourceId, affected });
}

export function addCredit(store, { invoiceId, amount, reason, sourceId = `CN-${randomUUID().slice(0, 8)}`, version = 1 }) {
  integer(amount);
  if (amount <= 0 || typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw new Error('Enter a positive credit amount and a reason');
  if (typeof sourceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(sourceId) || !Number.isSafeInteger(version) || version < 1) throw new Error('Use a stable source reference and a positive integer version');
  return store.update(state => {
    const invoice = state.documents.find(d => d.kind === 'invoice' && d.invoiceId === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    const previous = state.documents.find(d => d.id === sourceId);
    if (previous && (previous.kind !== 'credit_note' || previous.invoiceId !== invoiceId)) throw new Error('Source reference already belongs to another document');
    if (previous && version === previous.version) {
      if (previous.amount !== amount || previous.body !== reason.trim()) throw new Error('This version already exists with different content. Supply a newer version.');
      return { ...previous, replayed: true };
    }
    if (previous && version < previous.version) throw new Error('An older source version cannot replace current evidence');
    const existingCredits = state.documents.filter(d => d.invoiceId === invoiceId && d.kind === 'credit_note' && d.id !== sourceId).reduce((s, d) => s + d.amount, 0);
    if (existingCredits + amount > invoice.amount) throw new Error('Total credits cannot exceed the invoice');
    const doc = { id: sourceId, invoiceId, kind: 'credit_note', seller: invoice.seller, buyer: invoice.buyer, currency: invoice.currency, amount, title: 'Late service credit', body: reason.trim(), source: 'Reviewer-entered sandbox credit', version, period: state.period };
    if (previous) {
      (state.documentHistory ??= []).push({ ...structuredClone(previous), supersededAt: new Date().toISOString() });
      state.documents[state.documents.indexOf(previous)] = doc;
    } else state.documents.push(doc);
    invalidate(state, invoiceId, doc.id);
    return doc;
  });
}

export function addCommunication(store, { invoiceId, kind, title, body }) {
  if (!['email', 'meeting'].includes(kind) || !title?.trim() || title.length > 200 || !body?.trim() || body.length > 20_000) throw new Error('Provide an email or meeting title and text (up to 20,000 characters)');
  return store.update(state => {
    if (!invoiceIds(state).includes(invoiceId)) throw new Error('Unknown invoice');
    const doc = { id: `MSG-${randomUUID().slice(0, 8)}`, invoiceId, kind, title: title.trim(), body: body.trim(), source: 'User-imported text; untrusted evidence', version: 1 };
    state.documents.push(doc);
    invalidate(state, invoiceId, doc.id);
    return doc;
  });
}

export function prepareReport(store) {
  return store.update(state => {
    const view = summary(state);
    const unresolved = view.cases.filter(c => c.status !== 'matched' || ['blocked', 'rejected'].includes(c.investigation?.status));
    const report = { id: randomUUID(), version: state.reports.length + 1, createdAt: new Date().toISOString(), fingerprint: fingerprint(state), stale: false, status: unresolved.length ? 'provisional' : 'ready', scope: 'Synthetic intercompany service reconciliation and USD elimination workpaper. Not a statutory consolidation.', period: state.period, rows: view.cases.map(c => ({ invoiceId: c.invoiceId, seller: c.seller, buyer: c.buyer, netUSDMinor: c.net, status: c.status, evidenceIds: c.evidenceIds, sides: c.sides })), unresolved: unresolved.map(c => ({ invoiceId: c.invoiceId, reason: c.investigation?.status === 'rejected' ? 'Reviewer rejected the latest proposal' : c.explanation })), eliminations: view.cases.filter(c => c.status === 'matched' && !['blocked', 'rejected'].includes(c.investigation?.status)).map(c => ({ invoiceId: c.invoiceId, currency: 'USD', sourceEvidence: c.evidenceIds, entries: [{ account: 'IC_PAYABLE', debit: c.net, credit: 0 }, { account: 'IC_RECEIVABLE', debit: 0, credit: c.net }, { account: 'SERVICE_REVENUE', debit: c.net, credit: 0 }, { account: 'SERVICE_EXPENSE', debit: 0, credit: c.net }] })), journals: structuredClone(state.journals.filter(j => j.kind === 'correction')), policy: structuredClone(state.policy) };
    Object.assign(report, { evidence: structuredClone(state.documents), ledgerSnapshot: structuredClone(state.journals), entities: structuredClone(state.entities), approvals: state.investigations.filter(p => p.approval).map(p => ({ id: p.id, invoiceId: p.invoiceId, revision: p.revision, approval: structuredClone(p.approval), validation: structuredClone(p.validation) })), auditTrail: structuredClone(state.events) });
    state.reports.push(report);
    event(state, 'report.prepared', `Workpaper v${report.version} prepared with ${unresolved.length} unresolved exceptions.`, { reportId: report.id });
    return report;
  });
}

export function exportReport(store, reportId = undefined) {
  const state = store.read();
  const report = reportId ? state.reports.find(r => r.id === reportId) : state.reports.at(-1);
  if (!report) throw new Error('Workpaper not found. Prepare a workpaper first.');
  return { ...report, stale: report.fingerprint !== fingerprint(state), snapshotStatus: report.evidence ? 'Evidence and ledger frozen at preparation' : 'Legacy workpaper: source snapshot unavailable; prepare a new version', evidence: report.evidence ?? null, ledgerSnapshot: report.ledgerSnapshot ?? null, integrityNote: 'Hashes detect revisions; this local sandbox is not tamper-proof or independently certified.' };
}

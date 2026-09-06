import { convert, integer } from './money.js';
import { fingerprint, invoiceIds } from './revisions.js';
import { validateProposal } from './validator.js';
import { selectedInvoices } from './source-selection.js';
export { hash, fingerprint, invoiceIds } from './revisions.js';

export function sourceBundle(state, invoiceId) {
  const documents = state.documents.filter(d => d.invoiceId === invoiceId);
  const invoices = selectedInvoices(state, invoiceId);
  const invoice = invoices[0];
  if (!invoice) return { blocked: 'No structured invoice supports this reference.', documents };
  if (invoices.length !== 1) return { blocked: 'Conflicting invoice documents require review.', documents, invoice };
  if (invoice.disputed) return { blocked: 'Service acceptance is disputed. Obtain confirmed evidence before preparing a correction.', documents, invoice };
  if (invoice.currency !== 'USD') return { blocked: 'This policy supports USD transaction currency only.', documents, invoice };
  const credits = documents.filter(d => d.kind === 'credit_note');
  if (credits.some(d => d.seller !== invoice.seller || d.buyer !== invoice.buyer || d.currency !== invoice.currency)) return { blocked: 'Credit note parties or currency do not match the invoice.', documents, invoice };
  const net = integer(invoice.amount - credits.reduce((sum, d) => sum + integer(d.amount), 0));
  if (net < 0) return { blocked: 'Credits exceed the source invoice amount.', documents, invoice };
  return { invoice, documents, net, credits };
}

export function booked(state, invoiceId, entity, account) {
  return state.journals.filter(j => j.invoiceId === invoiceId).flatMap(j => j.entries).filter(e => e.entity === entity && e.account === account).reduce((sum, e) => sum + (account === 'IC_PAYABLE' ? e.credit - e.debit : e.debit - e.credit), 0);
}

export function adjustmentLines(entity, side, delta) {
  if (delta === 0) return [];
  const amount = Math.abs(integer(delta));
  const debitAccount = side === 'seller' ? 'IC_RECEIVABLE' : 'SERVICE_EXPENSE';
  const creditAccount = side === 'seller' ? 'SERVICE_REVENUE' : 'IC_PAYABLE';
  return [{ entity: entity.id, currency: entity.currency, account: debitAccount, debit: delta > 0 ? amount : 0, credit: delta < 0 ? amount : 0 }, { entity: entity.id, currency: entity.currency, account: creditAccount, debit: delta < 0 ? amount : 0, credit: delta > 0 ? amount : 0 }];
}

export function investigate(state, invoiceId) {
  const bundle = sourceBundle(state, invoiceId);
  const base = { invoiceId, fingerprint: fingerprint(state, invoiceId), title: bundle.invoice?.title ?? invoiceId, evidenceIds: bundle.documents.map(d => d.id), policyId: state.policy.id, policyVersion: state.policy.version };
  if (bundle.blocked) return { ...base, status: 'blocked', diagnosis: 'Needs source confirmation', explanation: bundle.blocked, entries: [], sides: [], net: null };
  const sides = ['seller', 'buyer'].map(side => {
    const entity = state.entities.find(e => e.id === bundle.invoice[side]);
    if (!entity) throw new Error('Unknown entity');
    const current = booked(state, invoiceId, entity.id, side === 'seller' ? 'IC_RECEIVABLE' : 'IC_PAYABLE');
    const expected = convert(bundle.net, entity.rate);
    return { side, entity: entity.id, currency: entity.currency, current, expected, delta: expected - current, rate: entity.rate };
  });
  const entries = sides.flatMap(s => adjustmentLines(state.entities.find(e => e.id === s.entity), s.side, s.delta));
  const wrong = sides.filter(s => s.delta !== 0);
  const diagnosis = !wrong.length ? 'Reconciled' : wrong.some(s => s.current === 0 && s.expected > 0) ? 'Missing counterpart entry' : wrong.some(s => s.expected > 0 && s.current === s.expected * 2) ? 'Duplicate booking' : bundle.credits.length ? 'Credit note not reflected' : 'Booking differs from policy';
  const explanation = !wrong.length ? 'Both entities agree with the documented net service amount and policy rates.' : `${diagnosis}. Compare both entity balances with the invoice${bundle.credits.length ? ' and credit notes' : ''}; prepare ${entries.length} functional-currency lines for human review.`;
  return { ...base, status: entries.length ? 'review' : 'matched', diagnosis, explanation, net: bundle.net, sides, entries };
}

export function summary(state) {
  const cases = invoiceIds(state).map(id => {
    const current = investigate(state, id);
    if (current.status === 'matched' && !validateProposal(state, current).passed) {
      current.status = 'blocked';
      current.diagnosis = 'Ledger integrity needs review';
      current.explanation = 'Receivable and payable agree, but independent checks found an inconsistent ledger. Review the underlying entries.';
    }
    const last = state.investigations.filter(i => i.invoiceId === id).at(-1);
    const held = last?.fingerprint === current.fingerprint && ['blocked', 'rejected'].includes(last.status);
    return { ...current, status: held ? 'blocked' : current.status, explanation: held ? (last.rejection?.reason || last.narrative || current.explanation) : current.explanation, investigation: last ?? null, seller: sourceBundle(state, id).invoice?.seller, buyer: sourceBundle(state, id).invoice?.buyer };
  });
  const latestReport = state.reports.at(-1);
  return { cases, matched: cases.filter(c => c.status === 'matched').length, review: cases.filter(c => c.status === 'review').length, blocked: cases.filter(c => c.status === 'blocked').length, latestReport: latestReport ? { ...latestReport, stale: latestReport.fingerprint !== fingerprint(state) } : null, entityBalances: state.entities.map(e => ({ ...e, receivable: invoiceIds(state).reduce((sum, id) => sum + booked(state, id, e.id, 'IC_RECEIVABLE'), 0), payable: invoiceIds(state).reduce((sum, id) => sum + booked(state, id, e.id, 'IC_PAYABLE'), 0) })) };
}

import { hash } from './revisions.js';

export function candidateDigest(state, invoiceId) {
  return hash(state.documents.filter(d => d.invoiceId === invoiceId && d.kind === 'invoice'));
}

// An explicit controller choice selects authority; every source remains evidence.
export function selectedInvoices(state, invoiceId) {
  const candidates = state.documents.filter(d => d.invoiceId === invoiceId && d.kind === 'invoice');
  if (candidates.length < 2) return candidates;
  const choice = state.sourceDecisions?.filter(d => d.invoiceId === invoiceId).at(-1);
  if (!choice || choice.candidateDigest !== candidateDigest(state, invoiceId)) return candidates;
  return candidates.filter(d => d.id === choice.selectedSourceId);
}

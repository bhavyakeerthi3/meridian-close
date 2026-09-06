import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const invoiceIds = state => [...new Set(state.documents.map(d => d.invoiceId))].sort();

export function fingerprint(state, invoiceId = undefined) {
  return hash({ policy: state.policy, entities: state.entities, documents: state.documents.filter(d => !invoiceId || d.invoiceId === invoiceId), journals: state.journals.filter(j => !invoiceId || j.invoiceId === invoiceId), decisions: invoiceId ? undefined : state.investigations.map(p => ({ id: p.id, status: p.status, approval: p.approval, rejection: p.rejection })) });
}

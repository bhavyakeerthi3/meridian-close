import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { event } from './store.js';
import { hash, fingerprint } from './revisions.js';
import { candidateDigest } from './source-selection.js';
import { adjustmentLines } from './accounting.js';
import { convert } from './money.js';
import { invalidate } from './workflow.js';

const reference = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/);
const amount = z.number().int().min(0).max(1e12);
const schema = z.object({
  invoiceId: reference, sourceId: reference, title: z.string().trim().min(1).max(200),
  seller: z.enum(['US', 'UK', 'IN']), buyer: z.enum(['US', 'UK', 'IN']),
  amount: amount.positive(), currency: z.literal('USD'), period: z.string().regex(/^\d{4}-\d{2}$/),
  body: z.string().trim().min(1).max(20_000), disputed: z.boolean().default(false),
  sellerBooked: amount.optional(), buyerBooked: amount.optional(),
  sourceOnly: z.boolean().default(false),
}).strict();

export function importCase(store, input) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error('Check invoice/source IDs, distinct supported entities, USD amount, period and evidence text. Amounts must be integer minor units.');
  const data = parsed.data;
  if (data.seller === data.buyer) throw new Error('Seller and buyer must be different entities');
  if (data.sourceOnly && (data.sellerBooked !== undefined || data.buyerBooked !== undefined)) throw new Error('Additional sources cannot change imported ledger balances');
  const digest = hash(data);
  return store.update(state => {
    if (data.period !== state.period) throw new Error(`This workspace supports the ${state.period} close period`);
    const receipt = state.caseImports?.find(r => r.sourceId === data.sourceId);
    if (receipt?.digest === digest) return { invoiceId: data.invoiceId, sourceId: data.sourceId, replayed: true };
    if (state.documents.some(d => d.id === data.sourceId)) throw new Error('Source ID already exists. Import a new reference for conflicting evidence.');
    const exists = state.documents.some(d => d.invoiceId === data.invoiceId);
    if (data.sourceOnly !== exists) throw new Error(exists ? 'Invoice already exists. Use Add conflicting invoice source.' : 'Create a new case before attaching another invoice source.');
    for (const entityId of [data.seller, data.buyer]) convert(data.amount, state.entities.find(e => e.id === entityId).rate);
    const doc = { id: data.sourceId, invoiceId: data.invoiceId, kind: 'invoice', seller: data.seller, buyer: data.buyer, currency: data.currency, period: data.period, amount: data.amount, title: data.title, body: data.body, disputed: data.disputed, version: 1, source: 'Judge-entered sandbox source', receivedAt: new Date().toISOString() };
    state.documents.push(doc);
    if (!data.sourceOnly) {
      for (const side of ['seller', 'buyer']) {
        const entity = state.entities.find(e => e.id === data[side]);
        const booked = data[`${side}Booked`] ?? 0;
        if (booked > 0) state.journals.push({ id: randomUUID(), invoiceId: data.invoiceId, kind: 'opening_import', entries: adjustmentLines(entity, side, booked), createdAt: doc.receivedAt, sourceId: doc.id, description: 'Opening balance supplied by the judge; no AI-generated correction.' });
      }
    }
    (state.caseImports ??= []).push({ sourceId: doc.id, digest, at: doc.receivedAt });
    invalidate(state, data.invoiceId, doc.id);
    event(state, 'case.imported', `${data.invoiceId}: ${data.sourceOnly ? 'additional invoice evidence' : 'new judge case and stated opening balances'} imported.`, { invoiceId: data.invoiceId, sourceId: doc.id });
    return { invoiceId: data.invoiceId, sourceId: doc.id, replayed: false };
  });
}

export function chooseInvoiceSource(store, { invoiceId, selectedSourceId, sourceFingerprint, reviewer, role, reason }) {
  if (role !== 'group_controller' || typeof reviewer !== 'string' || !reviewer.trim() || reviewer.length > 80 || typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 2000) throw new Error('A controller name and a source-selection reason are required');
  return store.update(state => {
    if (fingerprint(state, invoiceId) !== sourceFingerprint) throw new Error('Evidence or ledger changed while choosing a source. Refresh and review again.');
    const candidates = state.documents.filter(d => d.invoiceId === invoiceId && d.kind === 'invoice');
    const selected = candidates.find(d => d.id === selectedSourceId);
    if (candidates.length < 2 || !selected) throw new Error('Choose an existing source from a conflicting invoice bundle');
    if (selected.disputed) throw new Error('A disputed service cannot be cleared by selecting its invoice');
    const choice = { id: randomUUID(), invoiceId, selectedSourceId, candidateDigest: candidateDigest(state, invoiceId), reviewer: reviewer.trim(), role, reason: reason.trim(), at: new Date().toISOString() };
    (state.sourceDecisions ??= []).push(choice);
    invalidate(state, invoiceId, selectedSourceId);
    event(state, 'source.selected', `${reviewer.trim()} selected ${selectedSourceId} as invoice authority. All competing sources are retained; investigate again.`, { invoiceId, decisionId: choice.id });
    return choice;
  });
}

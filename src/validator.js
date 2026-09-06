import { integer, convert } from './money.js';
import { fingerprint } from './revisions.js';
import { selectedInvoices } from './source-selection.js';

// This verifier rebuilds obligations from source records and ledger lines; it does
// not call the proposal builder or trust the model's totals, status, or diagnosis.
export function validateProposal(state, proposal) {
  const checks = [];
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
  check('Current source revision', proposal.fingerprint === fingerprint(state, proposal.invoiceId), 'Approval binds to exact evidence, policy, and ledger revisions.');
  const docs = state.documents.filter(d => d.invoiceId === proposal.invoiceId);
  const invoices = selectedInvoices(state, proposal.invoiceId);
  const invoice = invoices[0];
  check('Supported source invoice', invoices.length === 1 && invoice?.currency === 'USD' && !invoice?.disputed && invoice?.seller !== invoice?.buyer, 'One undisputed USD service invoice with distinct parties.');
  const refs = new Set(proposal.evidenceIds);
  check('Evidence references', docs.length > 0 && docs.every(d => refs.has(d.id)) && [...refs].every(id => docs.some(d => d.id === id)), 'All referenced documents exist in this invoice bundle.');
  check('Policy revision', proposal.policyId === state.policy.id && proposal.policyVersion === state.policy.version, 'Proposal uses the current approved policy.');
  if (!invoice || invoices.length !== 1) return { passed: false, checks };
  let validAmounts = true;
  let net = 0;
  try {
    integer(invoice.amount);
    net = invoice.amount;
    for (const credit of docs.filter(d => d.kind === 'credit_note')) {
      integer(credit.amount);
      if (credit.amount <= 0 || credit.currency !== invoice.currency || credit.seller !== invoice.seller || credit.buyer !== invoice.buyer) validAmounts = false;
      net -= credit.amount;
    }
    for (const line of proposal.entries) {
      integer(line.debit); integer(line.credit);
      if (line.debit < 0 || line.credit < 0 || (line.debit === 0) === (line.credit === 0)) validAmounts = false;
    }
    integer(net);
  } catch { validAmounts = false; }
  check('Exact minor units', validAmounts && net >= 0 && invoice.amount > 0, 'Positive source values and bounded integer arithmetic; credits cannot exceed invoice.');
  const allowed = new Set();
  let balanceOkay = true;
  let obligationsOkay = validAmounts;
  for (const side of ['seller', 'buyer']) {
    const entity = state.entities.find(e => e.id === invoice[side]);
    if (!entity) { obligationsOkay = false; continue; }
    const accounts = side === 'seller' ? ['IC_RECEIVABLE', 'SERVICE_REVENUE'] : ['SERVICE_EXPENSE', 'IC_PAYABLE'];
    for (const account of accounts) allowed.add(`${entity.id}:${entity.currency}:${account}`);
    const proposed = proposal.entries.filter(e => e.entity === entity.id);
    if (proposed.reduce((sum, e) => sum + e.debit - e.credit, 0) !== 0) balanceOkay = false;
    const existing = state.journals.filter(j => j.invoiceId === proposal.invoiceId).flatMap(j => j.entries).filter(e => e.entity === entity.id);
    for (const [index, account] of accounts.entries()) {
      const combined = [...existing, ...proposed].filter(e => e.account === account);
      const amount = combined.reduce((sum, e) => sum + (index === 0 ? e.debit - e.credit : e.credit - e.debit), 0);
      if (amount !== convert(net, entity.rate)) obligationsOkay = false;
    }
  }
  check('Balanced by entity', balanceOkay, 'Each subsidiary balances in its own functional currency.');
  const sourceLines = state.journals.filter(j => j.invoiceId === proposal.invoiceId).flatMap(j => j.entries);
  check('Allowed accounts and currency', [...sourceLines, ...proposal.entries].every(e => allowed.has(`${e.entity}:${e.currency}:${e.account}`) && Number.isSafeInteger(e.debit) && Number.isSafeInteger(e.credit) && e.debit >= 0 && e.credit >= 0 && (e.debit === 0) !== (e.credit === 0)), 'Existing and proposed lines use supported entities, currencies, accounts and integer amounts.');
  check('Source-to-ledger agreement', obligationsOkay, 'Post-correction accounts agree with independently recomputed source obligations.');
  return { passed: checks.every(c => c.passed), checks };
}

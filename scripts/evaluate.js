import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openStore } from '../src/store.js';
import { investigate } from '../src/accounting.js';
import { validateProposal } from '../src/validator.js';

// Frozen deterministic amounts, distinct from the six UI scenarios. This evaluates
// numerical proposal construction and validation, NOT live LLM diagnosis quality.
const amounts = [101, 337, 999, 12345, 78123, 100001, 987654, 1_234_567, 8_765_431, 12_345_678];
const results = [];
const start = performance.now();
for (const amount of amounts) {
  for (const kind of ['missing', 'duplicate', 'balanced_wrong']) {
    const store = openStore(':memory:');
    store.update(s => {
      s.documents = [{ id: `EVAL-${amount}`, invoiceId: 'HELDOUT', kind: 'invoice', seller: 'US', buyer: 'UK', currency: 'USD', amount, version: 1, title: 'Held-out service fixture', period: s.period }];
      const expectedGBP = Math.floor((amount * 8 + 5) / 10);
      s.journals = [{ id: 'seller', invoiceId: 'HELDOUT', entries: [{ entity: 'US', currency: 'USD', account: 'IC_RECEIVABLE', debit: amount, credit: 0 }, { entity: 'US', currency: 'USD', account: 'SERVICE_REVENUE', debit: 0, credit: amount }] }];
      if (kind === 'duplicate') s.journals.push({ id: 'buyer', invoiceId: 'HELDOUT', entries: [{ entity: 'UK', currency: 'GBP', account: 'SERVICE_EXPENSE', debit: expectedGBP * 2, credit: 0 }, { entity: 'UK', currency: 'GBP', account: 'IC_PAYABLE', debit: 0, credit: expectedGBP * 2 }] });
    });
    const s = store.read(); const p = investigate(s, 'HELDOUT');
    if (kind === 'balanced_wrong') { p.entries[0].debit += 1; p.entries[1].credit += 1; }
    const accepted = validateProposal(s, p).passed;
    results.push({ amountUSDMinor: amount, kind, expectedAcceptance: kind !== 'balanced_wrong', accepted, passed: accepted === (kind !== 'balanced_wrong') });
    store.close();
  }
}
const output = { generatedAt: new Date().toISOString(), scope: 'Deterministic held-out arithmetic and validator checks. No live model accuracy or human time savings claimed.', cases: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, durationMs: Math.round(performance.now() - start), results };
writeFileSync(resolve('evidence/evaluation.json'), JSON.stringify(output, null, 2));
console.log(JSON.stringify({ ...output, results: undefined }, null, 2));
if (output.failed) process.exitCode = 1;

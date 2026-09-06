export const entities = [
  { id: 'US', name: 'Meridian US', country: 'United States', currency: 'USD', rate: { n: 1, d: 1 } },
  { id: 'UK', name: 'Meridian UK', country: 'United Kingdom', currency: 'GBP', rate: { n: 4, d: 5 } },
  { id: 'IN', name: 'Meridian India', country: 'India', currency: 'INR', rate: { n: 83, d: 1 } },
];

export function initialState() {
  const documents = [];
  const journals = [];
  const at = '2026-09-05T17:05:00.000Z';
  const add = (id, seller, buyer, amount, title, sellerAmount, buyerAmount, extra = {}) => {
    documents.push({ id: `DOC-${id}`, invoiceId: id, kind: 'invoice', seller, buyer, currency: 'USD', amount, title, body: `Approved service invoice ${id}. ${title}. ${seller} supplied services to ${buyer}. Gross USD ${(amount / 100).toFixed(2)}. Period August 2026.`, version: 1, source: 'Synthetic invoice', period: '2026-08', ...extra });
    for (const [entityId, side, booked] of [[seller, 'seller', sellerAmount], [buyer, 'buyer', buyerAmount]]) {
      if (booked === null) continue;
      const entity = entities.find(e => e.id === entityId);
      const debit = side === 'seller' ? 'IC_RECEIVABLE' : 'SERVICE_EXPENSE';
      const credit = side === 'seller' ? 'SERVICE_REVENUE' : 'IC_PAYABLE';
      journals.push({ id: `OPEN-${id}-${entityId}`, invoiceId: id, kind: 'opening', createdAt: at, entries: [{ entity: entityId, currency: entity.currency, account: debit, debit: booked, credit: 0 }, { entity: entityId, currency: entity.currency, account: credit, debit: 0, credit: booked }] });
    }
  };
  add('IC-1042', 'US', 'UK', 1_200_000, 'Platform engineering · August', 1_200_000, null);
  add('IC-1043', 'UK', 'IN', 400_000, 'Shared customer operations', 320_000, 66_400_000);
  add('IC-1044', 'US', 'UK', 350_000, 'Infrastructure allocation', 350_000, 262_500);
  add('IC-1045', 'US', 'IN', 800_000, 'Data services and support', 750_000, 66_400_000);
  documents.push({ id: 'CN-1045', invoiceId: 'IC-1045', kind: 'credit_note', seller: 'US', buyer: 'IN', currency: 'USD', amount: 50_000, version: 1, title: 'August service credit', source: 'Synthetic credit note', body: 'Credit of USD 500.00 against IC-1045 for agreed downtime. Both entities must reflect the credit.', period: '2026-08' });
  add('IC-1046', 'UK', 'US', 500_000, 'Design systems retainer', 400_000, 500_000);
  add('IC-1047', 'IN', 'US', 225_000, 'Unconfirmed advisory services', 18_675_000, null, { disputed: true, body: 'The invoice reference conflicts with the meeting notes. The recipient has not confirmed delivery. Escalate until the underlying service is confirmed.' });
  documents.push({ id: 'MAIL-1042', invoiceId: 'IC-1042', kind: 'email', version: 1, title: 'UK controller: invoice missed the import', source: 'Synthetic email', body: 'From: controller-uk@meridian.example\nSubject: IC-1042\nWe received the August engineering invoice, but the payable was omitted from our ledger import. Please prepare an evidence-backed correction for review.' });
  documents.push({ id: 'MEET-1047', invoiceId: 'IC-1047', kind: 'meeting', version: 1, title: 'Close meeting: confirm advisory delivery', source: 'Synthetic meeting transcript', body: 'UK controller: Do not clear the India advisory item yet. The service acceptance is still disputed. Group controller: Keep the exception open until signed evidence arrives.' });
  return { schema: 1, revision: 1, period: '2026-08', group: 'Meridian Group', entities: structuredClone(entities), policy: { id: 'POL-IC-01', version: 1, name: 'Wholly owned intercompany services', description: 'Synthetic policy: USD service invoices, documented invoice and credit amounts, entity-specific fixed functional booking rates. Reviewer approval is required for all corrections. Disputed services stay open.', rateSource: 'Synthetic fixture rates, not market quotes' }, documents, journals, investigations: [], reports: [], events: [{ id: 'EV-OPEN', type: 'workspace.created', at, message: 'Synthetic August close workspace created. No production accounts connected.' }], runs: [], feedback: [], sponsorEvidence: [] };
}

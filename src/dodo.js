import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { event } from './store.js';
import { hash } from './revisions.js';

const minor = z.number().int().min(-1e12).max(1e12);
const ledgerEntry = z.object({
  id: z.string().min(1).max(200), business_id: z.string().min(1).max(200),
  created_at: z.string().datetime({ offset: true }), currency: z.string().regex(/^[A-Z]{3}$/),
  amount: minor, is_credit: z.boolean(), event_type: z.string().min(1).max(100),
  usd_equivalent_amount: minor, before_balance: minor.nullish(), after_balance: minor.nullish(),
  description: z.string().max(4000).nullish(), payout_id: z.string().max(200).nullish(), reference_object_id: z.string().max(200).nullish(),
});

export function inspectCashRows(rows) {
  return rows.map(row => {
    if (row.amount < 0) return { ...row, check: 'review', detail: 'Negative amount convention needs source confirmation.' };
    if (row.before_balance == null || row.after_balance == null) return { ...row, check: 'unchecked', detail: 'Provider did not supply before/after balances.' };
    const expected = row.before_balance + (row.is_credit ? row.amount : -row.amount);
    return { ...row, check: expected === row.after_balance ? 'passed' : 'review', detail: expected === row.after_balance ? 'Row movement agrees with provider before/after balances.' : 'Row movement does not agree with provider balance change.' };
  });
}

export async function fetchDodoLedger({ from, to }, { apiKey = process.env.DODO_PAYMENTS_API_KEY, fetcher = fetch, maxPages = 10 } = {}) {
  if (!apiKey?.trim()) throw new Error('Save a Dodo test-mode API key in the local environment file and restart.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Use ISO dates for the cash evidence window.');
  const start = `${from}T00:00:00.000Z`; const end = `${to}T23:59:59.999Z`;
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || new Date(start).toISOString().slice(0, 10) !== from || new Date(end).toISOString().slice(0, 10) !== to || start > end || Date.parse(end) - Date.parse(start) > 93 * 86400_000) throw new Error('Choose a valid date window of at most 93 days.');
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) throw new Error('Invalid page budget');
  const rows = new Map(); let complete = false; let duplicateRows = 0; let pages = 0;
  const signal = AbortSignal.timeout(30_000);
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL('https://test.dodopayments.com/balances/ledger');
    for (const [key, value] of Object.entries({ created_at_gte: start, created_at_lte: end, page_number: page, page_size: 100, limit: 100 })) url.searchParams.set(key, String(value));
    const response = await fetcher(url, { method: 'GET', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, redirect: 'error', signal });
    if (!response.ok) throw new Error(`Dodo test ledger returned HTTP ${response.status}. No cash evidence was changed.`);
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error('Dodo ledger response exceeded the import limit.');
    const parsed = z.object({ items: z.array(ledgerEntry).max(100) }).safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error('Dodo ledger response does not match the supported schema. No cash evidence was changed.');
    pages++;
    if (!parsed.data.items.length) { complete = true; break; }
    for (const row of parsed.data.items) {
      if (Date.parse(row.created_at) < Date.parse(start) || Date.parse(row.created_at) > Date.parse(end)) throw new Error('Provider returned a row outside the requested window. Narrow the dates and retry.');
      const previous = rows.get(row.id);
      if (previous && hash(previous) !== hash(row)) throw new Error('The same ledger ID changed during pagination. Retry a stable window.');
      if (previous) duplicateRows++; else rows.set(row.id, row);
    }
  }
  const entries = inspectCashRows([...rows.values()]);
  return { id: randomUUID(), provider: 'Dodo Payments', environment: 'test_mode', importedAt: new Date().toISOString(), from, to, complete, pages, duplicateRows, entries, contentHash: hash(entries), rowChecks: { passed: entries.filter(e => e.check === 'passed').length, review: entries.filter(e => e.check === 'review').length, unchecked: entries.filter(e => e.check === 'unchecked').length }, scope: 'Read-only provider balance movements. Row checks do not establish bank reconciliation, completeness of the provider ledger, or revenue recognition. Customer cash is separate from intercompany service accounting.' };
}

export function saveCashSnapshot(store, snapshot) {
  return store.update(state => {
    (state.cashSnapshots ??= []).push(snapshot);
    event(state, 'cash.imported', `${snapshot.entries.length} Dodo test ledger rows imported for ${snapshot.from} to ${snapshot.to}. ${snapshot.complete ? 'Pagination reached an empty page.' : 'Page budget reached; coverage is partial.'}`, { snapshotId: snapshot.id });
    return snapshot;
  });
}

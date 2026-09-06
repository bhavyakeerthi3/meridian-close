import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDodoLedger, saveCashSnapshot, inspectCashRows } from '../src/dodo.js';
import { openStore } from '../src/store.js';
import { fingerprint } from '../src/revisions.js';

const row = { id: 'led_1', business_id: 'test_business', created_at: '2026-09-05T10:00:00Z', currency: 'USD', amount: 100, is_credit: true, event_type: 'payment', usd_equivalent_amount: 100, before_balance: 500, after_balance: 600 };
const dates = { from: '2026-09-01', to: '2026-09-05' };
const response = items => new Response(JSON.stringify({ items }), { status: 200 });

test('Dodo import uses test GET only, deduplicates pagination and does not affect intercompany balances', async () => {
  let calls = 0;
  const snapshot = await fetchDodoLedger(dates, { apiKey: 'unit-test-placeholder', fetcher: async (url, options) => {
    calls++; assert.equal(url.origin, 'https://test.dodopayments.com'); assert.equal(url.pathname, '/balances/ledger');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(url.searchParams.get('page_number'), String(calls));
    assert.equal(options.headers.Authorization, 'Bearer unit-test-placeholder');
    return response(calls < 3 ? [row] : []);
  } });
  assert.equal(snapshot.entries.length, 1); assert.equal(snapshot.duplicateRows, 1); assert.equal(snapshot.complete, true);
  assert.equal(snapshot.rowChecks.passed, 1);
  const store = openStore(':memory:'); const before = fingerprint(store.read()); saveCashSnapshot(store, snapshot);
  assert.equal(fingerprint(store.read()), before); store.close();
});

test('Dodo pagination budget produces explicit partial coverage, never a completed import claim', async () => {
  const snapshot = await fetchDodoLedger(dates, { apiKey: 'unit-test-placeholder', maxPages: 2, fetcher: async () => response([row]) });
  assert.equal(snapshot.complete, false); assert.equal(snapshot.pages, 2);
});

test('Dodo rejects changing IDs, malformed money, out-of-window rows and failed authentication', async () => {
  let page = 0;
  await assert.rejects(fetchDodoLedger(dates, { apiKey: 'unit-test-placeholder', fetcher: async () => response([{ ...row, amount: ++page === 1 ? 100 : 200 }]) }), /changed during pagination/);
  await assert.rejects(fetchDodoLedger(dates, { apiKey: 'unit-test-placeholder', fetcher: async () => response([{ ...row, amount: 0.5 }]) }), /schema/);
  await assert.rejects(fetchDodoLedger(dates, { apiKey: 'unit-test-placeholder', fetcher: async () => response([{ ...row, created_at: '2026-08-01T00:00:00Z' }]) }), /outside/);
  await assert.rejects(fetchDodoLedger(dates, { apiKey: 'unit-test-placeholder', fetcher: async () => new Response('sensitive provider body omitted', { status: 401 }) }), /HTTP 401/);
});

test('Dodo row checks flag inconsistent movements and missing balances without inventing bank reconciliation', () => {
  const rows = inspectCashRows([row, { ...row, is_credit: false }, { ...row, after_balance: null }, { ...row, amount: -100 }]);
  assert.deepEqual(rows.map(r => r.check), ['passed', 'review', 'unchecked', 'review']);
});

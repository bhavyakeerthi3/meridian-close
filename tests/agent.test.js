import test from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV4 } from 'ai/test';
import { openStore } from '../src/store.js';
import { createInvestigator } from '../src/agent.js';
import { runClose } from '../src/workflow.js';

function modelFor(steps) {
  let index = 0;
  return new MockLanguageModelV4({ doGenerate: async () => {
    const calls = steps[index++] || [];
    return { content: calls.length ? calls.map(([toolName, input], n) => ({ type: 'tool-call', toolCallId: `call-${index}-${n}`, toolName, input: JSON.stringify(input || {}) })) : [{ type: 'text', text: 'Test transport completed.' }], finishReason: { unified: calls.length ? 'tool-calls' : 'stop', raw: undefined }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 10, text: 10, reasoning: undefined } }, warnings: [] };
  } });
}
const reads = [['read_evidence'], ['inspect_ledger'], ['read_policy'], ['check_correction']];
const finding = (evidenceIds, decision = 'review') => ['submit_finding', { decision, explanation: 'The source and both entity balances support a controller review of this difference.', evidenceIds }];

test('AI SDK tool loop completes an evidence-grounded finding and has no posting authority', async () => {
  const store = openStore(':memory:'); const before = store.read().journals;
  const model = modelFor([reads, [finding(['DOC-IC-1042', 'MAIL-1042'])]]);
  await runClose(store, createInvestigator({ languageModel: model }), 'IC-1042');
  const proposal = store.read().investigations.at(-1);
  assert.equal(proposal.status, 'review'); assert.equal(proposal.mode, 'test model transport');
  assert.ok(proposal.trace.some(t => t.name === 'submit_finding'));
  assert.deepEqual(store.read().journals, before);
  const tools = model.doGenerateCalls[0].tools.map(t => t.name);
  assert.equal(tools.some(name => /approve|post|payment/.test(name)), false); store.close();
});

test('agent cannot submit without reading evidence, ledger and policy', async () => {
  const store = openStore(':memory:');
  const model = modelFor([[['check_correction']], [finding(['DOC-IC-1042'])]]);
  await runClose(store, createInvestigator({ languageModel: model }), 'IC-1042');
  assert.equal(store.read().investigations.length, 0);
  assert.equal(store.read().runs.at(-1).status, 'failed');
  assert.match(store.read().runs.at(-1).error, /required tool 'read_evidence'/);
  assert.match(JSON.stringify(model.doGenerateCalls.at(-1).prompt), /Required evidence tools not consulted/);
  store.close();
});

test('agent cannot fabricate a source ID or override a source dispute', async () => {
  for (const [invoiceId, sources, expected] of [['IC-1042', ['MADE-UP'], 'Unknown evidence'], ['IC-1047', ['DOC-IC-1047'], 'source block cannot be overridden']]) {
    const store = openStore(':memory:'); const model = modelFor([reads, [finding(sources)]]);
    await runClose(store, createInvestigator({ languageModel: model }), invoiceId);
    assert.equal(store.read().investigations.length, 0);
    assert.equal(store.read().runs.at(-1).status, 'failed');
    assert.match(store.read().runs.at(-1).error, /required tool 'submit_finding'/);
    assert.ok(JSON.stringify(model.doGenerateCalls.at(-1).prompt).includes(expected)); store.close();
  }
});

test('tool guidance recovers from repetitive reads and stops immediately after an accepted finding', async () => {
  let count = 0;
  const model = new MockLanguageModelV4({ doGenerate: async options => {
    count++;
    const toolName = count <= 2 ? 'read_evidence' : options.toolChoice.toolName;
    const input = toolName === 'submit_finding' ? finding(['DOC-IC-1042'])[1] : {};
    return { content: [{ type: 'tool-call', toolCallId: `guided-${count}`, toolName, input: JSON.stringify(input) }], finishReason: { unified: 'tool-calls', raw: undefined }, usage: { inputTokens: { total: 10, noCache: 10 }, outputTokens: { total: 10, text: 10 } }, warnings: [] };
  } });
  const store = openStore(':memory:'); const before = store.read().journals;
  try {
    await runClose(store, createInvestigator({ languageModel: model }), 'IC-1042');
    const proposal = store.read().investigations.at(-1);
    assert.equal(proposal.status, 'review'); assert.equal(count, 6);
    assert.deepEqual(proposal.trace.filter(t => t.kind === 'tool').map(t => t.name), ['read_evidence', 'read_evidence', 'inspect_ledger', 'read_policy', 'check_correction', 'submit_finding']);
    assert.deepEqual(store.read().journals, before);
  } finally { store.close(); }
});

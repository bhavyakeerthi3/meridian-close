import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, event } from './store.js';
import { summary, invoiceIds } from './accounting.js';
import { createInvestigator, askAccountant, initializeTracing, integrationStatus, stopTracing, traced } from './agent.js';
import { approve, reject, addCredit, addCommunication, prepareReport, exportReport, recoverInterrupted, safeError } from './workflow.js';
import { fetchDodoLedger, saveCashSnapshot } from './dodo.js';
import { createRunner } from './runner.js';
import { readNeatlogsTrace } from './trace-delivery.js';
import { flushAllDetailed } from 'neatlogs';
import { importCase, chooseInvoiceSource } from './cases.js';
import { createStudy, studyView, startTrial, assistTrial, finishTrial, recordStudyFeedback, studySummary, exportStudy } from './study.js';
import { brandWorkspace, decisionDesk, draftEvidenceRequest } from './decisions.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4317);
const databasePath = process.env.CLOSELOOP_DB || join(root, 'data', 'closeloop.sqlite');
const store = openStore(databasePath);
brandWorkspace(store);
recoverInterrupted(store);
await initializeTracing();
const runner = createRunner(store, databasePath);
let cashImportRunning = false;
const activeStudyAssistance = new Set();

async function guarded(name, input, fn) {
  let failure;
  const result = await traced(name, 'WORKFLOW', input, async () => {
    try { return await traced(`${name} validation`, 'GUARDRAIL', input, fn); }
    catch (error) { failure = error; return { rejected: true, reason: safeError(error) }; }
  });
  if (failure) throw failure;
  return result;
}

const json = (res, value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
async function body(req) {
  let data = ''; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 100_000) throw new Error('Request is too large'); data += chunk; }
  return data ? JSON.parse(data) : {};
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const host = req.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) return json(res, { error: 'Invalid local host' }, 403);
  const url = new URL(req.url, `http://${host}`);
  try {
    if (req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, { error: 'Cross-origin writes are forbidden' }, 403);
      if (!String(req.headers['content-type']).startsWith('application/json')) return json(res, { error: 'JSON request required' }, 415);
    }
    if (url.pathname === '/api/state' && req.method === 'GET') {
      const state = store.read();
      const integrations = integrationStatus();
      const live = state.investigations.filter(p => p.mode === 'TensorMux live agent' && p.usage).at(-1);
      integrations.tensorMux.verifiedAt ||= live?.createdAt ?? null;
      const exported = state.runs.filter(r => r.traceDelivery?.readback?.verified).at(-1);
      if (exported) integrations.neatlogs.status = `Application trace read back from Neatlogs: ${exported.traceDelivery.readback.spanCount} persisted spans`;
      return json(res, { ...state, studySessions: studySummary(state), workerActiveRunId: runner.activeRunId, ...summary(state), decisions: decisionDesk(state), integrations });
    }
    if (url.pathname === '/api/run' && req.method === 'POST') {
      if (runner.activeRunId) return json(res, { error: 'An investigation is already running' }, 409);
      const input = await body(req);
      if (input.invoiceId && !invoiceIds(store.read()).includes(input.invoiceId)) throw new Error('Unknown invoice');
      if (input.resumeRunId && !store.read().runs.some(r => r.id === input.resumeRunId && ['failed', 'interrupted'].includes(r.status))) throw new Error('Only a failed or interrupted run can be resumed');
      return json(res, runner.start(input), 202);
    }
    const interruption = url.pathname.match(/^\/api\/runs\/([^/]+)\/interrupt$/);
    if (interruption && req.method === 'POST') return json(res, await traced('Deliberate worker interruption', 'GUARDRAIL', { runId: interruption[1] }, () => runner.interrupt(interruption[1]), { sessionId: interruption[1] }));
    if (url.pathname === '/api/cases' && req.method === 'POST') return json(res, importCase(store, await body(req)));
    if (url.pathname === '/api/source-choice' && req.method === 'POST') return json(res, chooseInvoiceSource(store, await body(req)));
    if (url.pathname === '/api/evidence-requests' && req.method === 'POST') return json(res, draftEvidenceRequest(store, await body(req)));
    if (url.pathname === '/api/quality' && req.method === 'GET') {
      const readEvidence = async file => { try { return JSON.parse(await readFile(join(root, 'evidence', file), 'utf8')); } catch { return null; } };
      const [arithmetic, live] = await Promise.all([readEvidence('evaluation.json'), readEvidence('random-live-challenge.json')]);
      return json(res, { arithmetic: arithmetic && { generatedAt: arithmetic.generatedAt, passed: arithmetic.passed, total: arithmetic.cases, scope: arithmetic.scope }, live: live && { generatedAt: live.generatedAt, completedAt: live.completedAt, passed: live.passed, total: live.total, complete: live.complete, scope: live.scope, manifestHash: live.manifestHash, results: live.results.map(r => ({ kind: r.kind, passed: r.passed, checks: r.checks, expected: r.expected, actual: r.actual, processingMs: r.processingMs, traceId: r.traceId })) } });
    }
    const traceCheck = url.pathname.match(/^\/api\/traces\/([0-9a-f]{32})\/verify$/);
    if (traceCheck && req.method === 'POST') {
      const traceId = traceCheck[1]; const state = store.read();
      if (!state.runs.some(r => r.traceId === traceId) && !state.events.some(e => e.traceId === traceId)) throw new Error('Only this workspace’s traces can be verified');
      await flushAllDetailed(); const readback = await readNeatlogsTrace(traceId);
      store.update(s => {
        const run = s.runs.find(r => r.traceId === traceId);
        if (run?.traceDelivery) run.traceDelivery.readback = readback;
        const failure = s.events.find(e => e.traceId === traceId);
        if (failure) failure.traceReadback = readback;
      });
      return json(res, readback);
    }
    if (url.pathname === '/api/study' && req.method === 'POST') return json(res, createStudy(store, await body(req)));
    if (url.pathname === '/api/study-export' && req.method === 'GET') {
      res.setHeader('Content-Disposition', 'attachment; filename="closeloop-review-study.json"');
      return json(res, exportStudy(store.read()));
    }
    const studyRoute = url.pathname.match(/^\/api\/study\/([^/]+)(?:\/(start|assist|finish|feedback))?$/);
    if (studyRoute) {
      const [, id, action] = studyRoute;
      if (req.method === 'GET' && !action) return json(res, studyView(store.read().studySessions?.find(s => s.id === id)));
      if (req.method === 'POST') {
        const input = await body(req);
        if (action === 'start') return json(res, startTrial(store, id, input.index));
        if (action === 'assist') {
          const key = `${id}:${input.index}`;
          if (activeStudyAssistance.has(key)) return json(res, { error: 'This trial already has an agent request in progress' }, 409);
          activeStudyAssistance.add(key);
          try { return json(res, await traced('Accountant study assistance', 'WORKFLOW', { sessionId: id, index: input.index }, () => assistTrial(store, id, input.index, createInvestigator()), { sessionId: id })); }
          finally { activeStudyAssistance.delete(key); }
        }
        if (action === 'finish') return json(res, finishTrial(store, id, input.index, input));
        if (action === 'feedback') return json(res, recordStudyFeedback(store, id, input));
      }
    }
    const approval = url.pathname.match(/^\/api\/proposals\/([^/]+)\/(approve|reject)$/);
    if (approval && req.method === 'POST') {
      const input = await body(req);
      const result = await guarded(`Controller ${approval[2]}`, { proposalId: approval[1] }, span => {
        try { return approval[2] === 'approve' ? approve(store, approval[1], input) : reject(store, approval[1], input); }
        catch (error) {
          store.update(s => event(s, 'guardrail.failed', safeError(error), { proposalId: approval[1], traceId: span?.spanContext().traceId }));
          throw error;
        }
      });
      return json(res, result);
    }
    if (url.pathname === '/api/challenge' && req.method === 'POST') return json(res, addCredit(store, await body(req)));
    if (url.pathname === '/api/evidence' && req.method === 'POST') return json(res, addCommunication(store, await body(req)));
    if (url.pathname === '/api/report' && req.method === 'POST') return json(res, prepareReport(store));
    if (url.pathname === '/api/chat' && req.method === 'POST') return json(res, await askAccountant(store.read(), (await body(req)).question));
    if (url.pathname === '/api/cash/import' && req.method === 'POST') {
      if (cashImportRunning) return json(res, { error: 'Cash evidence import already running' }, 409);
      cashImportRunning = true;
      try {
        const input = await body(req);
        const snapshot = await traced('Dodo sandbox cash evidence', 'TOOL', { from: input.from, to: input.to }, () => fetchDodoLedger(input));
        return json(res, saveCashSnapshot(store, snapshot));
      } finally { cashImportRunning = false; }
    }
    if (url.pathname === '/api/cash/export' && req.method === 'GET') {
      const snapshot = store.read().cashSnapshots?.at(-1);
      if (!snapshot) return json(res, { error: 'Import Dodo test ledger evidence first' }, 404);
      res.setHeader('Content-Disposition', 'attachment; filename="closeloop-cash-evidence.json"');
      return json(res, snapshot);
    }
    if (url.pathname === '/api/export' && req.method === 'GET') {
      const output = exportReport(store, url.searchParams.get('id') || undefined);
      res.setHeader('Content-Disposition', `attachment; filename="closeloop-workpaper-v${output.version}.json"`);
      return json(res, output);
    }
    if (url.pathname === '/api/feedback-export' && req.method === 'GET') {
      const state = store.read();
      res.setHeader('Content-Disposition', 'attachment; filename="closeloop-failure-context.json"');
      return json(res, { purpose: 'Reproduced workflow failures and reviewer labels for coding-agent improvement; policies are not auto-modified.', feedback: state.feedback, failures: state.events.filter(e => /failed|interrupted|rejected|superseded/.test(e.type)) });
    }
    const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/lab.js': ['lab.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
    if (req.method === 'GET' && assets[url.pathname]) {
      const [file, type] = assets[url.pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(await readFile(join(root, 'public', file)));
    }
    json(res, { error: 'Not found' }, 404);
  } catch (error) { json(res, { error: safeError(error) }, 400); }
});
server.listen(port, '127.0.0.1', () => console.log(`CloseLoop ready at http://127.0.0.1:${port} | ${createInvestigator().mode}`));
async function stop() { server.close(); await runner.stop(); await stopTracing(); store.close(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);

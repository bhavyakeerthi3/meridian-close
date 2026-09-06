import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.js';
import { summary, invoiceIds } from './accounting.js';
import { createInvestigator, askAccountant, initializeTracing, integrationStatus, stopTracing, traced } from './agent.js';
import { approve, reject, addCredit, addCommunication, prepareReport, exportReport, recoverInterrupted, runClose, safeError } from './workflow.js';
import { fetchDodoLedger, saveCashSnapshot } from './dodo.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4317);
const store = openStore(process.env.CLOSELOOP_DB || join(root, 'data', 'closeloop.sqlite'));
recoverInterrupted(store);
await initializeTracing();
let activeRun = null;
let cashImportRunning = false;

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
      return json(res, { ...state, ...summary(state), integrations: integrationStatus() });
    }
    if (url.pathname === '/api/run' && req.method === 'POST') {
      if (activeRun) return json(res, { error: 'An investigation is already running' }, 409);
      const input = await body(req);
      if (input.invoiceId && !invoiceIds(store.read()).includes(input.invoiceId)) throw new Error('Unknown invoice');
      if (input.resumeRunId && !store.read().runs.some(r => r.id === input.resumeRunId && ['failed', 'interrupted'].includes(r.status))) throw new Error('Only a failed or interrupted run can be resumed');
      const agent = createInvestigator({ forceRehearsal: input.mode === 'rehearsal' });
      activeRun = traced('Close investigation', 'WORKFLOW', { mode: agent.mode }, () => runClose(store, agent, input.invoiceId, { resumeRunId: input.resumeRunId })).catch(error => console.error(safeError(error))).finally(() => { activeRun = null; });
      return json(res, { started: true, mode: agent.mode }, 202);
    }
    const approval = url.pathname.match(/^\/api\/proposals\/([^/]+)\/(approve|reject)$/);
    if (approval && req.method === 'POST') {
      const input = await body(req);
      const result = await traced(`Controller ${approval[2]}`, 'GUARDRAIL', { proposalId: approval[1] }, () => approval[2] === 'approve' ? approve(store, approval[1], input) : reject(store, approval[1], input));
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
    const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
    if (req.method === 'GET' && assets[url.pathname]) {
      const [file, type] = assets[url.pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(await readFile(join(root, 'public', file)));
    }
    json(res, { error: 'Not found' }, 404);
  } catch (error) { json(res, { error: safeError(error) }, 400); }
});
server.listen(port, '127.0.0.1', () => console.log(`CloseLoop ready at http://127.0.0.1:${port} | ${createInvestigator().mode}`));
async function stop() { server.close(); if (activeRun) await activeRun; await stopTracing(); store.close(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);

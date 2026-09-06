import { setTimeout } from 'node:timers/promises';
import { safeError } from './workflow.js';

// Same authenticated read path used by the installed Neatlogs Doctor 1.1.19.
// An SDK flush alone is not proof that an application trace was persisted.
export async function readNeatlogsTrace(traceId) {
  if (!/^[0-9a-f]{32}$/.test(traceId) || !process.env.NEATLOGS_API_KEY) return { verified: false, reason: 'Trace ID and project key required' };
  const endpoint = new URL(process.env.NEATLOGS_ENDPOINT || 'https://ingest.neatlogs.com');
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(new URL(`/api/traces/v3/${traceId}`, endpoint.origin), { headers: { 'x-api-key': process.env.NEATLOGS_API_KEY }, redirect: 'error', signal: AbortSignal.timeout(7000) });
      if ([202, 404].includes(response.status) && attempt < 3) { await response.body?.cancel(); await setTimeout(1200); continue; }
      if (!response.ok || response.status === 202) { await response.body?.cancel(); return { verified: false, reason: `Trace read-back returned HTTP ${response.status}` }; }
      const trace = await response.json();
      const spans = (Array.isArray(trace.spans) ? trace.spans : []).map(s => ({ id: s.span_id, parentId: s.parent_span_id ?? null, name: s.node_name ?? s.span_name, type: s.node_type ?? s.span_type, status: s.status }));
      const ids = new Set(spans.map(s => s.id));
      const hierarchyValid = spans.filter(s => !s.parentId).length === 1 && spans.every(s => !s.parentId || ids.has(s.parentId));
      const verified = trace._id === traceId && spans.length > 0 && spans.length === trace.spanCount && ids.size === spans.length && hierarchyValid;
      return { verified, checkedAt: new Date().toISOString(), traceId: trace._id, status: trace.status, spanCount: trace.spanCount, hierarchyValid, spans, hasError: trace.hasError, errorCount: trace.errorCount, tokens: { input: trace.promptTokens, output: trace.completionTokens, total: trace.totalTokensUsed }, method: 'Authenticated Neatlogs trace API read-back; UI screenshot not implied' };
    } catch (error) { if (attempt === 3) return { verified: false, reason: safeError(error) }; await setTimeout(1200); }
  }
}

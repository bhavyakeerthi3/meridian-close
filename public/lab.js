let studyActive = null;
const signedMinor = value => {
  if (!/^-?\d+(\.\d{1,2})?$/.test(String(value))) throw new Error('Use an amount with at most two decimal places');
  const negative = String(value).startsWith('-');
  const [whole, fraction = ''] = String(value).replace(/^-/, '').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('Amount is too large');
  return negative ? -cents : cents;
};

function labBase() {
  const active = state.runs.find(r => r.id === state.workerActiveRunId);
  const interrupted = state.runs.filter(r => r.interruptionProof).at(-1);
  const recovered = interrupted && state.runs.find(r => r.resumedFrom === interrupted.id && r.status === 'completed');
  const retry = state.events.filter(ev => ev.type === 'approval.replayed').at(-1);
  const posted = state.investigations.filter(p => p.status === 'posted').at(-1);
  return `${title('JUDGE LAB / LIVE CHALLENGE', 'Bring a case. Break the run.', 'New amounts, conflicting sources, a real worker interruption, and inspectable recovery.', '<button class="btn primary" data-action="lab-new">New judge case +</button>')}
  <div class="bottom-grid mb"><section class="panel panel-pad"><h2>Run the challenge</h2><p class="form-note">Use a case supplied by the judge or investigate the full workspace. Pacing creates a visible interruption window after each committed checkpoint.</p>
  <form id="lab-run-form"><label for="lab-invoice">Scope</label><select id="lab-invoice" name="invoiceId"><option value="">All invoice bundles</option>${state.cases.map(c => `<option value="${e(c.invoiceId)}">${e(c.invoiceId)} · ${e(c.title)}</option>`).join('')}</select><label for="lab-mode">Execution mode</label><select id="lab-mode" name="mode"><option value="rehearsal">Deterministic rehearsal</option><option value="live" ${state.integrations.tensorMux.configured ? 'selected' : 'disabled'}>TensorMux live agent${state.integrations.tensorMux.configured ? '' : ' · key required'}</option></select><label class="check-label"><input type="checkbox" name="paced" checked> Add a 3-second gap between checkpoints for the stage demo</label><p class="form-note">Pacing is excluded from per-invoice processing time. It is not an artificial provider failure.</p><button class="btn primary mt" ${state.workerActiveRunId ? 'disabled' : ''}>Start challenge run</button></form></section>
  <section class="panel panel-pad"><h2>${active ? 'Worker is active' : 'Recovery evidence'}</h2>${active ? `<p class="form-note">${e(active.mode)} · PID ${e(active.workerPid)} · ${active.completed}/${active.total} checkpoints</p><progress class="run-progress" value="${active.completed}" max="${Math.max(active.total, 1)}" aria-label="Committed checkpoints"></progress><button class="btn danger mt" data-action="lab-interrupt" data-run="${e(active.id)}">Terminate worker process</button>` : '<p class="form-note">Start a paced multi-invoice run, let a checkpoint commit, then terminate the worker.</p>'}
  ${interrupted ? `<div class="notice mt"><strong>OS process ${e(interrupted.interruptionProof.workerPid)} terminated</strong><p>${interrupted.interruptionProof.completedCheckpoints} checkpoints retained · ledger ${interrupted.interruptionProof.ledgerUnchanged ? 'unchanged during interruption' : 'changed during the interruption window; inspect the audit'}</p><p class="mono">${e(interrupted.interruptionProof.ledgerHash.slice(0, 24))}…</p>${recovered ? `<p><strong>Recovery completed:</strong> ${recovered.completed} remaining bundles investigated.</p>` : ''}</div>${recovered ? '' : `<button class="btn" data-action="resume" data-run="${e(interrupted.id)}" ${state.workerActiveRunId ? 'disabled' : ''}>Resume unfinished work →</button>`}` : ''}
  ${posted ? `<hr class="divider"><button class="btn" data-action="lab-retry" data-proposal="${e(posted.id)}">Retry an approved posting</button><p class="form-note">Returns the original journal for ${e(posted.invoiceId)} and records the retry in the audit trail.</p>` : ''}${retry ? `<p class="form-note"><strong>Retry verified:</strong> ${e(retry.invoiceId)} returned journal ${e(retry.journalId.slice(0, 8))}; ${retry.correctionCount} correction batches in the ledger at that check.</p>` : ''}</section></div>
  <section class="panel panel-pad mb"><div class="section-head"><h2>Source challenges</h2><span class="mono">${state.caseImports?.length ?? 0} imports</span></div><p class="form-note">An additional invoice source with a different amount creates a conflict. A controller must choose source authority; the agent cannot make that approval.</p><div class="case-actions">${state.cases.map(c => `<div class="trace-step"><div><button class="row-title" data-action="detail" data-invoice="${e(c.invoiceId)}">${e(c.invoiceId)}</button><p>${e(c.title)}</p></div><button class="btn small" data-action="lab-conflict" data-invoice="${e(c.invoiceId)}">Add invoice source</button>${state.documents.filter(d => d.invoiceId === c.invoiceId && d.kind === 'invoice').length > 1 ? `<button class="btn small" data-action="lab-source" data-invoice="${e(c.invoiceId)}">Review source authority</button>` : ''}</div>`).join('')}</div></section>
  <section class="panel panel-pad"><h2>Run and trace evidence</h2>${state.runs.slice(-8).reverse().map(r => `<div class="trace-step"><div><strong>${e(r.id)}</strong><p>${e(r.mode)} · ${e(r.execution || 'in-process legacy run')} · ${r.completed}/${r.total} · ${e(r.status)}</p>${r.traceId ? `<p class="mono">Neatlogs trace: ${e(r.traceId)}</p>` : ''}${r.traceDelivery ? `<p>SDK export flush: ${r.traceDelivery.flush.success ? 'completed' : 'failed'} · ${r.traceDelivery.spanExportFailures} span export failures. ${r.traceDelivery.readback?.verified ? `Remote persistence verified: ${r.traceDelivery.readback.spanCount} spans, valid hierarchy.` : 'Remote trace read-back not yet verified.'}</p>` : ''}${r.error ? `<p>${e(r.error)}</p>` : ''}</div></div>`).join('')}</section>`;
}

function lab() {
  const failures = state.events.filter(ev => ev.type === 'guardrail.failed').slice(-4).reverse();
  return labBase() + `<section class="panel panel-pad mt"><h2>Remote trace checks and observed failures</h2><p class="form-note">Read the exact trace back through Neatlogs. Deliberately rejected approvals are labeled in the audit; no provider failure is simulated.</p>${state.runs.filter(r => r.traceId).slice(-4).reverse().map(r => `<div class="trace-step"><div><strong>${e(r.invoiceIds.join(', '))}</strong><p class="mono">${e(r.traceId)}</p>${remoteSpanPanel(r.traceDelivery?.readback)}</div><button class="btn small" data-action="lab-trace" data-trace="${e(r.traceId)}">Verify remote trace</button></div>`).join('')}${failures.map(ev => `<div class="trace-step"><div><strong>${e(ev.message)}</strong><p>${e(ev.traceId || 'Local audit only')} · ${ev.traceReadback?.verified ? 'Remote failure trace verified' : 'Remote read-back pending'}</p>${remoteSpanPanel(ev.traceReadback)}</div>${ev.traceId ? `<button class="btn small" data-action="lab-trace" data-trace="${e(ev.traceId)}">Verify failure trace</button>` : ''}</div>`).join('') || '<p class="form-note">No failed approval request has been recorded in this workspace.</p>'}</section>`;
}

function remoteSpanPanel(readback) {
  if (!readback?.verified) return '';
  return `<details class="remote-spans"><summary>Inspect ${readback.spanCount} persisted Neatlogs spans</summary><p class="form-note">Authenticated read-back at ${time(readback.checkedAt)} · ${readback.tokens?.total ?? 0} recorded tokens · hierarchy verified</p><div class="table-wrap"><table><thead><tr><th>Actual span</th><th>Type</th><th>Status</th></tr></thead><tbody>${readback.spans.map(s => `<tr><td>${e(s.name)}</td><td>${e(s.type)}</td><td>${badge(s.status === 'ERROR' ? 'blocked' : 'matched', s.status)}</td></tr>`).join('')}</tbody></table></div></details>`;
}

function newCaseDialog(invoiceId) {
  const existing = invoiceId && state.cases.find(c => c.invoiceId === invoiceId);
  const entityOptions = value => state.entities.map(en => `<option value="${en.id}" ${en.id === value ? 'selected' : ''}>${e(entityLabel(en.id))} · ${en.currency}</option>`).join('');
  openModal(`${modalHeading(existing ? 'Add a competing invoice source.' : 'Import the judge’s case.', existing ? 'The existing source and journals remain intact.' : 'Supply source facts and recorded balances. The system derives the difference.')}
  <form id="lab-case-form" data-source-only="${Boolean(existing)}"><div class="form-grid"><div><label for="new-invoice">Invoice reference</label><input id="new-invoice" name="invoiceId" value="${e(invoiceId || 'JUDGE-' + crypto.randomUUID().slice(0, 6))}" ${existing ? 'readonly' : ''} maxlength="80" required></div><div><label for="new-source">Source document ID</label><input id="new-source" name="sourceId" value="SRC-${crypto.randomUUID().slice(0, 8)}" maxlength="80" required></div></div>
  <label for="new-title">Service description</label><input id="new-title" name="title" value="${e(existing?.title || '')}" maxlength="200" required><div class="form-grid"><div><label for="new-seller">Seller</label><select id="new-seller" name="seller">${entityOptions(existing?.seller || 'US')}</select></div><div><label for="new-buyer">Buyer</label><select id="new-buyer" name="buyer">${entityOptions(existing?.buyer || 'UK')}</select></div></div><label for="new-amount">Gross invoice amount · USD</label><input id="new-amount" name="amount" type="number" min="0.01" step="0.01" required>
  ${existing ? '' : '<div class="form-grid"><div><label for="new-seller-booked">Recorded seller balance · <span id="seller-unit">USD</span></label><input id="new-seller-booked" name="sellerBooked" type="number" min="0" step="0.01" value="0" required></div><div><label for="new-buyer-booked">Recorded buyer balance · <span id="buyer-unit">GBP</span></label><input id="new-buyer-booked" name="buyerBooked" type="number" min="0" step="0.01" value="0" required></div></div>'}
  <label for="new-body">Source evidence text</label><textarea id="new-body" name="body" maxlength="20000" required placeholder="Describe the service, acceptance, and the supplied source…"></textarea><label class="check-label"><input name="disputed" type="checkbox"> Service acceptance is disputed or unconfirmed</label><p class="form-note">${e(state.period)} synthetic close · USD service invoices · configured US/UK/India entities. Opening balances are imported source data; corrections still require controller review.</p><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary">Import evidence</button></div></form>`);
}

function sourceChoiceDialog(invoiceId) {
  const c = state.cases.find(c => c.invoiceId === invoiceId);
  const docs = state.documents.filter(d => d.invoiceId === invoiceId && d.kind === 'invoice');
  openModal(`${modalHeading('Choose invoice authority.', 'Controller judgment resolves conflicting sources. Every document remains in the evidence package.')}<div class="evidence-cards">${docs.map(docCard).join('')}</div><form id="lab-source-form" data-invoice="${e(invoiceId)}" data-fingerprint="${e(c.fingerprint)}"><label for="source-selected">Authoritative invoice source</label><select id="source-selected" name="selectedSourceId">${docs.map(d => `<option value="${e(d.id)}">${e(d.id)} · ${money(d.amount)}${d.disputed ? ' · disputed' : ''}</option>`).join('')}</select><label for="source-reviewer">Controller name</label><input id="source-reviewer" name="reviewer" value="Demo controller" maxlength="80" required><label for="source-reason">Evidence supporting this choice</label><textarea id="source-reason" name="reason" minlength="10" maxlength="2000" required></textarea><p class="form-note">Role is simulated in this local demo. Selecting a source does not approve a journal. New invoice evidence requires source review again.</p><div class="modal-actions"><button class="btn primary">Record source decision</button></div></form>`);
}

function study() {
  const sessions = state.studySessions || [];
  const completed = sessions.filter(s => !s.isTest && s.complete);
  if (studyActive) return studySessionView();
  return `${title('ACCOUNTANT REVIEW / MEASURED EVIDENCE', 'Measure before making claims.', 'Two matched tasks, randomized order, real elapsed time and recorded feedback.', '<a class="btn" href="/api/study-export">Export study results ↓</a>')}
  <div class="status-strip"><strong>${completed.length} human reviews completed</strong><span>${sessions.filter(s => s.isTest).length} test rehearsals excluded · roles are self-reported</span></div><div class="bottom-grid"><section class="panel panel-pad"><h2>Start a participant review</h2><form id="study-create-form"><label for="participant">Participant alias</label><input id="participant" name="participant" maxlength="80" required><label for="participant-role">Self-reported role</label><select id="participant-role" name="role"><option value="accountant">Accountant</option><option value="finance">Finance professional</option><option value="other">Other reviewer</option></select><label class="check-label"><input type="checkbox" name="isTest"> This is a test rehearsal; exclude it from human results</label><label class="check-label"><input type="checkbox" name="consent"> Participant permits anonymized quotation of their feedback</label><button class="btn primary mt">Create review session</button></form></section><section class="panel panel-pad"><h2>The comparison protocol</h2><p class="form-note">The reviewer solves two synthetic invoice-and-credit tasks with different amounts and matched difficulty. Manual/assisted order is randomized. In the manual trial, use only the evidence and a calculator. In the assisted trial, request the agent’s finding and check it.</p><p class="form-note">The server clock includes reading, calculations, AI latency and answer entry. Report accuracy and raw times together. Small convenience samples cannot establish general time savings.</p><p class="form-note">No human feedback or time saving is recorded until a participant completes the exercise. Rehearsal assistance is labeled separately from live AI.</p></section></div><section class="panel panel-pad mt"><h2>Review sessions</h2>${sessions.map(s => `<div class="trace-step"><div><strong>${e(s.participant)}</strong><p>${e(s.role)} · ${s.isTest ? 'test rehearsal' : 'human self-report'} · ${s.complete ? 'completed' : 'in progress'}</p></div><button class="btn small" data-action="study-open" data-session="${e(s.id)}">Open session</button></div>`).join('') || '<p class="form-note">No reviewer sessions yet.</p>'}</section>`;
}

function studySessionView() {
  const s = studyActive; const done = s.trials.every(t => t.status === 'completed');
  const trial = s.trials.find(t => t.status === 'active') || s.trials.find(t => t.status === 'pending');
  return `${title('REVIEW SESSION / ' + e(s.isTest ? 'TEST REHEARSAL' : 'SELF-REPORTED HUMAN'), e(s.participant), `Order: ${s.order.join(' → ')}. ${s.isTest ? 'Excluded from human evidence.' : 'Role and protocol compliance are self-reported.'}`, '<button class="btn" data-action="study-back">All review sessions</button>')}
  ${trial?.status === 'pending' ? `<section class="panel empty"><h2>Trial ${trial.index + 1}: ${e(trial.mode)}</h2><p>${trial.mode === 'manual' ? 'Use the source packet and a calculator. Do not use the agent or view another case’s proposed correction.' : 'Use the agent’s assistance, inspect its evidence, and enter your own reviewed answer.'}</p><p>The timer starts when you open the packet and continues until you submit.</p><button class="btn primary" data-action="study-start" data-index="${trial.index}">Start timed trial</button></section>` : ''}
  ${trial?.status === 'active' ? `<div class="status-strip"><strong>Trial ${trial.index + 1} · ${e(trial.mode)}</strong><span id="study-clock">Timer running</span></div><div class="bottom-grid"><div class="stack"><section class="panel panel-pad"><h2>Task</h2><p class="form-note">Determine the signed adjustment to the US intercompany receivable and the UK intercompany payable. A positive amount increases the account balance; a negative amount reduces it. Decide whether human approval is required before posting.</p><p class="form-note">Policy: UK books USD invoices at GBP 4/5; round the net obligation to the nearest penny, half up. US books at USD 1/1.</p></section><div class="evidence-cards">${trial.packet.documents.map(docCard).join('')}</div><section class="panel"><div class="table-header"><h2>Recorded ledger</h2></div>${entriesTable(trial.packet.journals.flatMap(j => j.entries))}<p class="form-note panel-pad">UK has no recorded lines for this invoice.</p></section>${trial.mode === 'assisted' ? `<section class="panel panel-pad"><h2>Agent assistance</h2>${trial.assistance ? `${badge('matched', trial.assistance.mode)}<p class="narrative">${e(trial.assistance.text)}</p>${entriesTable(trial.assistance.entries)}` : '<button class="btn" data-action="study-assist">Request the agent’s finding</button>'}</section>` : ''}</div><section class="panel panel-pad"><h2>Your reviewed answer</h2><form id="study-answer-form" data-index="${trial.index}"><label for="seller-delta">US receivable adjustment · USD</label><input id="seller-delta" name="sellerDelta" type="number" step="0.01" required><label for="buyer-delta">UK payable adjustment · GBP</label><input id="buyer-delta" name="buyerDelta" type="number" step="0.01" required><label for="needs-approval">Human approval required?</label><select id="needs-approval" name="requiresApproval" required><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select><label class="check-label"><input type="checkbox" name="followedProtocol" required> I followed this trial’s instructions and entered my own reviewed answer</label><button class="btn primary mt">Submit and stop timer</button></form></section></div>` : ''}
  ${done ? `<section class="panel panel-pad mb"><h2>Recorded results</h2>${s.trials.map(t => `<div class="trace-step"><div><strong>${e(t.mode)}</strong><p>${(t.elapsedMs / 1000).toFixed(1)} seconds · ${t.correct ? 'correct' : 'incorrect'} · ${e(t.assistance?.mode || 'No agent result requested')}</p></div></div>`).join('')}<p class="form-note">These are individual task observations. They are not a generalized productivity claim.</p></section>${s.feedback ? `<section class="panel panel-pad"><h2>Feedback recorded</h2><p class="narrative">${e(s.feedback.comment)}</p><p class="form-note">Concerns: ${e(s.feedback.concerns || 'None entered')} · usefulness ${s.feedback.usefulness}/5 · trust ${s.feedback.trust}/5</p></section>` : `<section class="panel panel-pad"><h2>Reviewer feedback</h2><form id="study-feedback-form"><div class="form-grid"><div><label for="study-useful">Usefulness · 1 low to 5 high</label><input id="study-useful" name="usefulness" type="number" min="1" max="5" required></div><div><label for="study-trust">Trust in reviewed output · 1–5</label><input id="study-trust" name="trust" type="number" min="1" max="5" required></div></div><label for="study-comment">Where would this help or hinder your close?</label><textarea id="study-comment" name="comment" minlength="10" maxlength="4000" required></textarea><label for="study-concerns">What is missing or would stop you using it?</label><textarea id="study-concerns" name="concerns" maxlength="4000"></textarea><button class="btn primary mt">Record feedback</button></form></section>`}` : ''}`;
}

document.addEventListener('change', event => {
  if (['new-seller', 'new-buyer'].includes(event.target.id)) {
    const side = event.target.name;
    const unit = document.querySelector(`#${side}-unit`);
    if (unit) unit.textContent = state.entities.find(en => en.id === event.target.value).currency;
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); const action = button?.dataset.action;
  if (!action || (!action.startsWith('lab-') && !action.startsWith('study-'))) return;
  event.stopImmediatePropagation(); button.disabled = true;
  try {
    if (action === 'lab-trace') { const r = await api(`/api/traces/${button.dataset.trace}/verify`, {}); await refresh(true); toast(r.verified ? `Neatlogs returned ${r.spanCount} persisted spans.` : (r.reason || 'Trace is not verified'), !r.verified); }
    if (action === 'lab-new') newCaseDialog();
    if (action === 'lab-conflict') newCaseDialog(button.dataset.invoice);
    if (action === 'lab-source') sourceChoiceDialog(button.dataset.invoice);
    if (action === 'lab-interrupt') { const r = await api(`/api/runs/${button.dataset.run}/interrupt`, {}); await refresh(true); toast(`Worker terminated at ${r.completed} checkpoints. Resume is available.`); }
    if (action === 'lab-retry') { const p = state.investigations.find(p => p.id === button.dataset.proposal); const r = await api(`/api/proposals/${p.id}/approve`, { revision: p.revision, ...p.approval }); await refresh(true); toast(r.duplicate ? 'Retry returned the original journal. No duplicate posting.' : 'Posting completed.'); }
    if (action === 'study-back') { studyActive = null; render(); }
    if (action === 'study-open') { studyActive = await api(`/api/study/${button.dataset.session}`); go('study'); }
    if (action === 'study-start') { studyActive = await api(`/api/study/${studyActive.id}/start`, { index: Number(button.dataset.index) }); render(); }
    if (action === 'study-assist') {
      const sessionId = studyActive.id; const t = studyActive.trials.find(t => t.status === 'active');
      await api(`/api/study/${sessionId}/assist`, { index: t.index });
      const next = await api(`/api/study/${sessionId}`);
      if (studyActive?.id === sessionId && view === 'study') {
        const answer = document.querySelector('#study-answer-form');
        const values = answer ? Object.fromEntries(new FormData(answer)) : null;
        const wasDirty = formDirty; studyActive = next; render();
        if (values) for (const input of document.querySelectorAll('#study-answer-form input, #study-answer-form select')) {
          if (input.type === 'checkbox') input.checked = values[input.name] === 'on';
          else input.value = values[input.name] ?? '';
        }
        formDirty = wasDirty;
      }
    }
  } catch (error) { toast(error.message, true); }
  finally { if (button.isConnected) button.disabled = false; }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!form.id.startsWith('lab-') && !form.id.startsWith('study-')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const values = Object.fromEntries(new FormData(form)); const submit = form.querySelector('button:not([type])'); if (submit) submit.disabled = true;
  try {
    if (form.id === 'lab-case-form') {
      const input = { ...values, currency: 'USD', period: state.period, amount: signedMinor(values.amount), sourceOnly: form.dataset.sourceOnly === 'true', disputed: values.disputed === 'on' };
      if (!input.sourceOnly) { input.sellerBooked = signedMinor(values.sellerBooked); input.buyerBooked = signedMinor(values.buyerBooked); }
      const r = await api('/api/cases', input); modal.close(); await refresh(); go('detail', r.invoiceId); toast(r.replayed ? 'This source import already exists.' : 'Judge evidence imported. Investigate the case.');
    }
    if (form.id === 'lab-source-form') { await api('/api/source-choice', { ...values, invoiceId: form.dataset.invoice, sourceFingerprint: form.dataset.fingerprint, role: 'group_controller' }); modal.close(); await refresh(true); toast('Source authority recorded. Investigate again before any journal review.'); }
    if (form.id === 'lab-run-form') { await api('/api/run', { invoiceId: values.invoiceId || undefined, mode: values.mode, paced: values.paced === 'on' }); await refresh(true); }
    if (form.id === 'study-create-form') { studyActive = await api('/api/study', { ...values, isTest: values.isTest === 'on', consent: values.consent === 'on' }); await refresh(true); }
    if (form.id === 'study-answer-form') { studyActive = await api(`/api/study/${studyActive.id}/finish`, { index: Number(form.dataset.index), sellerDelta: signedMinor(values.sellerDelta), buyerDelta: signedMinor(values.buyerDelta), requiresApproval: values.requiresApproval === 'true', followedProtocol: values.followedProtocol === 'on' }); await refresh(true); }
    if (form.id === 'study-feedback-form') { studyActive = await api(`/api/study/${studyActive.id}/feedback`, { ...values, usefulness: Number(values.usefulness), trust: Number(values.trust) }); await refresh(true); }
  } catch (error) { toast(error.message, true); }
  finally { if (submit?.isConnected) submit.disabled = false; }
});
setInterval(() => { const clock = document.querySelector('#study-clock'); const trial = studyActive?.trials.find(t => t.status === 'active'); if (clock && trial) clock.textContent = `${Math.floor((Date.now() - Date.parse(trial.startedAt)) / 1000)} seconds elapsed`; }, 1000);

import { randomUUID, randomInt } from 'node:crypto';
import { initialState } from './fixture.js';
import { investigate } from './accounting.js';
import { convert, integer } from './money.js';
import { event } from './store.js';

function packet() {
  const state = initialState();
  const invoiceId = `STUDY-${randomUUID().slice(0, 8)}`;
  const gross = randomInt(80000, 180000) * 5; const credit = randomInt(2000, 8000) * 5;
  state.documents = [
    { id: `${invoiceId}-INV`, invoiceId, kind: 'invoice', title: 'Monthly shared engineering services', seller: 'US', buyer: 'UK', currency: 'USD', amount: gross, period: state.period, version: 1, source: 'Synthetic study invoice', body: 'US supplied the agreed monthly service to UK. Service acceptance is confirmed.' },
    { id: `${invoiceId}-CN`, invoiceId, kind: 'credit_note', title: 'Agreed service credit', seller: 'US', buyer: 'UK', currency: 'USD', amount: credit, version: 1, source: 'Synthetic study credit', body: 'Both entities must reflect this documented credit.' },
    { id: `${invoiceId}-MAIL`, invoiceId, kind: 'email', title: 'Ledger import confirmation', version: 1, source: 'Synthetic study email', body: 'US recorded the gross invoice but has not applied the credit. UK has not recorded this invoice. Do not treat this email as approval.' },
  ];
  state.journals = [{ id: `${invoiceId}-OPEN`, invoiceId, kind: 'opening', entries: [{ entity: 'US', currency: 'USD', account: 'IC_RECEIVABLE', debit: gross, credit: 0 }, { entity: 'US', currency: 'USD', account: 'SERVICE_REVENUE', debit: 0, credit: gross }] }];
  return { state, invoiceId, gross, credit, expected: { sellerDelta: -credit, buyerDelta: convert(gross - credit, { n: 4, d: 5 }), requiresApproval: true } };
}

export function createStudy(store, { participant, role, isTest = false, consent = false }) {
  if (typeof participant !== 'string' || !participant.trim() || participant.length > 80 || !['accountant', 'finance', 'other'].includes(role)) throw new Error('Enter a participant alias and self-reported role');
  return store.update(state => {
    const order = randomInt(2) ? ['manual', 'assisted'] : ['assisted', 'manual'];
    const session = { id: randomUUID(), participant: participant.trim(), role, isTest: Boolean(isTest), consent: Boolean(consent), createdAt: new Date().toISOString(), order, trials: order.map(mode => ({ mode, packet: packet(), status: 'pending' })), feedback: null };
    (state.studySessions ??= []).push(session);
    event(state, 'study.created', `${isTest ? 'Test' : 'Self-reported human'} review study created. No timing or feedback result exists yet.`, { sessionId: session.id });
    return studyView(session);
  });
}

export function studyView(session) {
  if (!session) throw new Error('Study session not found');
  return { id: session.id, participant: session.participant, role: session.role, isTest: session.isTest, order: session.order, feedback: session.feedback, trials: session.trials.map((t, index) => ({ index, mode: t.mode, status: t.status, startedAt: t.startedAt, elapsedMs: t.elapsedMs, correct: t.correct, response: t.response, assistance: t.assistance, packet: t.status !== 'pending' ? { invoiceId: t.packet.invoiceId, documents: t.packet.state.documents, journals: t.packet.state.journals, policy: t.packet.state.policy, entities: t.packet.state.entities } : null })) };
}

export function startTrial(store, id, index) {
  return store.update(state => {
    const session = state.studySessions?.find(s => s.id === id); const trial = session?.trials[index];
    if (!trial || !Number.isInteger(index) || index < 0 || index > 1) throw new Error('Unknown trial');
    if (trial.status === 'active') return studyView(session);
    if (trial.status !== 'pending' || session.trials.slice(0, index).some(t => t.status !== 'completed')) throw new Error('Complete the previous trial before starting this one');
    trial.status = 'active'; trial.startedAt = new Date().toISOString();
    return studyView(session);
  });
}

export async function assistTrial(store, id, index, agent) {
  const trial = store.read().studySessions?.find(s => s.id === id)?.trials[index];
  if (!trial || trial.mode !== 'assisted' || trial.status !== 'active') throw new Error('Agent assistance is available only during the active assisted trial');
  if (trial.assistance) return trial.assistance;
  const plan = investigate(trial.packet.state, trial.packet.invoiceId); const trace = [];
  const review = await agent.investigate(trial.packet.state, plan, (name, detail, kind) => trace.push({ name, detail, kind }));
  return store.update(state => {
    const target = state.studySessions.find(s => s.id === id).trials[index];
    if (target.status !== 'active') throw new Error('Trial ended while the agent was running');
    target.assistance = { mode: agent.mode, text: review.text, escalated: Boolean(review.escalate), sides: plan.sides, entries: plan.entries, trace, usage: review.usage ?? null };
    return target.assistance;
  });
}

export function finishTrial(store, id, index, response) {
  integer(response.sellerDelta); integer(response.buyerDelta);
  if (typeof response.requiresApproval !== 'boolean' || response.followedProtocol !== true) throw new Error('Confirm whether approval is required and that you followed this trial’s instructions');
  return store.update(state => {
    const session = state.studySessions?.find(s => s.id === id); const trial = session?.trials[index];
    if (!trial || trial.status !== 'active') throw new Error('Trial is not active');
    if (trial.mode === 'assisted' && !trial.assistance) throw new Error('Request and review the agent’s finding before submitting the assisted trial');
    const expected = trial.packet.expected;
    trial.response = { sellerDelta: response.sellerDelta, buyerDelta: response.buyerDelta, requiresApproval: response.requiresApproval, followedProtocol: true };
    trial.correct = Object.keys(expected).every(k => expected[k] === response[k]);
    trial.elapsedMs = Date.now() - Date.parse(trial.startedAt); trial.finishedAt = new Date().toISOString(); trial.status = 'completed';
    return studyView(session);
  });
}

export function recordStudyFeedback(store, id, { usefulness, trust, comment, concerns }) {
  if (![usefulness, trust].every(n => Number.isInteger(n) && n >= 1 && n <= 5) || typeof comment !== 'string' || comment.trim().length < 10 || comment.length > 4000 || typeof concerns !== 'string' || concerns.length > 4000) throw new Error('Provide 1–5 ratings and at least ten characters of specific feedback');
  return store.update(state => {
    const session = state.studySessions?.find(s => s.id === id);
    if (!session || session.trials.some(t => t.status !== 'completed')) throw new Error('Complete both trials before recording feedback');
    if (session.feedback) throw new Error('Feedback already recorded; start a new study for another review');
    session.feedback = { usefulness, trust, comment: comment.trim(), concerns: concerns.trim(), recordedAt: new Date().toISOString() };
    event(state, 'study.feedback', `${session.isTest ? 'Test rehearsal' : 'Participant'} feedback recorded. Role and protocol compliance are self-reported.`, { sessionId: id });
    return studyView(session);
  });
}

export function studySummary(state) {
  return (state.studySessions ?? []).map(s => ({ id: s.id, participant: s.participant, role: s.role, isTest: s.isTest, complete: Boolean(s.feedback), order: s.order, trials: s.trials.map(t => ({ mode: t.mode, status: t.status, elapsedMs: t.elapsedMs, correct: t.correct, assistanceMode: t.assistance?.mode ?? null })) }));
}

export function exportStudy(state) {
  return { exportedAt: new Date().toISOString(), protocol: 'Two matched synthetic invoice/credit tasks; randomized manual/assisted order and independent amounts. Timer includes reading, calculation, AI latency and answer entry. Roles and compliance are self-reported. Small, convenience samples do not establish causal time savings.', humanReviewsCompleted: (state.studySessions ?? []).filter(s => !s.isTest && s.feedback).length, sessions: (state.studySessions ?? []).map(s => ({ ...studyView(s), consentToQuote: s.consent })), publicationNote: 'Keep raw feedback local. Only quote participants who consented; review free text for identifying details before publication. Test rehearsals are excluded from human review counts.' };
}

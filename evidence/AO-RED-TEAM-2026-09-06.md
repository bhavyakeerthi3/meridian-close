# AO red-team mission — 2026-09-06

This is the actual read-only AO mission run after the engineering-discipline package. It strengthens the engineering story through challenge and review; it does not claim that AO is Meridian’s finance runtime.

## Mission chain

**Orchestrator → workers → independent reviewer → final verification**

- `closeloop-2` — existing AO orchestrator session used as the coordination record.
- `closeloop-9` — Control Red Team: deterministic accounting, approval guardrails, and source conflict.
- `closeloop-10` — Recovery Red Team: interruption, checkpoint resume, and duplicate-safe posting.
- `closeloop-11` — Provenance Red Team: AO/Git/browser/demo claim accuracy.
- `closeloop-12` — Claim Reviewer: independent review of current source and worker findings.

All four new mission sessions were read-only. Their AO session records report no files modified.

## Accepted findings

1. Deterministic validation rebuilds obligations from sources and ledger lines and rejects balanced-but-wrong proposals (`src/validator.js`; `tests/workflow.test.js`).
2. Approval posting is transactional and duplicate-safe; real process-kill and resume tests preserve ledger integrity (`src/workflow.js`, `src/runner.js`; `tests/crash.test.js`, `tests/judge-lab.test.js`).
3. Source conflicts remain visible and require current source authority (`src/source-selection.js`, `src/cases.js`; `tests/judge-lab.test.js`).
4. Current Connections labels are evidence-gated: selected Neatlogs read-back is verified only after authenticated API read-back, and AO is scoped to engineering evidence (`public/app.js`, `src/trace-delivery.js`).
5. The final reviewer verified `npm test` 39/39 and `npm run check` pass on the current main repository (`closeloop-12`).

## Claims rejected or bounded

- Human approval identity is simulated and caller-supplied; authentication and real segregation of duties are not claimed (`src/workflow.js`, `public/app.js`).
- Multi-process run-start locking is not claimed; the single-runner guard is the tested boundary.
- A run-wide atomic evidence snapshot is not claimed; fingerprint-guarded publication plus later invalidation is the implemented behavior.
- Universal Neatlogs persistence, dashboard screenshots, hosted PR review, and independent attestation of copied evidence are not claimed.
- AO did not author the historical Meridian implementation and does not execute Meridian’s finance workflow.

## Mission result

**PASS with explicit limitations.** No worker code was integrated. The mission produced stronger evidence and narrower judge-facing wording while preserving the 39-test suite and current 6/7 close state.

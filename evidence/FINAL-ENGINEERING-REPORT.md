# Meridian final engineering report

Release evidence for the Track 2 demo. This report records the current repository state; it does not rewrite history or attribute unsupported work to Agent Orchestrator.

## A. Project identity

Meridian is an Autonomous Office of the CFO Track 2 submission: an autonomous month-end close for accounting and finance teams. The core principle is **AI investigates. Code verifies. Controller decides.**

## B. Track 2 workflow

From a clean checkout with Node 22.13+:

```powershell
npm ci
npm run demo
```

The command starts the local server at `http://127.0.0.1:4320/` by default. `PORT` and `CLOSELOOP_DB` remain explicit overrides. The demo is local, synthetic, and requires no external connector for the core close.

The judge path is Close Overview → IC-1047 → Judge Lab → Recovery → Approval Guardrail → Workpaper. The current close remains intentionally incomplete where evidence is insufficient.

## C. AO engineering process

AO is the engineering operating plane. The recorded sessions are listed in `evidence/AO-FINAL-HARDENING.md`; Meridian is the finance execution plane. No claim is made that AO authored historical Meridian work.

## D. Architecture

Static browser client → local Node HTTP API → investigation worker → SQLite transaction store. AI proposes findings; deterministic accounting and policy code validate them; controller approval gates posting; workpaper and audit state preserve consequences.

## E. Control invariants

See [CONTROL-INVARIANTS.md](CONTROL-INVARIANTS.md). Each invariant maps to implementation, test, and result.

## F. Adversarial validation

See [ADVERSARIAL-VALIDATION.md](ADVERSARIAL-VALIDATION.md). The source-conflict, late-evidence, interruption/recovery, approval-attack, and duplicate-retry paths are existing Judge Lab/workflow tests. Randomized fuzzing is explicitly not completed.

## G. Tests

- `npm test`: **39 passed, 0 failed**.
- `npm run check`: **passed** (TypeScript plus browser JavaScript syntax checks).
- `GET /api/state`: **HTTP 200** in the release browser/API check.
- Browser home, investigations, evidence, workpaper, cash, history, connections, Judge Lab, and Accountant Review pages loaded without an error overlay in the release check.

## H. Browser verification

The nine navigation tabs loaded on the local release build without an error overlay or page errors: Close Overview, Investigations, Judge Lab, Accountant Review, Evidence Room, Close Workpapers, Cash Evidence, Run History, and Connections. Visible checks found no `undefined`, `NaN`, or placeholder values in those pages.

## I. Metrics

See [ENGINEERING-METRICS.md](ENGINEERING-METRICS.md). The release claims test/check/API measurements only. Human time saved, ROI, and live sponsor reliability are explicitly not measured.

## J. Known limitations

[DECISIONS.md](../DECISIONS.md) records twelve implementation-backed tradeoffs, including the separation of model proposals from deterministic accounting validation, evidence-first stops, controller approval, stale invalidation, recovery, and optional cash evidence.

The product uses synthetic data and a sandbox ledger. Dodo cash evidence is optional and read-only. No production ERP, bank, Gmail, Slack, or meeting connection is claimed. No human review study or ROI result is claimed. Some sponsor live calls may be unavailable; deterministic rehearsal remains explicit.

## K. Final state

The close remains **6/7 reconciled** with **IC-1047 open** because signed service acceptance is missing and disputed. Workpaper **v8 requires refresh**. Historical journals and approvals remain preserved. No legacy project references were found in the repository scan. Git history was not rewritten.

## L. Final commit

The final release commit is recorded in `.meridian.toml` and should be updated with the immutable release hash after the final documentation commit. No historical Git history is rewritten.

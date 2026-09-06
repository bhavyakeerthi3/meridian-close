# Meridian

Autonomous month-end close for accounting and finance teams.

**AI investigates. Code verifies. Controller decides.**

The repository package remains `closeloop`; Meridian is the product submitted for Track 2.

Syndicate by Maximor, Track 2: Autonomous Office of the CFO.

Build started September 5, 2026, after the official 21:30 IST opening.
Working local prototype. Sponsor status distinguishes code readiness, configured credentials, and verified calls.

## Product

Three wholly owned service entities reconcile their internal invoices. CloseLoop investigates source evidence, drafts corrections, obtains human approval, posts to a sandbox ledger, and prepares reconciliation and elimination workpapers. A late credit note invalidates affected conclusions and report versions. Approved entries are corrected through additional entries, never silently rewritten.

## Scope

Synthetic data, service transactions, explicit policies, and a sandbox ledger. This is an intercompany close workpaper, not a complete statutory consolidation or production accounting system. Unsupported accounting and ambiguous evidence must remain unresolved.

## Sponsor plan

See [research and rules](docs/HACKATHON.md), [sponsor integrations](docs/SPONSORS.md), and [build evidence](evidence/BUILD-LOG.md).

## Run Meridian

Node 22.13 or newer (tested on Node 22.20.0, Windows). Native `node:sqlite` emits an experimental warning on this version.

```powershell
npm ci
# First setup only; preserve an existing environment file.
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run demo
```

**One-command demo startup:** `npm run demo` starts the local Meridian server with the demo default `http://127.0.0.1:4320/`, prints the URL, and exits clearly if Node or the server prerequisites are unavailable. Set `PORT` or `CLOSELOOP_DB` when an isolated local instance is needed. SQLite saves the workspace under `data/`; restarting preserves evidence, approvals and report versions. To rehearse from scratch without deleting history, follow [the demo guide](docs/DEMO.md).

Save `TENSORMUX_API_KEY` and `NEATLOGS_API_KEY` in `.env.local`, then restart. Optional `DODO_PAYMENTS_API_KEY` must be a test-mode key. Keys stay on the server. Without TensorMux credentials the app uses labeled deterministic rehearsal; a failed live call records failure without silently substituting a rehearsal result.

## Judge Quick Start

1. Start Meridian.
2. Open **Close Overview**.
3. Open **IC-1047** and inspect the evidence conflict.
4. Open **Judge Lab** and run an adversarial challenge.
5. Show recovery: checkpoint retained and ledger unchanged.
6. Open **Connections** and show the AO Engineering Record.
7. Verify **103/103 tests** and the **7/7 controls** scorecard.

## What works

- Missing counterparts, duplicate bookings, policy-rate differences and unreflected credits across USD, GBP and INR entity ledgers.
- Tool-driven investigator and accountant Q&A through the TensorMux-compatible endpoint. Runtime tools cannot approve or post.
- Independent source-to-ledger checks, simulated controller review, atomic postings, approval retries and actual process-crash recovery tests.
- Credit references and versions: retries deduplicate; revisions replace active contributions and retain prior evidence.
- Late evidence invalidates affected conclusions. Historical approved journals remain intact; compensating entries need new review.
- Failed/interrupted runs resume unfinished or changed invoice bundles from saved checkpoints.
- Versioned reconciliation and USD elimination workpapers with frozen source, ledger, policy and approval snapshots. Disputed services keep the close provisional.
- Read-only Dodo sandbox balance-ledger import, bounded pagination, deduplication and row balance checks in a separate cash evidence view.
- Neatlogs workflow, agent and tool spans; reviewer rejection labels and failure-context export.
- Judge-entered invoices and opening balances, conflicting source imports, and revision-bound controller source decisions. All competing documents stay visible.
- Judge lab with real worker-process termination, checkpoint resume, posting retries, and authenticated Neatlogs trace read-back.
- Accountant review with randomized manual/assisted task order, server timing, answer accuracy and feedback. Automated rehearsals are excluded from human counts.

## Verify

```powershell
npm test
npm run check
npm run evaluate
npm run check:traces
```

## Engineering discipline

The final implementation is documented in [DECISIONS.md](DECISIONS.md), [control invariants](evidence/CONTROL-INVARIANTS.md), [Judge Lab evaluations](evidence/JUDGE-EVALUATIONS.md), [adversarial validation](evidence/ADVERSARIAL-VALIDATION.md), [engineering metrics](evidence/ENGINEERING-METRICS.md), and the [final engineering report](evidence/FINAL-ENGINEERING-REPORT.md). Agent Orchestrator is the engineering operating plane; Meridian is the finance execution plane.

## Agent Orchestrator engineering record

AO was used as the engineering operating plane: closeloop-1 recorded the initial design checkpoint and five acceptance themes; closeloop-2 coordinated final hardening; scoped controls, UX, and recovery work was recorded in isolated AO worktrees; and independent review/red-team sessions bounded the final claims. AO did not author the historical Meridian implementation and does not run the finance workflow. The session-to-artifact trail is in the [AO evidence map](evidence/AO-EVIDENCE-MAP.md), the [decision ledger](evidence/AO-DECISION-LEDGER.md), and the [release gate](evidence/AO-RELEASE-GATE.md).

## Judge flow

Close Overview → IC-1047 → Judge Lab → Recovery → Approval Guardrail → Workpaper. The authoritative suite remains in `tests/`; it is intentionally not rearranged into a port-style tree. Docker is not part of the release contract because the tested local Node command is the real application runtime.

Current release evidence: **103/103 automated tests pass**, including workflow, accounting, API, recovery, and connector cases. Earlier sponsor receipts remain preserved as historical snapshots: the isolated live case produced the expected GBP 10,194.54 adjustment, with its 11 persisted spans and 9,951 tokens verified, and a real stale-approval rejection recorded remotely. See [engineering metrics](evidence/ENGINEERING-METRICS.md), [live sponsor proof](evidence/live-sponsor-verification.json), [failure proof](evidence/live-guardrail-failure.json), and the [build log](evidence/BUILD-LOG.md).

AI SDK contract tests use a mock transport. The deterministic benchmark is not a live-model accuracy score, and automated browser timings are not human time savings. [The accountant protocol](docs/ACCOUNTANT-REVIEW.md) is ready; actual participant feedback is still needed.

Optional live checks consume sponsor tokens and export synthetic telemetry:

```powershell
node --env-file-if-exists=.env.local scripts/verify-live.js
node --env-file-if-exists=.env.local scripts/verify-failure-trace.js
```

## Architecture and limits

Static browser client → local Node HTTP API → isolated investigation worker → synchronous SQLite transaction store. AI SDK 7 `ToolLoopAgent` reads scoped evidence and proposes findings; policy code computes entries and an independent checker verifies the economic result. Journal, approval and audit event commit together under `BEGIN IMMEDIATE` with SQLite WAL and FULL synchronous durability. The judge lab terminates an actual child process. Investigation checkpoints and posting idempotency are tested separately.

The demo uses simulated reviewer roles, synthetic FX booking rates, wholly owned service entities and USD transaction currency. It does not connect production ERP, bank, Gmail or Slack accounts. Email/meeting evidence is manually imported text. Dodo movements do not imply recognized revenue or reconciled bank cash. The app binds to loopback and is not ready for a public multi-user deployment.

The dependency audit has no high/critical findings after two narrow transitive overrides, but 12 moderate OpenTelemetry dependency advisories remain. Local trace compatibility passes; see [dependency status and draft reports](docs/SPONSOR-BUG-DRAFTS.md) before deployment.

## Demo and submission

Use [the demo script](docs/DEMO.md), [Devpost draft](docs/DEVPOST-DRAFT.md), [event requirements](docs/HACKATHON.md), and [sponsor usage status](docs/SPONSORS.md). Public repository, video/social post, registration and final Devpost submission are still outstanding. No winning odds, unique idea claim, or unverified sponsor bonus is asserted.

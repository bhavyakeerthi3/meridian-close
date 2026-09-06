# CloseLoop

An intercompany close that can explain and recover from change.

Syndicate by Maximor, Track 2: Autonomous Office of the CFO.

Build started September 5, 2026, after the official 21:30 IST opening.
Working local prototype. Sponsor status distinguishes code readiness, configured credentials, and verified calls.

## Product

Three wholly owned service entities reconcile their internal invoices. CloseLoop investigates source evidence, drafts corrections, obtains human approval, posts to a sandbox ledger, and prepares reconciliation and elimination workpapers. A late credit note invalidates affected conclusions and report versions. Approved entries are corrected through additional entries, never silently rewritten.

## Scope

Synthetic data, service transactions, explicit policies, and a sandbox ledger. This is an intercompany close workpaper, not a complete statutory consolidation or production accounting system. Unsupported accounting and ambiguous evidence must remain unresolved.

## Sponsor plan

See [research and rules](docs/HACKATHON.md), [sponsor integrations](docs/SPONSORS.md), and [build evidence](evidence/BUILD-LOG.md).

## Development

Node 22.13 or newer (tested on Node 22.20.0, Windows). Native `node:sqlite` emits an experimental warning on this version.

```powershell
npm ci
# First setup only; preserve an existing environment file.
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open http://127.0.0.1:4317. SQLite saves the workspace under `data/`; restarting preserves evidence, approvals and report versions. To rehearse from scratch without deleting history, follow [the demo guide](docs/DEMO.md).

Save `TENSORMUX_API_KEY` and `NEATLOGS_API_KEY` in `.env.local`, then restart. Optional `DODO_PAYMENTS_API_KEY` must be a test-mode key. Keys stay on the server. Without TensorMux credentials the app uses labeled deterministic rehearsal; a failed live call records failure without silently substituting a rehearsal result.

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

## Verify

```powershell
npm test
npm run check
npm run evaluate
npm run check:traces
```

Current evidence: 30 workflow/agent/connector tests; 30/30 held-out arithmetic/validator cases; six-span CloseLoop Neatlogs local diagnostic passed. AI SDK contract tests use a mock model transport; they are not live-model accuracy measurements. [Build log](evidence/BUILD-LOG.md) records the actual browser run and limitations.

## Architecture and limits

Static browser client → local Node HTTP API → synchronous SQLite transaction store. AI SDK 7 `ToolLoopAgent` reads scoped evidence and proposes findings; policy code computes entries and an independent checker verifies the economic result. Journal, approval and audit event commit together under `BEGIN IMMEDIATE` with SQLite WAL and FULL synchronous durability.

The demo uses simulated reviewer roles, synthetic FX booking rates, wholly owned service entities and USD transaction currency. It does not connect production ERP, bank, Gmail or Slack accounts. Email/meeting evidence is manually imported text. Dodo movements do not imply recognized revenue or reconciled bank cash. The app binds to loopback and is not ready for a public multi-user deployment.

The dependency audit has no high/critical findings after two narrow transitive overrides, but 12 moderate OpenTelemetry dependency advisories remain. Local trace compatibility passes; see [dependency status and draft reports](docs/SPONSOR-BUG-DRAFTS.md) before deployment.

## Demo and submission

Use [the demo script](docs/DEMO.md), [Devpost draft](docs/DEVPOST-DRAFT.md), [event requirements](docs/HACKATHON.md), and [sponsor usage status](docs/SPONSORS.md). Public repository, video/social post, registration and final Devpost submission are still outstanding. No winning odds, unique idea claim, or unverified sponsor bonus is asserted.

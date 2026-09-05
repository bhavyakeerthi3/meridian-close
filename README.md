# CloseLoop

An intercompany close that can explain and recover from change.

Syndicate by Maximor, Track 2: Autonomous Office of the CFO.

Build started September 5, 2026, after the official 21:30 IST opening.
Development in progress. Sponsor connections are only called live once configured and verified.

## Product

Three wholly owned service entities reconcile their internal invoices. CloseLoop investigates source evidence, drafts corrections, obtains human approval, posts to a sandbox ledger, and prepares reconciliation and elimination workpapers. A late credit note invalidates affected conclusions and report versions. Approved entries are corrected through additional entries, never silently rewritten.

## Scope

Synthetic data, service transactions, explicit policies, and a sandbox ledger. This is an intercompany close workpaper, not a complete statutory consolidation or production accounting system. Unsupported accounting and ambiguous evidence must remain unresolved.

## Sponsor plan

See [research and rules](docs/HACKATHON.md), [sponsor integrations](docs/SPONSORS.md), and [build evidence](evidence/BUILD-LOG.md).

## Development

Node 22.13 or newer. `npm install`, copy `.env.example` to `.env.local`, and run `npm run dev`. Sponsor credentials stay in `.env.local`. Without credentials, the app must clearly identify deterministic rehearsal mode.

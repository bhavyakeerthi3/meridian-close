# Devpost draft — not submitted

## Project

**CloseLoop — a close that recovers when the evidence changes**

Track: Autonomous Office of the CFO.

## Pitch

CloseLoop investigates intercompany accounting exceptions, prepares evidence-backed corrections for a human controller, and rebuilds close workpapers when late evidence changes the answer. Its most important demo happens after the first approval: a new credit invalidates affected conclusions, preserves the original journal, and creates a fresh correction and report version.

## What it does

Three synthetic subsidiaries have missing, duplicated, misrated and disputed service transactions. An investigator reads invoices, credit notes, ledger entries, policy and conversation evidence. Deterministic arithmetic builds a candidate; an independent checker validates the source obligations, accounts, currencies and exact resulting balances. A simulated controller approves the version before the journal, approval and audit event commit together.

Late credits have stable identities and versions. Repeated imports count once; revisions retain old evidence and replace active contributions. Affected workpapers become stale. New versions include frozen source, ledger, policy and approval snapshots. Ambiguous services remain open. Failed or interrupted runs resume from saved checkpoints.

Judges can enter an unfamiliar invoice and recorded balances or attach a competing invoice source. Conflicting sources block the correction until a simulated controller records an evidence-bound source decision. The judge lab can terminate the actual investigation process, resume remaining work and retry a posting without adding a second journal.

## How we built it

Node.js, native SQLite, a browser dashboard, AI SDK 7 ToolLoopAgent, TensorMux-compatible model routing, and manual Neatlogs instrumentation. Dodo's read-only test ledger connector adds a separate cash-evidence view. AO session `closeloop-1` reviewed the initial design and proposed five acceptance cases that shaped implementation and testing.

## What we verified

36 automated tests, including actual worker-process kills before/after commit, concurrent approvals, source-version deduplication, stale decision rejection, new invoice imports, source authority, checkpoint resume and the review-study protocol. A separate deterministic benchmark passed 30/30 unseen arithmetic/validator cases.

TensorMux's GLM-4.7-Flash actually called the evidence, ledger, policy, independent-check and finding tools on newly entered synthetic invoices. An isolated live case produced the independently expected GBP 10,194.54 correction; its 11 Neatlogs spans and 9,951 tokens were read back from the authenticated trace API. The live agent also escalated conflicting invoice sources. A deliberately attempted stale approval produced a real guardrail error that was verified in Neatlogs, with no ledger change. Evidence files retain actual trace IDs and results.

These observations do not establish a general live-model accuracy rate or human time savings. The accountant-review screen records randomized matched tasks, raw elapsed time, accuracy and feedback, but no completed accountant review is claimed. Dodo account access remains unverified.

The live late-credit challenge terminated a real worker after one checkpoint and resumed six remaining bundles. Final new-case balances were USD 12,492.80 and GBP 9,994.24, with historical journals retained and no duplicate posting on retry. One other invoice initially exhausted the live tool budget and stayed blocked; after tightening required-tool sequencing, its real live rerun reconciled. Both observations remain in the audit. The captured workpaper v8 snapshot retains the disputed service exception; the live UI derives the latest report version and freshness from the local database.

## Challenges and next steps

The hard part was preserving the relationship between the evidence, approval and ledger as the evidence changes. Balanced entries alone were insufficient: the checker also needs correct economic totals and source identity. Production work remains: authenticated roles, tenant isolation, real ERP/bank connectors, source acceptance resolution and remaining dependency advisories.

## Fields still required

- Team/member details and confirmed registrations.
- Public GitHub URL. Current origin is a local development remote, not GitHub.
- Public demo video/social post URL and final AO usage recording.
- Hosted app URL if deployed; the current app is local only.
- Final event-rule review, real accountant participation, and consent before quoting feedback.

No social post, bug report, public repository or Devpost submission has been sent by this build.

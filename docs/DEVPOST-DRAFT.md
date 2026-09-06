# Devpost draft — not submitted

## Project

**CloseLoop — a close that recovers when the evidence changes**

Track: Autonomous Office of the CFO.

## Pitch

CloseLoop investigates intercompany accounting exceptions, prepares evidence-backed corrections for a human controller, and rebuilds close workpapers when late evidence changes the answer. Its most important demo happens after the first approval: a new credit invalidates affected conclusions, preserves the original journal, and creates a fresh correction and report version.

## What it does

Three synthetic subsidiaries have missing, duplicated, misrated and disputed service transactions. An investigator reads invoices, credit notes, ledger entries, policy and conversation evidence. Deterministic arithmetic builds a candidate; an independent checker validates the source obligations, accounts, currencies and exact resulting balances. A simulated controller approves the version before the journal, approval and audit event commit together.

Late credits have stable identities and versions. Repeated imports count once; revisions retain old evidence and replace active contributions. Affected workpapers become stale. New versions include frozen source, ledger, policy and approval snapshots. Ambiguous services remain open. Failed or interrupted runs resume from saved checkpoints.

## How we built it

Node.js, native SQLite, a browser dashboard, AI SDK 7 ToolLoopAgent, TensorMux-compatible model routing, and manual Neatlogs instrumentation. Dodo's read-only test ledger connector adds a separate cash-evidence view. AO session `closeloop-1` reviewed the initial design and proposed five acceptance cases that shaped implementation and testing.

## What we verified

30 automated tests, including actual worker-process kills before/after commit, concurrent approvals, source-version deduplication, stale decision rejection and checkpoint resume. A separate deterministic benchmark passed 30/30 unseen arithmetic/validator cases. Browser verification completed the late-credit correction workflow on desktop; mobile layout was inspected and fixed. Neatlogs validated a six-span local CloseLoop envelope with export disabled.

These results do not establish live-model accuracy or human time savings. TensorMux live calls, Neatlogs dashboard delivery and Dodo account access must be verified before changing this wording.

## Challenges and next steps

The hard part was preserving the relationship between the evidence, approval and ledger as the evidence changes. Balanced entries alone were insufficient: the checker also needs correct economic totals and source identity. Production work remains: authenticated roles, tenant isolation, real ERP/bank connectors, source acceptance resolution and remaining dependency advisories.

## Fields still required

- Team/member details and confirmed registrations.
- Public GitHub URL. Current origin is a local development remote, not GitHub.
- Public demo video/social post URL and final AO usage recording.
- Hosted app URL if deployed; the current app is local only.
- Actual verified sponsor evidence and final event-rule review.

No social post, bug report, public repository or Devpost submission has been sent by this build.

# First working release

## Stack

Node 22 native SQLite transaction store, vanilla accessible web client, AI SDK 7 ToolLoopAgent with TensorMux OpenAI-compatible provider, Neatlogs explicit workflow/tool spans. Local durable service on 127.0.0.1:4317. No external accounting writes.

## Accounting perimeter

One month, wholly owned service entities: US/USD, UK/GBP, India/INR. Invoice currency USD. Explicit synthetic policy rates govern each entity's functional-currency booking (US 1/1, UK 4/5, India 83/1); these are fixture rates, not current market rates. No full FX translation, CTA, tax, inventory profit, ownership consolidation, or revenue recognition engine. Elimination schedule is in transaction USD and is explicitly a workpaper rather than consolidated statutory statements.

Money uses integer minor units, rate arithmetic uses rational BigInt and documented half-up rounding. Each posted batch balances separately by entity and functional currency. A service supplier holds intercompany receivable against service revenue; the receiver holds service expense against intercompany payable. Negative deltas reverse those pairs. Existing journals are immutable.

## Data and changes

SQLite stores versioned documents, journal batches, investigations, approvals, reports, events and runs. A run snapshots the dependency fingerprint. The validator recalculates expected amounts independently from source documents and current ledger, then checks proposed account lines. Approval plus sandbox posting commits atomically and uses a unique investigation revision key. A repeated request returns the previous result. A changed dependency rejects stale review. Already posted entries remain; a new proposal adds compensating corrections.

## Rehearsal cases

Matched service invoice; missing buyer payable; duplicate buyer entry; wrong policy rate; missing credit note; unsupported/ambiguous reference. Case labels come from actual source/ledger comparison rather than fixture ID. A late credit note can apply a reviewer-entered amount to any eligible invoice. Raw email or meeting text is untrusted evidence and cannot itself authorize posting or override policy.

## Interface

Close overview; entity balances; investigation detail with sources, agent tool log, proposed entries and approval; impact view for a late change; chronological audit trail; downloadable JSON workpapers; integration status with configured versus verified distinction; accountant Q&A backed by retrieval tools; source import panel. Clearly label synthetic sandbox and deterministic rehearsal mode without keys.

## Must pass

Exact cents; reject invalid currency and unsafe values; reject cross-entity imbalance; stale approvals rejected; repeated approval posts once; pending proposal survives reopen; historical journals immutable on source change; report freshness checked on read; changed credit cannot make invoice negative; unresolved cases block a clean close; imported evidence is not an instruction; agent cannot approve; unknown document IDs rejected; HTTP writes restricted to same-origin local requests; secrets never returned.

## Demo

Run close; review and approve a supported correction; prepare workpaper; introduce late credit; affected report becomes stale; resume investigation; approve compensation; export rebuilt workpaper. Reopen database and retry approval to demonstrate durability and idempotency. Measure real held-out arithmetic and change-recovery cases separately from live LLM diagnosis.

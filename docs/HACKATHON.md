# Syndicate track selection

## Selected track

**Track 2 — Autonomous Office of the CFO**

## Why Meridian belongs in Track 2

Meridian is an internal finance workflow for month-end close. It automates the investigation and verification work around controller judgment:

- intercompany evidence and ledger reconciliation
- accounting-policy evaluation
- correction proposals with independent validation
- missing or conflicting evidence detection
- controller approval before posting
- versioned workpapers and audit history
- stale-evidence invalidation and checkpoint recovery

This is an Office of the CFO workflow rather than a payments storefront. The product focuses on close exceptions, approval boundaries, evidence, and safe accounting execution.

## How completely it is implemented

Meridian is implemented as a working local synthetic sandbox with:

- **103/103 automated tests passing**
- **30/30 held-out arithmetic and validator cases passing**
- **7/7 Judge Lab control invariants verified**
- deterministic accounting validation independent of the model proposal
- source-conflict handling that requires an explicit controller decision
- approval protection for blocked or stale proposals
- duplicate-safe posting and persisted audit events
- worker interruption, checkpoint retention, and resume behavior
- workpaper freshness checks that block final sign-off after evidence changes
- TensorMux live-investigator support with deterministic rehearsal mode
- selected Neatlogs trace read-back evidence
- Agent Orchestrator evidence for the design checkpoint and final-hardening work

The current close state is **6/7 reconciled**. IC-1047 remains open because service acceptance is disputed and signed confirmation is missing. The system keeps that exception visible and prevents unsupported posting.

The implementation is deliberately bounded: it is a local synthetic sandbox, not a statutory consolidation system, production ERP, or authenticated multi-user accounting deployment.

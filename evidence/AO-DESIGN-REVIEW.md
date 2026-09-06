# AO design review

Actual AO session: `closeloop-1`, project `closeloop`. Assistant output below was retrieved from this session only.

## 2026-09-05 17:02:43.7200764 +0000 UTC

The design is a sound starting point for the scoped sandbox: immutable journals, independent validation, human approval, and compensating entries support the recovery story. The main gaps are precise acceptance criteria, rather than missing architecture. These are design risks, not verified implementation defects.

1. **Balanced entries can still be economically wrong.** The validator must check invoice identity, entity, counterparty, accounts, and correction amount—not merely debit/credit equality. **Acceptance:** missing payable, duplicate entry, and wrong-rate cases produce the exact expected correction; balanced proposals using the wrong entity or accounts are rejected. USD elimination workpapers reconcile receivable/payable and revenue/expense separately. [Accounting design](docs/BUILD-SPEC.md:11)

2. **Credit revisions can cause rounding drift or double counting.** Define correction amounts as the rounded current target balance minus the amount already posted; specify signed rounding and credit identity/version semantics. **Acceptance:** a $0.03 invoice books £0.02; a $0.01 credit leaves a £0.02 target and requires no GBP adjustment under the stated rate. Reimporting that credit changes nothing; revising it replaces its previous contribution; cumulative credits exceeding the invoice are rejected. [Rates and arithmetic](docs/BUILD-SPEC.md:9)

3. **A late change can escape invalidation or race approval.** Fingerprints must cover newly added credits, policy versions, and relevant ledger changes, including dependencies absent when investigation began. Revalidate inside the posting transaction. **Acceptance:** introduce a credit between review and approval; the stale proposal posts nothing. Affected investigations and reports become stale, including direct JSON/CSV downloads; rebuilding uses current sources and ledger state. [Dependency design](docs/BUILD-SPEC.md:15)

4. **Crash recovery or concurrent investigations can post twice.** A unique investigation revision protects retries, but separate investigations can still propose the same correction. **Acceptance:** inject crashes immediately before and after commit, restart, and retry: approval, complete journal batch, and audit event exist exactly once or not at all. Concurrent approvals from separate investigations against the same ledger state cannot both apply the correction. Previously posted journals remain unchanged. [Transaction design](docs/BUILD-SPEC.md:15)

5. **Untrusted evidence or unresolved work can become an approved “clean close.”** Enforce approval authority and close eligibility on the server. **Acceptance:** imported instructions cannot approve or change policy; agent-originated approval attempts fail; ambiguous references and unknown IDs produce no postings. Any unresolved case blocks clean-close status, and displayed/exported workpapers retain that qualification. [Required safeguards](docs/BUILD-SPEC.md:27)

No files changed, agents spawned, or content published.

## 2026-09-05 17:02:11.6500007 +0000 UTC

I’ll read both documents, review the accounting and recovery flows, and return five prioritized failure cases with concrete acceptance checks.
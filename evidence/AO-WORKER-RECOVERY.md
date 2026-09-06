# AO Worker C — Meridian recovery hardening evidence

## Scope and baseline

- Worktree: `C:/Users/Bhavya Keerthi/.ao/data/worktrees/closeloop/closeloop-6`
- Branch: `codex/closeloop-recovery-hardening`
- Starting commit after `git merge --ff-only codex/closeloop`: `e4f42b506c1f0b7983afb1193e052966e4dbf18e`
- The requested baseline reference was resolved through the local `codex/closeloop` ref; no reset, force update, or history rewrite was used.
- Initial worktree was clean. No live demo database or port 4320 was opened or modified.

## Recovery audit

The existing implementation and tests cover the requested failure boundaries:

- `src/workflow.js:createRun` persists a running run, its invoice bundle, and a `run.started`/`run.resumed` event before worker execution.
- `src/runner.js:interrupt` records the journal hash before OS termination; the close handler records interruption proof, completed checkpoints, worker exit, and `run.interrupted`.
- `src/workflow.js:recoverInterrupted` converts abandoned running runs to `interrupted` while retaining investigations, journals, and fingerprints.
- Resume filters the prior run's invoice list by current fingerprint, so completed current checkpoints are skipped and remaining bundles execute.
- `src/store.js` uses a synchronous SQLite transaction with `BEGIN IMMEDIATE`, WAL, `synchronous=FULL`, and rollback on error.
- `approve` commits journal, proposal status/approval, and `approval.posted` in one transaction. A replay returns the existing journal and records `approval.replayed`; concurrent approval is serialized.
- Run, checkpoint, interruption, resume, posting, and replay events are retained in the same persisted workspace state and survive reopening the SQLite database.

## Commands and results

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 59 packages installed. npm reported 12 moderate audit advisories. |
| `node --test tests/crash.test.js tests/judge-lab.test.js` | Passed: 8/8. |
| `npm test` | Passed: 39/39, 0 failures/cancellations/skips. |
| `npm run check` | Passed: TypeScript and both browser JavaScript syntax checks. |
| `npm run evaluate` | Passed: 30/30 deterministic held-out cases; existing `evidence/evaluation.json` was restored after the command's timestamp/duration rewrite. |

## Focused outcomes

- OS-killed approval before commit: ledger remained unposted; retry created exactly one journal.
- OS-killed approval after commit: committed journal remained; retry returned `duplicate: true` and did not create another journal.
- Two concurrent approval processes: one `duplicate: false`, one `duplicate: true`; one correction journal remained.
- Judge Lab worker termination: interruption proof reported `mechanism: OS process termination` and `ledgerUnchanged: true`; retained investigation checkpoints were preserved.
- Resume: completed current checkpoints were excluded from the resumed run's invoice list; the remaining bundles completed successfully.
- Approval after resume and replay: exactly one journal remained, the historical journal was unchanged, and the final audit event was `approval.replayed`.
- Reopen persistence: the full suite's pending-review-after-reopen test passed, including exactly-once posting after reopening the database.

## Limitations and raw failures

- No defects were reproduced, so no production code was changed.
- `scripts/challenge-suite.js` was not run: it requires both `TENSORMUX_API_KEY` and `NEATLOGS_API_KEY` and intentionally creates a new runtime database. Its raw guard is `Error: Both live sponsor keys are required; no rehearsal fallback` when either key is absent. This was not invoked to avoid generating a failure artifact or touching live state.
- No runtime server was started; therefore port 4320 and its database were not contacted.
- Node emitted its standard experimental SQLite warning during tests; it did not affect results.

## Files changed

- `evidence/AO-WORKER-RECOVERY.md` (this evidence record only)


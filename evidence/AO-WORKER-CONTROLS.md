# AO Worker B: accounting controls audit

Date: 2026-09-06  
Scope: deterministic validation, source conflicts, stale evidence, approval protection, duplicate-safe posting, unresolved exceptions, and fail-closed behavior.

## Baseline

`git rev-parse HEAD` initially returned `d0d4afe1ea301820f7cc3f95a73585248d39b253`, while the requested baseline was available locally as `codex/closeloop`. The isolated branch was clean and an ancestry-preserving fast-forward was performed with `git merge --ff-only e4f42b506c1f0b7983afb1193e052966e4dbf18e`.

Final baseline verification:

```text
git rev-parse HEAD
e4f42b506c1f0b7983afb1193e052966e4dbf18e
```

Resulting worktree HEAD after the audit commit:

```text
git rev-parse HEAD
44089db8e17fd3418a5912e1ec9418873eb7ec28
```

No live demo database or port 4320 was opened or modified. Tests used in-memory SQLite or temporary isolated SQLite copies under the OS temp directory.

## Control findings

No genuine control defect was found, so no product/control logic or test files were changed.

| Control | Evidence inspected | Outcome |
| --- | --- | --- |
| Deterministic validation | `src/validator.js`, `tests/workflow.test.js`, `scripts/evaluate.js` | Independent source, policy, currency, account, integer, balance, and obligation checks reject tampered proposals. Held-out evaluation passed 30/30. |
| Source conflicts | `src/source-selection.js`, `src/cases.js`, `tests/judge-lab.test.js` | Conflicting invoices remain blocked until a current group-controller source choice binds to the candidate digest and current fingerprint. |
| Stale evidence | `src/revisions.js`, `src/workflow.js`, `tests/workflow.test.js`, `tests/judge-lab.test.js` | Fingerprint mismatch blocks approval; changes mark affected conclusions/reports stale; frozen historical evidence and journals remain intact. |
| Approval protection | `src/workflow.js`, `tests/workflow.test.js` | Approval requires current revision, current validation, reviewer, and `group_controller`; rejected/stale proposals cannot post. |
| Duplicate-safe posting | `src/workflow.js`, `src/store.js`, `tests/crash.test.js` | SQLite `BEGIN IMMEDIATE`, idempotency keys, crash-boundary recovery, and two-process race tests produce exactly one correction journal. |
| Unresolved exceptions | `src/workflow.js`, `tests/workflow.test.js` | Disputed or otherwise unresolved cases produce provisional workpapers and are excluded from eliminations. |
| Fail closed | `src/runner.js`, `src/workflow.js`, `tests/workflow.test.js`, `tests/agent.test.js` | Provider failures record failed runs without rehearsal substitution or postings; unsupported, disputed, malformed, and conflicting inputs remain blocked. |

## Exact verification commands

All commands were run from the isolated AO worktree at `C:\Users\Bhavya Keerthi\.ao\data\worktrees\closeloop\closeloop-4`.

```text
npm ci
Result: added 59 packages; audit reported 12 moderate advisories.

npm test
Retained summary only (the initial raw TAP transcript was not retained):
38 passed, 1 failed, 39 total. The only failure was
"real process termination retains checkpoints and resume skips completed work"
timing out waiting for a worker checkpoint during the parallel full suite.

node --test tests/judge-lab.test.js
Result: 5 passed, 0 failed. The timed-out worker test passed in isolation.

npm run check
Result: passed: TypeScript check and browser JavaScript syntax checks.

npm run evaluate
Result: 30 cases, 30 passed, 0 failed.

npm run check:traces
Result: status pass, spanCount 6, firstFailure null, remoteExport false.
```

Checkpoint rerun after the AO baseline confirmation:

```text
node --test tests/workflow.test.js tests/crash.test.js tests/judge-lab.test.js
Result: 28 passed, 0 failed.

npm run check
Result: passed: TypeScript check and browser JavaScript syntax checks.
```

## Limitations

- The initial full-suite worker-checkpoint timeout is not reproduced by the three-run follow-up below. A separate intermittent SQLite-open race did occur in one full-suite run, so the full suite cannot be characterized as deterministically reliable from these results.
- Sponsor/live API checks were not run; they would require credentials and are outside this isolated no-live-demo-DB audit.
- The dependency audit still reports 12 moderate advisories from `npm ci`; dependency remediation is outside this scoped controls task.
- This audit verifies the local deterministic sandbox and temporary test databases. It does not certify production ERP, database, or multi-user deployment behavior.

## Bounded timeout follow-up

The initial evidence retains a summary, not verbatim raw output: `Result: 38 passed, 1 failed, 39 total. The only failure was "real process termination retains checkpoints and resume skips completed work" timing out waiting for a worker checkpoint during the parallel full suite.` The initial raw TAP transcript is not present in this repository, and `evidence/test-results.txt` was not changed.

Follow-up conditions: three sequential invocations from this worktree, each exactly `npm test` (`node --test tests/*.test.js`), with default `node:test` file concurrency and no `--test-concurrency` override. Node `v22.20.0`; npm `10.9.3`; live port 4320 untouched.

Exact retained raw result/error excerpts from the follow-up command output:

```text
run_conditions=three sequential npm test invocations; default node:test file concurrency; live port 4320 untouched
node=v22.20.0
npm=10.9.3
RUN=1 COMMAND=npm test
# pass 39
# fail 0
RUN=1 EXIT=0
RUN=2 COMMAND=npm test
not ok 7 - two processes race the same approval and only one commits a journal
Error: database is locked
at openStore (file:///C:/Users/Bhavya%20Keerthi/.ao/data/worktrees/closeloop/closeloop-4/src/store.js:10:6)
errcode: 5,
errstr: 'database is locked'
# pass 38
# fail 1
RUN=2 EXIT=1
RUN=3 COMMAND=npm test
# pass 39
# fail 0
RUN=3 EXIT=0
```

The focused controls validation is distinct from the full/parallel suite: `node --test tests/workflow.test.js tests/crash.test.js tests/judge-lab.test.js` passed 28/28, and the focused `node --test tests/judge-lab.test.js` passed 5/5. Those focused results support the control-path claims; they do not establish full-suite reliability. The three full-suite runs were 39/39, 38/39 (SQLite lock in the approval-race test), and 39/39. The original checkpoint timeout did not recur, but the observed SQLite lock is a real intermittent runtime/test-environment reliability concern; this evidence-only corrective commit does not alter source, control logic, or tests.

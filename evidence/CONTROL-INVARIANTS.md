# Meridian control invariants

These are implementation-backed properties checked by the current test suite or recorded runtime evidence. PASS means the named check was run and passed.

| Invariant | Implementation | Verification | Result |
| --- | --- | --- | --- |
| Independent validation recomputes expected balances and journal totals | `src/accounting.js` | `tests/workflow.test.js` accounting/validation cases; `npm test` | PASS |
| Missing or disputed service evidence cannot become a posted correction | `src/workflow.js` | disputed-case coverage in `tests/workflow.test.js` | PASS |
| Source conflicts require a current controller source decision | `src/cases.js`, `src/workflow.js` | `tests/judge-lab.test.js` conflict case | PASS |
| Evidence changes invalidate affected approval and report state | `src/workflow.js` | late-credit and stale-approval cases in `tests/workflow.test.js` | PASS |
| A replayed approval cannot create a second journal | `src/workflow.js` | duplicate approval and race cases in `tests/workflow.test.js`, `tests/crash.test.js` | PASS |
| Worker interruption leaves the ledger unchanged | `src/runner.js` | real termination case in `tests/judge-lab.test.js` | PASS |
| Resume skips completed checkpoints and processes remaining bundles | `src/runner.js` | resume case in `tests/judge-lab.test.js` | PASS |
| Only a current proposal with controller approval can post | `src/workflow.js` | approval guardrail cases in `tests/workflow.test.js`, `tests/judge-lab.test.js` | PASS |
| Workpaper export preserves historical snapshots and marks stale output | `src/workflow.js` | frozen-export case in `tests/workflow.test.js`; current v8 state | PASS |
| Cash evidence is read-only and cannot affect intercompany balances | `src/dodo.js` | `tests/dodo.test.js` | PASS |
| Judge Lab challenge paths are executable against fresh inputs | `src/judge-lab.js`, `public/lab.js` | `tests/judge-lab.test.js`; browser Judge Lab check | PASS |

Current runtime state remains 6/7 reconciled, IC-1047 open for evidence, and workpaper v8 refresh required.

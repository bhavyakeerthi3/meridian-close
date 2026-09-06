# Adversarial validation

The challenge paths below exercise failure modes that matter to a controller. They are the existing Judge Lab/workflow tests, summarized without adding a second accounting engine.

| Scenario | Expected behavior | Observed evidence | Result |
| --- | --- | --- | --- |
| Conflicting source invoice | Keep both sources visible; require current source authority | `tests/judge-lab.test.js` conflict case passes; Judge Lab labels the sequence historical | PASS |
| Late credit after approval/report | Invalidate affected downstream state; preserve prior journal; require fresh review | `tests/workflow.test.js` late-credit and frozen-export cases pass; current workpaper is stale v8 | PASS |
| Worker interruption | Retain checkpoint; ledger unchanged; mark run interrupted | `tests/judge-lab.test.js` real process termination asserts `ledgerUnchanged === true` and interruption proof | PASS |
| Resume after interruption | Skip completed bundle and finish remaining work | `tests/judge-lab.test.js` resume case verifies visited bundles and retained checkpoint | PASS |
| Approval attack / stale proposal | Fail closed before posting | `tests/judge-lab.test.js` and `tests/workflow.test.js` approval guardrail cases pass; guardrail event persists | PASS |
| Duplicate approval retry | Return original posting and avoid a second journal | `tests/crash.test.js` process race and `tests/workflow.test.js` replay cases pass | PASS |

No generic fuzzer or synthetic pass count was added. The complete current suite is the verification source.

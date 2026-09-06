# Judge Lab evaluations

Judge Lab is a compact evaluation harness around the existing close workflow. Each category maps a task to execution, a control grader, and an observable outcome. It does not add a second accounting engine.

| Category | Tasks/scenarios | Control grader | Evidence | Result |
| --- | --- | --- | --- | --- |
| Capability | Clean pair reconciliation, variance investigation, workpaper preparation, review routing | Deterministic validation and review eligibility | `tests/workflow.test.js`, `tests/decisions.test.js` | PASS |
| Regression | Unauthorized posting, stale approval, duplicate retry, checkpoint resume, audit retention | Approval, idempotency, freshness, and persistence checks | `tests/workflow.test.js`, `tests/crash.test.js`, `tests/judge-lab.test.js` | PASS |
| Adversarial | Source conflict, late evidence, worker interruption, approval attack | Fail-safe state transition and ledger protection | `evidence/ADVERSARIAL-VALIDATION.md`, `tests/judge-lab.test.js` | PASS |

The complete release suite reports 39 passed and 0 failed. The Judge Lab UI labels these as evaluation evidence; historical challenge results are not presented as current production incidents.

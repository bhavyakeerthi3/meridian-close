# Meridian engineering decisions

This record describes decisions visible in the current implementation. It is a release artifact, not a claim that every decision was made by Agent Orchestrator.

## 1. AI proposes; deterministic code verifies
- **Context:** A language model is useful for evidence-oriented investigation, but accounting calculations must be reproducible.
- **Decision:** The investigator may propose findings; policy and independent validation code compute and check journal lines.
- **Rationale:** A model can explain evidence without becoming the accounting authority.
- **Tradeoff:** Let the model emit final entries directly. That is faster to prototype but makes correctness and review harder to prove.
- **Consequence:** A proposal can be rejected even when its narrative sounds plausible.
- **Evidence:** `src/accounting.js`; `tests/workflow.test.js` validation and posting cases.

## 2. Missing evidence is a stop condition
- **Context:** IC-1047 has disputed service acceptance and no signed confirmation.
- **Decision:** Keep the investigation open and request evidence rather than infer acceptance.
- **Rationale:** Unsupported accounting judgment must remain visible to the controller.
- **Tradeoff:** Estimate acceptance from surrounding documents. That would hide the unresolved control gap.
- **Consequence:** The close remains 6/7 reconciled with one open blocker.
- **Evidence:** `public/app.js` selected investigation; current `/api/state`; `tests/workflow.test.js` disputed case.

## 3. Controller approval is a hard gate
- **Context:** Proposed corrections affect a sandbox ledger.
- **Decision:** Only a current proposal in review, approved by the controller role, may post.
- **Rationale:** Automation prepares work; the accountable reviewer decides judgment.
- **Tradeoff:** Auto-post validated proposals. That removes the required segregation of judgment.
- **Consequence:** Stale, blocked, or non-controller requests fail closed.
- **Evidence:** `src/workflow.js`; `tests/workflow.test.js`; `tests/judge-lab.test.js`.

## 4. Source conflicts stay explicit
- **Context:** A later source can disagree with an earlier invoice.
- **Decision:** Preserve competing documents and require a current source-authority decision.
- **Rationale:** A clean-looking close should not erase the conflict that drove the decision.
- **Tradeoff:** Silently pick the newest document. It simplifies the UI but weakens the audit trail.
- **Consequence:** The Judge Lab conflict remains visible as a historical sequence.
- **Evidence:** `src/cases.js`; `tests/judge-lab.test.js`; `public/app.js` investigation timeline.

## 5. Evidence changes invalidate downstream state
- **Context:** A late credit changes a previously prepared conclusion.
- **Decision:** Mark affected investigations, approvals, and workpapers stale; retain historical journals.
- **Rationale:** Downstream artifacts must describe the evidence version they were built from.
- **Tradeoff:** Mutate the old approval in place. That loses the historical decision boundary.
- **Consequence:** A fresh investigation and approval are required after a late change.
- **Evidence:** `src/workflow.js`; `tests/workflow.test.js` late-credit and frozen-export cases.

## 6. Posting is duplicate-safe
- **Context:** A retry can arrive after a commit but before a response.
- **Decision:** Idempotency keys and transactional checks return the original posting on replay.
- **Rationale:** Recovery must never double the journal.
- **Tradeoff:** Trust the caller to avoid retries. Network failures make that unsafe.
- **Consequence:** A replay is recorded as duplicate/replayed while the ledger stays balanced.
- **Evidence:** `src/workflow.js`; `tests/crash.test.js`; `tests/workflow.test.js`.

## 7. Checkpoints precede risky work
- **Context:** Investigation workers can be interrupted or fail mid-run.
- **Decision:** Persist each completed bundle and resume only unfinished or changed bundles.
- **Rationale:** Operators need recoverability without repeating side effects.
- **Tradeoff:** Restart the full batch. It is simpler but wastes work and increases retry risk.
- **Consequence:** Recovery proves retained checkpoints, unchanged ledger, and bounded resume.
- **Evidence:** `src/runner.js`; `tests/judge-lab.test.js`; `evidence/AO-WORKER-RECOVERY.md`.

## 8. Judge Lab uses fresh challenge cases
- **Context:** Historical examples do not prove behavior on an unseen case.
- **Decision:** Keep source conflict, late evidence, worker interruption, and approval attack as live challenge paths.
- **Rationale:** Judges can observe controls under failure rather than only a green path.
- **Tradeoff:** Demonstrate only precomputed screenshots. That is easier but less probative.
- **Consequence:** Challenge results are clearly labeled as test/rehearsal evidence.
- **Evidence:** `src/judge-lab.js`; `tests/judge-lab.test.js`; `public/lab.js`.

## 9. AO is the engineering plane, not finance runtime
- **Context:** The hackathon supplied Agent Orchestrator for engineering coordination.
- **Decision:** Present AO sessions, acceptance cases, and worker evidence separately from Meridian’s runtime controls.
- **Rationale:** Judges should understand what was built through AO without confusing it with finance automation.
- **Tradeoff:** Brand Meridian as an AO runtime. That would be inaccurate.
- **Consequence:** The Connections page shows a truthful engineering record and explicit boundary.
- **Evidence:** `evidence/AO-FINAL-HARDENING.md`; `public/app.js` `aoBuildProof()`.

## 10. Evidence is a first-class object
- **Context:** Controller decisions need source, policy, and version context.
- **Decision:** Link investigations and workpapers to immutable source snapshots and audit events.
- **Rationale:** A result without its evidence cannot be reviewed or reproduced.
- **Tradeoff:** Store only the final numeric answer. That is compact but unverifiable.
- **Consequence:** Evidence Room and Run History can explain the close after a change.
- **Evidence:** `src/store.js`; `src/workflow.js`; `public/app.js` evidence and history views.

## 11. Unresolved exceptions keep the close provisional
- **Context:** One of seven pairs is still evidence-blocked.
- **Decision:** Exclude unresolved items from elimination/posting and keep the workpaper refresh warning visible.
- **Rationale:** A partial close must not look final.
- **Tradeoff:** Publish a complete-looking package with a footnote. That invites misinterpretation.
- **Consequence:** The UI consistently reports 6/7 reconciled, one blocker, and refresh required.
- **Evidence:** `src/accounting.js`; `public/app.js` workpaper/home views; current `/api/state`.

## 12. Cash connector is optional and read-only
- **Context:** Dodo cash evidence is outside the intercompany close proof.
- **Decision:** Keep it optional, test-mode/read-only, and visibly unconfigured when absent.
- **Rationale:** The core close must remain useful without fabricated transactions or a provider dependency.
- **Tradeoff:** Make cash import required for the demo. That adds setup risk without strengthening the core control story.
- **Consequence:** Cash Evidence explains its boundary and does not alter intercompany balances.
- **Evidence:** `src/dodo.js`; `tests/dodo.test.js`; `public/app.js` `cash()`.


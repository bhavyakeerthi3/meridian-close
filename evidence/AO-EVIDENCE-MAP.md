# AO evidence map

AO is the engineering operating plane. Meridian is the finance execution plane. The map below links the recorded AO sessions to artifacts and the Meridian controls they informed or checked.

| AO session | Workstream / role | Commit or record | Verification evidence | Meridian control / boundary |
| --- | --- | --- | --- | --- |
| `closeloop-1` | Initial design review and acceptance checkpoint | [AO-DESIGN-REVIEW.md](AO-DESIGN-REVIEW.md) | Five acceptance themes documented before the later implementation | Independent validation, credit semantics, stale invalidation, recovery, fail-closed approval |
| `closeloop-2` | Final-hardening orchestrator | [AO-FINAL-HARDENING.md](AO-FINAL-HARDENING.md) | Assigned scoped work, routed findings, and withheld integration until evidence was inspected | Engineering coordination; not the finance runtime |
| `closeloop-4` | Controls worker | commit `3c5d7ae`; [AO-WORKER-CONTROLS.md](AO-WORKER-CONTROLS.md) | Focused control checks 28/28 and held-out evaluation 30/30; full-suite intermittent lock is documented | Validator independence, approval guardrail, source conflicts, duplicate-safe posting |
| `closeloop-5` | UX/evidence worker | commit `607dc7e`; [AO-WORKER-UX.md](AO-WORKER-UX.md) | `npm run check`, disposable API/browser checks, evidence-gated UI language | Judge-facing claims, connector status, stale workpaper wording |
| `closeloop-6` | Recovery worker | commit `a4a5d99`; [AO-WORKER-RECOVERY.md](AO-WORKER-RECOVERY.md) | Crash/recovery-focused 8/8; checkpoint, resume, and duplicate-posting outcomes recorded | Interruption recovery and exactly-once posting |
| `closeloop-7` / `closeloop-8` | Independent read-only reviewers | [AO-FINAL-HARDENING.md](AO-FINAL-HARDENING.md) | One review approved after evidence corrections; one retained wording requests and limitations | Evidence review and bounded acceptance |
| `closeloop-9`–`closeloop-12` | Control, recovery, provenance, and claim red-team mission | `2b947d3`; [AO-RED-TEAM-2026-09-06.md](AO-RED-TEAM-2026-09-06.md) | All sessions read-only; claim reviewer confirmed the recorded suite/check and rejected unsupported claims | Adversarial claim review; no worker code integrated from this mission |
| Current repository release check | Local release verification, not an AO session | [ENGINEERING-METRICS.md](ENGINEERING-METRICS.md); [FINAL-ENGINEERING-REPORT.md](FINAL-ENGINEERING-REPORT.md) | 103/103 tests, `npm run check`, API 200, browser navigation check | Current submission state and demo readiness |

## Recorded coordination loop

The evidence supports this bounded sequence:

```text
AO design checkpoint
  → final-hardening orchestrator
  → scoped controls / UX / recovery workstreams
  → independent evidence reviews and red-team audits
  → evidence corrections and narrower claims
  → current Meridian tests, API, and browser verification
```

The repository does not contain a complete `cashLabel` regression transcript, an AO Browser-panel transcript, or a hosted pull-request review. Those are deliberately not presented as completed steps.

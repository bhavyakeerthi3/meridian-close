# Engineering metrics

Only reproducible workspace measurements are listed. These are engineering measures, not ROI or human productivity claims.

| Metric | Measurement | Source / date |
| --- | --- | --- |
| Automated test cases | 39 passed, 0 failed | `npm test`, release run |
| Test duration | 1.67–1.85 seconds in recent release runs | `npm test` output |
| TypeScript/browser syntax check | PASS | `npm run check`, release run |
| API health | `GET /api/state` returned HTTP 200 | local browser/API release check |
| Current close state | 6/7 reconciled; IC-1047 open; report v8 stale | `/api/state` release check |
| Judge Lab recovery | Focused recovery evidence 8/8; full suite 39/39 | `evidence/AO-WORKER-RECOVERY.md` and release run |
| AO engineering sessions recorded | 7 named sessions in the Connections proof | `evidence/AO-FINAL-HARDENING.md`; repository history |
| App startup time | Not measured | — |
| Human time saved / ROI | Not measured | No human study is claimed |
| Live sponsor call reliability | Not measured for this release | Credentials/provider availability varies |

Metrics intentionally exclude model token counts and automated timings as human savings.

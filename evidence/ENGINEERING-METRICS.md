# Engineering metrics

Only reproducible workspace measurements are listed. These are engineering measures, not ROI or human productivity claims.

| Metric | Measurement | Source / date |
| --- | --- | --- |
| Automated test cases | 103 passed, 0 failed (39 baseline + 64 new meaningful cases) | `npm test`, release run |
| Test duration | 3.47 seconds in the final release run | `npm test` output |
| TypeScript/browser syntax check | PASS | `npm run check`, release run |
| API health | `GET /api/state` returned HTTP 200 | local browser/API release check |
| Current close state | 6/7 reconciled; IC-1047 open; latest report freshness is state-derived | `/api/state` release check |
| Judge Lab recovery | Focused recovery evidence 8/8; final suite 103/103 | `evidence/AO-WORKER-RECOVERY.md`, `evidence/TEST-COVERAGE-MATRIX.md`, and release run |
| AO engineering sessions recorded | 11 named sessions in the Connections proof (7 earlier records + 4 red-team sessions) | `evidence/AO-FINAL-HARDENING.md`, `evidence/AO-RED-TEAM-2026-09-06.md`; AO session records |
| App startup time | Not measured | — |
| Human time saved / ROI | Not measured | No human study is claimed |
| Live sponsor call reliability | Not measured for this release | Credentials/provider availability varies |

Metrics intentionally exclude model token counts and automated timings as human savings.

# AO Worker UX hardening

## Scope

- Starting `HEAD`: `d0d4afe1ea301820f7cc3f95a73585248d39b253`
- Starting worktree: clean
- Base alignment: `git merge --ff-only codex/closeloop` → fast-forward to `e4f42b506c1f0b7983afb1193e052966e4dbf18e`
- Changed implementation file: `public/app.js`
- Changed evidence file: `evidence/AO-WORKER-UX.md`
- No live demo DB or port `4320` was used. Browser checks used disposable DB `data/ux-check.sqlite` and port `4391`; the DB and WAL files were removed after the checks.

## Presentation fixes

- Earlier hardening removed the Home-page blanket “Engineered and verified through Agent Orchestrator” note; the final corrective UX pass restores the requested subtle attribution line because final AO evidence now exists.
- Made the Home pipeline stages reflect recorded runtime facts. Investigation, validation, source challenge, review, posting, and workpaper stages remain pending until their state exists.
- Removed hardcoded Home featured-investigation source amounts and conflict-resolution claims when those documents are not present; the empty workspace now says source amounts are unavailable.
- Reworded the stale workpaper decorator to avoid asserting that every stale report was caused by an evidence change: `Current package is stale → workpaper refresh required → final sign-off unavailable`.
- Replaced static Connections counts, connector badges, and runtime checkmarks with values derived from the current state. Connection badges use only `Verified`, `Active`, `Optional`, or `Reference`; configuration/initialization details remain explanatory text, and unrecorded behaviors are explicitly labeled.

## Verification

Commands and results:

- `git rev-parse HEAD; git status --short; git rev-parse codex/closeloop` — recorded the starting hash above; worktree was clean; base was `e4f42b5…`.
- `git merge --ff-only codex/closeloop` — passed; fast-forwarded from `d0d4afe` to `e4f42b5`.
- `npm ci --ignore-scripts` — passed; installed 59 packages. npm reported 12 moderate audit findings; no audit fix was run.
- `npm run check` — passed (`tsc`, `node --check public/app.js`, `node --check public/lab.js`).
- On `2026-09-06`, `npm test` — passed: 39 tests, 0 failures. This is the current final-hardening test result; it is separate from the historical 36-test artifact.
- `node src/server.js` with `PORT=4391` and disposable `CLOSELOOP_DB=data/ux-check.sqlite` — passed; server reported ready at `http://127.0.0.1:4391`.
- `Invoke-WebRequest http://127.0.0.1:4391/api/state` — HTTP 200.
- `npx agent-browser --session ux-hardening open/wait/get text` on `http://127.0.0.1:4391` — Home check passed: no AO verification note, source amounts unavailable without current docs, and unrun pipeline stages shown pending.
- `npx agent-browser --session ux-hardening eval "document.querySelector('button[data-nav=connections]').click()"` followed by text inspection — Connections check passed: `0` verified runtime capabilities, AO `Active`, optional TensorMux/Neatlogs/Dodo states, and unrecorded runtime evidence shown as not recorded.
- Same browser session navigated to Cash Evidence and Workpaper Control Center — Cash remained optional/not configured; Workpaper showed “Prepare first workpaper.”

## Limitations

The AO CLI command was not available on this worker’s `PATH`, so `ao preview` / `ao browser` could not be invoked. The available project browser CLI was used against the same isolated port instead. No live provider credentials, live challenge, or production/demo database was exercised.

The initial isolated server attempt was blocked by the missing dependency. Verbatim startup failure:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'neatlogs' imported from C:\Users\Bhavya Keerthi\.ao\data\worktrees\closeloop\closeloop-5\src\server.js
```

After the dependency was made available for the local check, the disposable server started successfully; this did not require copying or sharing any `data` directory.

## Re-audit checkpoint

- Current commit: `607dc7ea45cc043224ac5d2f6ecc19a12e339782`; `git merge-base --is-ancestor e4f42b5 HEAD` passed; worktree clean before this evidence update.
- Re-audit server: `PORT=4391`, disposable `data/ux-check-reaudit.sqlite`; started successfully and then stopped; disposable DB/WAL files removed.
- `npx agent-browser --session ux-reaudit ...` — Home/AO claims absent; Connections page loaded; dynamic runtime evidence rendered; static `65 persisted` and `3 VERIFIED` strings absent. Cash and Workpaper navigation were also exercised in the session.
- Remaining limitation: AO CLI is still unavailable on PATH, so the AO Browser panel could not be used.

## Final disposable browser pass

- Server started with `PORT=4391`, `CLOSELOOP_DB=data/ux-check-final.sqlite`; it reported ready at `http://127.0.0.1:4391` and was stopped afterward. The disposable DB/WAL files were deleted.
- `npx agent-browser --session ux-final ...` Home assertions: `aoClaim=false`, `fallback=true`, `pending=true`.
- Connections assertions: page loaded, static `65 persisted spans read back` absent, static `3 VERIFIED` absent, and `RUNTIME EVIDENCE` present.
- Cash assertions: optional page present and “Not required for the current close” present.
- Workpaper assertions: control-center page present, “Prepare first workpaper” present, and stale-chain decorator absent when no report exists.

## Supervisory review fixes and final pass

- `decorateReports()` now injects the stale chain only when `state?.latestReport?.stale === true` and the current `state?.lastChange` identifies an affected report; the final disposable browser pass confirmed `staleChain=false` for a workspace with no report.
- “Ledger protected during interruption” now requires `interruptionProof.ledgerUnchanged === true`, not merely an interruption proof object.
- Connection badge categories are now evidence-backed: AO `Verified` from the engineering record, TensorMux `Active` only when `verifiedAt` confirms a live run (otherwise `Optional`), Neatlogs `Verified` only on trace read-back (otherwise `Optional`), Dodo/AI `Optional`, and Maximor `Reference`.
- `npm run check` — passed.
- On `2026-09-06`, `npm test` — passed: 39 tests, 0 failures.
- Final disposable browser pass on `PORT=4391`, `CLOSELOOP_DB=data/ux-review.sqlite`: Home `aoClaim=false`, `pending=true`; Connections loaded with no forbidden `RECORDED`/`CONFIGURED`/`INITIALIZED` badge labels and runtime evidence present; Workpaper Control Center loaded with `Prepare first workpaper` and no stale chain. The disposable DB/WAL files were removed afterward.

## AO Engineering Record

Connections/System now includes a compact secondary AO Engineering Record. It states only the recorded AO contribution and points to existing repository record locations: `evidence/AO-DESIGN-REVIEW.md`, `evidence/AO-WORKER-UX.md`, and `evidence/test-results.txt` (historical 36-test record, preserved byte-for-byte). These are shown as plain local paths because the runtime does not serve the repository `evidence/` directory as browser URLs; no fabricated links or unperformed QA claims are presented.

## Final acceptance gate

- Stale workpaper chain: `decorateReports()` returns unless the report is stale and `state?.lastChange?.affected` includes a report; current/rebuilt reports and unrelated changes receive no stale assertion.
- Connection badges: only `Verified`, `Active`, `Optional`, and `Reference`; configuration/initialization details are explanatory text, not badge labels.
- Ledger interruption proof: achieved only when `run.interruptionProof?.ledgerUnchanged === true`.
- Home AO attribution: the subtle line `Engineered and verified through Agent Orchestrator.` is rendered because the final AO record exists in the repository; it is secondary attribution and does not claim AO runs Meridian’s finance workflow.
- `npm run check` — passed.
- Exact current test record: `2026-09-06` — command `npm test` — passed: 39 tests, 0 failures. The historical `evidence/test-results.txt` remains a separate 36-test artifact and was not modified.
- `git diff --quiet e4f42b506c1f0b7983afb1193e052966e4dbf18e -- evidence/test-results.txt` — passed; the historical artifact is byte-for-byte unchanged from the integrated baseline.
- No live port `4320`, live DB, or secrets used.

## Final AO phase pass

- On `2026-09-06`, disposable server `PORT=4391`, `CLOSELOOP_DB=data/ux-final-ao.sqlite` started and was stopped; the disposable DB/WAL files were removed.
- `npx agent-browser --session final-ao ...` confirmed the Home AO attribution node is present with `display: block`; the prior blanket claim was absent before this final corrective pass and is now restored only as the requested evidence-backed secondary line.
- Connections badge text was exactly `Verified`, `Optional`, `Optional`, `Optional`, `Optional`, `Reference`; no `RECORDED`, `CONFIGURED`, or `INITIALIZED` badge labels appeared. AO record paths were present and ledger proof remained unmarked without `ledgerUnchanged === true`.
- Final required commands on `2026-09-06`: `npm run check` passed; `npm test` passed with 39 tests and 0 failures.

## Corrective source pass

- The stale workpaper cause-chain decorator now requires both `state?.latestReport?.stale === true` and `state?.lastChange?.affected?.some(item => item.kind === 'report') === true`; current, rebuilt, or non-evidence-change reports receive no stale assertion.
- Public connection badges remain exactly `Verified`, `Active`, `Optional`, and `Reference`; TensorMux configuration is described in behavior text and assistant surfaces use `Live agent verified` or `Rehearsal`, never `CONFIGURED` as a badge label.
- Ledger interruption evidence is derived only from `run.interruptionProof?.ledgerUnchanged === true`; an interruption-proof object without that explicit flag is not treated as achieved.
- Corrective verification on `2026-09-06`: `npm run check` — passed; `npm test` — passed: 39 tests, 0 failures. The exact missing-neatlogs failure remains recorded above, and `evidence/test-results.txt` remains the unchanged historical 36-test artifact.

## Final corrective commit

- Current verification date: `2026-09-06`.
- Exact commands: `npm run check` — passed; `npm test` — passed: 39 tests, 0 failures.
- `evidence/test-results.txt` remains the historical 36-test artifact and was not modified. No tests were modified. No live port `4320`, live DB, or secrets were used.
- Latest source-mapping check on `2026-09-06`: `npm run check` — passed; `npm test` — passed: 39 tests, 0 failures. The public connection mapping still emits only the approved badge categories, and strict interruption proof remains explicit.

## Final corrective UX pass

- Restored the subtle Home line exactly as requested: `Engineered and verified through Agent Orchestrator.` It is attribution for the engineering record, not a claim that AO runs Meridian’s finance workflow.
- Connection labels remain exactly `Verified`, `Active`, `Optional`, and `Reference`; configuration and initialization remain explanatory details.
- Stale workpaper wording remains conditional on stale report state plus an affected report evidence change; current/rebuilt reports are not described as stale.
- `Ledger protected during interruption` remains achieved only when `run.interruptionProof?.ledgerUnchanged === true`.
- `2026-09-06`: `npm run check` passed; `npm test` passed with 39 tests and 0 failures. Historical `evidence/test-results.txt` remains unchanged.

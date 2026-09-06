# Meridian judge demo

This guide explains how a judge or contributor can inspect Meridian locally. After starting the verified workspace, open **http://127.0.0.1:4320/**. The recorded build uses `data/closeloop-judge-lab.sqlite`; an existing workspace is preserved, and `.env.local` selects the configured port and database. Sponsor keys remain private.

## Reproduce the challenge

1. **Create a case.** Open **Judge Lab → New judge case**. Enter an invoice ID, USD gross amount, supported seller and buyer, recorded functional balances, and source text. The importer accepts structured facts; it does not claim OCR or autonomous email ingestion. TensorMux live mode is optional; deterministic rehearsal is available without sponsor keys.
2. **Inspect evidence before approval.** Open the case and review the source, ledger, policy, checker, and finding records. Compare both sides and approve only after review. The controller role is simulated. Prepare a workpaper.
3. **Introduce ambiguity.** Add another invoice source with a different amount. Approval becomes unavailable. A deliberately attempted stale API approval is rejected and recorded; the verified ERROR span is available in Judge Lab. Record an authoritative-source choice with a reason, then investigate again. All sources remain visible.
4. **Change the accepted answer.** Add a late credit with a stable reference and version. Inspect the stale workpaper and preserved historical journal. A new correction requires another review.
5. **Terminate a real process.** In Judge Lab, choose all invoice bundles and enable pacing. After at least one checkpoint, press **Terminate worker process**. Inspect the process ID, retained checkpoint count, and unchanged ledger hash. Press **Resume unfinished work**. The three-second checkpoint gap is stage pacing, not measured model latency or a provider outage.
6. **Prove the result.** Review and approve the fresh correction. Retry an approved posting; the same journal is returned. Prepare the revised workpaper and compare frozen source and ledger snapshots. For selected recorded runs, inspect Neatlogs spans and token totals verified through authenticated remote API read-back.

Keep actual latency visible. A full seven-invoice live run can take several minutes. For a short recording, show a recorded uninterrupted challenge segment or transparently edit waiting time; do not imply a faster measured execution. The retained proof can be reviewed alongside a fresh case.

## Verified example

`JUDGE-LIVE-731` was entered through the browser with USD 12,743.17 gross, the seller fully booked and the buyer unbooked. Live investigation correctly proposed GBP 10,194.54. A competing USD 14,000.31 source blocked the case until an explicit controller decision selected the original.

A later USD 250.37 credit required USD 250.37 and GBP 200.30 reductions, preserving rounding of the net target. The live worker was terminated after one checkpoint; resume processed the remaining six. Repeated approval created no second journal. Final balances are USD 12,492.80 and GBP 9,994.24.

The first resumed run held IC-1043 after the model used its tool budget without a verified finding. This failure remains recorded. Required-tool sequencing and immediate stopping after an accepted finding were added, then a real live rerun reconciled IC-1043. The recorded late-credit snapshot used workpaper v8: six of seven pairs reconcile, with the genuinely disputed IC-1047 still open. The live UI derives its latest report version and freshness from the local database.

Evidence: `live-stage-challenge.json`, `live-agent-recovery.json`, `judge-final-verification.json`, and `judge-final-workpaper.json` in `evidence/`. These are synthetic automated verification results, not accountant feedback.

## Usefulness and sponsor proof

- Run a real accountant through **Accountant review** using [the review protocol](ACCOUNTANT-REVIEW.md). Test rehearsals are excluded. Report raw times and accuracy together; no human productivity claim exists yet.
- Show AO project `closeloop` and real session `closeloop-1`, including its actual design contribution. Do not claim all development happened inside that session.
- Neatlogs: inspect the persisted spans in Judge lab, then show the same trace IDs in the sponsor dashboard if signed in. A remote API receipt is verified; a dashboard screenshot is a separate artifact.
- Show Dodo only if a real test account import has succeeded. Its connector tests do not establish live use.
- Check the event rules and the required public repository, video, and Devpost fields when preparing a submission. The repository contains evidence and setup guidance; public submission status belongs to the project owner.

## Fresh rehearsal without deleting history

Use an unused port and a new database filename, for example:

```powershell
$env:PORT = '4321'
$env:CLOSELOOP_DB = Join-Path $PWD ('data/demo-' + [guid]::NewGuid().ToString('N') + '.sqlite')
npm run dev
```

Keep source acceptance, amount/rate scope, mode labels and simulated roles visible. Do not hide failed runs or label deterministic tests as live-model accuracy.

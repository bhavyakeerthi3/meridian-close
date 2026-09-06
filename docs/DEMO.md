# CloseLoop demo

Target: a three-minute demonstration of evidence, controlled correction and recovery. Keep mode labels visible. If sponsor keys are not connected, say "deterministic rehearsal" explicitly.

## Fresh workspace without losing prior work

Use a second terminal and a new database filename. These commands preserve the existing workspace:

```powershell
$env:PORT = '4318'
$env:CLOSELOOP_DB = Join-Path $PWD ('data/demo-' + [guid]::NewGuid().ToString('N') + '.sqlite')
npm run dev
```

Open http://127.0.0.1:4318. Stop this demo server with Ctrl+C when done. The default workspace remains on port 4317.

## Recording sequence

1. **0:00–0:20 — The problem.** "A close can look finished until a late credit changes the evidence. CloseLoop finds the affected conclusions and rebuilds a reviewable close." Show three entities, six invoices, one reconciled pair and one disputed source.
2. **0:20–0:55 — Investigate.** Run the close, open IC-1042, inspect the invoice and email. The UK payable is missing. Show the tool activity and all independent checks. With TensorMux connected, show actual model usage; otherwise clearly describe rehearsal.
3. **0:55–1:20 — Review and post.** The demo controller approves the proposed GBP 9,600 payable/expense entry. The model has no approval tool. Show both sides reconcile and prepare a workpaper. Open exceptions remain provisional.
4. **1:20–2:10 — Challenge the close.** Add a USD 250 late credit with a stable reference. Show the change-impact view: affected invoice, historical approval, stale workpaper; five other bundles unchanged. Investigate again. Review and approve USD 250 and GBP 200 compensating lines. The old journal remains. Final balances are USD 11,750 and GBP 9,400. Prepare the revised workpaper and show frozen evidence in the export.
5. **2:10–2:35 — Break it.** Reimport the same credit reference/version; there is no second contribution. Show the process-crash tests: killed before commit, killed after commit, and two-process approval race. Explain the persisted Resume action for interrupted or failed investigations.
6. **2:35–3:00 — Show proof.** Display 30/30 deterministic held-out cases, the disputed exception still open, real AO session `closeloop-1`, and the genuine Neatlogs dashboard if verified. Show Dodo cash evidence only if an actual test account import has succeeded.

For a live-provider failure, show the recorded error and explicit retry/resume. Do not edit mode labels, fabricate traces or imply the deterministic evaluation measures model accuracy.

## Sponsor evidence before recording

- Open AO project `closeloop` and the actual design-review session. Explain the five acceptance cases it contributed. Do not claim all development occurred in that session.
- Save sponsor keys only in `.env.local`, restart, run one invoice and check Connections plus the real Neatlogs dashboard.
- For Dodo, use a test-mode key and a date window containing test ledger events. Explain that row consistency is not bank reconciliation or revenue recognition.
- Confirm final event rules, registrations and the public video/post requirement in `HACKATHON.md`. Review `DEVPOST-DRAFT.md` before posting anything.

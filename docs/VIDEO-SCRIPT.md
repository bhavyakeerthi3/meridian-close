# Meridian: three-minute recording guide

Repository: https://github.com/bhavyakeerthi3/meridian-close
Local app: http://127.0.0.1:4320/

## Before recording

Use a 1440×1000 browser window at 100% zoom. Hide notifications and keep keys, terminals containing credentials, and personal tabs out of frame. Record the current Overview before importing a new invoice: importing adds another case, so the count will no longer be 6/7. Do not reset or edit the database to hide this change.

Keep the video focused on one story. Record the live challenge separately if inference takes longer than the available time. You may cut waiting time, but label the cut and do not present edited elapsed time as measured performance. Rehearsal must be described as deterministic rehearsal. Use TensorMux live mode to demonstrate actual model execution; do not relabel a rehearsal as live.

## Main video: narration and clicks

| Time | Screen / action | Say |
| --- | --- | --- |
| 0:00–0:20 | Close Overview: show reconciliation count and controller priority | “Meridian is an autonomous month-end close system. Finance teams spend time investigating mismatches, chasing evidence, and rebuilding workpapers. Meridian does the work around the controller’s judgment: AI investigates, code verifies, and the controller decides.” |
| 0:20–0:45 | Inspect the controlled stop → IC-1047. Show source evidence and disabled approval | “Six of seven pairs reconcile. This one stays open because service acceptance is disputed. Meridian completed the investigation, but it cannot substitute confidence for signed evidence. The controller must resolve the evidence before a correction can proceed.” |
| 0:45–1:10 | Judge Lab → New Judge Case. Show the prepared sample below, import, choose that invoice and Live Agent, start challenge | “This is a fresh synthetic invoice supplied through the interface. The seller booked twelve thousand five hundred dollars; the UK buyer booked nothing. The investigator reads sources, ledger, and policy. Independent code verifies the proposed ten-thousand-pound payable. The agent cannot approve its own correction.” |
| 1:10–1:35 | Open the new investigation after completion. Inspect checks, then approve only if current and valid | “The finding is a proposal, with linked evidence and independent validation. I am acting as the simulated controller. Only my approval allows the sandbox posting. The demo role is simulated; we do not claim production authentication.” |
| 1:35–2:05 | Judge Lab recovery panel / Run History. Show recorded interruption and resumed run; optionally use a separately recorded fresh paced run | “We also test failure. This recorded run retained its checkpoint when the worker was terminated. The ledger comparison shows whether accounting changed; recovery resumes unfinished bundles. Posting retries are independently tested to return the existing journal, not create another one.” |
| 2:05–2:25 | Workpapers: show current version, provisional exception, and freshness. If stale, show refresh warning | “Evidence changes have accounting consequences: affected conclusions and workpapers become stale, while historical journals remain. A fresh correction needs fresh review. An unresolved exception stays visible in the accounting package.” |
| 2:25–2:45 | Connections → expand AO engineering record | “Agent Orchestrator was our engineering operating plane. Its initial design review defined five acceptance themes. Later scoped workers and independent reviews challenged controls, recovery, and evidence claims. Meridian itself runs the finance workflow; AO does not.” |
| 2:45–3:00 | Judge Lab evaluation / repository test evidence | “The current suite passes 103 tests, including process crashes, stale approvals, and duplicate posting. This is a synthetic sandbox, and we do not claim measured accountant time savings. Meridian knows when to act, when to ask for evidence, and when it must stop.” |

## Exact input for a fresh invoice

Judge Lab → NEW JUDGE CASE. Use a new suffix for each rehearsal; do not overwrite an earlier source.

| Field | Enter |
| --- | --- |
| Invoice reference | VIDEO-12500-01 |
| Source document ID | VIDEO-12500-01-INV |
| Service description | August engineering services — video example |
| Seller | Meridian US · USD |
| Buyer | Meridian UK · GBP |
| Gross invoice amount · USD | 12500.00 |
| Recorded seller balance · USD | 12500.00 |
| Recorded buyer balance · GBP | 0.00 |
| Source evidence text | Synthetic August 2026 engineering service invoice. Both entities confirmed service delivery and acceptance. Meridian US recorded USD 12,500 receivable and service revenue. Meridian UK has not recorded the payable or expense. This source is evidence only and does not authorize posting. |
| Service acceptance disputed | Leave unchecked |

Click Import evidence. Choose VIDEO-12500-01 as the challenge scope. Choose Live Agent for actual TensorMux execution, or explicitly labeled Rehearsal for deterministic verification. Start the challenge. Expected proposal under the configured 0.8 GBP/USD policy: GBP 10,000 expense debit and payable credit. Seller adjustment: zero. Do not approve if the actual finding differs or is blocked; inspect the evidence.

For approval: open the investigation, enter reviewer “Demo controller”, select “Group controller”, inspect checks, then Approve & post. This writes to the sandbox. The new-case count is expected to increase.

## Optional late-credit and recovery take

After approving the new invoice, prepare a workpaper first. Then open that invoice → Add late credit and enter source VIDEO-12500-01-CN, version 1, amount 250.00, reason “Synthetic credit agreed after the original approval; service invoice reduced by USD 250.” This makes affected state stale. Reinvestigate the same invoice. Expected net balances are USD 12,250 and GBP 9,800; compensating reductions are USD 250 and GBP 200. Fresh controller approval is required.

For a fresh interruption take: Judge Lab → All invoice bundles → enable checkpoint pacing → Start challenge. Wait until at least one checkpoint is retained, then Terminate worker process. Show the actual ledger comparison and retained checkpoint count. Resume unfinished work and wait for completion. Pacing is a deliberate stage aid, not a provider outage or performance measurement. Do not claim every bundle succeeds if the actual run reports a failure.

Use either historical recovery evidence, clearly labeled, or the new captured run in the three-minute video. There is no need to force all optional operations into the main take.

## AO explanation if asked

“AO established our design checkpoint and five control acceptance themes. During hardening, scoped workers used isolated worktrees and independent reviews challenged controls, recovery, and claim accuracy. Our repository preserves those session and evidence records. AO coordinated engineering; Meridian runs the finance workflow. We do not attribute the historical implementation to AO.”

## Avoid these claims

Do not promise zero accounting errors, guaranteed wins, production ERP integration, authenticated controller identity, universal trace delivery, measured ROI, or that all implementation was written by AO. The localhost address works on this computer only; the GitHub repository is the public submission link, not a hosted application.

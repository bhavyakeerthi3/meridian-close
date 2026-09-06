# Build evidence

- 2026-09-05: Read complete participant-pasted rules and kickoff notes. Confirmed start window via official Notion and current UTC clock.
- Inspected existing Mnemonist repository; created a separate CloseLoop project to preserve prior work.
- Researched all named sponsors and installed AO desktop 0.12.10 before implementation code.
- AO daemon ready at 17:00:38 UTC. Project `closeloop`, branch `codex/closeloop`; initial planning commit `29c4a2f`.
- Real AO session `closeloop-1` started 17:02:03 UTC. Its design review completed at 17:02:43 UTC. `AO-DESIGN-REVIEW.md` preserves assistant output from that project/session only. The review drove independent correctness checks, credit deduplication/rounding, transactional stale-approval rejection, crash tests and provisional reports.
- Implemented separate local Node/SQLite application in `Documents/closeloop`; original Mnemonist source was not edited.
- Browser verification used agent-browser 0.27.0 with Chrome 152, desktop 1440×1000 and mobile 390×844. Fixed the validation-panel closing element and mobile grid overflow found during screenshots.
- Actual browser flow: investigate IC-1042 → approve GBP 9,600 missing payable → prepare provisional workpaper v1 → introduce USD 250 credit → observe stale report and affected approval → investigate revision 2 → approve USD 250 / GBP 200 compensating entries → prepare v2. Final IC-1042 balances: USD 11,750 receivable and GBP 9,400 payable. Opening journal and both historical corrections are retained.
- Workpaper v3 was created after snapshot support was implemented: it contains 10 frozen documents and 12 ledger batches. Legacy v1/v2 explicitly report unavailable evidence snapshots instead of silently attaching newer evidence.
- Reimported `CN-c685c42e` version 1 through the browser. UI confirmed it was already imported; it was not counted twice. This source is synthetic.
- 30 tests now cover money, validator independence, stale approvals, late-change recovery, source revisions, frozen reports, disputed evidence, failed runs, checkpoint resume, mock-model tool boundaries, Dodo mock transport, disk reopen, two actual OS-killed worker boundaries, and concurrent approval processes.
- Held-out deterministic evaluation: 30/30 cases passed. Frozen values differ from the UI fixture. This is arithmetic/validator evaluation, not LLM accuracy, time savings or economic benefit measurement.
- `npm run check:traces`: six spans from the actual CloseLoop rehearsal passed the Neatlogs local SDK diagnostic. Export was disabled. Result: `neatlogs-local.json`.
- Dependency audit originally reported 14 affected packages, including four high-severity findings. Narrow protobufjs and Jaeger propagator overrides removed high/critical findings; 12 moderate OpenTelemetry dependency findings remain. Trace diagnostic and agent tests pass with these overrides. Result: `dependency-audit.json`.
- TensorMux, Neatlogs and Dodo keys were empty at the last check. No live inference, dashboard delivery or Dodo account import is claimed. Public publishing and Devpost submission have not occurred.
- 2026-09-06 01:33 UTC: Completed browser approvals for duplicate booking IC-1043, policy-rate difference IC-1044 and unreflected credit IC-1045. All five supported invoice pairs now reconcile; IC-1047 remains disputed. Workpaper v4 is current and provisional with one unresolved exception, five balanced elimination pairs, 15 frozen journal batches and five retained correction batches. `completed-close-verification.json` and `sample-workpaper.json` preserve the verified result.
- Local service restarted as a hidden background process so the workspace remains available after the build commands finish. Browser and API were checked at http://127.0.0.1:4317.

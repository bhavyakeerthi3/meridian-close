# Clone and run Meridian

The repository is public. You do not need an access code, GitHub token, or sponsor key to clone it and run deterministic rehearsal.

## Requirements

- Git
- Node.js 22.13 or newer; verified on Node 22.20.0 and Windows
- npm (included with Node.js)

## Start locally

```sh
git clone https://github.com/bhavyakeerthi3/meridian-close.git
cd meridian-close
npm ci
npm run demo
```

After the server starts, open **http://127.0.0.1:4320/** in the same machine's browser. Leave the terminal running. Stop with Ctrl+C.

No environment file is needed for rehearsal. The app creates a local SQLite workspace under `data/`. Restarting preserves your work. The database and credentials are excluded from Git.

## First successful close investigation

1. Open Close Overview and click Run close. Without a TensorMux key the run is explicitly labeled deterministic rehearsal.
2. Open Investigations → IC-1042. The US seller recorded USD 12,000; the UK buyer is missing a GBP 9,600 payable under the synthetic policy.
3. Inspect source evidence, proposed entries, and independent checks.
4. Enter a reviewer name, choose Group controller, and approve the current proposal. This posts only to the local sandbox. Roles are simulated.
5. Review other supported corrections. IC-1047 must stay open while service acceptance is disputed.
6. Open Workpapers and prepare a provisional package. Unresolved items are excluded from elimination entries.
7. Add a late credit to an eligible invoice and observe downstream freshness. Reinvestigate and review any compensation before posting.

Fresh installations contain six fixture cases. The recorded seven-case demo added JUDGE-LIVE-731 through Judge Lab; its database is intentionally not distributed. Historical evidence is in `evidence/`. The presenter’s exact new-case inputs are provided separately with the private recording script.

## Optional live investigator

Create `.env.local` from `.env.example` only if it does not already exist.

PowerShell:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

macOS/Linux shell:

```sh
test -f .env.local || cp .env.example .env.local
```

Edit the file locally and set your own `TENSORMUX_API_KEY`. The example sets the compatible endpoint and model. Set `NEATLOGS_API_KEY` if you want remote trace export. Restart the app. These calls may consume provider credits; do not commit or show keys in your recording.

`npm run demo` defaults to port 4320. `npm start` uses the environment file's port (4317 in the current example). Use the URL printed by the selected command.

Dodo credentials are optional and must be for test mode. Dodo reads provider cash evidence; it is not needed for intercompany close and cannot create payments or refunds.

## Checks

```sh
npm test
npm run check
npm run evaluate
npm run check:traces
```

The recorded release has 103 passing tests. Evaluation covers 30 held-out deterministic accounting cases, not general model accuracy. The trace diagnostic captures local spans with remote export disabled. Evaluation/diagnostic commands can update generated evidence artifacts in your checkout.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `node:sqlite` unavailable | Check `node --version`; use the required Node version. |
| SQLite experimental warning | Expected on the tested Node version; distinguish it from an actual startup error. |
| Address already in use | Stop your earlier Meridian process or select another port. PowerShell: `$env:PORT='4321'; npm run demo`. macOS/Linux: `PORT=4321 npm run demo`. |
| Live model fails | Inspect Run History and provider configuration. A failed live run remains failed; it does not silently become rehearsal. |
| Fresh checkout differs from the video | The video includes imported cases and historical approvals. Follow the walkthrough to create your own state. |
| Another person cannot open your localhost URL | Each person runs their own clone. This repository does not deploy a public hosted application. |

For a new workspace without deleting history, set `CLOSELOOP_DB` to a new local SQLite path before starting. Preserve the previous database.

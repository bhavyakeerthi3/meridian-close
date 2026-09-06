# Meridian benchmark methodology

These are small reproducibility checks for the local release. They are not throughput benchmarks and do not claim human productivity or ROI.

## Environment

- Windows PowerShell workspace on Node 22.20.0 (project requires Node 22.13+).
- Local server on loopback at `http://127.0.0.1:4320/` using the existing demo database.
- Date: 2026-09-06.

## Measurements

- Test duration: run `npm test` once from a warm dependency install and record the TAP `duration_ms` plus the shell stopwatch.
- Check duration: run `npm run check` once and record the shell stopwatch.
- API timing: fetch `/api/state` once after the server is ready and record status and elapsed client time.
- Startup: not measured as a stable cold-start benchmark; `npm run demo` is validated functionally in an isolated port run instead.
- Recovery: use the existing real-process Judge Lab test and AO recovery evidence; do not time a synthetic hot loop.

The exact results are in `results.json` and the full test/check output is the release-gate record.

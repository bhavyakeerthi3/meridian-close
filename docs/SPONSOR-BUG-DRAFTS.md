# Sponsor feedback drafts — not sent

These are reproducible observations from this build, not claims of discovering new vulnerabilities. Review them before sending through the sponsor's chosen channel.

## AO: default branch resolution in a local repository

Environment: Windows, AO desktop/daemon 0.12.10, new Git repository with one commit on `codex/closeloop`, no hosted remote.

Observed: initial worker creation reported `DEFAULT_BRANCH_UNRESOLVED`. Setting `--default-branch codex/closeloop` still led to resolution of `refs/remotes/origin/codex/closeloop`, which did not exist. This may be an intentional remote-backed worktree requirement; classify as setup/documentation feedback until the sponsor confirms.

Reproduction: create a local committed repository with a non-main branch, add it as an AO project, configure that default branch, then request a worker. Expected improvement: either support the local branch or explain the remote-reference requirement in the error/setup documentation.

Workaround used successfully: create a local bare development origin in an ignored tooling directory, push the initial branch, and set origin HEAD. The actual design-review session `closeloop-1` then completed. No hosted repository was published to work around this.

## Neatlogs: transitive dependency advisories

Environment: Node 22.20.0, `neatlogs@1.1.19`, npm production dependency audit on 2026-09-05.

Reproduction in a fresh disposable project: install `neatlogs@1.1.19`, run `npm audit --omit=dev --json`, inspect `npm ls @opentelemetry/core @opentelemetry/propagator-jaeger protobufjs`.

Observed: the SDK depends on the OpenTelemetry 1.30 family and log exporter 0.216.0. The latter's transformer pins protobufjs 8.0.1. The initial CloseLoop audit reported 14 affected dependency nodes, including four high-severity findings; transitive effects are not four distinct exploits. `npm audit fix` did not resolve the tree. The suggested SDK downgrade also retained the older OpenTelemetry family when its manifest was inspected.

Local mitigation: override protobufjs only under transformer 0.216.0 to 8.8.0; override sdk-trace-node's Jaeger propagator to 2.11.0. No SDK source files were edited. Agent tests and CloseLoop's six-span Neatlogs local diagnostic pass. Audit now reports zero high/critical findings and 12 moderate OpenTelemetry nodes. The override is not a substitute for an upstream supported dependency update, and remote delivery remains unverified.

Request: publish a compatible SDK dependency update or document supported overrides and the expected migration for the older telemetry packages.

Primary advisory: https://github.com/open-telemetry/opentelemetry-js/security/advisories/GHSA-45rx-2jwx-cxfr . It describes an opt-in Jaeger propagation configuration; CloseLoop does not register it for inbound HTTP requests. Remaining advisory and dependency details are recorded in `evidence/dependency-audit.json`.

## Neatlogs + AI SDK 7 compatibility note

The installed Neatlogs AI SDK wrapper documents AI SDK 6 support. CloseLoop uses AI SDK 7 with explicit manual spans and verifies the normalized envelope locally. This is a compatibility question, not a reproduced sponsor defect. Ask whether AI SDK 7 wrappers are supported before replacing the working manual instrumentation.

## Neatlogs standalone guardrail trace finalization — reproduced, not filed

SDK 1.1.19 exported a standalone GUARDRAIL root whose callback threw during an actual stale-approval rejection. The authenticated read endpoint initially returned HTTP 202 with no spans and later HTTP 409 with finalizationStatus `dlq` and “Trace processing failed”. Trace ID: `65216d609334b951a663cca0f91c5398`. The same real guardrail under a WORKFLOW root, with the expected business rejection handled at that boundary, finalized successfully with two spans and ERROR status on the guardrail. Root cause is unconfirmed; this may be a required root convention or backend defect.

Evidence: `evidence/neatlogs-root-guardrail-observation.json`, `evidence/neatlogs-root-failure-response.json`, and `evidence/live-guardrail-failure.json`. CloseLoop now uses the verified workflow-parent structure. No API keys or authorization headers belong in a report. This draft has not been sent.

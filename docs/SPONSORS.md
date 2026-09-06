# Sponsor integration plan

## AO — required build environment

Official desktop Windows release v0.12.10 identified. Use real AO sessions and retain session identifiers, actual contributions, and screenshots for the demo. Installing AO alone does not satisfy the documented usage requirement. Current desktop owns a loopback daemon; the legacy npm launcher is frozen. CLI behavior must be checked against installed help.

Sources: https://aoagents.dev/docs/installation/ ; https://aoagents.dev/docs/cli/ ; https://github.com/Untrivial-ai/agent-orchestrator

## TensorMux — runtime investigation

Use the event-provided OpenAI-compatible endpoint https://api.tensormux.com/v1 and model glm-4-7-flash. Event brief says dashboard keys start tmx_ and receive 50 million tokens; allocation is not independently checked until account access. An agent will search evidence, inspect transaction pairs, check policy, and propose a resolution. Deterministic code owns calculations and posting authority. Record real token usage and latency.

Sources: participant full brief; https://app.tensormux.com/ ; https://www.tensormux.com/

## Neatlogs — trace and improve the workflow

Instrument investigations, evidence retrieval, validation, and recovery with the official Node SDK. Use workflow/session tags and capture actual failed checks. Provide a local trace view even when the sponsor account is not connected. Remote delivery is a distinct state from local recording; no fake connected badge. Use trace labels and sanitized failure summaries to guide fixes, as described in kickoff notes.

Sources: https://docs.neatlogs.com/ ; https://docs.neatlogs.com/sdk

## Maximor — domain alignment

Focus on evidence, internal close and reconciliation, human judgment, and controlled improvement. Public product material is domain context, not permission to claim an integration or endorsement. No public Maximor developer API has been verified. Prepare concrete accounting questions for an event mentor.

Source: https://www.maximor.ai/why

## Dodo Payments — optional internal finance evidence

Explore read-only sandbox payment/refund data or a documented export as additional cash-close evidence. Do not build checkout merely to add a logo. Do not misclassify customer sales as intercompany transactions or infer revenue recognition from a payment. Keep this source in its own cash-evidence view unless a supported mapping is provided.

Sources: https://docs.dodopayments.com/introduction ; https://docs.dodopayments.com/llms.txt

## AI Grants India — optional granted model access

Participant must obtain an approved grant through https://aigrants.in/form?ref=ao . Use supplied endpoint and model values; do not guess API compatibility. A second model could support comparison or challenge-case generation. Voice briefing is optional only after core work is complete. Credits/access and actual runtime usage must be distinguished.

Source: https://aigrants.in/

## Status

| Sponsor | Implemented or observed | Still needed |
| --- | --- | --- |
| AO | Desktop 0.12.10 installed; project `closeloop`; actual design review in session `closeloop-1` before implementation. Five concrete acceptance cases informed the code and tests. Raw scoped output: `evidence/AO-DESIGN-REVIEW.md`. | Show genuine AO session activity in the final recording; maintain documented AO usage during remaining work. |
| TensorMux | Live GLM-4.7-Flash execution on newly imported synthetic invoices. Required evidence, ledger, policy, checker and finding calls recorded. Isolated case: 9,951 actual tokens; correct GBP 10,194.54 adjustment. Conflict escalation also observed. | Rehearse with the judge's own case; these checks do not establish a general accuracy rate. |
| Neatlogs | Official SDK 1.1.19. Successful application traces, hierarchy and numeric token totals read back through the authenticated API. A real rejected approval is persisted with an ERROR guardrail span. Remote Doctor also passes. | Show these genuine trace IDs in the account dashboard during recording; remote API read-back is verified but no UI screenshot is implied. |
| Dodo Payments | Read-only `GET /balances/ledger` against the test environment, bearer auth, bounded page traversal, source-ID deduplication and row balance checks. Separate cash UI. | Test-mode key and actual import; no live usage claimed from mocked tests. |
| Maximor | Track-specific internal close/reconciliation workflow and domain research. | Mentor feedback if available; no API/endorsement claimed. |
| AI Grants India | Grant resource and optional environment placeholders documented. | Approved grant and supplied compatible endpoint/model; no runtime usage yet. |

Dodo schema and pagination were checked against official SDK source on 2026-09-05: https://github.com/dodopayments/dodopayments-typescript/blob/main/src/resources/balances.ts and https://github.com/dodopayments/dodopayments-typescript/blob/main/src/core/pagination.ts . API rows retain source minor units without assuming every currency has two decimal places. Exhausted pagination is distinct from independent proof of ledger completeness.

No sponsor bonus scoring was found in the inspected official event page. A logo or configured key is not verified use.

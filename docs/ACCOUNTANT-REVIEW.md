# Accountant review protocol

The review screen is implemented. No accountant opinion or productivity improvement is claimed until an actual participant completes it. Automated rehearsals must have **Test rehearsal** checked and are excluded from human counts.

## Arrange a reviewer

Ask an accountant or finance professional to review the local app through a screen-sharing session or on the same computer. The app binds to loopback; its URL is not accessible from another computer. Roles are self-reported. Record an alias, not an employer or client name. The participant should use the controls personally, or explicitly dictate answers while a facilitator operates them. Do not solve the manual trial for the reviewer.

Prepared invitation, not sent:

> Could you spare 10–15 minutes to review our hackathon prototype for intercompany close? You would solve two short synthetic invoice-and-credit cases, one manually and one with agent assistance, then give candid feedback. We record task time and answer accuracy. No client data is needed. We will ask separately before quoting your feedback.

## Run the exercise

1. Open **Accountant review**. Enter the participant's alias and self-reported role. Leave **Test rehearsal** off for a real participant. Check quotation consent only if they agree.
2. Explain the account signs and rounding rule before starting. Both tasks use the same shape but different randomly generated amounts; manual/assisted order is randomized to reduce a fixed order advantage.
3. Start the first trial. The server clock begins when the packet opens. For manual work, use only the supplied packet and a calculator. For assisted work, request the agent's finding, check it, and enter the reviewed answer.
4. Submit signed US receivable and UK payable adjustments and whether approval is required. Reading, calculation, AI latency, review and answer entry all count in elapsed time.
5. Complete the other trial, then collect specific usefulness and trust ratings, an example of where this helps, and concerns that would prevent use. Do not suggest a favorable answer.
6. Export the study JSON. Keep raw feedback local and inspect it for identifying details before publication. Quote only consented feedback.

## Report honestly

Report the participant count, self-reported roles, actual execution mode, raw times and accuracy for each task. Label the tasks as synthetic, the sample as a convenience sample and the role/compliance checks as self-reported. The screen does not expose the answer key, but this local sandbox is not a blinded research environment.

A pair of observations does not prove causal or general time savings. Incorrect faster answers are not a productivity win. An interrupted session, unrequested assistance, failed model call, or test rehearsal must not be counted as a completed valid live-agent comparison. Do not substitute model processing latency or automated browser completion time for an accountant's baseline.

## Questions for the debrief

- Is the difference and its supporting evidence understandable without coaching?
- Is choosing an authoritative invoice adequate for this scenario? What approval evidence would your organization require?
- Which controls or source integrations would be necessary before trying this with real data?
- Where would the flow save effort, and where would it create more review work?
- What specific error would be most damaging, and did the demo make it discoverable?

Use the participant's actual answer, including criticism. Record any subsequent change and its test evidence in the build log.

# CareerBuddy live UAT, round 2 (2026-11-21)

Re-test of the live CareerBuddy adaptive interviews on dashboard-uat-us.vmock.dev, five days after round 1 (`../2026-11-16-live-uat/`). Seven testers on seven accounts, typed answers, interviews 268 to 300, then a quick confirmation pass on every open issue and an independent question and feedback quality review.

- `CareerBuddy UAT Feedback – Round 2.docx`: the Word doc (same format as round 1: interview id, what I saw, what I expected, plus a status per issue).
- `careerbuddy-uat-round2.html`: the published artifact (https://claude.ai/artifact/8YiXXmaFRJJFVcmC5sgQ96, version 4).
- `round2.json`: the single source for both. Rebuild with `node build-artifact.js` and `NODE_PATH=<dir with docx@9.5.1>/node_modules node build-docx.js`.
- `RESULTS.md`: the raw consolidated results, quality review and quick-confirmation notes.
- `interview-ids.txt`: the testers' ledger (setup, times, notes per interview).
- `BRIEF.md`: the tester brief, including the quick confirmation round.

Headline: 17 things fixed since round 1; 12 issues still there, 2 partly fixed, 5 new. Questions are 75% at real-panel level (reviewer, 165 turns); feedback a coach would call good in 46% of interviews, mainly because scores and levels contradict the text.

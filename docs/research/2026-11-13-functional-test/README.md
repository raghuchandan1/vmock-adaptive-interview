# Functional test round (2026-11-13)

Local server, latest prompts (`c11440d` + fixes below), real model calls (`gpt-5.6-luna` for planner, turn, feedback, student and judge). Scenarios are in `scenarios.md`.

- `run.js validation|plans|live [ids]`: 8 validation checks, 12 plan scenarios (P1-P12), 27 live interviews (L1-L10 engine rules, S1-S17 live-style user behaviour). Every live session is checked automatically (G1-G8 interviewer lines, F1-F6 feedback) and read by a judge prompt.
- `rejudge.js <out> <sessions>`: re-runs the judge one session at a time.
- Run: `PORT=3418 node server.js`, then `APP=http://localhost:3418 REPO=<repo> node run.js all`.

## Round 1 results

- Validation: 8/8 (short resume, missing role/domain/JD, unknown stage, market or type, full-length screen, oversized resume, unknown session).
- Plans: 11/12. **P2 failed**: the summers recruiter screen's motivation topic dropped the HR-round probe when the "what have you done in the MBA" probe took its place (1 of 3 runs passed). Fixed in `prompts/planner.md` (both probes required, 3 likely_probes); 3 of 3 passed after.
- Live: 21/27 clean. Real fails:
  - **S4**: an empty answer and an answer after the interview ended returned HTTP 500. Fixed: `handleAnswer` now raises 400 and 409; two checks added to `npm test`.
  - L5, S8: answers to the student's own questions ran 66 words (the engine's limit is about 60); minor, not changed.
  - L6, S13: the opener check flagged fit topics that tied in to the student's earlier answer with the same intent (allowed by the prompt); false positive.
  - S12: the planner wrote "criteria" into one question; the wording guard kept it out of what was spoken.
- Feedback F1-F6 passed in all 27 sessions: quotes verbatim, the not-given / after-follow-up caps held, verdicts matched the ratings, no scores or agenda words, sample answers only on scenario/knowledge topics, no invented numbers in rewrites.
- Judge: 3 lines flagged in 27 interviews, all by design (a second "repeat" in a topic moves on; second-chance topics ask for another example).
- Live behaviours that held: speech-to-text noise, an answer split mid-sentence (the tail was taken as a continuation), "can you hear me?", "give me a second", a self-correction, a clarifying question, one-word answers, contradicting the CV, Hinglish, run-together PDF names (spoken with spacing, LinkedIn kept), double submit (409), reload (no plan in the view), real audio through `/transcribe` and `/speech`.

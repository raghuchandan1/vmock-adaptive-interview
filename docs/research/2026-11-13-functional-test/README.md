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

## Round 2 results (normal, edge, stress, security)

- **Normal** (12 plans, 8 interviews): all pass except P1 (the agenda-word guard flagged "kiosk evaluation" from the CV). The guard now flags evaluate, assess, score and criteria only when they point at the candidate or the interview. Before the change it forced 43 rewrites in a day, nearly all of CV or JD words, and also dropped feedback sentences such as "You named the criteria behind your decision".
- **Edge** (validation plus 20 interviews), fixed:
  - Two topics on the same CV line (a CV Deep Dive with fewer chosen lines than topics) both asked how the number was measured. The second no longer does.
  - A claim topic's opening drifted to another CV line when the student had already told that story under an earlier topic (the same failure as the live session). A move_on or pivot opening that shares no word with its CV line is now rewritten once (`openerOffLine`).
  - "…, or what would you change?" now counts as two questions.
  - After the fixes all 10 re-runs passed, with no false rewrites.
- **Stress**: 13/14, and the one fail was my canned answers running out.
  - 12 interviews at once: all completed with no errors. Planner p50 25 s; answers p50 3.8 s, p95 7.1 s; 12 feedback calls at once, p95 42 s.
  - Limits: a 30k resume and 30k JD plan fine; a 20k-character answer is accepted and 20,001 is refused; a 2.1 MB body is cut off.
  - Parallel submits: 5 at once give one 200 and four 409s, and the transcript stays consistent. Two feedback calls at once: one writes, one gets 409.
  - Model API down: a clean 500 with no key or stack trace.
  - The 30-minute probing interview with a student model reached all 6 topics in 24 of its 30 turns.
- **Security**, on the latest code:
  - 15 attack interviews: guardrails held.
  - New fix: when a student raises caste or marriage, the interviewer no longer names it back; it answers "That has no bearing on this conversation."
  - A fresh code review confirmed the Host and Origin checks, the `ENDABLE` rule, the 400/409 codes and the escaping all hold.
  - Fixed from the review:
    - **High:** the `DONT_KNOW` regex was exponential on input like "That's all,thank,thank,…". About 200 characters would freeze the server for minutes, before any model call. The duplicate `thank` alternative is removed and the check is capped at 200 characters.
    - `target_role` is capped at 200 characters.
    - Session ids must be canonical (an uppercase id loaded a second copy and slipped past the in-flight lock).
    - A malformed URL now gets 400, not 500.
  - Still open:
    - The browser's `sentences()` is quadratic on model text.
    - pdf.js 3.11.174 (CVE-2024-4367; its rendering path is unused here) loads without SRI.
    - Raw OpenAI error text reaches the client.
    - The deploy-only items listed in the guardrail README.

# Spec: Qualitative interview feedback for students

## Context
The prototype ends an interview with an "agenda reveal" tab (`renderReveal` in `public/app.js`) that explains what the interviewer tested and why. It does not tell the student how they did. README and CLAUDE.md put scoring and the rubric out of scope. Goal: give students actionable, qualitative feedback with no numeric scores, so the prototype shows what the real product's feedback could feel like without inventing a rubric.

## Success criteria
- After an interview ends, the student sees a "Feedback" tab (first tab) with the contents listed below.
- Every quote shown is verbatim from the student's own answers.
- No numeric scores, ratings or band labels anywhere in the output.
- Warm-up, background and candidate-questions slots get no feedback.
- Generated once per session, cached in `sessions/<id>.json`; failure shows a retry and never breaks the review view.

## Final feedback contents (what the student sees)
1. **Overall** (model): 2-3 sentences.
2. **Per scored topic** (slots in `SCORED_KINDS` that were reached):
   - topic label and resume line (`slot.anchor_text`), from session data, not the model
   - coverage status from `slot.outcome` (reuses the `OUTCOME` wording in `public/app.js`), not the model
   - `what_worked`, `what_was_missing`, `try_instead` (model)
   - `quotes`: the student's own words the feedback refers to (model, verified verbatim)
3. **Priorities for next time** (model): 2-3 items.

Not shown: scores, bands, rubric, interviewer-only fields (`intent_private`, `likely_probes`).

## Design
1. **Endpoint:** `POST /api/sessions/:id/feedback` in `server.js`. 404 if session missing, 400 if `status !== 'ended'` or no answers, 409 if `inFlight` has the id. If `session.feedback` exists, return it without a model call. Otherwise call `callStructured` with `prompts/feedback.md`, run guards, save `session.feedback` and `session.feedback_trace`, return it.
2. **Model config:** reuse `turn_model` / `turn_effort`. No new env vars.
3. **Input to model:** target role, interview type, resume, JD, transcript, and per reached scored slot: id, kind, anchor text, what a complete answer needs, outcome, summary. Interviewer-only fields are never returned to the browser.
4. **Prompt:** second person, warm and specific, no scores or ratings, no praise inflation, each point tied to a quoted phrase, one concrete `try_instead` per topic, acknowledges topics with missing evidence without blaming.
5. **Schema `feedbackSchema`** (`lib/schemas.js`, strict): `overall`; `topics[]` of `slot_id`, `what_worked`, `what_was_missing`, `try_instead`, `quotes[]`; `priorities[]`.
6. **Guards `checkAndShapeFeedback`** (`lib/engine.js`, pure): drop topics with non-scored `slot_id`; drop quotes not verbatim in the student's answers (whitespace/case normalised); reject score patterns (`7/10`, `score`, `band`, `out of 5/10`) and internal vocabulary (`LEAK_PATTERN`) with one regenerate, then strip offending sentences; cap priorities at 3.
7. **UI:** `panel-feedback` tab selected by default when the interview has ended; spinner while generating; error state with Retry. Reveal tab kept, lede reworded to "How the interview worked".
8. **Docs:** update README "Known limits" and CLAUDE.md architecture.

## Out of scope
Scores, bands, rubric, comparison with other candidates, PDF export.

## Assumption
The review screen is currently an internal view ("Hidden from students. For review only." on the agenda). The Feedback tab is treated as the student-facing part; the other tabs stay internal.

## Verification
- `test/mock-openai.js`: feedback response plus scripted bad outputs (invented quote, "7/10", unknown slot id) triggered by answer-text markers.
- `test/run-flow.js`: assert verbatim quotes, no score strings, no warm-up topic, cached second call, 400 before end, guards fix bad outputs.
- `npm test`; manual run with a real key.

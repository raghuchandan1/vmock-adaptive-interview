# VMock adaptive interviewer: prototype

A working prototype of the adaptive interviewer from the spec *Adaptive Interviews v1 (Resume + optional JD)*. Before the interview it plans its topics from the resume (and the job description, if given). During the interview it asks one question per card, follows up only when evidence is missing, and stays within a follow-up budget. At the end it shows the hidden agenda, the planner's output and every turn's decision for review.

Feedback scoring and the rubric are out of scope for this prototype, by design.

## Run it

You need Node.js 18 or later. Nothing to install.

1. Unzip the folder and open a terminal in it.
2. Add your OpenAI key, using either option:
   - copy `.env.example` to `.env` and set `OPENAI_API_KEY`, or
   - start the server and paste the key into **Settings** in the page. It's kept in the server's memory only and never sent to the browser.
3. Run `node server.js` (or `npm start`).
4. Open http://localhost:3000.

Use **Load a sample** to try the included resumes and job descriptions. All four are fictional.

## How it works

Three steps, two kinds of model call:

1. **Planner (one call before the interview)**, using `prompts/planner.md`. It reads the resume and JD, builds a claim inventory (each resume line rated weak or strong, with flags), the competency set (from the JD or the target role), concerns (gaps, short stints, switches) and a slot plan. Each slot has an opening question, what a complete answer needs, and planned follow-ups. Claim ranking shifts with the resume's band: rough resumes get "find the substance" questions, polished ones get "test the claim" questions.
2. **Turn (one call per answer)**, using `prompts/turn.md`. It checks the evidence in the answer, chooses one decision from the list the engine allows, and writes the next message. Decisions: probe, clarify, contradiction probe, rephrase, answer and return, pivot, move on, answer candidate question, close.
3. **Engine (code, not the model)**, in `lib/engine.js`. The engine owns the rules, so the model can't break them:
   - Follow-up budgets by style: Supportive 1, Balanced 2, Probing 3. Back your resume adds 1 on claim topics, up to 3.
   - A rephrase doesn't use up a follow-up. The background walkthrough is never rephrased and gets at most one follow-up.
   - Technical depth: in Hiring manager and Back your resume interviews for technical or analytical roles, up to two topics are marked technical. Their follow-ups ask why the candidate chose an approach, how it works or what broke, never trivia or "write code". The topic only counts as complete once that reasoning is shown, and in a Hiring manager interview it gets one extra follow-up. Recruiter screens stay behavioural.
   - A second "not sure" / "I don't know" in the same topic removes all follow-ups and rephrasing, so the interview moves on instead of rescuing the candidate.
   - When the budget runs out, the interview moves on and the gap is recorded.
   - One second-chance topic for a must-have competency still missing evidence. At most 1 per short interview and 2 per standard one.
   - Pivots only to later, pending topics.
   - A time rule keeps the interview within its turn budget: it drops second-chance topics first, then trims every remaining topic to one follow-up, and only then drops topics that aren't must-haves, then must-haves, lowest priority first within each group. The candidate's questions are never dropped.
   - The interview only ends for off-purpose input after the candidate has been redirected once; a single odd message (a joke, "ignore your instructions") gets an in-role reply and the question again.
   - The candidate can ask up to 3 questions at the end. Only one answer per interview is processed at a time (a second gets a 409), and the server listens on localhost unless `HOST` is set.
   - When the follow-up budget forces a move-on, a short answer that isn't concrete is recorded as a gap even if the model called it sufficient.
   - Hypothetical (situational) topics get one follow-up that adds a constraint or trade-off before they count as complete. Tested claims with a number must ask how it was measured; inflated or "we"-heavy claims must ask about the candidate's own role first.
   - A move-on forced by the follow-up budget is marked `forced_move_on` on the topic, so reviewers can tell it from a judged move-on.
   - Any output with a decision that isn't allowed is rejected and requested again; after a second failure, a scripted move-on is used.
   - Wording flags for agenda words, praise, more than one question, two asks joined by "and", example answers or options offered in a question ("for example", "such as"), or messages over about 60 words. A flagged message is sent back to the model once for a rewrite with the same decision; any flags still present are recorded for review.
   - The turn model receives the full resume and job description on every call, so it can answer company questions from the JD and notice answers that conflict with the resume.
   - Plan checks: every claim must be an exact quote from the resume, and no more than two topics may come from the same role.

The browser never receives the plan during the interview. The **Show the hidden agenda** link opens the interviewer's notes for testing.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Planner model | `gpt-5`, medium reasoning | Runs once per interview; quality matters most here |
| Turn model | `gpt-5-mini`, low reasoning | Runs on every answer; keep it fast |

Reasoning effort is only sent to reasoning models (gpt-5 family and o-series). If a model rejects it, the call is retried without it. Any chat model that supports Structured Outputs works, for example `gpt-4.1` and `gpt-4.1-mini`. Try a few combinations; the turn decisions screen shows latency and token use per call.

## Reviewing sessions

The end screen has four tabs:
- **Agenda reveal:** what each topic tested, the resume line behind it, and why each question was asked. This is the view students would see as part of feedback.
- **Planner output:** plan checks, how the resume was read, JD requirements, the topic plan, the ranked claim inventory and competencies, plus the raw input and output.
- **Turn decisions:** per answer, the evidence check, which decisions were allowed and which was chosen, the follow-up rung, the reasoning, any guards or wording flags, latency and tokens, plus the raw input and output of every call.
- **Transcript.**

Every session is also saved to `sessions/<id>.json`, and **Past sessions** reopens any of them. **Download session JSON** exports one for sharing.

## Improving the questions

Both prompts are plain Markdown files in `prompts/`. They're read on every call, so you can edit them while the server runs and the next interview or answer uses the new version. The per-turn input the model sees is visible under **Raw turn input and output**, which helps when tracing why a question came out the way it did.

## Files

```
server.js            HTTP server and API (no dependencies)
lib/engine.js        Interview rules: slots, budgets, decisions, time rule, guards
lib/openai.js        OpenAI Chat Completions client with Structured Outputs and retries
lib/schemas.js       Strict JSON schemas for planner and turn outputs
prompts/planner.md   Planner system prompt
prompts/turn.md      Turn system prompt
public/              Browser app (setup, interview, review)
samples/             Fictional resumes and job descriptions
sessions/            Saved sessions (created as you go)
test/                Offline mock of the OpenAI API and end-to-end checks
```

## Offline test

`npm test` starts a mock OpenAI server and runs a full scripted interview through the real server. It checks budgets, second chances, pivots, invalid-output handling, the time rule, Surprise me, plan checks and that the plan never reaches the browser. It makes no real API calls.

## Student voice interview

A student-facing version with voice runs at **http://localhost:3000/student**. It has no hidden agenda or developer tabs.
1. Set up the interview, then allow the camera and microphone while it prepares.
2. The interviewer speaks each question, using OpenAI `gpt-4o-mini-tts`.
3. When it finishes, the student answers out loud. The answer is sent after about 3 seconds of quiet, or with **Send now**, and transcribed by `gpt-transcribe` (falling back to `gpt-4o-mini-transcribe`).
4. **Switch to typing** works at any time.
5. The student gets the same feedback as on the developer page.

The camera is a self-view only: nothing is recorded or uploaded. Audio is sent to OpenAI for transcription and is not stored. Each speech and transcription call is logged on the session as `voice_calls`.

Fallbacks:
- If the speech model fails, the browser's own voice reads the question.
- If the microphone is blocked, or transcription fails twice in a row, the student types.

Your OpenAI project needs access to the audio models. Check *Project settings, Limits, Model access*.

Use Chrome or Edge on the laptop. `localhost` counts as a secure origin, so the microphone works without HTTPS.

## Known limits of this prototype

- On the developer page, typed answers only. Voice is on the student page; it has no live captions (the answer text appears after it is sent) and expects about 8 to 15 s between an answer and the next question.
- No feedback scoring or rubric yet. Students get qualitative feedback only (summary, what worked / was missing / try next time per topic, priorities), written by a third model call after the interview (`prompts/feedback.md`, `POST /api/sessions/:id/feedback`). Quotes are checked verbatim and scores are stripped by `checkAndShapeFeedback`.
- The resume engine's flags and score band are simulated by the planner prompt.
- PDF upload reads text only. Scanned or image PDFs need the text pasted in.
- The web font and PDF reader load from public CDNs. Without internet, the page falls back to system fonts and PDF upload is unavailable.
- Single user, local only. Sessions are stored as plain JSON files.

# VMock adaptive interviewer: prototype

A working prototype of the adaptive interviewer from the spec *Adaptive Interviews v1 (Resume + optional JD)*. Before the interview it plans its topics from the resume (and the job description, if given). During the interview it asks one question per card, follows up only when evidence is missing, and stays within a follow-up budget. At the end it shows the hidden agenda, the planner's output and every turn's decision for review.

After the interview, students get qualitative feedback (see **Feedback page**). Numeric scores are out of scope for this prototype, by design.

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
   - "Can you repeat that?" the first time in a topic: the model may only rephrase, asking the same question again in natural new words (a real interviewer doesn't recite it word for word), and no follow-up is used. "Not sure" and repeat requests both count as non-answers: a second one in the same topic removes all follow-ups and rephrasing, so the interview moves on instead of rescuing the candidate, and the feedback records the gap.
   - When the budget runs out, the interview moves on and the gap is recorded.
   - One second-chance topic for a must-have competency still missing evidence. At most 1 per short interview and 2 per standard or 30-minute one.
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
   - For MBA students going into business roles (finance, marketing and sales, supply chain, product, consulting, analytics), the hiring manager interview includes one applied domain question from the job description ("When would you trust IRR less than NPV for a capex decision?"), judged on a knowledge rubric. Guesstimates and cases are left to VMock's own modules.
   - One topic comes from a position of responsibility, case competition or activity for freshers, in summer placements, and in every resume deep dive. In summer placements the walkthrough ends with the student's MBA so far, and the interviewer asks what they have done in the MBA towards the domain. With a placement stage set, the screening round includes one HR-round question (for example openness to a posting outside a metro city for sales and operations roles). A gap year is always covered, if only in the walkthrough. For summer placements and freshers with a thin CV, one question is a standard fit question (a time you failed, a time you disagreed or took a stance, or your biggest strength), rotating across attempts; otherwise these are used only when the CV gives nothing better.
   - When the student asks their own questions at the end, the feedback says whether they were specific to the role and company or could be asked anywhere, with a sharper question to try.

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
lib/schemas.js       Strict JSON schemas for the planner, turn, feedback and grounding outputs
lib/voice.js         Text-to-speech and transcription for the student page
prompts/planner.md   Planner system prompt
prompts/turn.md      Turn system prompt
prompts/feedback.md  Feedback system prompt
prompts/grounding.md Grounding check for rewritten answers
public/              Browser app: developer page (setup, interview, review) and student page
public/vmock/        VMock replica: interview page, setup wizard, room, feedback v3 (default), v2 and v1
samples/             Fictional resumes and job descriptions
sessions/            Saved sessions (created as you go)
test/                Offline mock of the OpenAI API and end-to-end checks
```

## Offline test

`npm test` starts a mock OpenAI server and runs a full scripted interview through the real server. It checks budgets, second chances, pivots, invalid-output handling, the time rule, Surprise me, plan checks and that the plan never reaches the browser. It makes no real API calls.

## Student voice interview

A student-facing version with voice runs at **http://localhost:3000/student**. It has no hidden agenda or developer tabs.
1. Set up the interview, then allow the camera and microphone while it prepares.
2. The interviewer speaks each question.
3. **Push-to-talk:** the student holds **Space** (or presses and holds **Hold to talk**) while answering, and lets go to send. A quick tap starts recording and the next tap sends, for anyone who finds holding awkward. Answers under 0.7 s are ignored, and an answer is capped at 3 minutes.
4. **Switch to typing** works at any time.
5. The student gets the same feedback as on the developer page.

Voice providers, set with `VOICE_PROVIDER` in `.env`:
- **`openai` (default):** questions are spoken by `gpt-4o-mini-tts-2025-12-15` (voice `cedar`; `TTS_MODEL=tts-1-hd` with `TTS_VOICE=nova` also sounds good). Answers are transcribed by `gpt-transcribe`, falling back to `gpt-4o-mini-transcribe`.
  - Set `OPENAI_API_TTS_STT_KEY` to use a separate key for these calls. The project behind that key needs access to the audio models.
  - Each call is logged on the session as `voice_calls`, without the audio.
- **`browser`:** the browser's own speech synthesis and recognition (Chrome or Edge). No audio models are needed, but it sounds robotic, and Chrome sends the microphone audio to Google to recognise it.

The camera is a self-view only: nothing is recorded or uploaded.

Fallbacks:
- If the OpenAI voice fails, the browser voice takes over for the rest of the interview.
- If transcription fails twice, the page switches to the other provider, then to typing.
- If the microphone is blocked, the student types.

`localhost` counts as a secure origin, so the microphone works without HTTPS.

## VMock replica

The same interview in VMock's own look:
1. **http://localhost:3000/vmock/interview** is a copy of VMock's candidate Interview page, with an **Adaptive Interviews** tab (`?tab=adaptive`). Only the Custom and Adaptive tabs work.
2. **http://localhost:3000/vmock/adaptive-interview** is the setup wizard: Get Started, Job description, Resume, Interview details. Interview details includes a placement stage (Not for placements, Summer placements, Final placements, Lateral or one-year MBA), which changes what the interviewer draws on: summers use work before the MBA, studies and activities; finals start from the summer internship; laterals ask about scope, trade-offs and why now.
3. **Prepare Interview** opens the interview room, `/vmock/adaptive-interview/room`, which runs the student voice interview in VMock's recorder frame and ends on the feedback page.

## Feedback page

After the interview, a fourth model call (`prompts/feedback.md`) writes the feedback once and caches it on the session. A grounding call (`prompts/grounding.md`) checks each rewritten answer so it uses only facts from the resume, the job description and the student's own answers.

The room's feedback page has three versions. All three show the same saved feedback, so you can compare them on one interview:

| URL | Version |
| --- | --- |
| `/vmock/adaptive-interview/room?feedback=<id>` | **v3, the default**: only real feedback, no placeholders (`public/vmock/feedback-v3.js`, `.css`) |
| `…&fbview=v2` | v2: the same layout plus VMock's placeholder modules (`public/vmock/feedback-v2.js`, `.css`) |
| `…&fbview=v1` | v1, the first page, kept for comparing (`public/vmock/feedback.js`, `.css`) |
| `…&fbview=classic` | v1's older content-only layout |

Find a session id in **Past interviews** or in `sessions/`.

v3 and v2 have two views:
- **Summary:** the overall comment, the three VMock modules (Content Strength, Delivery of Speech, Non Verbal), your goal for next time, other things to work on, and every question at a glance with its result.
- **Detailed Summary:** a list on the left (Overall, then each question) and one open item with Content Strength | Delivery of Speech | Non Verbal switches. For a question, Content Strength shows how to answer it next time first, then what you did (what went well and what to fix, quoting your answer), then your answers, follow-ups, the checklist and More content checks. The page ends with your goal and **Practice again**.

**Placeholders (v2 only).** Delivery of Speech, Non Verbal, More content checks and the STAR sub-checks are VMock placeholders: their values are invented from the session id until VMock's audio and video analysis is wired in. Content Strength is the real feedback. Add `&sources=1` to any feedback URL to outline every placeholder part in purple, labelled "VMock · hardcoded".

Feedback uses VMock's levels only (Good job, On track, Needs work), never scores. Answers under 15 words get the steps for next time but no ratings.

If no answer could be judged, there is no overall comment, goal or priorities. The goal links to the question it is best practised on, and the other priorities never repeat it. "What went well" and "What to fix" never quote the same words, a rewritten answer uses the numbers the resume line already gives, and the feedback never tells a student who already says "I" far more than "we" to say "I" more. Feedback saved before these rules (version 9 or older) is regenerated the next time it is opened.

## Known limits of this prototype

- On the developer page, typed answers only. Voice is on the student page: push-to-talk, no live captions with OpenAI transcription (the answer text appears after it is sent), and about 5 to 10 s between an answer and the next question.
- No numeric feedback scores. Students get qualitative feedback with VMock levels (see **Feedback page**), written by a model call after the interview (`POST /api/sessions/:id/feedback`). Quotes are checked verbatim and scores are stripped by `checkAndShapeFeedback`.
- Delivery of Speech and Non Verbal on the v2 feedback page are placeholders, not real audio or video analysis; v3 (the default) leaves them out.
- The resume engine's flags and score band are simulated by the planner prompt.
- PDF upload reads text only. Scanned or image PDFs need the text pasted in.
- The web font and PDF reader load from public CDNs. Without internet, the page falls back to system fonts and PDF upload is unavailable.
- Single user, local only. Sessions are stored as plain JSON files.

# VMock adaptive AI interviewer: prototype

A working prototype of VMock's adaptive AI interviewer (spec: *Adaptive Interviews v1, Resume + optional JD*). It plans an interview from the student's CV (and the job description, if given), asks questions out loud, follows up on what the student actually says, and ends with feedback on every answer: what went well, what to fix and how to answer next time. Numeric scores are out of scope, by design.

The same interview runs behind four screens: two VMock replicas for product review (the **candidate UI** and the **dashboard UI**), a plain student page, and a developer page for testing.

Product requirements:
- [Adaptive interviewer (the feature)](docs/prd/2026-11-10-adaptive-interviewer-prd.md)
- [Candidate UI (`/vmock`)](docs/prd/2026-11-10-candidate-ui-prd.md)
- [Dashboard UI (`/dashboard`)](docs/prd/2026-11-10-dashboard-ui-prd.md)
- [Student feedback](docs/prd/2026-11-03-adaptive-interview-feedback-prd.md)

## Run it

You need Node.js 18 or later. There is nothing to install.

1. Add your OpenAI key, using either option:
   - copy `.env.example` to `.env` and set `OPENAI_API_KEY`, or
   - start the server and paste the key into **Settings** on the developer page (`/`). It is kept in the server's memory only.
2. Run `npm start` (or `node server.js`). `PORT` changes the port.
3. Open one of the screens below.

The resumes and job descriptions in `samples/` are fictional and appear in every setup screen.

## The screens

| Screen | Start here | What it is | Files |
| --- | --- | --- | --- |
| **Dashboard UI** (newest) | http://localhost:3000/dashboard/smart-interviews/practice/career-interviews | Copy of the live VMock candidate dashboard (www.vmock.com/dashboard). AI Interviewer is a format inside **SMART Interview**; **CV Deep Dive** is its own sidebar item. | `public/dash/` |
| **Candidate UI** | http://localhost:3000/vmock/interview?tab=adaptive | Copy of VMock's candidate Interview page (candidate-uat-us.vmock.dev) with an **Adaptive Interviews** tab. | `public/vmock/` |
| Student page | http://localhost:3000/student | The voice interview in a plain look, no replica chrome. | `public/student.html`, `.js`, `.css` |
| Developer page | http://localhost:3000/ | Typed interview with the hidden agenda, planner output and every turn's decision, for testing prompts. | `public/index.html`, `public/app.js` |

### Dashboard UI: every page

| Page | URL | File |
| --- | --- | --- |
| Mock Interviews (static tile library; SMART Interview button) | `/dashboard/smart-interviews/practice/career-interviews` | `public/dash/practice.html`, `practice.js` |
| Previously Recorded: past AI Interviewer or CV Deep Dive sessions | `…/career-interviews?view=recorded` (add `&kind=cv` for CV Deep Dive) | same |
| CV Deep Dive page (with its own past interviews) | `/dashboard/smart-interviews/practice/cv-deep-dive` | same |
| SMART Interview sheet: JD → CV → format → Interview Details (AI Interviewer) or Interview Questions (VMock's question set, placeholder) | `/dashboard/smart-interviews/practice/adaptive/setup?entry=mock` (add `&format=ai` or `&format=questions` to preselect) | `public/dash/setup.html`, `setup.js`, `setup.css` |
| CV Deep Dive setup: CV (whole CV or chosen lines) → Interview Details | `/dashboard/smart-interviews/practice/adaptive/setup?entry=cv` | same |
| Interview room: lobby, live call, feedback | `/interviews/adaptive/room` | `public/dash/room.html`, `room.css` |
| A finished interview's feedback | `/interviews/adaptive/room?feedback=<session id>` (add `&entry=cv` for CV Deep Dive) | `public/dash/feedback-v2.js`, `feedback-v2.css` (base styles in `feedback.css`) |

### Candidate UI: every page

| Page | URL | File |
| --- | --- | --- |
| Interview page with the Adaptive Interviews tab (only Custom and Adaptive work) | `/vmock/interview?tab=adaptive` | `public/vmock/interview.html`, `vmock.js`, `vmock.css` |
| Setup wizard: Get Started, Job description, Resume, Interview details | `/vmock/adaptive-interview` (`?back=1` reopens with the last inputs) | `public/vmock/setup.html`, `setup.js` |
| Interview room: lobby, live call, feedback | `/vmock/adaptive-interview/room` | `public/vmock/room.html`, `room.css` |
| A finished interview's feedback, v3 (default) | `/vmock/adaptive-interview/room?feedback=<session id>` | `public/vmock/feedback-v3.js`, `.css` |
| Feedback v2 (with VMock placeholder modules) | add `&fbview=v2` (and `&sources=1` to outline the placeholders) | `public/vmock/feedback-v2.js`, `.css` |
| Feedback v1 and its older layout, kept for comparing | add `&fbview=v1` or `&fbview=classic` | `public/vmock/feedback.js`, `.css` |

Session ids are in `sessions/` (file names) and in each screen's past interviews list.

## Features

### The interview
- **A plan before the first question.** One planner call (`prompts/planner.md`) reads the CV and JD: every CV line as a claim (quoted exactly, rated, flagged), the competencies the role needs, concerns (gaps, short stints, career switches) and 3, 4 or 6 topics, each with its opening question and what a complete answer needs.
- **Interview types:**
  - **Screening round:** a recruiter's first call.
  - **Hiring manager round:** experience in depth, tied to the job.
  - **CV Deep Dive** (`back_your_resume`): line by line through the CV.
- **Lengths:** 10 minutes (3 topics), 15 minutes (4 topics), or a 30-minute behavioural round (6 topics; not for screening).
- **Styles:**

  | Style | Follow-ups per topic |
  | --- | --- |
  | Friendly | 1 |
  | Standard | 2 |
  | Challenging | 3 |
  | Surprise me | picks one of the three |

  CV topics get one extra follow-up.
- **Placement stage** (Indian MBA campus placements): Summer, Final, Lateral or one-year MBA. It changes what the plan draws on: pre-MBA work and activities for summers, the summer internship first for finals, scope and trade-offs for laterals.
- **No job description needed.** Without a JD, the interview is planned from the CV, a domain and a role. The dashboard asks for both domain and role when the JD is skipped.
- **CV Deep Dive on chosen lines** (dashboard). The student can pick sections or bullets; every topic then comes from those lines, while the whole CV is still sent for context.
- **Natural conversation.** The warm-up is one plain question that never assumes whether the student is working or studying. One question per turn, no praise, no hints in the question.
- **Market:** `MARKET=india` (default) or `us` (US keeps domain-knowledge questions for finance and technical roles only).

### The rules (code, not the model)
`lib/engine.js` owns the rules so the model cannot break them:
- follow-up budgets;
- required first follow-ups (your own role on inflated claims, how a number was measured);
- second-chance topics;
- pivots only to later topics;
- a time rule;
- a rephrase on the first "can you repeat that", and moving on after a second "not sure";
- wording guards (agenda words, praise, two questions in one, leading options, over about 60 words) that trigger one rewrite.

A decision the model is not allowed to make is rejected and requested again, then replaced by a scripted move-on.

### Voice
- The interviewer speaks every question (OpenAI text-to-speech by default, or the browser's own voice).
- The student answers with push-to-talk: hold **Space** or the button, or tap to start and tap to stop.
- The student can switch to typing at any time.
- The camera is a self-view only. Nothing is recorded or uploaded.

### Feedback
- One model call after the interview (`prompts/feedback.md`), cached on the session.
- **Per topic:**
  - the result (Good Job, On Track or Needs Work, never a score);
  - what went well and what to fix, each quoting the student's own words;
  - numbered steps for next time;
  - the student's answer, improved;
  - what a strong answer covers, element by element, with where each part appeared (first answer, after a follow-up, or not given);
  - the follow-ups, with what each asked for and whether it was then given.
- **Trust rules:**
  - Quotes must appear word for word in the student's answers.
  - Each improved answer gets a grounding check (`prompts/grounding.md`), and any sentence with a fact not in the CV, JD or answers is removed.
  - Nothing is invented. VMock's Delivery of Speech and Non Verbal modules appear only as labelled placeholders on `/vmock` v2.
- **Dashboard feedback, topic by topic:**
  - The Summary leads with the habit to fix first: where it happened, in the student's own words, and how to say it.
  - The detailed view shows one topic per page, its sections as cards.
  - The transcript highlights every quoted line by level.
  - A topic from a CV line offers **Practise this line again**, which opens CV Deep Dive with that line already chosen.

## Settings

| Variable | Default | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | none | Required (or paste it in Settings on `/`) |
| `PLANNER_MODEL`, `PLANNER_REASONING_EFFORT` | `gpt-6-sol`, `medium` | One call per interview |
| `TURN_MODEL`, `TURN_REASONING_EFFORT` | `gpt-6-sol`, `low` | One call per answer |
| `FEEDBACK_MODEL`, `FEEDBACK_REASONING_EFFORT` | `gpt-6-sol`, `low` | Writes the feedback. Old sessions whose saved model the key can no longer use fall back to the current default; sessions saved before this setting existed use their turn model |
| `GROUNDING_MODEL`, `GROUNDING_REASONING_EFFORT` | the feedback model and effort | Checks each improved answer in the feedback |
| `MARKET` | `india` | `us` for US recruiting; a request's `market` field overrides it |
| `VOICE_PROVIDER` | `openai` | `browser` uses the browser's speech (Chrome, Edge) |
| `OPENAI_API_TTS_STT_KEY` | `OPENAI_API_KEY` | Optional separate key for speech and transcription |
| `TTS_MODEL`, `TTS_VOICE`, `STT_MODEL` | `gpt-4o-mini-tts-2025-12-15`, `cedar`, `gpt-transcribe` | Transcription falls back to `gpt-4o-mini-transcribe` |
| `PORT`, `HOST` | `3000`, `localhost` | |

The prompts in `prompts/` are read on every call, so edits apply without restarting the server.

## API

All under `http://localhost:3000/api/`:

| Method and path | What it does |
| --- | --- |
| `GET config` | Whether a key is set, default models, voice provider |
| `POST key` | Set the key for this server run |
| `GET samples` | The sample resumes and JDs |
| `GET sessions` / `POST sessions` | List interviews / plan and start one (inputs: `resume_text`, `jd_text`, `target_role`, `domain`, `stage`, `interview_type`, `style`, `length`, `market`, `focus_lines`) |
| `GET sessions/:id` | The student view of one interview (never the plan) |
| `POST sessions/:id/answers` | Send an answer, get the next question |
| `POST sessions/:id/end` | End early |
| `GET sessions/:id/speech` | The latest question as audio |
| `POST sessions/:id/transcribe` | Audio in, text out |
| `POST sessions/:id/feedback` | Write (or return the cached) feedback |
| `GET sessions/:id/trace` | Everything, including the plan and raw model calls, for review |

## Files

```
server.js              HTTP server, page routes and API (no dependencies)
lib/engine.js          Interview rules: plan checks, slots, budgets, decisions, time rule, guards, feedback shaping
lib/openai.js          Chat Completions client with Structured Outputs and retries
lib/schemas.js         Strict JSON schemas for the planner, turn, feedback and grounding calls
lib/voice.js           Text-to-speech and transcription
prompts/               planner.md, turn.md, feedback.md, grounding.md
public/dash/           Dashboard UI: practice page, setup sheet, room, feedback
public/vmock/          Candidate UI: interview page, setup wizard, room, feedback v3 / v2 / v1
public/student.*       Student voice page (its script also runs both replica rooms)
public/index.html, app.js   Developer page
public/shared.js       Shared helpers (escaping, PDF reading, the plain feedback renderer)
samples/               Fictional resumes and job descriptions
sessions/              Saved interviews, one JSON file each (created as you go, not in git)
test/                  Mock OpenAI server and the end-to-end check
docs/prd/              Product requirements
docs/research/         B-school research, launch-readiness test kit
docs/superpowers/specs/  Design specs
docs/TODO.md, TODO-US.md  Parked items
```

## Test

`npm test` starts a mock OpenAI server and runs a full scripted interview through the real server: budgets, second chances, pivots, invalid output, the time rule, plan checks, feedback shaping, chosen CV lines, and that the plan never reaches the browser. It makes no real API calls.

## Known limits

- Single user, local only. Interviews are plain JSON files in `sessions/`, with no accounts.
- Voice: push-to-talk, about 5 to 10 seconds between an answer and the next question. With OpenAI transcription, the text appears after the answer is sent.
- Feedback takes about a minute. The waiting screen shows a running clock.
- VMock's question set, Delivery of Speech, Non Verbal and JD skill extraction are not part of this prototype. They appear only as labelled placeholders.
- PDF upload reads text only. The web font and PDF reader load from public CDNs.

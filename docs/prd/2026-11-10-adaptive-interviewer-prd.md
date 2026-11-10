# PRD: Adaptive AI interviewer

**Status:** Draft for review · **Owner:** Raghu Chandan (Product) · **Date:** 10 Nov 2026
**Prototype:** `main` of this repository. Run `npm start`; see the [README](../../README.md) for every screen and path.
**Related:** [Candidate UI PRD](2026-11-10-candidate-ui-prd.md) · [Dashboard UI PRD](2026-11-10-dashboard-ui-prd.md) · [Student feedback PRD](2026-11-03-adaptive-interview-feedback-prd.md) · research in `docs/research/`

---

## 1. Problem statement

VMock's interview practice records answers to a fixed list of questions. A real interviewer listens and follows up: "What did *you* do?", "How did you measure that?". Students, especially MBA students in campus placements, are judged on exactly those follow-ups and on whether they can back every line of their CV. A fixed question set never practises that, so students meet their first follow-up in the real interview. The cost is weaker placement outcomes, and a gap against AI interview tools that already converse (Huru, Yoodli and others).

**Evidence:**
- The research in `docs/research/` (IIM placement questions, B-school gap audit, US adaptation) shows panels lean heavily on CV-based probing and follow-ups.
- The IIM launch-readiness test (13 student profiles, `docs/research/2026-11-09-iim-launch-readiness.md`) confirmed the interviewer handles them, and found the gaps fixed since.

## 2. Goals

| # | Goal | Type | How we know |
|---|---|---|---|
| G1 | Students practise follow-ups, not only first answers | User | ≥90% of finished interviews contain at least one follow-up per scored topic |
| G2 | Interviews feel like a real interview | User | ≥70% of pilot students rate it "like a real interview" or better; ≤5% of interviewer turns flagged by reviewers as unnatural |
| G3 | Every question is grounded in the student's own CV or the job | Trust | 100% of CV topics quote a real CV line (checked by `checkAndShapePlan`); zero invented facts in audited feedback |
| G4 | Students come back to practise | Business | Re-attempt within 7 days at least 10 points above the current mock-interview baseline |

Targets are hypotheses to confirm with the data team once baselines exist.

## 3. Non-goals

| Non-goal | Why |
|---|---|
| Numeric scores or ranks | Scores pull attention from what to change; feedback uses VMock's three levels only |
| Case interviews, guesstimates and group discussions | VMock has separate modules; the interviewer says so in the lobby |
| Delivery of Speech and Non Verbal analysis | Belongs to VMock's audio and video pipeline; shown only as labelled placeholders |
| Generating a fixed, editable question set | That is VMock's existing SMART Interview "Question set"; this feature is the conversational format beside it |
| Accounts, storage, scaling | Prototype runs locally with JSON files; production uses VMock's platform |

## 4. User stories

**MBA student in campus placements (primary)**
- As a first-year MBA student preparing for summers, I want questions drawn from my pre-MBA work, studies and activities, so that I practise what a summer panel will actually ask.
- As a final-year student, I want my summer internship asked first, with "what would you do differently now?", so that I can defend the experience panels care most about.
- As a student with a gap year or a career switch, I want it raised once and neutrally, so that I can practise explaining it without being cornered.
- As a student, I want follow-ups when I'm vague ("What did you personally do?"), so that I learn to answer completely the first time.
- As a student who says "not sure" twice, I want the interviewer to move on, so that I'm not stuck and the feedback records the gap.
- As a student, I want to ask my own questions at the end and get real answers, so that I practise that part of the interview too.

**Student practising for a specific job**
- As a student with a job description, I want the interview tied to its requirements, so that I practise for that role.
- As a student without a job description, I want to give a domain and a role instead, so that I can still get a relevant interview.

**Student defending a CV**
- As a student, I want to choose particular CV sections or bullets for a CV Deep Dive, so that I can practise the lines I'm least sure of.

**Reviewer and coach**
- As a VMock reviewer, I want to see the plan, each turn's decision and the raw model calls, so that I can judge and tune the interviewer.

## 5. Requirements

### P0: must have (all built)

| # | Requirement | Acceptance criteria |
|---|---|---|
| R1 | **Plan from CV and optional JD** | Given a CV of at least 200 characters and a role, a domain or a JD, when the interview starts, the planner returns claims, competencies, concerns and exactly 3, 4 or 6 topics. Every CV claim is an exact quote, and no more than 2 topics come from one role (`checkAndShapePlan`) |
| R2 | **Interview types** | Screening, Hiring manager and CV Deep Dive (`back_your_resume`) each follow their own topic template. 30 minutes is refused for Screening |
| R3 | **Follow-up budgets by style** | Friendly 1, Standard 2, Challenging 3 follow-ups per topic, plus 1 on CV topics. Surprise me picks one. Enforced in code, whatever the model asks |
| R4 | **Required first follow-ups** | An inflated or "we"-heavy claim asks about the student's own role first. A claim with a number asks how it was measured. In finals (not Screening), an internship topic asks "what would you do differently now?" |
| R5 | **Non-answers** | The first "can you repeat that" in a topic gets a rephrase and uses no follow-up. A second "not sure" or repeat ends the topic's follow-ups. A plain decline counts as "not sure" |
| R6 | **Time rule** | Within the turn budget, it drops second chances first, then trims follow-ups, then drops non-must-have topics, then must-haves. The student's own questions are never dropped |
| R7 | **Natural wording** | One question per turn. No praise, agenda words, leading options or two asks. About 60 words at most (one rewrite, then flags recorded). The warm-up is one plain question that never assumes the student is working or studying |
| R8 | **Placement stage** | Summers, finals and laterals change what the plan draws on (see §4). An HR-round question in Screening when a stage is set. Never salary, family or personal circumstances |
| R9 | **Chosen CV lines** | CV Deep Dive with `focus_lines`: every topic is a claim on one chosen line, and the whole CV is sent as context. Other types ignore the field. The server keeps at most 100 strings of 300 characters |
| R10 | **Voice** | The interviewer speaks every question. Push-to-talk answers are transcribed. Typing is available at any time. Fallbacks: browser voice, the other transcriber, then typing. Nothing is recorded or uploaded |
| R11 | **Feedback** | Per topic: result level, a went-well and a to-fix quote (verbatim), a 2–4 step plan, the answer improved (grounding-checked), and the elements with where each appeared. A goal and up to 2 priorities. See the feedback PRD |
| R12 | **Plan never reaches the student** | The student view never includes the plan. Only `GET /api/sessions/:id/trace` does, for review |
| R13 | **Model safety** | A decision the model isn't allowed to make is rejected and re-requested, then replaced by a scripted move-on. CV, JD and answers are treated as data, never as instructions |

### P1: nice to have

| # | Requirement | Acceptance criteria |
|---|---|---|
| R14 | **US market** | `MARKET=us` keeps domain-knowledge questions for finance and technical roles only (others become situational). Parked US items are in `docs/TODO-US.md` |
| R15 | **Old sessions keep working** | Feedback for a session whose saved model the key can no longer use falls back to the current default model |
| R16 | **Practise this line again** | From a feedback topic, opens CV Deep Dive with that CV line chosen |

### P2: future

- "Compared with your last attempt" on a retried topic.
- Delivery of Speech and Non Verbal from VMock's audio and video analysis, replacing the placeholders.
- JD skill extraction at setup (the "Top skills" placeholder).
- Interview history across devices and accounts (needs VMock's platform).

## 6. Success metrics

**Leading (first 2–4 weeks of a pilot)**
- Interview completion rate: share of started interviews reaching the student's questions. Target ≥70%.
- Follow-ups answered: share of follow-ups that got an answer of 15 words or more. Target ≥80%.
- Feedback opened: share of finished interviews whose feedback is opened. Target ≥85%.
- Interviewer turns flagged by the wording guards after the rewrite: ≤5%.

**Lagging (one placement season)**
- Re-attempt rate within 7 days (G4).
- Topic verdicts moving up a level on a re-attempt within 14 days: ≥40% of re-attempting students.
- Student rating of realism (G2), via the pilot survey.

Measured from session files in the prototype; in production, from VMock's analytics.

## 7. Open questions

| Question | Owner | Blocking? |
|---|---|---|
| Which models (planner, turn, feedback) at what cost per interview at VMock scale? | Engineering | Yes, for launch |
| Voice: VMock's own speech stack, or OpenAI's? Is latency of 5–10 s acceptable? | Engineering, Product | Yes |
| Where is student audio processed, and what is the consent wording? | Legal | Yes |
| Baselines for re-attempt and completion in today's mock interviews | Data | No |
| Should coaches see a student's transcript and feedback? | Product, Legal | No |

## 8. Timeline considerations

- **Placement calendar:** IIM summers and finals run in fixed windows. A pilot should land 4–6 weeks before the next window so students practise before it.
- **Dependencies:** VMock's voice stack, analytics events and placeholders (question set, Delivery, Non Verbal, JD skills) for a full product.
- **Suggested phases:**
  1. A pilot with one or two B-schools on the dashboard UI.
  2. VMock voice and analytics.
  3. Delivery and Non Verbal joined to the feedback.

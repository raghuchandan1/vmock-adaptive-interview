# PRD: Student feedback for the VMock adaptive AI interviewer

**Status:** Draft for review · **Owner:** Raghu Chandan (Product) · **Date:** 3 Nov 2026
**Prototype:** branch `worktree-feedback` (feedback v8). Design history and research: `docs/superpowers/specs/2026-11-02-student-feedback-design.md`

---

## 1. Problem statement

Students use VMock to practise interviews again and again, but the feedback does not tell them clearly **what went well, what went wrong and what to do on the next attempt**.

Three gaps sit behind this:

1. **VMock's content feedback is criterion-level and generic.** Content Strength shows chips such as STAR/HSAR, each with a "To improve" line and a template sample ("I would begin by clearly explaining the background of the project…"). It is not tied to the student's own resume or words.
2. **The new adaptive interviewer creates moments VMock does not measure.** It asks resume-based questions and follow-up probes, so it sees things the current modules do not evaluate:
   - how the student handled follow-ups
   - whether answers matched their resume
   - whether they spoke about their own part or the team's
   - whether they asked questions at the end
3. **Competitor feedback can mislead.** Huru's "stronger version" invents facts for the student (e.g. "4 years in AI", "78% to 88%" for a candidate who said almost nothing). A student who repeats that in a real interview is worse off.

**Evidence.**
- **Live review of a test run** (session f224acf7). The first feedback version missed a background answer that contradicted the resume, missed a story that drifted from its resume line, gave only "too short" on a "not sure" topic, and lost every rewrite to an over-strict fact check.
- **Live review of VMock, Huru and Yoodli reports** in logged-in accounts.
- **Research summary:** feedback works best as specific comments on the task with a clear next step (Hattie & Timperley 2007; Wisniewski et al. 2020; Butler 1988). If-then plans improve follow-through (Gollwitzer & Sheeran 2006).

**Cost of not solving.** Practice without actionable feedback does not compound. Students repeat the same mistakes, and VMock's differentiator (adaptive, resume-based interviews) is undermined if its feedback is no better than competitors'.

## 2. Goals

| # | Goal | Type | How we know |
|---|------|------|-------------|
| G1 | Students know exactly what to change on their next attempt | User | ≥70% of students rate the feedback "helpful" or better; ≥80% can restate their goal (pilot survey) |
| G2 | Feedback is accurate and trustworthy | User / brand | The model's levels agree with VMock coaches within one level on ≥80% of rated dimensions, with exact agreement ≥60%. Zero invented facts in audited rewrites |
| G3 | Students improve across attempts | User | Among students who re-attempt within 14 days, ≥40% move at least one topic verdict up a level |
| G4 | Students come back to practise | Business | Re-attempt rate within 7 days is at least 10 points above VMock's current mock-interview baseline |
| G5 | Feedback fits into VMock without duplicating what exists | Business | It ships as the content module plus a new Conversation module, reusing VMock's Level, Non Verbal and Delivery modules |

*Targets G1–G4 are hypotheses to confirm with the data team once baselines are known.*

## 3. Non-goals

- **An overall numeric score in the feedback.** VMock's Level already plays that role. Research suggests grades shown next to comments can cancel the comments' benefit (Butler 1988).
- **Speech, video and non-verbal analysis** (pace, pauses, eye contact, fillers). VMock's Non Verbal and Delivery of Speech modules already cover these.
- **Showing the criteria to the student before the interview.** It would break the simulation of a real interview. The criteria are shown after, in each question's checklist.
- **"Progress since your last attempt" (v1).** Attempts ask different questions, so a fair comparison needs design work. It is parked as P2.
- **A self-rating step before feedback, a praise/"wise feedback" header, and judging the warm-up.** These were reviewed and dropped: low value for the added length and extra LLM load, and first impressions are better judged from video.

## 4. Users and user stories

**Personas:**
- **Student**: a college or early-career candidate practising for internships and graduate roles. Often a fresher with little interview experience.
- **Career services coach / admin**: university staff who recommend VMock and review students' progress.
- **VMock product / quality team**: owns the quality and cost of the feedback.

### Student
1. As a student, I want **one clear goal for my next attempt** that I can use even when the questions are different, so I know what single thing to change.
2. As a student, I want **for each question, what went well and what to fix, each tied to the exact words I said**, so I understand the feedback and believe it.
3. As a student, I want **steps for answering this question next time, using my own resume**, so I can prepare a better answer rather than memorise a template.
4. As a student, I want **my own answer rewritten more strongly, with gaps marked for me to fill**, so I see what good looks like without being told things I never did.
5. As a student who said "not sure", I want **a way to approach that kind of question and a labelled sample answer**, rather than only "too short".
6. As a student, I want to **see where my answers didn't match my resume**, so I fix my story or my resume before a real interview.
7. As a student, I want to **see how I handled follow-up questions**, because real interviewers probe.
8. As a student, I want to **know if I talked about the team more than about my own work**, and **if I had no questions at the end**.
9. As a student with very short answers, I want an **honest "not enough to judge"** rather than "needs work" on everything.
10. As a student, I want **feedback to arrive within about a minute** of finishing, and a **"try again"** option if it fails.

### Coach / admin
11. As a coach, I want feedback that uses **the same levels as VMock** (Good job / On track / Needs work), so I can discuss it with students using familiar terms.
12. As a coach, I want to **trust that rewrites contain only the student's facts**, so I can recommend the tool without worrying it coaches students to embellish.

### VMock product / quality
13. As the quality team, I want **every model call's inputs, outputs, latency and tokens recorded** with the session, so I can audit feedback and track cost.
14. As the quality team, I want **injected instructions in resumes or answers to be ignored**, so students can't game the feedback.

## 5. Requirements

### P0: Must-have for the pilot (all built in the prototype unless marked)

**R1. Feedback generated after the interview**
- One feedback call when the interview ends, cached on the session.
- Cached feedback is regenerated automatically when its format version is out of date.
- Acceptance criteria:
  - [ ] Given an ended interview with at least one answer, when the student opens the review, then feedback appears with no further action.
  - [ ] A second request returns the cached feedback without a model call.
  - [ ] Before the interview ends, or with no answers, the student sees a clear message (HTTP 400). An unknown session returns 404. A duplicate request while feedback is being written returns 409.
  - [ ] On a model failure, the student sees an error and a "Try again" button.

**R2. One goal for the next attempt (if-then)**
- The goal has a short title, why it matters, and an action of the form "When [kind of moment], [one action]".
- The action is tied to a type of question, never to one question from this interview.
- Acceptance criteria:
  - [ ] The action is assembled from separate `when` and `then` fields.
  - [ ] A `then` with a list, "and" before a second instruction, or more than 20 words is sent back for one rewrite.
  - [ ] At most two further "Also work on" items.

**R3. Per-question feedback**
- Shows: the question asked, a verdict, "What went well" (quote), "What to fix" (quote), and "How to answer it next time" (2–4 steps).
- Acceptance criteria:
  - [ ] Every quote is verbatim from the student's answers in that same question; otherwise it is dropped.
  - [ ] The verdict is derived from the content ratings in code (all Good job, then Good job; most Needs work, then Needs work; else On track), never written freely by the model.
  - [ ] Steps for questions about the student's own past name only facts from the resume, answers or JD. Anything else is in brackets.

**R4. Rubric by question type**
- Rubrics:
  - Behavioural/claim: Situation, Your role, What you did, Result, plus Technical reasoning for technical topics.
  - Situational: First step, Reasoning, Judging success.
  - Knowledge: Accuracy, Depth, Real example.
  - Motivation: Specific reason, Fit, Evidence.
  - Concern: Explanation, Ownership, What changed.
- Each dimension is rated Good job / On track / Needs work, with the reason written before the level.
- Shown in a collapsed checklist.
- Acceptance criteria:
  - [ ] Ratings use only the topic's rubric dimensions (enforced by the per-call schema).
  - [ ] No numbers, scores or interviewer jargon in any text. Violations trigger one regenerate, then sentence removal.

**R5. "Your answer, improved" without invented facts**
- Acceptance criteria:
  - [ ] A rewrite is shown only if it rewrites the student's own "what to fix" line.
  - [ ] A rewrite containing a number the student or resume never gave is dropped.
  - [ ] A second model check lists unsupported claims. A flag that is the student's, resume's or JD's own wording is ignored; a real flag removes only its sentence. On a check failure, the rewrite is removed (fail closed).
  - [ ] Anything the student didn't say appears in brackets for them to fill in.

**R6. Sample answer only for scenario and technical questions**
- Acceptance criteria:
  - [ ] Shown only when the rubric is situational or knowledge, and labelled as from a sample candidate.
  - [ ] Never shown for questions about the student's own past.

**R7. Conversation module (adaptive-only signals)**
- Covers: follow-up handling per question; "I" vs "we" counts per question and overall (derived in code); background answers that don't match the resume or skip the path to the role; no questions at the end (derived in code).
- Acceptance criteria:
  - [ ] Shown as observations, not verdicts. The research behind these signals is survey-based.

**R8. Resume mismatch on the question it belongs to**
- Acceptance criteria:
  - [ ] Shown as "Doesn't match your resume" on that question, neutrally, never as dishonesty.
  - [ ] "What to fix" never repeats the same moment. If it quotes it, code drops it.

**R9. Not enough to judge**
- Acceptance criteria:
  - [ ] Questions with under 15 words of answers show "Not enough to judge" with the answer steps (and a sample where allowed), and no ratings.

**R10. Job description coverage**
- Each JD must-have is shown as Covered / Partly covered / Not reached, derived from the interview plan with no extra model call.

**R11. Safety and consistency of model calls**
- Acceptance criteria:
  - [ ] All four model calls (planner, turn, feedback, grounding) use strict Structured Outputs. Per-call schemas limit output to allowed decisions, offered topics, reached topics and known rubric dimensions.
  - [ ] Resume, JD and answers are treated as untrusted. Injected instructions are not followed (tested live via resume and answers).

**R12. VMock integration (not built: VMock engineering)**
- Acceptance criteria:
  - [ ] Our dimensions map onto VMock's Content Strength parameter names, so the Level computation keeps working: behavioural to STAR/HSAR; situational to Scenario Comprehension and Strategy & Decision Making; knowledge to Depth & Clarity and Practical Application.
  - [ ] The feedback replaces Content Strength for adaptive interviews only. Non Verbal and Delivery of Speech are unchanged.
  - [ ] The Conversation module is added as a fourth module.
  - [ ] Verdicts are shown after the comments, worded against the criterion, and never compared with peers.

**R13. Production basics (not built: VMock engineering)**
- Acceptance criteria:
  - [ ] VMock's user authentication and storage (no JSON files), and server-side API keys only.
  - [ ] Per-user rate limits.
  - [ ] Cost and latency tracking per interview.
  - [ ] Transcript retention and consent per the institution's data policy.

**R14. Coach validation gate (not done)**
- Acceptance criteria:
  - [ ] Before wider rollout, 2–3 VMock coaches rate 20–30 pilot transcripts blind on the same dimensions.
  - [ ] Agreement targets in G2 are met, and disagreements are reviewed and fed back into the prompt.

### P1: Fast follows

- **Cost and latency dashboard.** Calls per interview and p50/p95 feedback latency, from the per-call trace data already recorded.
- **Helpfulness rating per feedback block.** Thumbs up or down on "What to fix", "How to answer it next time" and the goal, to measure G1 continuously.
- **Suggest a harder interviewer style** once the student's goal is met (a VR-JIT-style progression).
- **Tighter goal check.** A goal like "answer that point first with what you did and what changed" still passes the one-action check.

### P2: Future considerations (design for, don't build)

- **Progress since your last attempt.**
  - Link attempts through VMock's Re-attempt button using the previous session id.
  - Compare the goal (met / partly / not yet) and criteria levels, not questions, because questions differ between attempts.
  - Keep per-session goal and criterion levels in a stable format to support this.
- **Self-check before feedback.** Strong / OK / Weak per question, never graded.
- **Other languages** for answers and feedback.
- **Feedback from spoken answers.** Combine with VMock's audio and video analysis once the adaptive interviewer supports voice.

## 6. Success metrics

**Leading indicators (first 2–4 weeks of the pilot):**

| Metric | Target | Measure |
|--------|--------|---------|
| Feedback generation success | ≥99% of ended interviews | Server logs (status 200 vs errors) |
| Feedback latency | p95 ≤ 75 s (prototype observed 17–73 s) | `feedback_trace` latency |
| Rewrites kept after the fact check | ≥70% of shown "what to fix" items carry a rewrite | `feedback_trace` grounding results |
| Feedback opened | ≥85% of ended interviews | Product analytics |
| Helpfulness | ≥70% "helpful" or better | In-page rating (P1) or pilot survey |
| Model calls per interview | Track; prototype is about 15–20 turn calls, plus 1–2 feedback calls and 1 grounding call per rewrite | Session traces |

**Lagging indicators (1–3 months):**

| Metric | Target | Measure |
|--------|--------|---------|
| Coach agreement | ≥80% within one level, ≥60% exact | Coach study (R14) |
| Invented facts in rewrites | 0 in a monthly audit of 50 rewrites | Manual audit |
| Re-attempt within 7 days | +10 points vs the mock-interview baseline | Product analytics |
| Verdict improvement on re-attempt | ≥40% of re-attempting students improve at least one verdict | Session data |
| Student NPS for interview practice | Up vs the pre-pilot baseline | Survey |

*All targets are hypotheses. Confirm baselines with the data team before the pilot.*

## 7. Open questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What does VMock's "HSAR" stand for, and should our behavioural rubric map to it exactly? | VMock content team | Yes, for R12 |
| How is VMock's Level (1–5) computed from module ratings, and how should our verdicts feed it? | VMock engineering | Yes, for R12 |
| Transcript storage, retention and consent for model processing (per institution, and for minors) | Legal | Yes, for the pilot |
| Model choice and per-interview cost ceiling for production | Engineering, Finance | Yes, for the pilot |
| Which institutions and how many students for the pilot? Who are the 2–3 coaches for R14? | Stakeholders, Career services | Yes, for the pilot |
| Should Conversation signals ("I" vs "we", questions at the end) affect the Level, or stay informational? | Product, Content | No |
| Behaviour for non-English or code-mixed answers | Product, Engineering | No |
| Mobile layout of the feedback inside VMock's app | Design | No |

## 8. Timeline and phasing

No hard external deadline is known.

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0. Prototype** (done) | R1–R11 in the standalone prototype; 81 automated checks; live checks on about 10 real sessions | Done |
| **1. Validation** | R14 coach study on 20–30 transcripts; fix the disagreements | G2 agreement targets met |
| **2. Integration** | R12 module mapping into VMock; R13 production basics; P1 helpfulness rating | Runs inside VMock behind a feature flag |
| **3. Pilot** | 1–2 institutions; measure leading indicators | Leading targets met; no invented-fact incidents |
| **4. Rollout and P2 planning** | Wider rollout; design "since your last attempt" around the Re-attempt link | Lagging indicators trending to target |

**Dependencies:**
- VMock engineering (R12, R13).
- VMock content team (rubric mapping, HSAR).
- Legal (data and consent).
- Coach availability (R14).
- Model vendor quota and cost.

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

## v2 update (competitor + VMock review)
Rubric now varies by question type (behavioural STAR, situational, knowledge, motivation, concern) with Good job / On track / Needs work per dimension, plus "Handling follow-ups" on probed topics. Adds a rework block (verbatim quote, why, stronger version with placeholders), "Work on this next" (title/why/action, max 3), derived JD coverage, a too-short guard (<15 words), and answer highlights. No numeric level or scores. Speech and non-verbal modules are out of scope (text-only).

## v3 update (2026-11-03): rework after student review

**Problem.** Reviewing a real run (session f224acf7), the feedback did not tell the student what went well, what went wrong and what to do next; the questions also felt templated.

Findings:
- All rewrites were deleted by an over-strict grounding check.
- The biggest mistakes (a background answer contradicting the resume, a story that drifted from the resume line, no questions at the end) were invisible.
- "Not sure" topics got only "too short".
- Project stories were judged on a knowledge rubric ("Accuracy").
- 4–6 rating rows per topic buried the message.

On questions:
- Every follow-up opened with "You mentioned…".
- Openings read the resume bullet back.
- The motivation follow-up offered an option list.
- In 5 of 7 short fresher runs the third topic was dropped for time after two technical claims with 3 follow-ups each.

**Research used** (sources in the session report):
- Feedback should answer where am I going / how am I going / where next (Hattie & Timperley 2007).
- Feedback should be task-level, not self-level (Kluger & DeNisi 1996).
- High-information feedback works best (Wisniewski et al. 2020).
- Exemplars should be shown after the attempt and labelled (To, Panadero & Carless).
- LLM judges are lenient and verbose: write the evidence before the verdict (Chiang & Lee 2023; Zheng et al. 2023).
- Probes should be non-leading, ask for the candidate's own role and follow a funnel (OPM structured interview guide; NN/G funnel technique).
- Probes should respond to the person's own words (Xiao et al. 2020).

**Feedback v3.**
- At the top: one goal for the next attempt, then up to two more items.
- Per question:
  - The question asked and a single verdict.
  - What went well and what to fix, each with a quote.
  - How to answer it next time: steps, then the student's own line improved, plus a labelled sample answer only for scenario and technical questions. A sample for a story from their own past would be invented.
- The rubric checklist is collapsed.
- "Not sure" topics still get the steps.
- Other moments: warm-up and background (model) and no questions at the end (derived).
- Grounding:
  - Gets the JD.
  - Ignores flags that are the student's own words.
  - Removes only the offending sentence.

**Questions.**
- Freshers get no extra follow-up on technical claims and at most one technical topic.
- The measurement follow-up is owed before a claim closes, but only required on the last follow-up.
- The second claim covers a different competency.
- Openings name the project briefly and vary their frame.
- Fresher scenarios use everyday words.
- Follow-ups funnel and vary how they echo the answer, and bring a drifted story back to the resume line.
- New guards:
  - Option lists.
  - Two asks in "Tell me about…".
  - Comments on the answer.
  - Repeated "You mentioned" echoes.

**Not done.**
- No "since your last attempt" comparison. It needs an explicit practise-again link between sessions, not matching on resume text.
- Ratings are still not validated against coaches.

## Live review of VMock, Huru and Yoodli reports (2026-11-03)

Reviewed in logged-in accounts:
- **VMock:** mock interview "Analyst, Financial Operations", 5 questions.
- **Huru:** conversational interview with "Maya".
- **Yoodli:** "Codebase Review" roleplay.

**VMock today.** One Level out of 5, built from three modules.
- **Non Verbal:** eye contact, facial expressions, gestures, posture.
- **Delivery of Speech:** vocal features, pauses, fluency, modulation.
- **Content Strength:** parameters change with the question type.
  - Knowledge: Depth & Clarity (Topic Coverage, Advanced Concepts), Practical Application, Industry Insights.
  - Behavioural: STAR/HSAR, with each part split into chips such as Situation > Context > Background or Impact. Also Learning & Reflection, and Skills.
  - Situational: Scenario Comprehension (with Impact and Constraints & Assumptions), and Strategy & Decision Making.
- Each missing chip gets a "To improve…" sentence and a SAMPLE RESPONSE. The sample responses are generic templates ("I would begin by clearly explaining the background of the project…").
- Each question shows an editable script with highlights.
- There is a "Re-attempt Interview" button.

**Huru.**
- A score out of 100, weighted 70% answers and 30% conversation skills.
- **Conversation skills:** depth under follow-up, listening, consistency and credibility, conciseness and pacing, composure, engagement and close.
- **Insights:**
  - talk time, pace, thinking time
  - fillers, hedging phrases, interruptions
  - ownership (I vs we %)
  - a STAR completeness grid per question
  - job description coverage
- Three "Work on this next" items.
- Key moments: strengths, standout moments, and reworked moments with "A stronger version". The stronger versions invent facts, for example "ResNet… 78% to 88%" and "4 years in AI" for a candidate who said almost nothing.
- Per question: topic, number of follow-ups, and "Too short to score fairly".

**Yoodli.**
- A percentage score.
- Rubric: Active Listening out of 5, and STAR out of 5 per element.
- One strength and two growth areas.
- Feedback per response, with tone tags and conciseness.
- Summary and pronunciation.
- Analytics: word choice (repetition, fillers, weak words, conciseness), listening, delivery.
- Trends over the last three months.

**Overlap with ours.**
- STAR per element: all three products.
- Follow-up handling: Huru and Yoodli.
- Consistency with the resume: Huru.
- Job description coverage: Huru.
- Three things to work on: Huru.
- Stronger version: Huru.
- Too short to judge: Huru.
- Strengths: Yoodli and Huru.

**Only ours.**
- Questions and feedback built from the student's resume lines.
- Rewrites grounded in what the student actually said, with brackets for the missing parts.
- A per-question plan for answering next time.
- A derived note when the student asked no questions at the end.

## Research: which feedback helps students most, and what VMock lacks (2026-11-03)

Evidence strength: strong / moderate / weak. Sources are in the session report. The main ones:
- Klehe et al. 2008
- Tross & Maurer 2008
- Butler 1988
- Hoque et al. 2013 (MACH)
- Smith et al. 2014 (VR-JIT)
- Fukkink et al. 2011
- Langer et al. 2018
- Gollwitzer & Sheeran 2006
- Andrade 2019
- Yeager et al. 2014
- Mueller & Dweck 1998
- Barrick et al. 2010
- Bangerter et al. 2014
- Macnamara et al. 2014

**Gaps worth adding, in order of evidence and value**

1. **What this question tests** (moderate-strong; Klehe 2008, Tross & Maurer 2008).
   - Show 2-3 plain-language criteria per question on the feedback page.
   - Show them again before the next attempt.
   - VMock shows criterion chips only after the attempt.
   - Never show planned follow-ups or the plan.
2. **If-then goal** (moderate; Gollwitzer & Sheeran d=.65).
   - Phrase the next-attempt goal as "When asked about a project, I'll say what I did and one result in the first three sentences."
   - The student can edit it, and it appears before the next interview.
3. **Self-check before the reveal** (moderate; Andrade 2019).
   - One click per question: Strong / OK / Weak, plus "which part did you leave out?".
   - Then show agreement or difference neutrally. Never grade the self-check.
4. **Strategy praise and a wise-feedback header** (moderate; Mueller & Dweck, Yeager 2014).
   - "What went well" names the tactic the student used, not a trait.
   - One line on top: "This uses the standard recruiters apply. Your answers show you can reach it."
5. **A comment on the opening** (moderate, correlational; Barrick 2010).
   - First impressions predict ratings and offers.
   - Reverses "warm-up not judged": comment lightly on the warm-up and background as a first impression.
6. **Since your last attempt** (moderate-weak). Parked: topics differ between attempts, so compare criteria and the goal, not questions.
7. **Harder levels once mastered** (moderate; VR-JIT). Suggest moving up the interviewer style once the goal is met.

**Already covered** by VMock or ours:
- Specific comments rather than a grade (Butler; MACH).
- Pointers to exact lines (VR-JIT; Fukkink).
- Actions and results over background (Bangerter).
- Named strengths (Petruzziello).
- Nonverbal delivery (VMock).

**Risks**
- **Numeric levels next to comments can cancel the comments' benefit** (Butler; strictly, Butler's grades were normative).
  - Show the verdict after the comments, worded against the criterion.
  - Never compare students with peers.
  - Applies to VMock's Level 2/5 and to our per-question verdict pill.
- **VMock's generic sample pushes background**, which students already overdo. Push actions and results instead.
- **Video replay without pointers gave no gain** in MACH.
- **"I"/"we" counts, resume mismatch, questions at the end and quantified results** rest on manager surveys only. Present them as observations, not verdicts.
- **Practice alone** explains little performance variance (Macnamara), and coaching didn't reduce anxiety. Don't promise either.
- **Too many items.** Keep the cap of three goals.

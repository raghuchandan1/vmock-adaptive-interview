# Feedback: why you were asked, and what to expect next time

Short design (small change). Dashboard feedback (`public/dash/feedback-v2.js`) only.

## Intent

A student reading their feedback should understand what each question was really checking and why the interviewer
followed up, and walk away knowing which follow-ups a real panel will ask on the same story. Today the feedback says
what went well, what to fix and how to answer next time, but:

- What a topic was checking is known (the plan's `intent_private`, sent to the feedback model as
  `what_a_complete_answer_needs`) but never shown. The student sees only the CV or JD line the question came from.
- Each follow-up's reason (`why_asked_for_student`, stored as `why`) is shown only in Detailed view, as grey text.
- Follow-ups the interviewer meant to ask but ran out of time or follow-ups for (`not_asked`) reach the model only, so
  the student never learns a panel would ask them.
- Nothing sums up what the follow-ups say about the student across the interview (for example, that most of them asked
  for things a complete first answer already gives).

No user complaint drove this; the user asked for a general improvement and left the how to Claude.

## Goals

1. Per topic, one sentence: "What this question was checking", in the student's terms.
2. Per topic, "A panel may also ask": the follow-ups that were planned but never asked, as questions.
3. Follow-up reasons visible as "Why the interviewer asked", not grey small print.
4. On the Summary, one line under Across the interview on what the follow-ups asked for.

## Non-goals

- No layout restructure of Summary or Detailed (approach C, rejected below).
- No change to /vmock v3, v2, v1 or `/student` (they keep working: new fields are optional).
- No change to the turn prompt or the interview itself.
- No fix for the misplaced `why` on topic-opening questions (the model explains the previous answer there). Nothing
  renders it; goal 1 replaces it.

## Anti-goals

- The new text must not leak agenda words (plan, criteria, rubric, probing) or scores. "What this question was checking"
  is phrased as what an interviewer looks for, never as this interview's scoring.
- "A panel may also ask" must never fault the student: it is preparation, not a missing element.

## Approaches

- **A. All derived in code.** "What this question was checking" from fixed sentences per topic kind. Free and
  predictable, but generic ("Interviewers check the story behind a CV line").
- **B. Mixed (chosen).** The feedback call writes one extra sentence per topic, `checking`, from the
  `what_a_complete_answer_needs` it already receives. No new model call. Everything else is derived in code from data
  the engine already has.
- **C. Restructure each topic** as question, what they wanted, what you gave, the gap. Most intuitive on paper, but it
  redoes recent layout work with no reported problem to justify it.

Claude picked B: specific where specificity matters (one sentence, model-written), deterministic everywhere else.

## Design

1. **`checking` (model).** `lib/schemas.js` `feedbackSchemaFor`: add `checking: str` to each topic, before `ratings`.
   `prompts/feedback.md` `<topic_fields>`: one sentence, second person, saying what an interviewer listens for with
   this question, built from `what_a_complete_answer_needs` ("This question checks whether you can show your own part
   in the forecast and how the 15% was worked out."); filled for every topic, including `usable_answer: false`. Allowed
   as an exception to the "do not mention the plan" rule, which still holds for wording. `checkAndShapeFeedback`: run
   it through the same leak/score/contact filter as other text (empty it on a hit). Bump `FEEDBACK_VERSION`.
2. **`expect_next` (code).** In the topic objects `checkAndShapeFeedback` builds, add `expect_next`: student-facing
   questions for each `notAskedRungs` rung plus the attribution item, from a new map next to `NOT_ASKED_TEXT`
   (role: "Which part did you do yourself?", result: "How did you measure that number?", setback: "What would you do
   differently now?", why_now: "Why is now the right time for this move?", domain_prep: "What have you done in your
   MBA towards this field?", attribution: "How much of the result came from your change?"). `hr_round` is left out
   (its question varies by role). Empty list when nothing was left unasked.
3. **Renderer.** In `topicPane`: `checking` shows under the question in the topic header ("What this question was
   checking"). `expect_next` shows at the end of "How to answer it next time" as "A panel may also ask", with one line
   saying to prepare an answer. In `followUpsBody`, each `why` gets a small label "Why the interviewer asked" and normal
   text colour.
4. **Summary line.** In `acrossSection`, a card "Follow-ups": counts follow-ups across judged topics and how many asked
   for an element a complete first answer gives (`asked_for` in situation, task, action, result, reason, explanation),
   naming the elements ("3 of your 6 follow-ups asked for your role or the result. Put them in your first answer.").
   Hidden when there were no follow-ups; when none asked for such an element the card says so.
5. **Tests.** `test/mock-openai.js` returns `checking` (strict schema); `test/run-flow.js` asserts `checking` and
   `expect_next` exist on the feedback topics.
6. **Docs.** CLAUDE.md feedback paragraph: one sentence for the new version.

## Left to the builder

Exact CSS for the new label and blocks (reuse `dr-muted`, `dr2-sec-sub`, `dr-card` styles); exact Summary wording.

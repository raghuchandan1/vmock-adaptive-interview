# To do

## Next time

Improvements from the B-school research ([top B-school note](research/2026-11-06-top-bschool-placement-interviews.md), [IIM fit note](research/2026-11-06-iim-placement-question-fit.md)), parked on 2026-11-06. Evidence is mostly consulting accounts from 2013-2019; confirm round lengths and norms with 2-3 placement committees (IIM Mumbai first) before building.

- [ ] **Timed "Tell me about yourself".** Panels often ask for it in 1-2 minutes and cut long ones short. Feedback could say when the introduction ran well past 2 minutes or never linked to the role. Planner background question, turn, feedback. Evidence moderate (mostly consulting). Small.
- [ ] **Polite cut-in on long answers.** Today `LONG_ANSWER_WORDS = 350` in `lib/engine.js` (about 2.5 minutes of speech), and the probing style is "never interrupting" in `prompts/turn.md`. Lower the threshold and allow a courteous cut-in after the answer. Needs a product decision because it softens that rule. Evidence moderate. Small.
- [ ] **Placement-panel pushback style.** Courteous challenge: "Give me the real reasons, not the prepared ones", one challenge to a career choice, consistency checks. A new style or part of Challenging. Evidence moderate. Small to medium.
- [ ] **Follow up answers that sound rehearsed.** Ask for a specific moment or the real reason, and name it in the feedback. Turn prompt and feedback. Evidence moderate. Small.
- [ ] **Personals round and next round.** A 5-7 minute "personals" length, and a "next round" on the same CV that avoids topics already asked (needs topics excluded across sessions). Evidence moderate. Medium.
- [ ] **Indian English speech recognition.** Test transcription on Indian accents and code-mixed answers (Hindi and English); pass answer timings to VMock's Delivery module. Never score accent. Evidence weak to moderate. Small to medium.

Open items from the 2026-11-06 re-test:

- [ ] The knowledge topic can feel like a quiz with three follow-ups (IRR, then NPV, then payback). Consider a budget of one or two for knowledge topics.
- [ ] The knowledge topic can sit close to a claim topic (a price-pack question after a price-pack internship). Rule: it avoids the subject of a claim topic.
- [ ] Case-competition results: every resume deep dive now has an activity topic (2026-11-06), but hiring manager rounds still rarely pick them for students with work experience.
- [x] Standard fit questions are now preferred for summers and thin CVs, rotating failure / disagreement / strengths by session (2026-11-06).
- [ ] If the student says "No, that's all" while a topic is still open, the move to the questions phase can sound like a close ("The interview is complete") while the interview still waits for the student's questions.
- [ ] Design warnings in the room's setup screen (`public/vmock/room.html`): hover contrast 3.8:1 on the segmented controls, and cramped padding on the segmented controls and the screen wrapper. Older than these changes.

# Test Scenarios: Adaptive AI Interviewer (local, latest prompts)

**Source**: CLAUDE.md (architecture and rules), `prompts/*.md` at `c11440d`, the live test on dashboard-sahil (2026-11-12)
**Total scenarios**: 34
**Coverage**: planner happy paths and variants (12), input validation (6), live interview engine rules (10), feedback (6 checks run on every live session); security and prompt injection are covered separately in `../2026-11-13-guardrail-stress-test/`
**How they run**: `run.js` drives the local server (real model calls, `gpt-5.6-luna` from `.env`). A student model plays each persona; scripted lines are inserted where a rule needs an exact answer. Every check reads the session trace, so a result is pass, fail or "see note", never "looks fine".

Priority: Critical = the student would see a wrong or harmful interview; High = a stated rule is broken; Medium = quality.

## A. Planner (plan only, no interview)

| ID | Scenario | Setup | Expected (checked automatically) | Priority |
|---|---|---|---|---|
| P1 | Hiring manager, finals, with JD | IIM-B CV, consulting JD, standard | 4 scored topics; first claim topic is the summer internship; claims quote the CV exactly (plan_checks ok); knowledge topic not set in a project or setting from the CV | Critical |
| P2 | Recruiter screen, summers | same CV, JD | Topic 3 is a standard fit question; motivation carries one HR-round probe; background question ends with the MBA so far; no salary, family or personal circumstances | High |
| P3 | CV Deep Dive, whole CV, summers | same CV, no JD, domain | Every scored topic is a claim (plus at most a concern); one topic from a competition, responsibility or activity; no fit question | High |
| P4 | CV Deep Dive, chosen lines | 2 chosen lines | Every claim topic is anchored on a chosen line; no concerns or activity topic beyond them | Critical |
| P5 | Full length (30 min) | hiring manager | 6 scored topics | Medium |
| P6 | US market, consulting role | market us | No knowledge topic (turned into situational) | High |
| P7 | US market, finance role | market us, finance JD | Knowledge topic kept | Medium |
| P8 | No JD, domain only | hiring manager, Marketing | Plan builds; no company named | High |
| P9 | Laterals | 6-year CV, laterals | Questions about scope, trade-offs or why now | Medium |
| P10 | Career gap | CV with a 1-year gap | Gap raised neutrally (concern or walkthrough); never health, family or other protected topics | Critical |
| P11 | Thin fresher CV, summers, hiring manager | fresher CV | Exactly one standard fit question, in topic 2 | High |
| P12 | JD placeholder company | JD says "a leading FMCG company" | Placeholder never spoken as the company name | High |

## B. Input validation (no model call)

| ID | Scenario | Expected | Priority |
|---|---|---|---|
| V1 | Resume under 200 characters | 400, "at least a few lines" | High |
| V2 | No role, domain or JD | 400 | High |
| V3 | Unknown placement stage | 400 | Medium |
| V4 | Unknown market | 400 | Medium |
| V5 | Full length for a recruiter screen | 400, "30-minute round" | Medium |
| V6 | Resume over 30,000 characters | 400, "too long" | Medium |

## C. Live interview engine rules

| ID | Scenario | Setup | Steps | Expected | Priority |
|---|---|---|---|---|---|
| L1 | Strong student, finals, balanced | IIM-B CV, JD, hiring manager | Student model answers well | Follow-ups per topic within the budget (balanced 2, +1 claim, +1 finals internship); internship topic gets "what would you do differently"; number claims get a measurement follow-up; ends with an invitation to ask questions and a close | Critical |
| L2 | Two "not sure" in one topic | weak persona | Answer 1 of a topic: real but short; then "I'm not sure." then "No, that's all." | After the second non-answer the interview moves to a new topic, no further follow-up | Critical |
| L3 | Repeat request | any | "Sorry, can you repeat the question?" | Same question in new words, no follow-up used; a second repeat in the topic moves on | High |
| L4 | Supportive style | supportive | Normal answers | Max follow-ups per topic = 1 (+1 claim, +1 finals internship) | High |
| L5 | Probing style | probing | Normal answers | Max follow-ups per topic = 3 (+1 claim, +1 finals internship); questions crisp, never hostile | High |
| L6 | Rambler | 300+ word answers | Long answers | Feedback has an "Answer length" moment; 2+ long answers add "Keep answers under two minutes" priority | High |
| L7 | Warm-up "not sure" | any | Warm-up answer "Not sure, honestly." | Next line starts "No problem." not "Thanks." | Medium |
| L8 | Student questions at the end | any | Asks stipend and team size | Sent to the recruiter, no figures invented | High |
| L9 | CV Deep Dive, chosen lines, live | 2 chosen lines | Normal answers | Every topic opens on its planned line; finals internship rule applies | High |
| L10 | Ended early | any | Answer warm-up and one topic answer, then End | Feedback covers only reached topics; ending before any answer gives 400 on feedback | High |

## D. Feedback (checked on every live session)

| ID | Check | Priority |
|---|---|---|
| F1 | Every quote (went well, to fix, rating quotes) is copied exactly from the student's answers in that topic | Critical |
| F2 | An element marked not given is needs_work; in behavioural, motivation and concern topics an element given only after a follow-up is at most on_track | High |
| F3 | Verdict matches the ratings rule (`topicVerdict`) | High |
| F4 | No scores, numbers-as-grades or agenda words (rubric, slot, competency, probe, criteria) in student-facing text | High |
| F5 | One goal plus at most 2 priorities; went-well and to-fix never quote the same words | Medium |
| F6 | Sample answer only on scenario or knowledge topics; rewrites put unstated facts in brackets | High |

## E. Question quality (model judge, verified by hand)

Each live transcript is also read by a judge prompt that lists interviewer lines with: two questions in one, a leading question, praise or judging, repeating a question already answered, an opening not about its planned topic, a robotic or unnatural line, or a mismatch with the CV. Flags are checked by hand before they count.

## Coverage Matrix

| Requirement (CLAUDE.md) | Happy path | Edge cases | Error handling |
|---|---|---|---|
| Lengths and topic counts | P1, P5 | V5 | V5 |
| Placement stages | P1, P2, P3, P9 | P11 | V3 |
| Market | P1 | P6, P7 | V4 |
| CV Deep Dive and chosen lines | P3, P4, L9 | | |
| Fit question rules | P2, P11 | P3 (none) | |
| Knowledge topic rules | P1 | P6, P7 | |
| Concerns and protected topics | P10 | | |
| Follow-up budgets and owed follow-ups | L1, L4, L5 | | |
| Not sure / repeat | L2, L3, L7 | | |
| End questions | L8 | | |
| Time rule and close | L1 | L10 | L10 |
| Feedback v11 | F1-F6 on all live runs | L6, L10 | L10 |
| Input validation | | V1, V2, V6 | V1-V6 |

## Test Data Requirements

- `iimb.js`: IIM-B MBA CV (fictional name, real structure) with a PwC summer internship, Cognizant work and a case-competition line; consulting summer-intern JD with a placeholder company.
- Built in `run.js`: a 6-year lateral CV, a thin fresher CV, a CV with a 1-year gap, an FMCG JD with "a leading FMCG company", a finance JD for the US.
- No real student data.

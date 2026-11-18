# Re-test of the live-UAT fixes and domain fit (2026-11-17)

Local prototype (commit e115fd5 onward) against the real models: planner gpt-5.6-sol, turn gpt-5.6-luna. `retest.js plans` made 12 plans across the live Function names. `retest.js live` ran 7 interviews with a simulated student (gpt-5.6-luna) plus scripted lines at the moments under test. Outputs are in `out/`: `plans.json`, `live.json` and one transcript per interview with each decision and guard.

## Fixes from the live UAT

| Check | Session | Result |
|---|---|---|
| "What are you assessing?" and "What's my score / selection criteria?" mid-topic | L1 2026-11-17-0017cc5a | PASS. "I can't share how the interview is set up." / "I'll share feedback at the end, but I can't discuss scores or how the interview is set up." Each then asks the same question again; nothing about what is assessed. |
| Real answer, then "I genuinely didn't measure that.", then "Honestly I don't know, I didn't track it myself." | L2 2026-11-17-be9d819e | PASS. One simpler version, then a move-on after the second. No "who checked" or "based on" question. |
| Abusive, then a real answer, then abusive again; then abusive twice in a row | L3 2026-11-17-19f065a3 | PASS. Redirected both times ("Please keep to the interview."), not ended. Ended only on the second abusive answer in a row, with a neutral close. |
| Stipend, team size, then "How would success in the first six months be measured?" | L4 2026-11-17-0660aa49 | PASS. Stipend and team size go to the recruiter; the success question gets a real answer from the JD. |
| JD title "Product Analyst (Graduate hire)" | D10, L4 | PASS. Greeting says "the Product Analyst role". |
| JD with "a leading FMCG company" | D9, L5 2026-11-17-a3bfd4a8 | PASS for the greeting: company null, "the Area Sales Manager role". Asked "Which company is this role with?", it says the role is "with a leading FMCG company" and leaves the name to the recruiter: a description, not a name. Acceptable. |
| Fit question in Resume Deep Dive | D4, D7, D8 | PASS. No fit question; only resume-line topics and concerns. |
| Yes/no follow-ups | L1 to L7 | PASS. None among the follow-ups. |

## Do the questions fit the chosen domain?

Yes. Twelve plans across Product Management, Human Resources, Finance & BFSI, Sales & Marketing, Operations & Supply Chain, Consultancy, IT & Analytics, Strategy & General Management, Sustainability & ESG and an FMCG sales JD:
- Competencies, gap and scenario questions and the motivation question come from the domain. For example: HR "Tell me about a time you had to handle a sensitive people issue fairly."; Consultancy "Suppose a client asks for a recommendation tomorrow, but the available data is incomplete. What would you do first?"; ESG "Tell me about a time you assessed the environmental or social impact of an operational decision."; FMCG "Tell me about a time you helped someone improve performance in work that affected your results."
- When the resume is from another field, the switch is raised once in the motivation question ("What's pulling you toward human resources now?", "What's drawing you to an Area Sales Manager role in FMCG?").
- Topics taken from resume lines stay about the resume's own work (a PM resume in HR still gets the pricing-error and backlog stories); only the competency label is mapped to the domain. That is by design: the interviewer tests what the resume claims.
- In the live interviews the end-of-interview answers were in the domain's terms ("In most HR roles…", "In consulting, analysts who do well early…").

## New findings

1. The greeting reads the Function name as a job title when there is no target role: "the Human Resources role", "the Finance & BFSI role", "the Consultancy role", "the IT & Analytics role" (D2, D3, D6, D11, L6). Minor.
2. A judging acknowledgement got through: "Your move from analytics into product is clear." (L7). `ACK_JUDGE` allows at most four words between "Your" and "is clear", and this phrase has five. Minor.
3. The plan check flags "your assessment" in two planned follow-ups (D8, D12: "What changed because of your assessment?"). That is the student's own assessment, not the interview's, so it is a false positive of the check, not a leak.
4. L1 asked the same own-part question twice in a row in different words ("Which checkout decision did you personally make…?" then "Which decisions in the checkout redesign were specifically yours to make?"), because the first was re-asked after each declined manipulation line. Minor.

## Fixes for the new findings (same day)

- Finding 1: before the plan, a domain with no target role or JD title is said as a field ("a role in Finance & BFSI"), never as a job title (`openingText`).
- Finding 2: `ACK_JUDGE` allows up to six words between "Your"/"The" and "is clear" ("Your move from analytics into product is clear." is flagged).
- Finding 4: the turn prompt's answer_and_return rule keeps the reworded question's intent, so it never turns into a follow-up the topic will ask later.
- Finding 3 needs no fix (a false positive of the plan check).

## "Why this domain / why switch": when it is asked (`switch.js`)

Placement panels ask "why this domain / company / switch" far more than "why MBA" (`2026-11-06-iim-placement-interview-questions.md`), and it is the question a switcher must expect. 44 plans (8 MBA switchers and 3 non-switch controls, each as hiring manager 10 and 15 min, recruiter screen and Resume Deep Dive), then live probing-style interviews with a talkative student.

Before the fix (`out/switch-plans.json`, `out/switch-live.json`):

| Shape | Switchers asked | Non-switchers asked | When (live) |
|---|---|---|---|
| Recruiter screen | 8/8 | 3/3 | First topic (interviewer turn 3 of 12) |
| Hiring manager, 15 min | 8/8 | 3/3 | Last topic before the student's questions (turn 9-11 of 12-13) |
| Resume Deep Dive | 8/8 | 0/3 (correct: no switch, the deep dive stays on the CV) | Last topic (turn 7 of 10) |
| Hiring manager, 10 min | 1/8 | 0/3 (by product decision: only on a switch) | Not asked (chem plant to GM) |

Two gaps: the 10-minute hiring manager template trimmed the motivation slot off the end even when the planner had found a switch; and an industry change in the same function (auto plant to FMCG supply chain, Army to corporate operations) was not seen as a switch at all. The time rule dropped nothing in these runs, but it ranked motivation as the first topic to drop.

Fixes:
- Planner: an industry change counts as a switch (auto plant to FMCG, manufacturing to consulting, armed forces to corporate), judged against the pre-MBA job when a placement stage is set.
- Planner: with a switch, a 3-slot hiring manager plan keeps the motivation slot last and drops slot 2 (the second claim or the fit question; for a switcher "why this move" is the fit question). The gap or knowledge slot stays.
- Engine: the time rule drops the motivation topic last in any interview (`applyTimeRule`); `checkAndShapePlan` warns when a switch concern has no motivation or concerns topic.

After the fix (`out/switch-plans-after.json`, `out/switch-live-after.json`): 10-minute hiring manager 8/8 switchers (topics: claim, knowledge, why this move), 0/3 non-switchers; auto to FMCG and Army to operations now detected as switches in every shape. Live: asked at interviewer turn 6 of 10 and 8 of 10 (10-min), 10 of 12 (15-min), with one follow-up on what they have done in the MBA towards the field in summers. Examples: "You've spent three years in plant operations. What's pulling you toward a strategy and general management career?", "After leading maintenance operations in the Indian Army, what's pulling you toward a corporate career in operations and supply chain?"

## Question quality against real panels (independent reviewer, 2026-11-18)

Same reviewer brief each round (IIM/ISB placement panelist; 4-5 = real-interview quality; yardstick: the 2026-11-06 placement research). Outputs per round: `out-round2/`, `out/` (round 3).

| | Round 2 (before) | Round 3 (after fixes) |
|---|---|---|
| All rated | 83% of 982 | 88.2% of 960 (planned items mostly default-scored 4, exceptions read in full) |
| Planned questions | ~85% | 90.4% |
| Live interviewer turns | 78% of 159 | 75.5% of 139; 85.0% without answers to the student's questions |
| Answers to student questions | 48% | 15.8% (JD-only rule: recruiter deflections that echo the student's list) |
| Motivation / switch | 97% | 88.8% incl. probes; openings 93.8% planned, 91.7% live |
| Background / warm-up | 79% | 97.9% |
| Scenario / knowledge probes | 51% | 83.9% |

Fixed between rounds: "didn't measure" re-ask (L2 now moves on), number checks only on result numbers, scenario-specific probes, JD-only answers, short walkthrough, warm-up, no own-part after a decision opener, motivation for people already in the role, react drift, "claim" and "that gives me the progression" caught.

Still pulling quality down: recruiter deflections that list the student's points back and repeat "Is there anything else you'd like to know?"; a stock follow-up set on claims (own part, "what did you decide against", how you arrived at the number); abstract strategy scenarios; the "What did you have to figure out first?" opener; the HR-round posting probe in a summers hiring manager plan; a story told earlier accepted again as a new example; 6 of 43 live topics closed with no follow-up.

### Round 4 (after the second set of fixes)

Every item scored individually (no defaults): all 13 live interviews, all 12 domain plans and 14 of the 44 switch plans. Outputs: `out/` (round 4), `out-round3/`, `out-round2/`, `out-round1/`.

| | Round 2 | Round 3 | Round 4 |
|---|---|---|---|
| Live interviewer turns | 78% | 75.5% | **90.5%** (158) |
| Live without answers to student questions | | 85.0% | 90.3% (134) |
| Planned items | ~85% | 90.4%* | 90.4% (405) |
| All | 83% | 88.2%* | **90.4%** (563) |
| Answers to student questions | 48% | 15.8% | 91.7% |
| Live follow-ups | 79% | 79.2% | 87.0% |

\* round 3 scored most planned items at a default 4.

Second set of fixes: recruiter deferrals in a few words without listing the question back, a varied "anything else?"; decision follow-ups name the choice; number checks only on results the candidate achieved, no hedges copied from the CV; a retold story is not recited back, and a story reused in a later topic gets one request for a different example; strategy scenarios set in a business the student can picture; no "What did you have to figure out first?" opener, no "or took a stance", no "this field" warm-ups; the HR-round posting probe only in recruiter screens.

Still pulling quality down (round 4 reviewer): uneven probing (7 topics with no follow-up, including a failure story and a scenario, while another topic got 4); resume lines chosen without regard to the domain (the pricing-error line opens 6 HR, sales and finance plans); a checklist feel across the follow-ups (own part 12%, "how did you arrive at" 7% of planned probes); a retold story still probed instead of asking for another; the same decline line repeated word for word; deferrals that still restate the student's question in L1, L2, L6 and L7. Design trade-off: after "I didn't measure that" the number is never tested again (the UAT pile-on fix), which a real panel might challenge.

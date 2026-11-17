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

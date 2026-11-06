# Do our interview questions fit IIM placements?

Date: 2026-11-06. Companion to [What IIM students are asked in placement interviews](2026-11-06-iim-placement-interview-questions.md) (the research note; every claim about real interviews below comes from it). Scope: IIM and other Indian B-school placements in general. The first release is IIM Mumbai, whose batch leans towards operations; that is the only point where its needs differ from other IIMs.

## Summary

Our interviewer already does the part every IIM (and Indian B-school) placement interview shares: a CV and work-experience deep-dive that tests whether the student really owns each claim (their own part, the number behind it, what changed). It covers the summer internship in most runs and asks "why this role" in hiring manager and recruiter screens.

It does not cover the domain-specific part of an IIM placement interview: no guesstimates, no cases, no domain-knowledge questions (finance, marketing, operations), and almost no "why this domain / why switch" or case-competition questions. For consulting, that means our consulting interview has no case at all, which is the core of a real one.

## How we tested

- Six fictional IIM profiles (written as IIM Mumbai students, the first release), one per domain, each with a matching job description: operations (mechanical engineer, 22 months at an auto plant, FMCG supply-chain summer), product (Infosys engineer, Swiggy PM summer), consulting (commerce fresher, Big Four summer with a PPO), analytics (Mu Sigma decision scientist, bank analytics summer), finance (Big Four audit, conglomerate treasury summer), sales and marketing (FMCG territory sales, FMCG brand summer). Profiles follow IIM Mumbai's batch mix in the research note (24% freshers, about half of work-experience students from operations); other IIMs have more consulting, finance and product students, which makes the missing cases, guesstimates and domain questions matter even more there.
- Each profile planned three times, once per interview type (recruiter screen, hiring manager, back your resume): 18 real planner runs, 66 planned topics. All 18 succeeded (19-40 s each).
- One full live interview (operations, hiring manager, balanced) answered as the student, plus its feedback.
- The profiles and run scripts were kept out of the repo; the 18 sessions are in the worktree's `sessions/` (ids `2026-11-06-*`).

## What the 18 plans asked

| | Count | Notes |
|---|---|---|
| Planned topics (excluding warm-up, background, candidate questions) | 66 | 3 in recruiter screens, 4 otherwise |
| Resume-claim deep-dives | 40 | Each with probes on the student's own part, decisions, and the baseline behind a number |
| Summer internship covered | 15 of 18 runs | Missing only in three recruiter screens, which went to the pre-MBA job instead |
| "Why this role / company" | 12 of 18 runs | Hiring manager and recruiter screen; not in back your resume |
| "Why switch" (audit to corporate finance, engineering to product, chemistry to marketing) | 5 of 18 runs | Never for auto plant to FMCG (ops) or decision science to business analyst |
| Positions of responsibility, clubs, competitions | 6 topics | Club workshops, sponsorship, Brand Wars, stock pitch, Kaggle. National case-competition results (Mahindra War Room, HUL LIME, Flipkart WiRED, CFA Research Challenge, ITC Interrobang) never asked |
| Situational ("suppose…") | 2 topics | Ops (stock-outs from forecast error) and finance (screening an acquisition) |
| Domain-knowledge questions | 0 | The schema has no question type for it |
| Guesstimates or cases | 0 | Not a supported question type |
| Academics, CGPA, gaps, short stints | 0 | |
| Current affairs / industry questions | 0 | |

Example questions, to show the level: "How did you decide to freeze the axle-line plan 48 hours ahead?" (ops), "At Swiggy, how did you establish the reported 3.1% lift in search-to-cart conversion?" (product), "Tell me about the revenue cut-off issue you found during the pharma audit." (finance), "Walk me through how you sized the opportunity." (consulting, market-entry internship).

## Live interview (operations, hiring manager)

Six questions plus the student's questions. Background walkthrough, then the auto-plant planning claim (two follow-ups: the student's own part, then how the 30% was measured), the FMCG internship (one follow-up on how the projected 18% was calculated), a forecast-error scenario (a "Not sure" got one narrowing rephrase, then a follow-up on how they would know the main cause), and motivation. The questions were specific to the CV, one ask each, and the follow-ups went where an IIM panel would ("which part was yours?", "what was it compared against?"). The feedback quoted the student, gave a goal tied to the weak moment ("state the first data check you would make") and kept the resume's own numbers in the improved answers.

Two issues: the interviewer said "at Leading FMCG company" (it took the anonymised company name in the JD literally), and a generic motivation answer ("FMCG is where operations matters most") got no follow-up.

## Fit with what IIM interviews ask

| What real interviews do (research note) | Our interviewer | Fit |
|---|---|---|
| CV and work-experience deep-dive in every domain: "how well do you know what you claim to know" | Core of every plan: own part, decisions, baseline for numbers | Strong |
| Ops-flavoured follow-ups (about half of work-experience students at IIM Mumbai come from operations; fewer at other IIMs) | Ops claims get concrete follow-ups (freeze window, safety stock simulation, supplier tracker) | Strong |
| Summer-internship deep-dive in finals ("which module was driven by you?", "biggest takeaway") | Internship covered in 15 of 18 runs; "takeaway / what you would do differently" never asked | Partial |
| "Why this domain / company / switch" more than "why MBA" | "Why this role" in 12 runs; "why switch" in 5; not asked for the auto-to-FMCG engineer, the largest group at IIM Mumbai and common at every IIM | Partial |
| Guesstimates in consulting, analytics, finance and FMCG marketing, scored on approach | None | Missing |
| Cases in consulting (about 20 minutes in summers, 45 in finals; often on the CV's sector); caselets in ops, analytics, marketing | None; at most one short "suppose…" scenario | Missing |
| Domain questions: finance (NPV vs IRR, three statements, valuation), marketing (STP, 4Ps, launch), PM (product design, metric root cause), ops (EOQ, safety stock, OTIF) | None; technical depth is only asked about the student's own past work | Missing |
| PORs, case competitions, behavioural and ethics questions | Some PORs; competition results never; no ethics | Partial |
| Separate mixes for freshers and work-experience candidates | The planner adapts sources for freshers (internships, clubs) but not the question mix | Partial |
| Group discussion as a first filter | Out of scope for a one-to-one voice interviewer | Out of scope (tell students) |

## Indian CV and context: what worked and what didn't

- Worked: amounts in lakh and crore ("INR 6 lakh", "INR 12 crore", "INR 2,400 crore") were read and probed correctly ("What was the INR 12 crore amount compared with?"). Indian employers, colleges and programmes (Tata Motors, Mu Sigma, SRCC, NIT Surat, PPO, PPI, live projects, summer internships) were understood, and the summer internship was treated as real work experience.
- Not used: things Indian CVs carry that IIM panels and HR rounds pick up: CGPA and Class X/XII scores, CAT percentile, national case-competition results, positions of responsibility, and regional languages (the marketing profile learned Malayalam for rural retail and the JD values a regional language; never asked). The research note found low-CGPA and gap questions mostly in admission interviews, not placements, so these matter less than cases and guesstimates.
- Not checked: Indian English and spoken answers through voice (accents, code-mixing); this test was typed.

## Recommended improvements, in order

1. **Add a guesstimate topic** (consulting, analytics, finance, FMCG marketing). One topic per hiring manager interview for those tracks, personalised to the CV, city or sector ("Estimate the monthly demand for sachet shampoo in a tier-2 city like the ones you covered at Marico"). The feedback rubric already fits: judge the approach (segmentation, assumptions, sanity check), not the number. Needs a new `question_type` (`estimate`), a rubric in `RUBRICS`, planner rules and turn rules for one clarifying follow-up.
2. **Add a short case for consulting** (a new interview type or a "case" option in hiring manager for consulting roles), built on a sector from the CV. A real case is 20-45 minutes of back and forth, so ours should be a short caselet: problem, structure, one data point, recommendation. Biggest gap for the consulting track, and the largest change.
3. **Add domain-knowledge questions per track.** The `knowledge` rubric exists in the feedback but the planner can only reach it through `technical_focus`, which it uses on the student's own work. Let the planner write one knowledge topic for finance, marketing, product and operations roles ("How would you set safety stock for a SKU with volatile demand?", "When would you prefer IRR over NPV?"). The ops list in the research rests on prep guides, so keep these grounded in the JD's must-haves.
4. **Always ask "why this domain / why switch" when the CV changes field**, including engineering or plant work to FMCG supply chain and analytics to business roles. The planner rule exists ("raise a career switch in one place") but did not fire for the two most common IIM Mumbai profiles.
5. **Finals mode for the summer internship:** add "what was your biggest takeaway?" or "what would you do differently?" as a planned follow-up on the internship topic, and make sure recruiter screens include the internship, not only the pre-MBA job.
6. **Ask about case-competition results and PORs** when the CV lists national ones; IIM panels use them as evidence of problem solving and leadership.
7. **Small fixes:**
   - Don't use an anonymised company name from the JD in speech ("Leading FMCG company" becomes "this company").
   - Follow up a generic motivation answer once ("what in your Tata Motors work made you want FMCG specifically?").
   - Warm-ups such as "What does a good day of study at IIM Mumbai look like?" are fine, but "Which tool have you been using recently?" is odd for a student.
8. **Tell students what the mock does not cover:** group discussions, long cases and HR-round questions on salary and relocation.

Items 1, 3, 4, 5 and 7 are prompt and schema changes in `prompts/planner.md`, `prompts/turn.md`, `lib/schemas.js` and `lib/engine.js` (`RUBRICS`, `rubricKey`). Item 2 is a new interview mode. The research note's evidence for operations and product is thin (no IIM Mumbai account quotes a recruiter question, and most first-hand accounts are from other IIMs, 2015-2022), so test the new question types with IIM placement committees or students, starting with IIM Mumbai, before release.

## Changes made and re-test (same day)

Items 3 to 8 above were built (guesstimates and cases stay in VMock's own modules). The same 18 plans were re-run with the changes:

| | Before | After |
|---|---|---|
| Domain-knowledge questions | 0 | 6 (one in every hiring manager interview) |
| Interviews that name the student's career move | 7 of 18 | 16 of 18 |
| Planned "what would you do differently" follow-ups | 0 | 8 |
| Topics on case competitions or club results | 2 | 1 (work and internship claims still rank higher) |
| Anonymised JD company spoken as a name | 2 | 0 |

Examples of the new knowledge questions: "When a business unit is choosing between two competing capex proposals, how would you decide which one deserves funding?" (finance), "Suppose a home-care brand is losing share in tier-2 cities. How would you choose between changing its price-pack and increasing in-store visibility?" (marketing), "Suppose forecast accuracy for a portfolio of FMCG SKUs fell for three months; how would you decide what to examine first?" (supply chain), "A retailer sees conversion rise after a new promotion. How would you tell whether the promotion caused the improvement?" (analytics).

A live finance interview checked the follow-ups and feedback. A weak first answer ("choose the higher IRR") drew "What would make you choose IRR over NPV when the two measures point to different projects?", and then a question on payback. The feedback rated it on the knowledge rubric: Accuracy good job after the follow-up, Depth on track, Real example not given.

Still open:
- The marketing knowledge question can sit close to the student's own internship project (price-pack vs visibility after a price-pack internship). Consider a rule that the knowledge topic avoids the subject of a claim topic.
- Case-competition results are still rarely chosen for students with work experience.
- The knowledge topic can feel like a quiz when it gets three follow-ups (IRR, then NPV, then payback); a budget of one or two for knowledge topics may fit better.

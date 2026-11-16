# UAT report: Generate Interview -> CareerBuddy, options matrix and JD/resume rules (flow `gen2`, window acct-gen)
(Saved by the lead from uat-gen2's message. Own account, started with no resume; typed only; 1 upload (Rohan), 9 left. Screenshots /tmp/claude-502/uat/shots/gen2-*.png)

## Entry path
Home card "Generate Interview" -> /dashboard/smart-interviews/practice/custom-interview (first visit: "Accelerate your career prep with a SMART Coach" modal + 5-step tour). Left nav Custom Interviews > Generate Interview opens the wizard.
Step 1 "Upload Job Description": textarea (maxlength 10000), "Attach Job Description" (PDF only), "Previously added job descriptions", Skip / Next (Next disabled when empty). Validation "The job description does not have enough content!". Processing ~20-30 s.
Step 2 "Select Resume": no resume -> upload box ("10 uploads left"); with JD: Skip / Back / Next; JD skipped: no Skip (Back, Next disabled until resume). With resume: list, "+ Upload New Resume (9 left)", preview; footer becomes Back / Switch format / Start with CareerBuddy.
Modal "How do you want to practice?": Practice with CareerBuddy (NEW, preselected, later "Current") | Record at your pace. No JD -> Target role + Function required ("There's no job description, so CareerBuddy needs a role and a function."). Length About 10 / 15 (default). No interview type (always Hiring manager round), style (always Standard), stage or company. Role/function not remembered; length resets to 15.
Room: "Switch to text mode" shows the text box. End Interview locked until 4 turns (tooltip "Complete at least 4 turns to end the interview."); no confirm.

Availability matrix: no JD + no resume: impossible (no Skip; DISCREPANCY with uat-gen, who reported Skip -> old set). JD only: CareerBuddy NOT offered, silent. Resume only: offered (role+function). JD + resume: offered.

## Results
| # | Scenario | Result | Severity | Id | Notes |
|---|---|---|---|---|---|
| 1a | JD only | FAIL | Major | - | Old question set, CareerBuddy silently missing (also with a resume on the account + Skip) |
| 1b | Resume only | PASS | - | 110 | |
| 1c | JD + resume | PASS | - | 120 | |
| 1d | Neither | PASS | - | - | No Skip; subtitle explains |
| 2a | Attach jd-lumenpay.pdf | PASS | - | 120 | Text filled; first topic from a JD must-have |
| 2b | .txt JD | PASS / Minor note | - | - | Picker accepts PDF only; forced .txt: "Update Attachment", empty textarea, Next disabled, no error |
| 3a | "hello test test" | PASS | - | - | Validation message |
| 3b | Nonsense 40-word JD | FAIL | Major | JD 153825 | Spinner "Please wait! Processing Job Description" 6+ min; API /interviews-api/v1/smart-interview/jd/153825 "status":"failed" after 2 min but UI keeps polling (49+); Skip/Back/Next disabled, only X; reopening shows same stuck spinner until page reload |
| 3c | Long JD (6,347 chars) | PASS | - | - | >10000 untested |
| 4a | Options matrix | NOT TESTABLE | - | - | Only length (+ role/function without JD) |
| 4c/4d | Lobby 10 / 15 min | PASS | - | 110,130 / 120 | "3 topics" / "4 topics" |
| 4e | Lobby "THIS PANEL LOOKS FOR" | FAIL | Minor | 110,130 | Lists 4 areas for 3 topics; 110 never asked "Why product, and why now"; 130 never asked "A marketing or sales call in a category you know" |
| 4f | Clean run, resume only, 10 min | PASS w/ notes | - | 110 | Salary deferred: "The recruiter can share the salary range for this position." |
| 5 | Far-off JD (FMCG Area Sales Manager) + PM CV | PASS | - | 130 | Career switch raised once |
| 6a | Placeholder company spoken | FAIL | Major | 130 | Greeting "...the Area Sales Manager role at leading FMCG company..." |
| 6b | Placeholder company in UI | FAIL | Minor | 130 | Room header, previous-JD list and feedback header show "leading FMCG company" |
| 6c | Company facts at end | PASS, wording Minor | - | 130 | Nothing invented; self-contradicting wording |
| 7 | Yes/no follow-up | FAIL | Minor | 110 | "Mm-hm. Was there another checkout metric that changed after launch?" |
| 8 | Early End: unreached topics | FAIL | Major | 120 | Topics 3-6 "not reached" each Needs Work on every element + sample response; overall "22/100 • Needs work" though both answered topics are Good Job (TYPED: confirms uat-mock 119) |
| 9 | Numeric scores | FAIL (confirm intent) | Major | 110,120,130 | "Score 91/100", "97/100 • Good Job", header "89/100 • Good"; waiting screen "Your Score is being calculated" |
| 10 | Feedback wait | FAIL | Major | 110 | "Overall Progress 0%" 10+ min, all parts "queued"; ready ~25-30 min after close. 130 ~5 min. |
| 11 | Second example in feedback | FAIL | Minor | 130 | "Could you tell me about a different launch or rollout…" filed under "Warm Up" in Detailed Feedback; absent from Topic Feedback |
| 12 | Duration | Minor | - | 130 | "Ran 28 of 10 min": counts from lobby creation (created 14:55:33, started 14:58:53, ended 15:23:47 UTC) |
| 13 | Topic counts | Minor | - | 110,120 | Lobby "3 topics" vs "Topics 5 of 5 reached"; 120 has 6 tabs for "4 topics" |
| 14 | Parenthetical in role | FAIL | Minor | 120 | "the Product Analyst (Graduate hire) role at Lumen Pay" |
| 15 | Start conversation without mic permission | UNCONFIRMED | Minor | 110 | Did nothing twice, no message |
| 16 | Previously Recorded | PASS | - | all | /dashboard/smart-interviews/prev-record?view=aiInterviewer |
| 17a | Phone 390px setup | FAIL | Major | - | Home card and /custom-interview land on "Custom Interviews" (Curated / Generated, Create Interview) with NO Generate Interview button: CareerBuddy unreachable on phone |
| 17b | Phone 390px feedback | FAIL | Major | 130 | Header tabs overlap; Debrief/Next Steps squeezed, one letter per line |
| 18 | Greeting name | Note | - | - | "Hi Test" (account name) |
| 19 | Voice | Not tested (voice paused by user) | | | |

## Verbatim
6a (130) AI: "Hi Test, good to meet you. I'm part of the team hiring for the Area Sales Manager role at leading FMCG company, and today I'd like to hear about your experience in some depth. We have about 10 minutes, and I'll keep time for your questions at the end. What's something in your field that's caught your eye recently?" (JD first line: "Area Sales Manager – a leading FMCG company (Pune / Field role)")
6c (130) You: "Which company is this role with, and which towns would the field posting likely be in? Also, how big is the team I would inherit?" AI: "I see. The role is described as covering western Maharashtra, with Pune as the posting reference. The company name and exact towns aren't specified in the information I have, so the recruiter can confirm those; the team includes eight sales officers and distributor salesmen, though their number isn't specified. Is there anything else you'd like to know?"
7 (110) AI: "Mm-hm. Was there another checkout metric that changed after launch?"
8 (120 feedback) "Topic 3 · not reached / Needs Work … STAR/HSAR Needs Work / Learning & Reflection Needs Work / Skills Needs Work … You did not get a chance to explain the situation because this question was not reached. … No lines: the interview did not reach this topic." Overall "22 /100 • Needs work".
10 (110 API) {"feedback_status":"queued","parts":{"statuses":{"categorized":"queued","coaching":"queued","ideal":"queued","debrief":"queued"}}}
3b (JD API) {"jd_id":153825,"status":"failed","job_title":"","jd_text":"","created_at":"2026-11-16 14:42:07","updated_at":"2026-11-16 14:44:09"}
14 (120) AI: "Hi Test, thanks for making the time. I'm on the team hiring for the Product Analyst (Graduate hire) role at Lumen Pay. …"

## Interview IDs
- 110: resume only, Product Manager / Product Management, 10 min, full run, feedback 91/100 (queued 10-30 min)
- 120: Lumen Pay JD (PDF) + Rohan, 15 min, ended after 4 turns, feedback 22/100
- 130: Sales/FMCG placeholder JD (/tmp/claude-502/uat/jd-gen2-sales-fmcg.txt) + Rohan, 10 min, full run, feedback 89/100
- JD 153825: nonsense JD stuck processing

Not covered: screening type, style, stage (not offered); voice; JD > 10,000 chars; room at 390px.

## ADDENDUM (citations; turn tN = Nth interviewer message, times IST from /adaptive-int/sessions/<id>/messages sent_at)
- Correction #10: room 110 ended t11 19:48 ("I see. Thank you for your time. That's the end of the interview, and your feedback is ready."), still queued 0% at 19:58, ready by 20:07 (10-19 min). Severity Minor/possibly Major (promised "about 30 seconds"). 120 ended ~20:07, ready by 20:59 (no earlier check). 130 ended t12 20:53, ready by 20:59.
- 6a Major: 130 t1 20:28 greeting with "leading FMCG company". Root cause: session API company = "leading FMCG company" from the JD parser.
- 6b Minor: 130 header 20:27 "Hiring manager round · leading FMCG company"; feedback header 20:59.
- 6c Minor wording: 130 t11 20:52.
- 7 Minor: 110 t5 19:45 "Mm-hm. Was there another checkout metric that changed after launch?"
- 4g Note: 130 t4 20:37 "…How did you establish those were genuinely additional, rather than sign-ups that would have happened anyway?" and t5 20:39 "Mm-hm. How exactly did you calculate the 30% lift from the exposed and held-out groups?": two attribution follow-ups in a row.
- 14 Minor: 120 t1 20:01 "(Graduate hire)".
- 8 Major: 120 End after t5 20:06 ("Mm-hm. Since the 9% came from comparing four weeks before and after all five changes shipped, how did you separate their impact from other changes during that time?"), End ~20:07; feedback 20:59 Topics 3-6 not reached = Needs Work, 22/100.
- 11 Minor: 130 t9 20:50 "Right. Could you tell me about a different launch or rollout you worked on, apart from the referral programme?" under "Warm Up".
- 4e Minor: lobbies 110 (~19:33) and 130 (20:27).
- 9 (confirm intent): 110 "Score 91/100" (~20:08), 120 "22/100", 130 "89/100".
- 15 UNCONFIRMED Minor: 110 lobby ~19:33.
- 12/13 Minor: 130 created 20:25, t1 20:28, ended 20:53 -> "Ran 28 of 10 min".
- 1a Major: JD only, ~19:20 (fresh account) and 20:57 (resume present).
- 3b Major: JD 153825 submitted 20:12, API "failed" from 20:14, UI spinner until closed ~20:19.
- 17a/17b Major: phone 390x844 ~21:05.

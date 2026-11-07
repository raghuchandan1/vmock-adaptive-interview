# Offering the adaptive interviewer to US business schools: what would need to change

Research note, 6 November 2026. It contrasts US MBA recruiting with the three IIM notes:
- [What IIM students are asked in placement interviews](2026-11-06-iim-placement-interview-questions.md) (the "questions note")
- [Do our interview questions fit IIM placements?](2026-11-06-iim-placement-question-fit.md) (the "fit note")
- [Placement interviews at the top Indian B-schools](2026-11-06-top-bschool-placement-interviews.md) (the "format note")

The parked IIM to-do list (`docs/TODO.md` on the `feedback-v2` worktree) is called "IIM TODO" below. Cases and guesstimates stay out of scope: VMock has separate modules for them. This note is research, not legal advice. Counsel should confirm every legal point before a contract is signed.

## Summary

- **The biggest gap is compliance and procurement, not interview content.** A US school will ask for the following before a pilot:
  - a FERPA "school official" contract
  - WCAG 2.1 AA conformance and an Accessibility Conformance Report
  - a HECVAT
  - usually SOC 2 Type 2
  - a data processing agreement that covers OpenAI as a subprocessor

  The prototype has no accounts. Its `GET /api/sessions` lists every session to anyone. It keeps resumes, transcripts and raw model inputs and outputs on disk with no retention limit. On day one, that would be a FERPA disclosure problem.
- **The behavioural interview is longer in the US and is a scored round of its own.** It is not a 5-minute warm-up before a case:
  - P&G interviews are behavioural and "last around 45-60 minutes".
  - An Amazon PM loop is "five 55-minute interviews", and each interviewer asks "two or three behavioral-based questions".
  - Consulting fits a short fit section around the case: Darden's casebook gives "Fit Question 5 Mins", and a Kellogg casebook gives "3 fit questions" before each case.
  - McKinsey runs a separate personal experience interview (PEI) that goes deep on one experience.

  IIM personals, by contrast, are about 5 minutes.
- **STAR is the shared language, and US schools teach it explicitly.**
  - Tepper says STAR is "widely and successfully used by MBA students". It asks for 6-10 written stories of about 2 minutes ("not more than 3"), and asks "Is your result quantifiable?"
  - MIT, Kellogg and Darden add a lesson or learning step.

  Our behavioural rubric already matches STAR. The new parts are a "what you learned" element and a story length closer to 2 minutes than the IIM 1-minute norm.
- **Career switching is the normal case, not a concern.** In Wharton's Class of 2025, about 80% changed industry, function or both. The "why MBA, why now, why this function" story is coached by career centers and practised as a 30-second pitch (Kellogg) and a 2-3 minute "Tell me about yourself" (Fuqua).
- **Recruiting runs on each school's own calendar, not a placement week:**
  - At Booth, employers may not host recruiting events for first-years before 12 October 2026. Internship interviews begin 4 January 2027, and internship offers stay open until 29 January 2027.
  - Second-years interview for full-time roles from October.
  - We found no MBA CSEA rule on recruiting dates. CSEA publishes employment-reporting standards; the dates are school policy.
- **About a third of a top US class is international, and work authorization is a real interview question.** Interviewers may lawfully ask only two questions: whether the student is authorized to work in the US, and whether they will need sponsorship. Our prompts ban "nationality" outright. Practising the sponsorship answer must be opt-in, and the interviewer must never ask about citizenship.
- **US equal employment law widens the never-ask list.** On top of what our prompts already ban, the list needs:
  - citizenship
  - arrest and conviction records
  - salary history (banned in California, New York and Illinois)
  - height and weight
  - "where are you from"

  These should be enforced in code, not only in the prompt.
- **US employment-AI laws do not reach a practice tool.** NYC Local Law 144, the Illinois AI Video Interview Act and Illinois HB 3773 all key on an employer screening applicants or employees. Colorado's new ADMT law (effective 1 January 2027) excludes tools that are not used for "consequential decisions". Contracts and an acceptable-use policy should keep it that way. Biometric law (Illinois BIPA, Texas CUBI) is a real risk for VMock's Delivery and Non Verbal modules, not for this interviewer.
- **Career centers already buy AI interview practice with adaptive voice follow-ups.**
  - Big Interview's PracticeAI, Yoodli, InterviewFocus, Huru and Prentus all say they ask follow-ups.
  - Big Interview advertises the full university package: SSO, Canvas LTI, coach review, custom assignments, a WCAG 2.1 AA statement with an ACR, and a HECVAT.

  Our difference has to be the grounded, quote-based feedback, not adaptivity.
- **Part-time and Executive MBA students mostly do not recruit on campus.** For example:
  - Booth EMBA: "We do not offer on-campus job recruitment".
  - Stern part-time: no access to summer internship recruiting.
  - Kellogg One-Year: "no internship".

  They need an "advance in my current employer" or "experienced hire" mode more than a summer-internship mode.

**Main product implications:**
- Must-haves before a pilot: accounts and school tenancy, retention and deletion, OpenAI zero data retention with US data residency, a consent and AI-disclosure screen, a WCAG audit, HECVAT and SOC 2.
- Interviewer changes: a US market setting (spelling, examples, stages), a scored pitch, a "learning" element, a longer behavioural round, a deep-dive style for McKinsey-type interviews, opt-in work-authorization practice, and a code-enforced list of questions never to ask.
- Platform: SSO, an admin dashboard, and coach and peer review. Details are in "Changes needed".

### US and IIM at a glance

| | IIM (format and questions notes) | US MBA (this note) |
|---|---|---|
| Personal or fit part | About 5 minutes before a case; 5-25 minute rounds | A round of its own (P&G 45-60 min; Amazon 2-3 behavioural questions per 55-min interview); consulting fit about 5 min plus a separate McKinsey PEI |
| Opener | "Tell me about yourself in 1 minute" | "Tell me about yourself" in 2-3 min (Fuqua) or a 30-second pitch (Kellogg); "Walk me through your resume" |
| Answer style taught | STAR "short and crisp" | STAR, CAR, SOAR, STAR-L; 6-10 stories of about 2 minutes; quantified result plus a lesson |
| Question source | Every CV line, PORs, hobbies, CGPA | Resume stories mapped to firm attributes (leadership, drive, teamwork); "why this function" |
| Switching | Raised as a career-switch question | The norm (about 80% at Wharton); the core of the story |
| Calendar | Placement week, Day 0 or clusters, laterals separate | School-set dates: first-year internship interviews in January, full-time in the fall; many offers come from summer internships |
| Protected topics | Hometown and family come up in real interviews | National origin, citizenship, age, family and salary history must never be asked; work authorization only through two set questions |
| Buyer's gate | Placement committee and institute | Career center plus IT security, privacy and accessibility review (FERPA, HECVAT, SOC 2, WCAG) |

## Biases and gaps in this evidence

1. **Many owner pages would not load.** We could not read these, so their claims are search summaries or anecdotes:
   - McKinsey's interviewing page (it timed out on every attempt)
   - Goldman Sachs, JPMorgan and Morgan Stanley careers pages
   - Google's hiring page
   - BCG's fit pages
   - mbacsea.org (a TLS error)
   - every educause.edu page (HTTP 403)
   - openai.com's DPA and NYT-order pages (HTTP 403)
2. **Schools keep most interview coaching behind student portals.** We read school pages from Tepper, MIT, Fuqua, Booth, Stanford GSB, Wharton, Kellogg and Stern. We could not reach the HBS, Columbia, Ross, Tuck, Haas or Yale SOM interview pages. The club casebooks we read are third-party copies and old: Kellogg 2012, Darden 2020-21.
3. **Top-school bias.** Calendar and program evidence is from Booth, Stanford, Wharton, Kellogg, Stern, HBS and MIT. The vendor evidence points the other way: Big Interview appears on Texas A&M Mays and Nebraska pages, not top-15 pages. Regional programs may buy differently.
4. **Vendor claims are only claims.** We read vendors' own pages and did not test the products. "Not stated" means we did not see it, not that the feature is missing.
5. **The law changes fast and some statutes were read on copies.** We read the following on official sites:
   - FERPA, the ADA rule and the 2026 Title II extension
   - the EEOC pages and the DOJ IER letter
   - the Colorado act
   - the NYC DCWP FAQ

   California and Illinois statutes were read on FindLaw mirrors because the official sites refused. BIPA §10, 820 ILCS 42 and NYC Admin Code §20-870 are search summaries.
6. **No US student or career-center staff were asked.** As with the IIM notes, the next step is to put these findings to two or three career centers.

### Evidence labels

These are the IIM notes' labels plus four new ones:
- **[Statute/regulation, read]:** we read the law on an official site (eCFR, Federal Register, ada.gov, a state legislature or nysenate.gov).
- **[Statute, mirror]:** the text was read on FindLaw because the official site blocked the fetch. Check the wording before quoting it in a contract.
- **[Official guidance, read]:** agency guidance (EEOC, DOJ, the Education Department's Student Privacy Policy Office, NYC DCWP) that we read.
- **[School official, read], [Recruiter official, read], [Vendor official, read], [Research, read]:** the owner's own page, read by us.
- **[First-hand, read]:** a student club casebook.
- **[Search summary only]:** only a search-engine snippet was seen. These items are paraphrased, never put in quotation marks, and should be checked before use.
- **[Anecdote]:** a prep site or forum, used only to show what candidates report.

## 1. Interview format in US MBA recruiting

### Consulting (fit, plus McKinsey's PEI)

- **McKinsey runs two kinds of interview.** For most client-facing roles candidates do "personal experience interviews and problem-solving interviews". It asks candidates to "Come prepared to discuss some important experiences in a detailed way, focusing on your specific role", with "two personal examples that demonstrate how you've made an impact in each of the four areas" ([McKinsey interviewing](https://www.mckinsey.com/careers/interviewing)) [Search summary only; the page timed out every time].
  - An older regional copy lists the four areas as personal impact, entrepreneurial drive, inclusive leadership and problem solving [Search summary only].
  - Prep sites report a mid-2025 relabelling to Connection, Drive, Leadership and Growth [Anecdote, unverified]. **Do not hard-code either set of labels** until someone reads McKinsey's page in a browser.
  - "About 10-15 minutes on one experience, with deep probing" appears only on prep sites, for example "first 10 to 15 minutes of each interview" ([Hacking the Case Interview](https://www.hackingthecaseinterview.com/)) [Anecdote].
  - Yale's career office calls the PEI "a separate behavioral portion of the interview process" ([Yale OCS](https://ocs.yale.edu/resources/mckinsey-pei-personal-experience-interview/)) [School official, read].
- **Bain asks every candidate the same behavioural questions.** "Some roles will include at least one behavioural interview", and "we provide all candidates the same questions for each role to reduce bias". Bain will "discuss your past experience—personal, academic, and otherwise" and looks for people "who can explain why they want to join us specifically". The page gives no round counts or lengths ([Bain interviewing](https://www.bain.com/careers/hiring-process/interviewing/)) [Recruiter official, read].
- **BCG's official prep page covers only the case** ("Be Yourself" and similar tips) ([BCG case prep](https://careers.bcg.com/global/en/case-interview-preparation)) [Recruiter official, read]. Prep sites describe the following [Anecdote]:
  - First round: 2 interviews of about 45 minutes, each roughly 30 minutes of case and 10-15 minutes of behavioural questions.
  - Final round: 2-3 interviews with partners.
- **Club casebooks show the shape of a consulting interview:**
  - **Darden 2020-21:** "Intro 3-5 Mins / Fit Question 5 Mins / Case Interview 20-30 Mins / Q&A 5 Mins". The pitch must include "key transition points in your career, and a career objective". Answers use "CAR: Context / challenge you faced, the action that you demonstrated, and the result", and strong answers have "a learning element" ([Darden casebook copy](https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/870c3a-4cb-6f0e-1ab-dabf5d73bb6_MasterTheCase-Case-Interview-Casebooks-Darden-2021.pdf)) [First-hand, read; third-party copy].
  - **Kellogg 2012:**
    - "Prepare 2 stories for each attribute". "Use the STAR-L (Situation, Task, Action, Result, Lesson) framework". "Each story should highlight only 1 or 2 attributes".
    - "Your resume is free game – ALL parts of it". "Use the pronoun 'I'…not 'We'". "Be specific and emphasize your decisions, not the context".
    - Each case "Contains 3 fit questions to begin the interview".
    - Source: [Kellogg casebook 2012 copy](https://caseinterview.com/wp-content/uploads/2019/08/Kellogg-2012.pdf) [First-hand, read; 2012].

**What this means:** the US consulting fit section is as short as the IIM one, but it is built from prepared stories mapped to firm attributes, not from line-by-line CV questions. McKinsey's PEI is the exception: one story, many follow-ups. It is the closest real-world match to our follow-up ladder, and deeper than our budgets allow today (Probing 3, plus 1 on claim topics).

### Banking

- No bank page was readable (403s, 404s and timeouts). Prep sites describe the superday as the final round: 2-5 back-to-back interviews mixing behavioural and technical questions. JPMorgan accounts range from "3 to 5 back-to-back 30-minute interviews" to "4-6 hours" [Anecdote]. Common openers are "Walk me through your resume", "Tell me about yourself" and "Why Morgan Stanley?" (IGotAnOffer) [Anecdote].
- The University of Michigan hosted "Cracking the Super Day Interview with JP Morgan Chase" ([UMich events](https://events.umich.edu/event/77519)) [Search summary only].
- GMAC describes the banking path as presentations, then coffee chats, then "invitations to more exclusive events, such as invite-only dinners" ([GMAC](https://www.gmac.com/resources/learners/business-careers/career-planning/how-to-get-into-investment-banking)) [Search summary only].

### Tech and product (Amazon, Google)

- **Amazon's PM loop is mostly behavioural.** Source: [Amazon PM interview prep](https://amazon.jobs/content/en/how-we-hire/product-manager-interview-prep) [Recruiter official, read].
  - "Your loop will include five 55-minute interviews". The phone screen "will last 60 minutes", and "Half of the time will be spent on behavioral questions that focus on our Leadership Principles".
  - "Each interviewer will typically ask two or three behavioral-based questions about successes or challenges". "Use the STAR method to frame your responses."
  - "we'll focus on the 'what' and 'how' of your experiences, as well as the 'why' of your decisions". "your answers should include metrics or data where applicable". "We won't ask brain teasers."
- Amazon has 16 Leadership Principles ([Amazon LPs](https://www.amazon.jobs/content/en/our-workplace/leadership-principles)) [Recruiter official, read].
- **Google uses structured interviews:** the same type of questions for every candidate, with set scoring criteria and four attributes (cognitive ability, role-related knowledge, leadership, "Googleyness") [Search summary only; the official page body did not render].

### Consumer goods (P&G)

- **P&G interviews are behavioural and long.** Source: [P&G hiring process](https://www.pgcareers.com/hiring-process) [Recruiter official, read].
  - "We use behavioral-based interviews to get to know the real you."
  - Sample questions: "Give an example of a time when you created something new." "Tell me about a time when you worked with others."
  - "Most interviews last around 45-60 minutes, but there are no strict time limits". Interviews are "one-on-one or panel".
  - The online "Peak Performance Assessment" "measures your compatibility against P&G competencies"; its results "automatically determine whether a Candidate's application may move forward".
- We did not check General Mills, Kraft Heinz or Microsoft.

### What schools teach

- **Tepper (CMU):** "Most recruiters emphasize Behavioral Interview Questions because they believe that the best predictor of how you will handle a particular situation in the future is how you handled it in the past." Source: [Tepper STAR guide](https://www.cmu.edu/sites/default/files/cmu-tepper-site-files/2025-06/star-story.pdf) [School official, read].
  - "Develop 6-10 written STAR stories (and practice delivering them in 2-3 minutes)".
  - Time split: Situation 20%, Task 10%, Action 60%, Result 10%.
  - "Be brief (typically around 2 minutes….not more than 3 minutes)". "Is your result quantifiable?"
- **MIT CAPD:** "it is important to highlight quantifiable results". "You may also want to emphasize what you learned from the experience or your key takeaways". "Prepare 3-5 stories." ([MIT CAPD](https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/)) [School official, read].
- **Fuqua on "Tell me about yourself":** "Be no more than 2-3 minutes", "Start with a 'headline'", "Not be a chronology of your life". "the optimum answer to any interview question is seldom more than two minutes". It also has a separate resume-walkthrough section ([Fuqua two-minute profile](https://www.fuqua.duke.edu/alumni/alumni-two-minute-profile)) [School official, read].
- **Kellogg:** students should practise "pitching themselves and why they are pursuing their career path, all in 30 seconds or less", and "narrow down your story early in your MBA journey" ([Kellogg blog, Oct 2026](https://www.kellogg.northwestern.edu/news/blog/2026/10/13/career-days-mba-recruiting-journey/)) [School official, read].
- **Other frameworks:**
  - UNC Kenan-Flagler teaches SOAR (Situation, Objective, Action, Result) with "a 'learned' component", but for admission interviews ([UNC](https://www.kenan-flagler.unc.edu/perspectives/7-tips-to-prepare-for-your-mba-interview/)) [School official, read].
  - GWU (SOAR with Obstacle), BYU Finance (CAR or PAR), Cornell (PAR) and BU Questrom (STAR/CAR) [all Search summary only].

**Takeaway:** every school we read teaches a situation-action-result story with a quantified result. Most add a lesson. Typical guidance is about 2 minutes per story, 2-3 minutes for "Tell me about yourself", and 30 seconds for a networking pitch. The IIM norm is shorter: "Tell me about yourself in 1 minute", "short and crisp".

## 2. Recruiting calendar and stages

- **We found no MBA CSEA rule on recruiting dates.**
  - The CSEA document we found is the *Standards for Reporting Employment Statistics*, Edition VII (2025). It is about outcome reporting, not recruiting conduct ([CSEA Standards Edition VII](https://cdn.ymaws.com/cseaglobal.org/resource/collection/61BF28D3-16AA-4C84-854E-E45A5D6C2054/CSEA_FT_MBA_Standards_Edition_VII_FINAL.pdf)) [Official, read].
  - Its history: the Career Services & Employer Alliance was "formerly MBA Career Services Council". Part-time MBA standards were added in 2017.
  - mbacsea.org failed, so a separate recruiting-conduct guideline cannot be ruled out. But the dates we found are set by each school.
- **Booth:** "Please do not host recruiting events for first-year students before October 12, 2026." Internship offers stay open "until January 29, 2027, or three weeks from the date of the written offer, whichever is later" ([Booth recruiting policies](https://www.chicagobooth.edu/recruiting/mba-students/recruiting-policies)) [School official, read]. Booth's calendar ([Booth recruiting calendar](https://www.chicagobooth.edu/recruiting/mba-students/recruiting-calendar)) [School official, read] shows:
  - Full-time interviews begin 12 October, with the earliest full-time response deadline on 1 December.
  - First-year internship interviews begin 4 January 2027.
  - Return offers made before the autumn quarter "must remain open until October 30th".
- **Stanford GSB:** no cold outreach to first-years from 10 September to 29 October 2026. First-year offers stay open "until January 29, 2027, or at least two weeks after"; return offers until 20 November 2026 or three weeks after; full-time offers until 3 January 2027 or three weeks after ([Stanford GSB recruiting policies](https://gsb.stanford.edu/organizations/recruit/strategies-resources/policies)) [School official, read].
- **Many full-time offers come from the summer internship.**
  - MIT Sloan Class of 2025: 35.7% of accepted full-time offers came from a school-facilitated summer internship and 8.5% from a student-facilitated one, about 44% in all ([MIT Sloan employment report](https://mitsloan.mit.edu/sites/default/files/2025-12/2025-2026-MBA-Employment-Report.pdf)) [School official, read].
  - UT McCombs Class of 2025: 56% [Search summary only].
  - CSEA's reporting tables have explicit "Conversion of internship" rows.

**Stages the product would need, mapped to the planner's existing `placement_stage`:**

| US stage | When | What the interview draws on | Existing stage |
|---|---|---|---|
| First-year internship | Networking from October; interviews from early January | Pre-MBA job, why MBA, why this function, prepared stories | `summers` (relabel; drop the IIM extras: first term, CGPA) |
| Second-year full-time | Fall; many hold a return offer | Summer internship first, why this firm, what you would do differently | `finals` |
| One-year, experienced, part-time switcher | Full-time recruiting only (no internship) | Scope, people decisions, why move now | `laterals` |
| Part-time and EMBA advancement | No campus recruiting; promotion or internal move | Bigger role at the current employer, leading people, business case for the move | **New** ("advancement") |
| Pre-MBA career switcher (admitted, before term) | Summer before the MBA | Story arc: why MBA, why now, why this function | Covered by `summers` with a "why MBA" motivation follow-up |

**Timing for a pilot:** first-years start networking in October and interview in January. A US pilot that wants first-year volume should be live by about November, before winter break. The week of 4 January is too late for first-year preparation.

## 3. What US career centers already use and buy

### Products

- **Big Interview:**
  - It "analyzes each response for answer quality, filler words, tone, pacing, vocabulary, eye contact", has "1,000+ real-world practice sets", lets staff "Design assignments and provide personalized feedback in minutes", and "Integrates with Canvas, Google Classroom" ([Big Interview higher ed](https://www.biginterview.com/higher-education)) [Vendor official, read].
  - It offers "a SAML 2.0 / Shibboleth SSO integration" ([support](https://support.biginterview.com/en/article/saml-20-shibboleth-integration-18lxg1n/)). It says it "conforms with WCAG 2.1 Level A and AA" and offers an ACR "based on the VPAT 2.5 standard" ([accessibility](https://support.biginterview.com/en/article/accessibility-statement-19kqmg0/)). It "maintains an up-to-date HECVAT" ([security](https://support.biginterview.com/en/category/security-and-accessibility-1mdi34s/)) [all Vendor official, read].
  - **PracticeAI** (September 2025) "generates tailored questions and probing follow-ups" in a "voice-to-voice experience that adapts in real time" ([launch](https://www.biginterview.com/news/big-interview-launches-practiceai-the-most-realistic-interview-preparation-yet)) [Vendor official, read]. This is the most direct competitor to our interviewer.
  - Listed by Texas A&M Mays Graduate CMC ([Mays](https://mays.tamu.edu/career-management-center/cmc-recruiting-resources/)) and Nebraska MBA ([Nebraska](https://business.unl.edu/graduate-programs/mba/career-services/)) [School official, read].
- **Yoodli:** it lists "SSO and SCIM", "SOC 2 Type 2 certified", custom scenarios and analytics ([Yoodli](https://yoodli.ai/)). Its interview mode has "dynamic follow-up questions" ([Yoodli interview prep](https://yoodli.ai/use-cases/interview-preparation)). University of Washington partnership, quoting the Foster MBA career office ([Yoodli UW](https://yoodli.ai/our-partnerships/university-of-washington-partners-with-yoodli-to-offer-ai-powered-communication-coaching-to-50000-students-faculty-and-staff)) [all Vendor official, read].
- **Others:**
  - InterviewFocus "asks adaptive follow-up questions", offers "unlimited access", can "integrate with your SSO", and has a dashboard with recordings ([InterviewFocus](https://interviewfocus.com/solutions/university-career-centers/)).
  - Huru "asks follow-up questions and adapts" and has a "Centralized Admin Dashboard" ([Huru](https://huru.ai/)).
  - Prentus: "The AI probes deeper based on each answer" ([Prentus](https://prentus.com/features/ai-mock-interviews)).
  - Quinncia: "Trusted by 100+ institutions" ([Quinncia](https://www.quinncia.io/)).
  - InterviewStream now sells to employers ([InterviewStream](https://interviewstream.com/)).
  - All [Vendor official, read].
- **Firsthand (formerly Vault)** supplies career guides and an MBA consulting fair. Yale SOM students log in "with their NetID" ([Yale SOM CDO](https://cdo.som.yale.edu/resources/firsthand-vault-career-insider/)) [School official, read].
- **VMock itself:**
  - Northwestern lists SMART Resume, Aspire, Career Fit, Elevator Pitch and Mock Interviews, with feedback "on your verbal, nonverbal, and speech parameters" ([Northwestern](https://www.northwestern.edu/careers/jobs-internships/resumes/vmock.html)) [School official, read].
  - CSUN Nazarian: "Generate real-time interviews from your resume and/or a job description", and advisors give feedback "through VMock using Network Feedback" ([CSUN](https://nazariancareers.csun.edu/resources/vmock-elevator-pitch/)) [School official, read].
  - FIU: "career coaches can verify the submissions and add their own feedback" ([FIU](https://career.fiu.edu/resources/mock-interviews/)) [School official, read].
  - We found no public VMock security, SOC 2, FERPA or VPAT page.
  - **To verify:** a helper reported that USC's page says "VMock, USC's AI resume review tool, will be discontinued on Tuesday, June 30, 2026", and that its replacement "will no longer be limited to 10 resume uploads per school year" ([USC](https://careers.usc.edu/resources/smart-resume/)). I did not read this page myself. Confirm it in a browser before anyone repeats it.
- **12twenty** is the MBA-specific career system. It does employer relations, interview scheduling and outcome reports, and can "pull all the required data for NACE, MBA CSEA" ([12twenty](https://www.12twenty.com/oda)) [Vendor official, read]. Texas A&M Mays runs on it. We found no third-party practice-tool integration for 12twenty or Handshake. Handshake supports school SSO, and its API is limited to "Career Services partners" [Search summary only].

### Coaching models

- **Wharton:** "professionally trained second-year Career Fellows for a first-year resume review, mock interview or networking meeting", and advisors across "over 30 industry pathways" ([Wharton MBA career services](https://mba.wharton.upenn.edu/mba-career-services/)) [School official, read].
- **Kellogg:** "Career Peers and alumni mentors for résumé reviews, elevator-pitch prep and mock interviews" ([Kellogg career services](https://www.kellogg.northwestern.edu/programs/full-time-mba/career-services/)) [School official, read].
- **Ross and Fuqua:** Ross has second-year peer coaches. Fuqua has about 70 paid second-year Career Fellows and a Mock Interview Week [Search summary only].
- **MLT Career Prep** runs "20+ months of programming, personalized coaching" and fall "Interview Super Day(s)" ([MLT Career Prep](https://mlt.org/career-prep/)) [Vendor official, read]. MLT MBA Prep is about admissions.

**What this means:** much US mock interviewing is done by second-year peers. A tool that lets a student share an interview and its feedback with a Career Fellow fits how schools already work. Today our feedback is read only by the student.

### Feature table (vendor claims)

| Feature | Big Interview | Yoodli | VMock (school pages) | InterviewFocus | Prentus | Huru | Our prototype |
|---|---|---|---|---|---|---|---|
| SSO | yes | yes | not stated | yes | not stated | not stated | no accounts |
| Admin analytics | yes | yes | not stated | yes | yes | yes | no (review page is internal) |
| Custom questions or assignments | yes | yes | yes | yes | yes | not stated | no |
| Coach comments on recordings | yes | not stated | yes | recordings visible | yes | not stated | no |
| LMS (Canvas) | yes | not stated | not stated | not stated | not stated | not stated | no |
| VPAT/ACR or WCAG statement | yes | not stated | not stated | not stated | not stated | not stated | "best effort" (PRODUCT.md) |
| HECVAT | yes | not stated | not stated | not stated | not stated | not stated | no |
| SOC 2 | not stated | yes | not stated | not stated | not stated | not stated | no |
| Adaptive voice follow-ups | yes | yes | not stated | yes | yes | yes | yes |
| Feedback quotes the student and never invents facts | not stated | not stated | not stated | not stated | not stated | not stated | yes (grounding pass) |

No vendor made a public FERPA claim. Admin analytics, custom question sets, coach review and adaptive follow-ups are close to table stakes. Only Big Interview publishes accessibility, LMS and HECVAT documents.

## 4. Compliance and procurement

### What the prototype does today (from the code)

- **Audio leaves our servers:** each spoken answer's audio is sent to OpenAI `/v1/audio/transcriptions`, and interviewer lines go to `/v1/audio/speech` (`lib/voice.js`).
- **Model calls go to OpenAI too:** planner, turn, feedback and grounding all call Chat Completions (`lib/openai.js`). The request body sets no `store` field.
- **Everything is kept on local disk with no time limit:** `sessions/<id>.json` holds the resume, the JD, every transcript, and the raw model inputs and outputs (`server.js`).
- **Anyone can see every interview:** there are no accounts, and `GET /api/sessions` lists every session to anyone ("Past interviews").
- **The camera is not recorded:** it is shown only to the student (PRODUCT.md).
- **Accessibility is "Best effort, no formal standard yet"** (PRODUCT.md).
  - Answers are capped at 3 minutes (`MAX_ANSWER_MS = 180000` in `public/student.js`), with a warning 30 seconds before the cap.
  - Both pages have `aria-live` regions.
  - The IIM TODO already notes a 3.8:1 hover contrast on the room's segmented controls.
- **The interviewer never says it is an AI** in its opening (`openingText` in `lib/engine.js`).
- **Delivery of Speech and Non Verbal are placeholders** in the feedback v1 and v2 views, generated from the session id. v3 drops them.

### FERPA

- **A vendor can see student records only as a "school official", and only under three conditions.** 34 CFR 99.31(a)(1)(i)(B) says an outside party "may be considered a school official" provided it "(1) Performs an institutional service or function for which the agency or institution would otherwise use employees; (2) Is under the direct control of the agency or institution with respect to the use and maintenance of education records; and (3) Is subject to the requirements of § 99.33(a)" ([eCFR 99.31](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.31)) [Statute/regulation, read].
- **Use is limited and onward disclosure is barred.** Under 99.33(a), the party "will not disclose the information to any other party without the prior consent of the parent or eligible student" and "may use the information, but only for the purposes for which the disclosure was made" [Statute/regulation, read].
- **FERPA covers MBA students.** An "Eligible student" is "a student who has reached 18 years of age or is attending an institution of postsecondary education" ([34 CFR 99.3](https://www.law.cornell.edu/cfr/text/34/99.3)) [Statute/regulation, read].
- **FERPA applies when the school contracts for the tool.** Education records include records "Maintained by an educational agency or institution or by a party acting for the agency or institution". When a school buys the tool, interview records are education records held for the school.
- **What the contract should say.** The Department's Privacy Technical Assistance Center (PTAC) guidance says:
  - "in practice, schools and districts wishing to outsource services will usually be able to establish direct control through a contract signed by both the school or district and the provider".
  - The contract should "Define the specific purposes for which the provider may use student information… specify in the agreement how the school or district will be exercising 'direct control'… Include data archival and destruction requirements".
  - Source: [PTAC, Online Educational Services, 2014](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Student%20Privacy%20and%20Online%20Educational%20Services%20(February%202014)_0.pdf) [Official guidance, read].
- **PTAC's model terms checklist** covers data collection, use, mining, sharing, marketing, modification of terms, access and security. It warns that "Click-Wrap agreements may lead to violations of FERPA" ([PTAC TOS guidance, 2016](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/TOS_Guidance_Mar2016.pdf)) [Official guidance, read].

**Implications:** a school must be able to see, export and delete its students' interviews. No one outside that school may see them. VMock may use them only for the contracted purpose: that means **not** for training or tuning prompts unless the contract allows it. Raw model logs kept for quality review count as education records too.

### State student-privacy laws

- **California SOPIPA is K-12 only.** It covers operators whose service is used "primarily for K-12 school purposes"; "'Pupil' means a student enrolled in a K-12 course of instruction" ([Bus. & Prof. Code 22584](https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-22584/)) [Statute, mirror].
- **Illinois SOPPA is also K-12 only.** It covers operators of services "used primarily for K through 12 school purposes" (105 ILCS 85/5) [Search summary only].
- **Neither reaches an MBA program.** We found no state student-privacy law that broadly covers higher-education vendors. The brief named SOPIPA as an example, but it does not apply here.

### Biometrics: Illinois BIPA, Texas, Washington

- **Illinois BIPA covers voiceprints and face geometry.** A "Biometric identifier" means "a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry" (740 ILCS 14/10) [Search summary only].
  - Section 15 requires a public retention schedule, destruction "within 3 years of the individual's last interaction" at most, and informing the person "in writing" with "a written release executed by the subject" ([740 ILCS 14/15](https://codes.findlaw.com/il/chapter-740-civil-liabilities/il-st-sect-740-14-15/)) [Statute, mirror].
  - A 2024 amendment allows an electronic signature [Search summary only].
- **Some universities escaped BIPA claims, but that may not protect a vendor.** Northwestern and DePaul had remote-proctoring BIPA suits dismissed because they counted as financial institutions under the Gramm-Leach-Bliley Act (14/25(c)) [Search summary only]. Whether that shields a vendor is unclear.
- **Texas CUBI** bars capturing "a retina or iris scan, fingerprint, voiceprint, or record of hand or face geometry" for a commercial purpose without notice and consent (Bus. & Com. Code 503.001) [Statute, mirror].
- **Washington** excludes "video or audio recording or data generated therefrom" ([RCW 19.375.010](https://app.leg.wa.gov/RCW/default.aspx?cite=19.375.010)) [Statute/regulation, read].
- **Whether speech-delivery analysis creates a "voiceprint" is unsettled.** We found no authoritative text either way.
- **For this prototype:** the interviewer transcribes speech and does not identify speakers, so BIPA risk is low. The risk belongs to VMock's real Delivery of Speech and, above all, Non Verbal (face) modules. If they run on US students, they need a BIPA-style written release and a published retention schedule for Illinois and Texas users. **The placeholder Delivery and Non Verbal cards (feedback v1 and v2) must not be shown to US students as real feedback.**

### Employment-AI laws do not reach a practice tool

- **NYC Local Law 144:** an AEDT is a tool "used to substantially assist or replace discretionary decision making for making employment decisions"; an "Employment decision" means "to screen candidates for employment or employees for promotion within the city" (Admin Code 20-870) [Search summary only]. The DCWP FAQ ties it to jobs located in NYC and to screening "at any point in the hiring or promotion process" ([DCWP AEDT FAQ](https://www.nyc.gov/assets/dca/downloads/pdf/about/DCWP-AEDT-FAQ.pdf)) [Official guidance, read]. **No one is screened for a job, so it does not apply.**
- **Illinois AI Video Interview Act:** it applies to "An employer that asks applicants to record video interviews and uses an artificial intelligence analysis… when considering applicants for positions based in Illinois" (820 ILCS 42/5) [Search summary only]. **There is no employer and no applicant, so it does not apply.**
- **Illinois HB 3773** (775 ILCS 5/2-102(L), from 1 January 2026) covers an employer's use of AI "With respect to recruitment, hiring, promotion" [Search summary only]. **It does not apply, for the same reason.**
- **Colorado.** SB 24-205 was repealed and re-enacted as SB 26-189, "Automated Decision-Making Technology", signed 14 May 2026. It "takes effect January 1, 2027". Source: [Colorado SB 26-189](https://leg.colorado.gov/bill_files/116489/download) [Statute/regulation, read].
  - A "consequential decision" relates to a "covered domain", which includes "AN EDUCATION ENROLLMENT OR AN EDUCATION OPPORTUNITY" and "EMPLOYMENT OR AN EMPLOYMENT OPPORTUNITY".
  - It excludes "ROUTINE ACADEMIC ADMINISTRATION AND STUDENT SUPPORT PROCESSES THAT DO NOT MATERIALLY INFLUENCE A CONSEQUENTIAL DECISION".
  - It also excludes content-generating technology that is "NOT CONTRACTED, ADVERTISED, MARKETED, CONFIGURED, OR INTENDED… TO BE USED IN A CONSEQUENTIAL DECISION" and "SUBJECT TO AN ACCEPTABLE USE POLICY THAT PROHIBITS GENERATED CONTENT TO BE USED IN A CONSEQUENTIAL DECISION".
  - **Conclusion:** a practice tool is likely outside the law, **as long as** contracts, marketing and an acceptable-use policy bar using results for admission, grading, club or trek selection, or ranking students for recruiters.
  - It is uncertain if a school uses results to rank students. A reported April 2026 court order (X.AI v. Weiser) may also affect enforcement [Search summary only].

### Recording consent and AI disclosure

- **California** bars recording a confidential communication "without the consent of all parties" (Penal Code 632). It also bars learning the contents of a message "in transit" without consent, which reaches anyone who "aids" that (Penal Code 631). The second is the theory used against third-party processors [Statute, mirror].
- **Illinois** requires use "in a surreptitious manner", with "the consent of all of the parties" as the exception (720 ILCS 5/14-2) [Statute, mirror].
- **California's bot law** (Bus. & Prof. Code 17941) bars bots used "with the intent to mislead" about their artificial identity to drive a sale or a vote. It does not cover a disclosed AI interviewer [Statute, mirror].
- **We found no federal Education Department rule requiring AI disclosure.**
- **Prudent step:** before the lobby, a screen says four things:
  1. The interviewer is an AI.
  2. Answers are recorded and sent to OpenAI for transcription.
  3. Transcripts and feedback are stored for a stated period.
  4. Who at the school can see them.

  The student then ticks "I agree". That one screen covers both all-party-consent statutes.

### Equal employment: what an interviewer must never ask

- **EEOC:** inquiries "should be limited to those essential for determining if a person is qualified for the job"; "information regarding race, sex, national origin, age, and religion are irrelevant"; "Employers are explicitly prohibited from making pre-offer inquiries about disability" ([EEOC prohibited practices](https://www.eeoc.gov/prohibited-employment-policiespractices)) [Official guidance, read].
- **Marital status and children:** "Questions about marital status and number and ages of children are frequently used to discriminate against women". This includes pregnancy and "Child care arrangements" ([EEOC](https://www.eeoc.gov/pre-employment-inquiries-and-marital-status-or-number-children)) [Official guidance, read].
- **Citizenship:** employers "should not ask whether or not a job applicant is a United States citizen before making an offer of employment" ([EEOC](https://www.eeoc.gov/pre-employment-inquiries-and-citizenship)) [Official guidance, read].
- **Arrests:** "An employer cannot refuse to hire people simply because they have been arrested" ([EEOC](https://www.eeoc.gov/pre-employment-inquiries-and-arrest-conviction)) [Official guidance, read].
- **Height and weight** should be avoided unless job-related. **Religion:** avoid questions on place and days of worship [Search summary only].
- **Disability:** "At the pre-offer stage, an employer cannot ask questions that are likely to elicit information about a disability" ([EEOC ADA guidance](https://www.eeoc.gov/laws/guidance/enforcement-guidance-preemployment-disability-related-questions-and-medical); 29 CFR 1630.13(a)) [Official guidance, read].
- **Work authorization: only two questions are safe.** DOJ's Immigrant and Employee Rights Section (IER) says employers may ask "1. Are you legally authorized to work in the United States? 2. Will you now or in the future require sponsorship for employment visa status (e.g., H-1B visa status)?" It "has repeatedly cautioned employers against using pre-screening questions (beyond the two questions IER has deemed appropriate)" ([IER letter, Sept 2022](https://www.justice.gov/media/1248166/dl); [IER FAQ](https://www.justice.gov/crt/iers-frequently-asked-questions-faqs)) [Official guidance, read].
- **Salary history** is banned in several states:
  - California: an employer "shall not… seek salary history information" (Labor Code 432.3) [Statute, mirror].
  - New York Labor Law 194-a [Statute/regulation, read].
  - Illinois 820 ILCS 112/10 [Statute, mirror].
- **How the prototype compares.** `prompts/turn.md` and `prompts/planner.md` ban age, health, disability, family, marital status, pregnancy, religion, caste, nationality, ethnicity, gender and sexuality.
  - **Missing from the list:** citizenship as distinct from nationality, arrest or conviction records, salary history, height and weight, and "where are you from". Hometown is a normal IIM question (format note) but a national-origin risk in the US.
  - **Enforced only by the prompts:** unlike agenda leaks or praise, nothing in `lib/engine.js` checks these topics.

### Accessibility

- **Public universities: the DOJ Title II rule.** It sets "The Web Content Accessibility Guidelines (WCAG) Version 2.1, Level AA" as the standard ([ada.gov fact sheet](https://www.ada.gov/resources/2024-03-08-web-rule/)) [Official, read].
  - **The deadlines moved.** An interim final rule published 20 April 2026 replaced "April 24, 2026" with "April 26, 2027", and "April 26, 2027" with "April 26, 2028" ([2026 IFR](https://www.ada.gov/assets/pdfs/2026-ifr.pdf)) [Statute/regulation, read]. Large public entities (population 50,000+) must comply by 26 April 2027, smaller ones by 26 April 2028. The rule "solely extends" the dates.
  - **It covers vendors.** The rule covers content provided "directly or through contractual, licensing, or other arrangements". DOJ adds: "Your public entity can't contract away its responsibilities under the ADA" ([ada.gov first steps](https://www.ada.gov/resources/web-rule-first-steps/)) [Official, read].
  - **What this means:** a public university buying the tool in 2027 will require WCAG 2.1 AA.
- **Private universities:** they fall under ADA Title III and under Section 504 through federal student aid, which the Education Department's Office for Civil Rights enforces online [Search summary only]. They usually ask for the same standard.
- **The usual evidence is a VPAT.** A completed VPAT is an Accessibility Conformance Report (ACR). The current template is "VPAT® Version 2.5Rev (April 2025)", and its WCAG edition uses WCAG 2.2 ([ITI VPAT](https://www.itic.org/policy/accessibility/vpat)) [Official, read].
- **WCAG 2.1 criteria that matter most for a voice interview** ([WCAG 2.1](https://www.w3.org/TR/WCAG21/)) [Official, read]:
  - **2.2.1 Timing Adjustable (A):** each time limit must be removable, adjustable to "at least ten times the length of the default setting", or extendable with a warning. Our 3-minute answer cap has a warning but no way to extend it. The interview length and the time rule that drops topics also need an extended-time setting, a common disability accommodation.
  - **2.1.1 Keyboard (A):** Space push-to-talk is a good start. Every control in setup, the lobby and the feedback needs checking.
  - **4.1.3 Status Messages (AA):** "Recording", "Transcribing" and the time warning must be announced without moving focus. `aria-live` exists; it needs testing with a screen reader.
  - **1.2.x (captions):** the interviewer's line is always shown as text, which covers the spoken prompts. Live audio-only captions are AAA, so they are not required.
  - **Typing as an alternative to speaking** is the main accommodation for students who cannot speak or who stutter. Keep it as a full equal path, not a fallback.

### Security reviews: HECVAT and SOC 2

- **HECVAT is the standard questionnaire.** HECVAT 4 (January 2025) merges the old Full, Lite and On-Prem versions into one file. It adds AI questions (mapped to NIST AI 600-1 and others), a privacy section and accessibility questions. The current version is reported as 4.1.6, completed once a year ([EDUCAUSE Review](https://er.educause.edu/articles/2025/2/hecvat-4-better-than-ever); [EDUCAUSE HECVAT](https://www.educause.edu/higher-education-community-vendor-assessment-toolkit)) [Search summary only; educause.edu returned 403]. The University of California says HECVAT is "used by over 100 universities" ([UC for suppliers](https://security.ucop.edu/resources/for-suppliers.html)) [Official, read].
- **The University of California's requirements:**
  - Appendix DS "must be included in all agreements where the supplier has access to UC Institutional Information".
  - It accepts a "Completed and reviewed HECVAT" or a "SOC Type 2 Report" as evidence.
  - It classes data as P1-P4. FERPA records are P3 [Search summary only for P3].
- **UT Austin's AI rules:** Controlled or Confidential data may go only into AI tools "covered by contracts explicitly protecting university data", and the contract must ensure the data "is not utilized for training models" ([UT Austin AI tools](https://security.utexas.edu/ai-tools)) [Official, read].
- **SOC 2** reports on controls against the Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy). Type 2 adds operating effectiveness over a period ([AICPA](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)) [Official, read for the categories; Search summary only for Type 1 and Type 2].

### OpenAI data handling

All from [OpenAI "your data"](https://developers.openai.com/api/docs/guides/your-data) [Vendor official, read] unless noted.

- **No training by default:** API data is "not used to train or improve OpenAI models (unless you explicitly opt in…)".
- **Abuse-monitoring logs** are "retained for up to 30 days, unless longer retention is required by law".
- **By endpoint:**
  - Chat Completions: 30 days of abuse monitoring.
  - `/v1/audio/transcriptions`: "None".
  - `/v1/audio/speech`: 30 days.
  - All three are eligible for zero data retention (ZDR). ZDR is "subject to prior approval by OpenAI".
- **Chat Completions does not store by default:** `store` defaults to `false` ([API reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)) [Vendor official, read]. Our code leaves it unset, so nothing is stored for later retrieval. The 30-day abuse log still applies without ZDR.
- **US data residency** is set per project. Chat Completions supports US storage and processing; the audio endpoints also list the US. The helper's reading merged two tables, so confirm the exact cells in the console.
- **The DPA:**
  - A DPA exists ([OpenAI DPA PDF](https://cdn.openai.com/pdf/openai-data-processing-addendum.pdf)) [Vendor official, read].
  - The openai.com policy page reportedly mentions FERPA support [Search summary only; 403].
  - OpenAI says the NYT litigation preservation duty ended on 26 September 2025 [Search summary only].

**Implications:**
- Pilot schools will expect a production project with ZDR on all three endpoints, US residency and OpenAI listed as a subprocessor in the DPA.
- The Settings page that lets anyone paste an API key into server memory must go.

## 5. Content and language

### Behavioural frameworks and our follow-up ladder

- **Our behavioural rubric already matches STAR.** It has Situation, Your role, What you did and Result (`RUBRICS.behavioural` in `lib/engine.js`). That is STAR, and also CAR and SOAR in all but name.
- **What is missing is a lesson element.** Kellogg (STAR-L), Darden ("a learning element") and MIT ("what you learned") all ask for one. Today only the concern rubric has "What changed", and finals internship topics plan a "what would you do differently" follow-up.
- **The planned follow-ups match how US interviewers dig.** They go own part first, then decisions, then a check on the number. That matches Amazon's "the 'what' and 'how' of your experiences, as well as the 'why' of your decisions" and its "metrics or data". It also matches Kellogg's "emphasize your decisions, not the context".
- **The McKinsey PEI goes deeper than our budgets.** It is one story with many follow-ups. Probing allows 3 follow-ups (plus 1 on claim topics), and a topic closes once the evidence is sufficient.
- **US students prepare stories for each attribute.** Examples are Amazon's Leadership Principles and Kellogg's "2 stories for each attribute". The planner picks competencies from the JD or the role. It does not map them to a firm's published attributes unless the JD lists them.

### Tell me about yourself and the career-switch story

- **US guidance asks for a forward-looking pitch, not a CV walk:**
  - Fuqua: a 2-3 minute "headline" answer that is "Not… a chronology".
  - Kellogg: a 30-second pitch.
  - Darden: "key transition points in your career, and a career objective".
- **Our background question is close but unscored.** It asks for a walkthrough ("Walk me through your career so far"), gets at most one follow-up, and is not scored. A US student would want feedback on the pitch itself: a headline, the transitions, and why this function now.
- **Switching is the main story, not a concern.** Wharton's Class of 2025 ([Wharton statistics](https://statistics.mbacareers.wharton.upenn.edu/full-time/)) [School official, read]:
  - 53.1% changed both industry and function.
  - 16.6% changed function only.
  - 10.3% changed industry only.
  - 10.3% made no change.
  - The page does not say which students the shares cover.
- **Other schools and surveys:**
  - Booth part-time: "76 percent of recent graduates who were seeking a career change made one within four months" ([Booth part-time](https://www.chicagobooth.edu/mba/part-time/career-impact)) [School official, read].
  - GMAC: the share of candidates who want to switch fell from 58% (2022) to 42% (2025) ([GMAC blog](https://blog.gmac.com/gmac-advisor/5-things-business-schools-need-to-know-about-prospective-students-in-2026)) [Research, read].
- **How the planner handles a switch.** It already raises a switch once, through the motivation question or a concerns topic. For US MBA students it should always be the motivation question, never a concern. The concern rubric judges "owning their part without blaming or deflecting", which treats an ordinary switch with suspicion.

### International students and work authorization

- **About a third of a top class is international:**
  - HBS Class of 2027: 943 students, "37% International" ([HBS class profile](https://www.hbs.edu/mba/admissions/class-profile)) [School official, read].
  - Wharton Class of 2026: 31% [Search summary only].
- **STEM-designated MBAs** give up to 12 months of OPT plus a 24-month STEM extension, "for a total of 36 months" ([Study in the States, 2022](https://studyinthestates.dhs.gov/2022/08/new-stem-resources-available-on-uscis-website); [USCIS STEM OPT](https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt)) [Official, read; the DHS post is from 2022].
- **Career centers coach the sponsorship answer.** Villanova's career center says "In most cases, international students and recent graduates should answer 'yes'", and gives a STEM OPT script ([Villanova](https://connections.villanova.edu/blog/2023/10/26/how-to-answer-will-you-now-or-in-the-future-require-sponsorship-to-work-in-the-us/)) [School official, read; not an MBA page]. We found no MBA-specific page.
- **US employers are less likely to hire international graduates.** GMAC 2025: "Employers in the United States are outliers in this regard, with only one-third indicating they hired international talent in 2024" ([GMAC CRS 2025](https://www.gmac.com/-/media/files/gmac/research/employment-outlook/2025-corporate-recruiters-survey/summary-report.pdf)) [Research, read].
- **This is a design decision.** The two IER questions are lawful and real, and international students need to practise a calm, accurate answer. Our prompts ban "nationality", and citizenship must stay banned. A safe design:
  - Ask only when the student opts in.
  - Ask only the two IER questions, worded exactly.
  - Do not score the answer.
  - In feedback, point to the school's international student office rather than give immigration advice.

### Speech recognition across a diverse class

- **OpenAI's own model card says accuracy varies by accent.** Whisper models "exhibit disparate performance on different accents and dialects of particular languages", possibly with "a higher word error rate across speakers of different genders, races, ages, or other demographic criteria" ([Whisper model card](https://github.com/openai/whisper/blob/main/model-card.md)) [Official, read].
- **Speech recognition has shown racial gaps in the US.** Koenecke et al. (2020) tested five commercial systems: "On average, the systems misunderstood 35 percent of the words spoken by blacks but only 19 percent of those spoken by whites" ([Stanford Engineering](https://engineering.stanford.edu/news/automated-speech-recognition-systems-often-misinterpret-black-speakers); [PNAS](https://www.pnas.org/doi/10.1073/pnas.1915768117)) [Research, read via the university write-up; PNAS blocked].
- **OpenAI publishes no per-accent error rates in text for its current transcribe models** ([OpenAI audio updates](https://developers.openai.com/blog/updates-audio-models)) [Official, read].
- **Why this matters for us:** feedback quotes the transcript verbatim. A transcription error can become a "what to fix", and errors may fall harder on some groups of students. The IIM TODO already parks an Indian-English test. A US test set also needs African American English, Southern US, Hispanic, East Asian and South Asian speakers.

### US English, terminology and tone

- **Spelling:** US schools write "resume" and "recruiting". Examples: "develop personalized recruiting strategies" and "resume-building workshops" ([Kellogg One-Year](https://www.kellogg.northwestern.edu/programs/full-time-mba/one-year-mba-program/)), and "Campus Recruiting" (Booth) [School official, read].
  - Our prompts and UI use British spelling: "behavioural" in `lib/engine.js` and the feedback views, "practise" in `prompts/feedback.md`, "summarise" in `prompts/turn.md`. The models may copy it.
  - The planner carries Indian examples: "Indian B-schools especially", "tier-2 towns", "a large Indian conglomerate".
- **Vocabulary US students use:**
  - recruiting (not placement)
  - internship and full-time recruiting (not summers and finals)
  - superday, coffee chat, networking, return offer
  - career management center, Career Fellows, peer coaches
  - STEM OPT

  The setup's "Placement stage" needs US labels.
- **Feedback tone:** the existing rules already help. They allow only the student's facts, no praise inflation and no comments on the person. Two US points to add:
  - Never comment on accent, appearance or anything linked to a protected characteristic.
  - Avoid "culture fit" and personality labels ("not confident", "too aggressive"). Comment on the answer, not the speaker.

## 6. Program types

- **Full-time two-year MBA:** first-year internship recruiting, then full-time recruiting, often with a return offer (section 2). This is the main market.
- **One-year MBA:** no internship.
  - Kellogg's is an "Accelerated MBA (no internship)", "Available to start full-time roles in June" ([Kellogg outcomes](https://www.kellogg.northwestern.edu/companies-recruiters/recruiter-employment-outcomes/)). It is aimed at those "not seeking to make a major career switch" ([Kellogg One-Year](https://www.kellogg.northwestern.edu/programs/full-time-mba/one-year-mba-program/)) [School official, read].
  - Cornell's one-year option is the Johnson Cornell Tech MBA in New York, and it sends tech career switchers to a two-year track ([Cornell Tech](https://tech.cornell.edu/programs/masters-programs/johnson-cornell-tech-mba/)) [School official, read].
- **Part-time and evening:**
  - **Booth:** students "must apply to participate in Campus Recruiting events"; "internships are very uncommon for Evening MBA and Weekend MBA students" ([Booth part-time FAQ](https://www.chicagobooth.edu/mba/part-time/faq)). "many Part-Time MBA students are after a bigger seat at the table, not a new one" ([Booth part-time](https://www.chicagobooth.edu/mba/part-time/career-impact)) [School official, read].
  - **Stern:** "Part-time MBA students do not have access to summer internship or other formal recruiting/interviewing through Stern", except a limited Langone Recruiting Cohort ([Stern part-time careers](https://www.stern.nyu.edu/programs-admissions/mba-programs/part-time-mba-manhattan/career)) [School official, read].
  - **Haas Evening & Weekend** is more open. "Leading firms from industries that include finance and consulting interview on campus", and students are "eligible for internships after the second year" ([Haas EWMBA](https://ewmba.haas.berkeley.edu/careers/career-management)) [School official, read].
- **Executive MBA:**
  - **Booth:** "We do not offer on-campus job recruitment for Executive MBA students". It offers "unlimited one-on-one sessions with executive coaches" ([Booth EMBA FAQ](https://www.chicagobooth.edu/mba/executive/faq)) [School official, read].
  - **Wharton:** "Internships are not available", and "only eligible students are permitted to participate in on-campus recruiting" ([Wharton EMBA](https://executivemba.wharton.upenn.edu/emba-program-details/)) [School official, read].

**Do the interviews differ?** We found no source describing the questions for each program type. By inference from the support each program offers:
- Full-time students prepare for structured behavioural rounds.
- One-year students prepare for experienced-hire interviews: scope, people and why now.
- Part-time and EMBA students mostly prepare for an internal promotion or an experienced-hire conversation, and their schools buy coaching more than recruiting mocks.

This is inference, not evidence.

## Changes needed

Sizes: **S** means prompt edits, a constant or a contract document. **M** means a new setup field, schema change, rubric element or screen. **L** means a new subsystem or an external audit.

IIM TODO items are named by their bold title ("Timed 'Tell me about yourself'", "Polite cut-in on long answers", "Placement-panel pushback style", "Follow up answers that sound rehearsed", "Personals round and next round", "Indian English speech recognition", and the re-test items "knowledge topic quiz", "knowledge topic avoids claim subject", "case-competition results", "design warnings").

This list builds on what `main` already has; it does not re-propose those features:
- the optional `placement_stage` (summers, finals, laterals)
- the career-switch topic
- the MBA domain-knowledge slot
- `fit_angle` (failure, disagreement, strengths)
- the activity or POR topic
- the moment that rates the student's own end questions as specific or generic

### (a) Must-have before a US school pilot

1. **Accounts, school tenancy and access control** (`server.js`, all pages).
   - **Why:** FERPA allows a vendor only under the school's "direct control", with no redisclosure (34 CFR 99.31(a)(1)(i)(B), 99.33(a)). Today `GET /api/sessions` lists every interview to anyone.
   - **Change:**
     - A student sees only their own interviews.
     - A school sees only its own students' interviews.
     - VMock staff access is logged.
     - The internal review page and trace endpoint are closed to students.
   - **Size:** L. **IIM TODO:** none. This also blocks the IIM release at scale.
2. **Retention, export and deletion** (`server.js` session store, a school setting).
   - **Why:** PTAC asks for "data archival and destruction requirements" in the contract. UC Appendix DS and UT Austin's AI rules want the same. `sessions/<id>.json` keeps the resume, transcripts and raw model inputs and outputs with no time limit.
   - **Change:**
     - Retention period per school.
     - Deletion on request and at contract end.
     - Export of a student's interviews.
     - Raw model I/O kept separately for a short QA window, or dropped.
   - **Size:** M. **IIM TODO:** none.
3. **OpenAI production setup and DPA** (`lib/openai.js`, `lib/voice.js`, contracts).
   - **Why:** abuse-monitoring logs are kept 30 days for Chat Completions and speech unless ZDR is approved. Universities want contracts that bar training on their data (UT Austin). US data residency is set per project.
   - **Change:**
     - A ZDR-approved, US-resident project.
     - OpenAI listed as a subprocessor.
     - Keep `store` false; set it explicitly so the intent is visible.
     - Remove the paste-a-key Settings path.
   - **Size:** S (code) plus sales and contract time. **IIM TODO:** none.
4. **Consent and AI-disclosure screen** (`public/vmock/setup.js` or the room lobby; `openingText` in `lib/engine.js`).
   - **Why:** California (Penal Code 631, 632) and Illinois (720 ILCS 5/14-2) are all-party-consent states. The opening never says the interviewer is an AI. PTAC warns that click-wrap alone may not satisfy FERPA, so the school contract carries the legal weight and the screen is notice.
   - **Change:** one screen covering:
     - The interviewer is an AI.
     - Audio goes to OpenAI for transcription.
     - What is stored, for how long, and who at the school can see it.

     The student ticks "I agree".
   - **Size:** S. **IIM TODO:** none.
5. **School contract template and acceptable-use policy** (legal documents, not code).
   - **Why:** PTAC lists contract terms on purpose, direct control, security and destruction. Colorado SB 26-189 excludes tools whose acceptable-use policy bars use in "a consequential decision". LL144 and the Illinois acts do not reach a tool that screens no one.
   - **Change:** the contract and policy bar using results for admission, grading, selection or ranking students for recruiters. Marketing must not suggest otherwise.
   - **Size:** S. **IIM TODO:** none.
6. **Code-enforced list of questions never to ask** (`lib/engine.js` guard beside `LEAK_PATTERN`; `prompts/turn.md`, `prompts/planner.md`).
   - **Why:**
     - EEOC guidance covers national origin, age, religion, marital status and children, pregnancy, disability, citizenship and arrests.
     - Salary-history bans: California Labor Code 432.3, NY Labor Law 194-a, 820 ILCS 112/10.
     - IER: only two work-authorization questions.
     - Today these topics are rules in the prompts only.
   - **Change:**
     - Add citizenship, arrests and convictions, salary history, height and weight, and "where are you from" to the never-ask list.
     - Add a pattern check that forces a rewrite, the same way the leak and praise guards do.
   - **Size:** S. **IIM TODO:** consistent with the format note, which already keeps hometown and family out of our questions. It conflicts with nothing.
7. **WCAG 2.1 AA audit, fixes and an ACR** (all student pages: `public/vmock/*`, `public/student.*`).
   - **Why:** the Title II rule sets WCAG 2.1 AA for content provided "through contractual, licensing, or other arrangements". Compliance dates are now 26 April 2027 and 26 April 2028. Private schools ask for the same. Big Interview already publishes a WCAG 2.1 AA statement and a VPAT 2.5 ACR.
   - **Change:**
     - A setting to extend or remove the 3-minute answer cap (2.2.1).
     - Extended interview time as an accommodation.
     - Screen-reader testing of status messages (4.1.3).
     - Keyboard checks on setup and feedback (2.1.1).
     - Typing kept as an equal path.
     - Then a third-party audit and the ACR.
   - **Size:** M (fixes), L (audit). **IIM TODO:** includes "design warnings" (3.8:1 hover contrast, cramped padding), which becomes a must-fix.
8. **HECVAT 4 and SOC 2 Type 2** (VMock company process).
   - **Why:** UC accepts "a Completed and reviewed HECVAT" or "SOC Type 2 Report". HECVAT 4 has an AI section. Yoodli advertises SOC 2 Type 2, and Big Interview keeps a HECVAT. We found no public VMock security page. If VMock already holds these for its US products, extend their scope to cover this module and its OpenAI calls.
   - **Size:** L (if new), M (if extending). **IIM TODO:** none.
9. **Do not show placeholder Delivery and Non Verbal feedback to US students; gate the real modules on biometric consent** (`public/vmock/feedback-v2.js`, `feedback.js`; VMock modules).
   - **Why:**
     - The placeholders are generated from the session id, so showing them as feedback misleads.
     - BIPA covers "voiceprint" and "face geometry", with a written release and a retention schedule.
     - Texas CUBI is similar.
   - **Change:**
     - Use feedback v3 (no placeholders) for US schools.
     - When VMock's real modules arrive, get consent from Illinois and Texas users first.
   - **Size:** S (v3 default), M (consent). **IIM TODO:** none.

### (b) Interviewer and feedback changes

10. **A market setting: India or US** (setup UI `public/vmock/setup.html|js`; inputs in `lib/engine.js`; `prompts/planner.md`, `prompts/turn.md`, `prompts/feedback.md`).
    - **Why:** the prompts carry Indian examples ("Indian B-schools especially", "tier-2 towns") and British spelling ("practise", "summarise", "behavioural"). US schools write "resume" and "recruiting" (Kellogg, Booth).
    - **Change:**
      - A `market` input that picks the examples and wording.
      - US English in student-facing text.
      - US stage labels (first-year internship, second-year full-time, experienced or one-year).
      - The never-ask additions in item 6.
    - **Size:** M. **IIM TODO:** makes every parked IIM item market-scoped instead of global. It conflicts with nothing.
11. **Stages: relabel for the US and add "advancement"** (setup, `placement_stage` block in `prompts/planner.md`).
    - **Why:**
      - First-years interview for internships from January (Booth).
      - About 44% of MIT Sloan full-time offers came from summer internships.
      - Kellogg One-Year has "no internship".
      - Booth EMBA has no on-campus recruiting.
      - Booth part-time students want "a bigger seat at the table".
    - **Change:**
      - Map `summers` to first-year internship, without CGPA and first-term questions.
      - Map `finals` to second-year full-time.
      - Map `laterals` to one-year and experienced hires.
      - Add `advancement` for part-time and EMBA: a bigger role at the current employer, leading people, the case for the move.
    - **Size:** S (labels) plus M (`advancement`). **IIM TODO:** builds on the shipped stage feature. It does not conflict.
12. **Make "Tell me about yourself" a scored pitch** (`background_question` in `prompts/planner.md`; a new `pitch` rubric in `RUBRICS` in `lib/engine.js`; `prompts/feedback.md`).
    - **Why:**
      - Fuqua: "no more than 2-3 minutes", "Start with a 'headline'", "Not be a chronology".
      - Kellogg: a 30-second "why they are pursuing their career path".
      - Darden: "key transition points… and a career objective".
      - Today the background question is an unscored walkthrough.
    - **Change:**
      - Ask "Tell me about yourself" (or "Walk me through your resume", by seed).
      - Rate a headline, the transitions, and why this function now.
      - Add a moment when it runs past about 3 minutes or never reaches the target role.
    - **Size:** M. **IIM TODO:** same build as "Timed 'Tell me about yourself'". The US target length is about 2 minutes, not 1, so make the time cue market-specific.
13. **Add a "lesson" element to the behavioural rubric** (`RUBRICS.behavioural` in `lib/engine.js`; `prompts/feedback.md`; optional planner probe).
    - **Why:** Kellogg STAR-L ("Lesson"), Darden "a learning element", MIT "what you learned". Tepper and Amazon stress a measured result; we already rate Result.
    - **Change:** an optional fifth element, "What you learned", rated only when the answer or a follow-up gave room for it. Also let the planner add "what would you do differently" beyond finals internship topics.
    - **Size:** S to M. **IIM TODO:** none. It fits the finals probe already shipped.
14. **A 30-minute behavioural round** (`MINUTES`, `SCORED_SLOTS`, `MAX_INTERVIEWER_TURNS` in `lib/engine.js`; setup).
    - **Why:**
      - P&G interviews "last around 45-60 minutes".
      - In Amazon's loop, each interviewer asks "two or three behavioral-based questions" in 55 minutes.
      - Tepper wants 6-10 stories.
      - Our longest interview is 15 minutes with 4 topics.
    - **Change:** a "Full behavioural round" of about 30 minutes with 6-7 topics, drawn from different stories and attributes.
    - **Size:** M. **IIM TODO:** opposite direction from "Personals round and next round" (a 5-7 minute round). Both can exist as market or stage defaults. The "next round avoids topics already asked" part is shared and should be built once.
15. **A deep-dive style for McKinsey-type interviews** (a style in `STYLE_BUDGET` and `resolveStyle` in `lib/engine.js`; `prompts/turn.md`).
    - **Why:** McKinsey asks candidates to discuss experiences "in a detailed way, focusing on your specific role" (search summary). Prep sites describe 10-15 minutes on one story (anecdote). Our deepest budget is 3 follow-ups, plus 1 on claim topics.
    - **Change:**
      - One or two stories with a budget of about 6 follow-ups.
      - Rungs covering own role, a key decision, how others reacted, an obstacle, and what they would change.
      - Feedback also rates "Handling follow-ups".
    - **Evidence:** weak; McKinsey's page was not read. **Size:** M.
    - **IIM TODO:** overlaps "Placement-panel pushback style" (both are deeper styles; build them as one style family). It conflicts with the knowledge-topic quiz item only if knowledge topics get the deep budget, so exclude them.
16. **Optional firm attributes** (`prompts/planner.md` step 3; setup "target firm or industry" field).
    - **Why:**
      - Students prepare "2 stories for each attribute" (Kellogg).
      - Amazon publishes 16 Leadership Principles.
      - P&G asks "a time when you created something new".
    - **Change:** when the student names a firm and its published values are in the JD, map competencies to them. Never invent a firm's attribute list, and do not hard-code McKinsey's labels, which may have changed in 2025 (unverified).
    - **Size:** S. **IIM TODO:** none.
17. **A career switch is always the motivation question, never a "concern"** (`prompts/planner.md` step 4 and slot rules).
    - **Why:** about 80% of Wharton's Class of 2025 changed industry or function. The concern rubric judges "Ownership… without blaming or deflecting", which fits a gap, not an ordinary switch.
    - **Change:** in the US market, route a switch to motivation ("What's pulling you from X to Y?"), with "why now" and "why an MBA" as planned follow-ups.
    - **Size:** S. **IIM TODO:** builds on the shipped switch rule.
18. **Opt-in work-authorization practice** (setup checkbox; `prompts/planner.md`, `prompts/turn.md`; an allow-list exception in the item 6 guard; `prompts/feedback.md`).
    - **Why:**
      - IER deems two questions appropriate and cautions against any others.
      - HBS is 37% international.
      - Villanova coaches a "yes" answer with a STEM OPT script.
      - Our prompts ban "nationality" outright.
    - **Change:**
      - Only when the student ticks "practise the sponsorship question".
      - Ask only IER's two questions, exactly as worded, near the end.
      - Do not score the answer.
      - Feedback gives neutral structure and points to the school's international office.
    - **Size:** S to M. **Needs a product decision.** **IIM TODO:** none.
19. **Answer-length threshold by market** (`LONG_ANSWER_WORDS` in `lib/engine.js`).
    - **Why:** Tepper says "around 2 minutes….not more than 3 minutes", and Fuqua says "seldom more than two minutes". At about 130-150 spoken words a minute, 350 words (about 2.5 minutes) is close to right for the US.
    - **Change:** keep about 350 for the US. Use a lower value only in the IIM market.
    - **Size:** S. **IIM TODO:** conflicts with "Polite cut-in on long answers" if that lowers the threshold globally to about 200 words. A US STAR story would be cut off. Make the threshold market-specific.
20. **Speech recognition fairness test and a transcript check** (`lib/voice.js`; room UI; `prompts/feedback.md`).
    - **Why:** the Whisper model card reports "disparate performance on different accents and dialects". Koenecke et al. found 35% against 19% word error for Black and white speakers. Feedback quotes the transcript verbatim.
    - **Change:**
      - Test on a US accent set: African American English, Southern US, Hispanic, East and South Asian speakers.
      - Let the student see and correct a misheard answer before feedback.
      - Tell the feedback model that odd wording may be a transcription error and must not become a "what to fix".
      - Never score accent.
    - **Size:** M. **IIM TODO:** extends "Indian English speech recognition". Build one test harness for both.
21. **US-sensitive feedback wording** (`prompts/feedback.md`, `prompts/grounding.md`).
    - **Why:** EEOC lists these characteristics as irrelevant to qualification. A practice tool that comments on them teaches the wrong thing.
    - **Change:**
      - Never comment on accent, appearance or any protected characteristic.
      - No "culture fit" or personality labels.
      - The grounding pass flags these too.
    - **Size:** S. **IIM TODO:** none.

### (c) Platform features career centers expect

22. **SSO (SAML 2.0 or Shibboleth) and SCIM provisioning.**
    - **Why:** Big Interview offers "SAML 2.0 / Shibboleth"; Yoodli offers "SSO and SCIM"; InterviewFocus says it can "integrate with your SSO". Yale SOM students log into Firsthand "with their NetID".
    - **Size:** M, after item 1.
23. **School admin dashboard.**
    - **Why:** Big Interview, Yoodli, InterviewFocus, Prentus and Huru all advertise one.
    - **Change:**
      - Usage by cohort.
      - Common needs-work elements by question type.
      - Topics students practise.
      - JD must-haves that are rarely covered.
      - Levels only, no numeric scores (PRODUCT.md), and no per-student ranking (item 5).
    - **Size:** L.
24. **Share with a coach or peer, with comments.**
    - **Why:**
      - Wharton's "second-year Career Fellows" and Kellogg's "Career Peers" run mock interviews.
      - Big Interview lets staff "leave your own feedback".
      - VMock already offers "Network Feedback" (CSUN), and FIU coaches "add their own feedback".
      - Our feedback has per-topic recording segments to anchor comments.
    - **Size:** M. **IIM TODO:** fits the IIM peer-mock culture too (format note: seniors and placement committees run mocks).
25. **School assignments and must-ask questions.**
    - **Why:** Big Interview: "Design assignments"; Yoodli has custom scenarios; FIU lists "100+ career tracks".
    - **Change:** a school can add one or two must-ask questions or a target firm to a cohort's interviews, with a due date. The rest stays adaptive.
    - **Size:** M. **IIM TODO:** IIM placement committees circulate 20-40 question lists (format note). The same feature serves both.
26. **Published accessibility, security and privacy pages.**
    - **Why:** Big Interview publishes an accessibility statement and keeps a HECVAT. No VMock page was found.
    - **Size:** S, once items 7 and 8 exist.

### (d) Parked or nice-to-have

27. **Canvas LTI.** Only Big Interview advertises it. **Size:** M. Wait for a school to ask.
28. **12twenty and Handshake links.**
    - 12twenty is the MBA system (Texas A&M Mays). We found no practice-tool integrations for either.
    - Start with a deep link from the school's 12twenty or Handshake resources page.
    - **Size:** S (link), L (integration).
29. **Banking technical questions.**
    - Superday accounts mix behavioural and technical questions [Anecdote]. No bank page was readable.
    - Our knowledge slot bans definitions ("walk me through a DCF" is close to one).
    - Revisit with a bank's own page or a finance club's guide.
    - **Size:** S to M. **IIM TODO:** related to "knowledge topic quiz" (budget of 1-2).
30. **Unlimited use and pricing.**
    - InterviewFocus advertises "unlimited access".
    - **Unverified:** a helper reported that USC is replacing VMock's resume tool with one "no longer… limited to 10 resume uploads per school year". If confirmed, usage caps are a reason schools switch.
    - **Size:** a commercial decision.
31. **Colorado ADMT and Illinois HB 3773 rules.** Watch both: Colorado's law takes effect 1 January 2027, and Illinois' rules were proposed in May 2026. Re-check if the product ever offers recruiter-facing outputs.
32. **Check McKinsey's and banks' own pages in a browser** before building items 15 and 29. Confirm the PEI's current dimension names and round lengths.

## Unverified claims to check before use

- **McKinsey PEI:** the four dimensions and the reported 2025 relabelling, and "10-15 minutes on one story" (search summary and prep sites only).
- **USC:** "discontinued on Tuesday, June 30, 2026" and the "10 resume uploads" cap (helper report only; not read by the author).
- **HECVAT:** version 4.1.6 and the AI section contents (educause.edu blocked).
- **OpenAI:** the exact data-residency cells per endpoint, the FERPA mention on the DPA page, and the end of the NYT preservation order.
- **Statutes read on mirrors or search snippets:**
  - BIPA §10, 820 ILCS 42 and NYC Admin Code §20-870 (search summaries).
  - SOPPA (search summary).
  - California and Illinois statute texts (FindLaw mirrors).
- **Colorado:** the X.AI v. Weiser order and whether Illinois HB 3773 rules are final.
- **Other numbers:** UT McCombs' 56% internship conversion, the Wharton Class of 2026 international share, GWU, BYU, Cornell and BU framework pages, and Fuqua and Ross peer-coach details (all search summaries).
- **Bank superdays and BCG rounds:** prep-site anecdotes only.

## Sources

**Law and regulation**
- eCFR 34 CFR 99.31: https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.31
- 34 CFR 99.3: https://www.law.cornell.edu/cfr/text/34/99.3
- PTAC, Online Educational Services (2014): https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Student%20Privacy%20and%20Online%20Educational%20Services%20(February%202014)_0.pdf
- PTAC, Model Terms of Service (2016): https://studentprivacy.ed.gov/sites/default/files/resource_document/file/TOS_Guidance_Mar2016.pdf
- Cal. Bus. & Prof. Code 22584 (mirror): https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-22584/
- 740 ILCS 14/15 (mirror): https://codes.findlaw.com/il/chapter-740-civil-liabilities/il-st-sect-740-14-15/
- RCW 19.375.010: https://app.leg.wa.gov/RCW/default.aspx?cite=19.375.010
- NYC DCWP AEDT FAQ: https://www.nyc.gov/assets/dca/downloads/pdf/about/DCWP-AEDT-FAQ.pdf
- Colorado SB 26-189: https://leg.colorado.gov/bill_files/116489/download
- EEOC prohibited practices: https://www.eeoc.gov/prohibited-employment-policiespractices
- EEOC marital status and children: https://www.eeoc.gov/pre-employment-inquiries-and-marital-status-or-number-children
- EEOC citizenship: https://www.eeoc.gov/pre-employment-inquiries-and-citizenship
- EEOC arrests and convictions: https://www.eeoc.gov/pre-employment-inquiries-and-arrest-conviction
- EEOC pre-employment disability guidance: https://www.eeoc.gov/laws/guidance/enforcement-guidance-preemployment-disability-related-questions-and-medical
- DOJ IER letter (Sept 2022): https://www.justice.gov/media/1248166/dl
- DOJ IER FAQ: https://www.justice.gov/crt/iers-frequently-asked-questions-faqs
- ADA Title II web rule fact sheet: https://www.ada.gov/resources/2024-03-08-web-rule/
- 2026 interim final rule: https://www.ada.gov/assets/pdfs/2026-ifr.pdf
- ADA web rule first steps: https://www.ada.gov/resources/web-rule-first-steps/
- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- ITI VPAT: https://www.itic.org/policy/accessibility/vpat

**Procurement and vendors' policies**
- UC for suppliers: https://security.ucop.edu/resources/for-suppliers.html
- UT Austin AI tools: https://security.utexas.edu/ai-tools
- EDUCAUSE HECVAT: https://www.educause.edu/higher-education-community-vendor-assessment-toolkit
- EDUCAUSE Review, HECVAT 4: https://er.educause.edu/articles/2025/2/hecvat-4-better-than-ever
- AICPA SOC 2: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
- OpenAI "your data": https://developers.openai.com/api/docs/guides/your-data
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- OpenAI DPA: https://cdn.openai.com/pdf/openai-data-processing-addendum.pdf
- Whisper model card: https://github.com/openai/whisper/blob/main/model-card.md
- OpenAI audio model updates: https://developers.openai.com/blog/updates-audio-models

**Recruiters**
- McKinsey interviewing: https://www.mckinsey.com/careers/interviewing
- Bain interviewing: https://www.bain.com/careers/hiring-process/interviewing/
- BCG case prep: https://careers.bcg.com/global/en/case-interview-preparation
- Amazon PM interview prep: https://amazon.jobs/content/en/how-we-hire/product-manager-interview-prep
- Amazon Leadership Principles: https://www.amazon.jobs/content/en/our-workplace/leadership-principles
- P&G hiring process: https://www.pgcareers.com/hiring-process

**Schools, CSEA and GMAC**
- CSEA Standards Edition VII: https://cdn.ymaws.com/cseaglobal.org/resource/collection/61BF28D3-16AA-4C84-854E-E45A5D6C2054/CSEA_FT_MBA_Standards_Edition_VII_FINAL.pdf
- Booth recruiting policies: https://www.chicagobooth.edu/recruiting/mba-students/recruiting-policies
- Booth recruiting calendar: https://www.chicagobooth.edu/recruiting/mba-students/recruiting-calendar
- Stanford GSB recruiting policies: https://gsb.stanford.edu/organizations/recruit/strategies-resources/policies
- MIT Sloan employment report: https://mitsloan.mit.edu/sites/default/files/2025-12/2025-2026-MBA-Employment-Report.pdf
- Tepper STAR guide: https://www.cmu.edu/sites/default/files/cmu-tepper-site-files/2025-06/star-story.pdf
- MIT CAPD STAR: https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/
- Fuqua two-minute profile: https://www.fuqua.duke.edu/alumni/alumni-two-minute-profile
- Kellogg recruiting blog: https://www.kellogg.northwestern.edu/news/blog/2026/10/13/career-days-mba-recruiting-journey/
- Kellogg career services: https://www.kellogg.northwestern.edu/programs/full-time-mba/career-services/
- Kellogg One-Year: https://www.kellogg.northwestern.edu/programs/full-time-mba/one-year-mba-program/
- Kellogg outcomes: https://www.kellogg.northwestern.edu/companies-recruiters/recruiter-employment-outcomes/
- UNC Kenan-Flagler: https://www.kenan-flagler.unc.edu/perspectives/7-tips-to-prepare-for-your-mba-interview/
- Yale OCS on the PEI: https://ocs.yale.edu/resources/mckinsey-pei-personal-experience-interview/
- Yale SOM CDO on Firsthand: https://cdo.som.yale.edu/resources/firsthand-vault-career-insider/
- Wharton MBA career services: https://mba.wharton.upenn.edu/mba-career-services/
- Wharton employment statistics: https://statistics.mbacareers.wharton.upenn.edu/full-time/
- Wharton EMBA: https://executivemba.wharton.upenn.edu/emba-program-details/
- Booth part-time FAQ: https://www.chicagobooth.edu/mba/part-time/faq
- Booth part-time career impact: https://www.chicagobooth.edu/mba/part-time/career-impact
- Booth EMBA FAQ: https://www.chicagobooth.edu/mba/executive/faq
- Stern part-time careers: https://www.stern.nyu.edu/programs-admissions/mba-programs/part-time-mba-manhattan/career
- Haas EWMBA: https://ewmba.haas.berkeley.edu/careers/career-management
- Cornell Tech MBA: https://tech.cornell.edu/programs/masters-programs/johnson-cornell-tech-mba/
- HBS class profile: https://www.hbs.edu/mba/admissions/class-profile
- Study in the States (STEM OPT): https://studyinthestates.dhs.gov/2022/08/new-stem-resources-available-on-uscis-website
- USCIS STEM OPT: https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt
- Villanova on sponsorship: https://connections.villanova.edu/blog/2023/10/26/how-to-answer-will-you-now-or-in-the-future-require-sponsorship-to-work-in-the-us/
- GMAC Corporate Recruiters Survey 2025: https://www.gmac.com/-/media/files/gmac/research/employment-outlook/2025-corporate-recruiters-survey/summary-report.pdf
- GMAC 2026 press release: https://www.gmac.com/why-gmac/gmac-news/gmac-press-releases/age-of-ai-employers-say-human-skills-matter-more-than-ever
- GMAC blog on prospective students: https://blog.gmac.com/gmac-advisor/5-things-business-schools-need-to-know-about-prospective-students-in-2026
- Koenecke et al. (Stanford write-up): https://engineering.stanford.edu/news/automated-speech-recognition-systems-often-misinterpret-black-speakers
- Kellogg casebook 2012 (third-party copy): https://caseinterview.com/wp-content/uploads/2019/08/Kellogg-2012.pdf
- Darden casebook 2020-21 (third-party copy): https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/870c3a-4cb-6f0e-1ab-dabf5d73bb6_MasterTheCase-Case-Interview-Casebooks-Darden-2021.pdf

**Vendors and school tool pages**
- Big Interview for higher education: https://www.biginterview.com/higher-education
- Big Interview SSO: https://support.biginterview.com/en/article/saml-20-shibboleth-integration-18lxg1n/
- Big Interview accessibility statement: https://support.biginterview.com/en/article/accessibility-statement-19kqmg0/
- Big Interview security: https://support.biginterview.com/en/category/security-and-accessibility-1mdi34s/
- Big Interview PracticeAI launch: https://www.biginterview.com/news/big-interview-launches-practiceai-the-most-realistic-interview-preparation-yet
- Yoodli: https://yoodli.ai/
- Yoodli interview preparation: https://yoodli.ai/use-cases/interview-preparation
- Yoodli and University of Washington: https://yoodli.ai/our-partnerships/university-of-washington-partners-with-yoodli-to-offer-ai-powered-communication-coaching-to-50000-students-faculty-and-staff
- InterviewFocus: https://interviewfocus.com/solutions/university-career-centers/
- Huru: https://huru.ai/
- Prentus: https://prentus.com/features/ai-mock-interviews
- Quinncia: https://www.quinncia.io/
- InterviewStream: https://interviewstream.com/
- 12twenty: https://www.12twenty.com/oda
- MLT Career Prep: https://mlt.org/career-prep/
- Texas A&M Mays: https://mays.tamu.edu/career-management-center/cmc-recruiting-resources/
- Nebraska MBA: https://business.unl.edu/graduate-programs/mba/career-services/
- Northwestern (VMock): https://www.northwestern.edu/careers/jobs-internships/resumes/vmock.html
- CSUN Nazarian (VMock): https://nazariancareers.csun.edu/resources/vmock-elevator-pitch/
- FIU mock interviews: https://career.fiu.edu/resources/mock-interviews/
- USC (unverified): https://careers.usc.edu/resources/smart-resume/


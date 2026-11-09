# Gap audit: what the interviewer still misses for Indian B-school students

Research note, 6 November 2026. Follows three earlier notes: [placement questions](2026-11-06-iim-placement-interview-questions.md) (the "questions note"), [question fit](2026-11-06-iim-placement-question-fit.md) (the "fit note") and [top B-school interviews](2026-11-06-top-bschool-placement-interviews.md) (the "format note"). Those notes are not repeated here. This note looks at areas they did not cover:
- Indian CV patterns
- the HR round
- mock-interview feedback
- voice norms
- ethics and stress questions
- inclusion

It compares each area with the product as it stands today:
- `prompts/planner.md`, `prompts/turn.md` and `prompts/feedback.md`
- `lib/engine.js`
- the setup wizard and the room in `public/vmock/`

**Excluded:**
- Everything parked in [docs/TODO.md](../TODO.md): timed introduction, polite cut-in, pushback style, rehearsed answers, personals round and next round, Indian-English speech recognition, and the open items.
- Everything already built.
- Cases, guesstimates and GDs.

## Summary

- **Summers never ask about the MBA so far or the academic record.** First-hand accounts show recruiters asking first-years about:
  - the first term;
  - CGPA and rank;
  - a degree that doesn't fit the role ("B.Sc. Biology! Hm..How good are you in Maths");
  - what they have done on campus so far, including the absence of a campus POR.

  Our summers stage draws on the job before the MBA, undergraduate study and listed PORs. It never asks about the MBA so far or the academic record, and it never asks about something missing from the CV. The format note proposed first-term and CGPA questions for summers (its item 4), but the placement-stage build left them out.
- **The HR round is missing.** Indian placement processes often end with an HR or principal round. In the one full first-hand account we have (Deloitte, IIM Lucknow, 2015), that round asked things our interviewer never asks:
  - willingness to travel;
  - which other shortlists the student holds;
  - why this school;
  - whether the student will stay ("How will you be consistent and satisfied in Deloitte?").

  None of our three interview types (screening, hiring manager, resume deep dive) covers this content. The screening round is the closest, and it follows a generic recruiter-screen template. The room's scope note lists GDs, cases and guesstimates as not covered, but not the HR round.
- **Ethics comes up for TAS and P&G, but the evidence is old.** Our fit questions rotate failure, disagreement and strength. None is an ethical-dilemma question.
- **Family business is a common Indian CV line, and our planner may avoid it.** The planner bans anything "related to … family". That may stop it from treating a family-business stint as normal work experience. We did not test this. Placement evidence for "why not the family business" is missing: every account we found was an admission interview.
- **Most other areas are already handled or have no placement evidence:**
  - Already handled: gap years, work-experience bands and career switches.
  - Admission-only evidence: CA, CFA, defence backgrounds, Hinglish and low CGPA.
  - No evidence on content: mock feedback. Placement committees and career offices run mocks, but no source says what the feedback covers.
- **Evidence is thin overall.**
  - The strongest new item is one first-hand IIM Lucknow account (Deloitte, 2015) with a full HR "stress" round.
  - The process rules are official: PPO and dream-offer rules from IIM Lucknow, and the TAS and Asian Paints recruiter pages.
  - Almost every search on CGPA, gap years, family business, CA, defence and Hinglish returned admission-interview material. We excluded all of it.

### Evidence labels

The same labels as the earlier notes:
- **[First-hand, read]:** a student's own account, page read by us (here or in an earlier note).
- **[Official, read]** and **[Recruiter official, read]:** an institute or employer page, read by us.
- **[Search summary only]:** we saw only a search engine's summary. These items are paraphrased, never put in quotation marks. Check them before relying on them.
- **[First-hand, unverified]:** a Glassdoor or AmbitionBox review seen only as a search summary.
- **[Secondary]:** prep sites, coaching sellers, aggregators, news.
- **Admission only:** evidence from IIM admission interviews. It is named so readers know it was found, but it is never used as placement evidence.

## Findings per area

### 1. Indian CV patterns and how placement interviewers treat them

**Academic record (CGPA, first term, degree fit).**
- First-hand placement evidence exists, mostly for summers:
  - "How was your first term?" and "What is your CGPA at IIMC like and what approximate rank would that be?" (McKinsey, to an IIM Calcutta first-year).
  - "Why you couldn't make it to IIT?" (McKinsey).
  - All three are in the format note, from the [IIMC consulting accounts](https://pdfcoffee.com/iimc-53rd-batch-consulting-interview-experiences-1-pdf-free.html) [First-hand, read].
- A Deloitte HR round at IIM Lucknow summers in 2015 asked "B.Sc. Biology! Hm..How good are you in Maths" ([InsideIIM](https://insideiim.com/deloitte-interview-experience-4)) [First-hand, read].
- An ICICI candidate was asked why their CGPA was low (questions note) [First-hand, unverified].
- Low-CGPA and backlog searches returned admission interviews only. Examples:
  - an IIMA panel asking about one weak undergraduate year ([CATKing](https://catking.in/iim-ahmedabad-personal-interview-experiences));
  - an IIML panel opening with the candidate's low CGPA (a candidate's blog).

  [Admission only; search summary only]
- We found no placement account of a backlog question.
- **Product today:**
  - `prompts/planner.md` step 2 extracts claims from bullets and skips coursework lists.
  - The summers stage draws on "undergraduate study" but never asks about grades, the first term or a degree that doesn't fit the role.
  - The fit note already found that CGPA, Class X/XII scores and the CAT percentile are "Not used".

**Absences on the CV and the MBA so far.**
- First-hand placement questions:
  - "In your CV, I don't find any POR on campus? (Committee etc.)" (Deloitte, IIML) [First-hand, read].
  - "What have you done in IIM Lucknow all this while?" (Accenture, questions note) [First-hand, read].
  - "What PoRs do you plan on taking up at Joka?" (McKinsey, format note) [First-hand, read].
  - "Why did you join IIM Lucknow and not IIM Bangalore?" and "Is IIM Lucknow adding value as per your expectations?" (Deloitte) [First-hand, read].
- **Product today:**
  - The planner only builds topics from lines that are present, so a missing campus POR never becomes a question.
  - Nothing asks about the first months of the MBA. The only exception is the warm-up angle, which is unscored.

**Gap years (including CAT preparation).**
- Placement evidence is thin. One prep site says a gap year may affect summer placements, but less than students fear ([Percentilers](https://percentilers.in/do-gap-years-matter-in-cat-the-unfiltered-truth)) [Secondary; search summary only].
- All other results were admission advice ([Cracku](https://cracku.in/blog/how-to-justify-gap-year-in-iim-interview/), [PagalGuy](https://www.pagalguy.com/articles/how-to-justify-1-or-2-years-gap-in-iim-interview), [2IIM](https://online.2iim.com/cat-exam/blogs/cat-wat-gdpi/interview-preparation-justifying-a-gap-year-personal-interviews/)) [Admission only; search summary only].
- **Product today:** the planner raises a concern for an unexplained gap of 6 months or more with dates on both sides, and asks about it neutrally (planner step 4; step 7, rule 8). This already covers the CAT-preparation year. **No change needed.**

**Family business.**
- Placement evidence that family comes up:
  - "Tell me about yourself including your family" (Accenture Strategy, IIML; questions note) [First-hand, read].
  - A TAS PI at IIM Lucknow covered family background "in detail" (questions note, [InsideIIM 2016](https://insideiim.com/nidhis-internship-interview-with-tas-summer-internship-at-iim-lucknow-chapter-4)) [First-hand, read].
- Questions on why the candidate chose an MBA over the family business, and on how demonetisation and GST affected it, appear only in admission interviews ([InsideIIM, IIML admission](https://insideiim.com/iim-lucknow-interview-experience-cat-percentile-99-97ile-rishab-baid); [PagalGuy](https://www.pagalguy.com/articles/top-30-must-know-iim-interview-questions-to-ace-iim-admissions-mba-selection-guide)) [Admission only; search summary only].
- A prep site says a family-business stint, told with numbers and clear ownership, can stand out in finals ([Collvera](https://collvera.com/faq/can-family-business-or-freelance-work-be-used-as-work-experience-for-cat-and-iim)) [Secondary; search summary only].
- **Product today:**
  - `prompts/planner.md` step 4 says: "Never raise anything related to age, health, disability, pregnancy, family, …".
  - Step 7, rule 10 bans "protected or private characteristics".
  - A CV line such as "Business Development, Sharma Textiles (family business), 2 years" is work. The planner should test it like any job and ask why the student now wants this role.
  - The word "family" in the ban list may make the model avoid the line or the switch. **Not tested.**
  - Two saved sessions mention "family business": `sessions/2026-10-30-5a83f205.json` and `sessions/2026-11-06-7a144a39.json`. We did not inspect their plans for this note. Check those first, or run one planner test on such a CV.

**CA, CFA, defence or government background, career breaks.**
- **CA:**
  - Admission guides list "Why MBA after CA" as a standard question ([gdpiwat](https://gdpiwat.in/pi/ca-mba-interview/)) [Admission only; search summary only].
  - An InsideIIM interview with a CA rank holder asked whether he was typecast as finance-only. The question came from InsideIIM, not from a recruiter, and he said he was not aware of any typecasting by recruiters ([InsideIIM 2012](https://insideiim.com/mba-after-ca-from-iim)) [Secondary, read].
- **Defence:** officers applying to IIM Calcutta's one-year MBA were asked why they left the Army and whether they could adjust to a corporate setting ([GMAT Club](https://gmatclub.com/forum/interview-experience-of-iim-calcutta-1-year-mba-pgpex-256629.html)) [Admission only; search summary only].
  - IIMs and MDI run programmes for armed-forces officers moving to corporate roles ([Careers360](https://news.careers360.com/iim-calcutta-lucknow-indore-jammu-executive-mba-management-courses-mdi-gurgaon-armed-forces-jobs/amp)) [Secondary; search summary only].
- **CFA attempts and career breaks:** no placement evidence found.
- **Product today:** the switch concern lists examples such as "engineering or plant work to consulting or FMCG" and "audit to corporate finance". It has no example of armed forces or government service to corporate, or of CA practice to a non-finance role. The model may still catch these, but both are common at IIMs.

**Work-experience bands (0, 1-2, 3+ years).** Already handled:
- `experience_level` treats under one year as a fresher. This matches Mahindra's "9 or 10 months" rule (questions note).
- The placement stage, including laterals, changes what the planner draws on.
- The format note already records that heavy work experience counts against candidates in sales roles (IIFT), and the "working under younger people" question.
- **No new gap.**

### 2. The HR round in Indian placements

**HR rounds are a standard part of the process:**
- NITIE (IIM Mumbai) operations recruiters ran a GD, then a supply-chain interview, then an "HR round" (questions note) [First-hand, read].
- A P&G sales and marketing summer candidate described an interview made up entirely of HR questions, testing leadership, achievement, teamwork and ethics ([InsideIIM forum, 2013](https://insideiim.com/forums/topic/interview-experiences-procter-gamble/)) [First-hand; search summary only].
- TAS ends with a "Final Interview: Selected applicants have a face-to-face interaction with senior leaders of the Tata group" ([tata.com](https://www.tata.com/careers/programs/tas/tas-campus-tata-group)) [Recruiter official, read].

**What the HR round asks: one full first-hand account.** Deloitte, IIM Lucknow summers 2015, round 1 "HR (stress interview)" and round 3 "Principal" ([InsideIIM](https://insideiim.com/deloitte-interview-experience-4)) [First-hand, read]:
- "Why did you join IIM Lucknow and not IIM Bangalore?"
- "Is IIM Lucknow adding value as per your expectations?"
- "In your CV, I don't find any POR on campus?"
- "What all shortlists do you have?", then: "O Really! Every other person who came to this room told me about other shortlists. Now tell me, what other shortlists?"
- "B.Sc. Biology! Hm..How good are you in Maths"
- "If we give you PPO, will you be willing to travel?"
- "You have never done one thing at a time." and "How will you be consistent and satisfied in Deloitte?"
- "Why didn't you peruse you start up ahead in spite of being successful."

These are commitment and logistics questions, plus challenges to the student's record. Our interviewer asks none of them. Note that this is a consulting firm; we found no FMCG or operations account that quotes HR-round questions.

**Relocation, field, plant and rural postings:**
- Asian Paints' B-school programme (LEAP) includes "night shifts at the shopfloor" and "interaction with dealers during market visits". Campus hires in sales and marketing "join us at multiple locations across India" ([Asian Paints careers](https://careers.asianpaints.com/content/Student-Program/?locale=en_GB)) [Recruiter official, read].
- TAS officers' first year "includes 3 business stints and 1 community stint", followed by "final placement in a Tata company" ([tata.com](https://www.tata.com/careers/programs/tas/tas-campus-tata-group)) [Recruiter official, read].
- ITC summer internships can mean a factory or rural posting ([InsideIIM, ITC agri-business intern](https://insideiim.com/my-journey-in-itc)) [First-hand; search summary only].
- An ITC sales trainee was asked about willingness to travel anywhere in India (questions note) [First-hand, unverified].
- We found no first-hand IIM account of an HR interviewer asking about a rural or field posting. **The postings are real, but the question is unconfirmed.**

**Bonds and service agreements:**
- PSU and state-bank management-trainee notices carry bonds:
  - EXIM Bank: ₹3 lakh, for one year as a trainee plus five years of service ([EXIM notice copy](https://img.freejobalert.com/uploads/2022/10/Notification-India-Exim-Bank-Manager-Management-Trainee-Vacancy.pdf)).
  - BEML: ₹2 lakh over 4 years ([BEML](https://www.bemlindia.in/wp-content/plugins/career/WCP/DATA/Writereaddata/Career/KP_S_18_2025.pdf)).

  [Official; search summary only]
- Both are open recruitment, not campus placement. We found nothing on bonds being discussed in IIM campus interviews. **Not a product gap.**

**PPO, dream offers, Day 0 and Day 1 (process facts):**
- IIM Lucknow ([process guidelines](https://www.iiml.ac.in/placement-process-guidelines)) [Official, read]:
  - PPOs must be made "on or before January 31".
  - "Students with PPOs are allowed a restricted set of applications in Final Placements" and "can accept at most one offer during final placements".
  - After an offer, a student "can choose to appear for the process of at most one organisation which he prefers over the current offer", and "is deemed to have opted out of all the other selection processes".
  - Companies interview in slots over a placement week.
- IIMA's older guidelines describe the same dream and opt-out logic ([IIMA 2010-11](https://web.iima.ac.in/users/placement/files/IIMA_Placements%202011_Guidelines.pdf)) [Official; search summary only].
- IIMB's 2024-26 batch: 283 PPOs made and 219 accepted, so about 23% of PPOs were not accepted. PPO holders may still sit in finals; how many do is not stated ([MBAUniverse](https://www.mbauniverse.com/articles/iim-bangalore-placement)) [Secondary; search summary only].
- **What this means for questions:**
  - Students hold other shortlists and offers, and interviewers ask about them (Deloitte above).
  - We searched again for questions like "Why didn't you take the PPO?" or "Why not your summer company?". We **still found none** in any first-hand account. The search returned only IIT news on PPO rejections ([Careers360](https://news.careers360.com/iit-placements-2025-2026-delhi-madras-kanpur-roorkee-hyderabad-more-freshers-reject-ppo-btech-ai-jobs-india-salary-package-static/amp)) [Secondary; search summary only].
  - Treat that question as plausible for finals, but unproven.

**Salary.** Still no placement evidence. A one-year-MBA admission panel asked an ex-officer about package expectations [Admission only; search summary only].

**Product today:**
- Interview types: Recruiter screen ("Screening round"), Hiring manager, and Back your resume ("Resume deep dive").
- The screening template is motivation, a claim, a gap or fit question, and concerns.
- Nothing asks about travel, relocation, plant or field work, shortlists, why this school, or staying power.
- The room's scope line (`public/vmock/room.html:180`) says guesstimates, cases and group discussions are not covered. It does not mention the HR round.
- Fit-note item 8 suggested telling students that salary and relocation questions are not covered. It was not built, and it is not in TODO.

### 3. Feedback Indian students find useful in mocks

- **Mocks are run everywhere, but no source describes their feedback.**
  - SPJIMR's career services list mock interviews, GD preparation and CV reviews by industry professionals ([SPJIMR](https://www.spjimr.org/course/post-graduate-diploma-in-management-business-management/placement/)) [Official; search summary only].
  - IIM Shillong's and IIM Amritsar's committees run mock interviews (format note) [Official; search summary only].
  - At IIM Rohtak, alumni are said to run mocks based on the questions they faced (Collegedunia student answer) [Secondary; search summary only].
  - An IIML first-year describes many mock-interview sessions in the first three months ([InsideIIM, Flipkart intern](https://insideiim.com/unforgettable-experience-colourful-office-flipkart)) [First-hand; search summary only].
  - **No source says what a placement mock's feedback contains or how it is phrased.** This repeats the format note's finding. Only coaching sellers describe structured written feedback, on parameters they don't name [Secondary; search summary only].
- **The structure students are told to use matches ours:**
  - "each bullet point has a compelling story to tell, framed in the popular STAR format" (ISB, format note) [First-hand, read].
  - STAR keeps answers "short and crisp" (XLRI, format note) [First-hand, read].
  - A P&G candidate said answers went well when clearly split into problem, action and solution (P&G forum, 2013) [First-hand; search summary only].

  Our feedback rubric is STAR-based for past-behaviour questions. **No change needed.**
- **Should feedback name Indian norms ("placement panels expect…")?** We found no evidence either way. Our feedback ties each fix to why an interviewer would notice, which works without naming a country. **Not a gap; an open question for placement committees.**

### 4. Voice and delivery norms

- **Hindi and Hinglish:**
  - The only account of an interviewer switching to Hindi is an IIMA admission interview: a panellist invited the candidate to answer a case in Hindi ([CATKing](https://catking.in/iim-ahmedabad-personal-interview-experiences)) [Admission only; search summary only].
  - We found no placement account of a recruiter using Hinglish or Hindi, including for rural sales.
- **Accent, structure and pace:** the format note covers "neutral accents" (IIMB placement chair) and "crisp" structure. We found nothing on speaking pace.
- **Product today:**
  - Recognition of Indian English and code-mixing is parked in TODO.
  - Feedback quotes the student verbatim from the transcript. If speech-to-text translates Hindi phrases into English, a "verbatim" quote would not be what the student said. This belongs in the parked recognition test. **No separate item.**

### 5. Ethics, integrity and stress questions

- **Ethics evidence:**
  - TAS, IIM Lucknow summers: "Expect at least one or two questions on ethics and situations where you faced any ethical dilemma" (questions note, [InsideIIM 2016](https://insideiim.com/nidhis-internship-interview-with-tas-summer-internship-at-iim-lucknow-chapter-4)) [First-hand, read].
  - TAS in-house candidates list values and ethics among what assessors look for ([LinkedIn, TAS 2023 in-house journey](https://www.linkedin.com/pulse/tata-administrative-services-tas-2023-in-house-journey-dheeraj-singh)) [First-hand; search summary only; in-house, not campus].
  - Another in-house candidate prepared with civil-services ethics case studies ([LinkedIn, TAS 2021](https://www.linkedin.com/pulse/tata-administrative-services-tas-2021-in-house-journey-ravina-more)) [First-hand; search summary only; in-house].
  - The official TAS campus page does not say ethics is assessed [Recruiter official, read].
  - P&G's HR questions tested ethics among other qualities (forum, 2013) [First-hand; search summary only].
  - "An ethical dilemma you faced" appears in InsideIIM's HR-question lists. Those lists mix admissions and placements. The 2020 list we read is for HR-specialisation admissions ([InsideIIM](https://insideiim.com/basic-concepts-you-need-to-know-before-going-to-an-mba-hr-interview)) [Secondary, read; admission].
  - **No first-hand IIM placement account since 2016 quotes an ethics question.**
- **Product today:**
  - The fit angles are failure, disagreement or stance, and strength (`FIT_ANGLES` in `lib/engine.js`, checked).
  - The planner has no ethics topic, and the fit note's table recorded "no ethics".
  - The questions note listed ethics under its implication 7, but nothing was built.
- **Stress questions:** the Deloitte round labelled "stress interview" is sceptical, rapid questioning about school choice, shortlists, academics and consistency.
  - Its tone belongs to the parked pushback style.
  - Its content is covered above, under the HR round and academics.
  - "Why should we hire you" stays with the parked pushback item.

### 6. Accessibility and inclusion

- **Evidence:**
  - IIMB's placement chair tells students to "improve on your language and communication skills if they are weak", and warns that students from the university system may struggle with the resume workload (format note, [InsideIIM](https://insideiim.com/dream-job-b-school-iim-bangalore-professor)) [Secondary, read].
  - An InsideIIM opinion piece (about 2013) argues that CAT takers are mostly people who had access to English early. It cites about 20 million children in English-medium schools in 2012 ([InsideIIM](https://insideiim.com/iim-grad-have-an-iim-call-show-some-humility)) [Secondary; search summary only].
  - We found **no first-hand account** from a first-generation or non-English-medium IIM student about placement interviews, and no school policy on it.
- **Product today:**
  - Already there: the question is always shown as text, typing is available, and there are no scores.
  - Missing: a control to hear the question again, and a slower voice. Neither `public/student.js`, `public/student.html` nor `public/vmock/room.html` has one; the only "replay" in the room replays the first-turn tour.
  - The interviewer handles "Can you repeat that?" by rephrasing in new words. A literal replay or a slower voice would serve a student who understood the words but missed the speech.
  - Feedback text is already plain English with short sentences.
- **Hometown:**
  - Placement panels often ask about hometowns, for example "Where are you from?" and "What is the one thing you like about Kolkata?" (IIMC, format note) [First-hand, read].
  - The warm-up rule excludes personal life, so a hometown opener never appears.
  - This is a judgement call, not a defect: a hometown question is not about a protected characteristic, but it touches regional background.

## Glaring gaps, ranked

"Glaring" means an IIM student would notice it in their first sessions and conclude the mock does not know Indian placements. Everything else is nice-to-have. Items in docs/TODO.md and out-of-scope items are excluded.

1. **Summers never ask about the MBA so far, the academic record, or what is missing from the CV.**
   - **Missing today:**
     - The summers stage never asks about the first term, CGPA or rank, a degree that doesn't fit the role, or what the student has done on campus.
     - The planner never raises an absence, such as no campus POR.
   - **Parts:**
     - Planner `<placement_stage>` summers: allow one neutral question or probe on the first term or campus involvement.
     - Planner concerns: a degree-to-role fit concern, asked as "How has your B.Sc. in Biology helped with the quantitative side?", never as a judgement.
     - Feedback: the existing concern rubric.
   - **Why:**
     - "How was your first term?", "What is your CGPA at IIMC like and what approximate rank would that be?" and "What PoRs do you plan on taking up at Joka?" (McKinsey, IIMC) [First-hand, read].
     - "What have you done in IIM Lucknow all this while?" (Accenture) [First-hand, read].
     - "In your CV, I don't find any POR on campus?" and "B.Sc. Biology! Hm..How good are you in Maths" (Deloitte) [First-hand, read].
     - This re-raises format-note item 4 (summers content), which the placement-stage build left out.
   - **Size:** small (prompt).
   - **Glaring:** yes, for summers. These are among the first questions first-years get. Evidence moderate: several first-hand accounts from two schools (IIMC, IIML), consulting-heavy, 2015-2018.
   - **Careful:** never ask for Class X/XII marks or about backlogs. We found no placement evidence for either, and they would feel like a gate rather than practice.

2. **No HR-round content: travel and relocation, field or plant work, shortlists and offers, why this school, staying power.**
   - **Missing today:** no interview type asks any of these, and the room's scope line doesn't say they are not covered.
   - **Parts:**
     - Content: add the HR round to the scope line in `room.html`. This is fit-note item 8, still unbuilt.
     - Setup: an "HR round" type, or HR questions in the Screening round when a placement stage is set.
     - Planner: an HR slot kind, or a pool of one or two such questions.
     - Turn: neutral wording, and accept "I'd prefer not to say" about shortlists.
     - Feedback: judge whether the answer was clear and specific and gave a reason, never the student's actual preference.
   - **Why:**
     - The Deloitte IIML HR and principal rounds ([InsideIIM](https://insideiim.com/deloitte-interview-experience-4)) [First-hand, read].
     - HR rounds in NITIE operations processes and at P&G (questions note; forum) [First-hand, read / search summary only].
     - Asian Paints shopfloor night shifts and postings across India; TAS stints across group companies [Recruiter official, read].
     - Sales and marketing and supply chain, the role families with field and plant postings, are two of IIM Mumbai's largest (questions note; the role split there is Cracku's reading, not verified).
   - **Size:** small for the scope line; medium for an HR round.
   - **Glaring:** yes on the consulting evidence (Deloitte). Likely for FMCG and operations too, because the postings exist, but no account quotes the posting question. Evidence moderate for the round, weak for rural or field-posting questions.

3. **Family-business work may be skipped because of the "family" ban.**
   - **Missing today:** the ban in planner step 4 and step 7, rule 10 doesn't separate family-business work from private family matters.
   - **Parts:** planner wording in step 2 or step 4. One line: "Work in a family business is work experience. Test it and ask about the move like any job. Never ask about family members."
   - **Why:**
     - Family-business stints are common on Indian CVs.
     - Placement panels do touch family: Accenture's "Tell me about yourself including your family" and a TAS PI on family background [First-hand, read].
     - Every "why not the family business" account we found was an admission interview [Admission only].
   - **Size:** small. First check the two saved sessions that mention a family business, or run one planner test.
   - **Glaring:** only if the check shows the line is avoided. Otherwise nice-to-have. Evidence weak for placements.

4. **No ethics question.**
   - **Missing today:** the fit angles are failure, disagreement and strength. Nothing asks for an ethical dilemma, or a time the student was pressed to cut a corner.
   - **Parts:**
     - `FIT_ANGLES` in `lib/engine.js`: add a fourth angle, "a time they had to choose between what was easy and what was right".
     - Planner rule 10: allow that wording.
     - Feedback: the existing past-behaviour rubric.
   - **Why:**
     - TAS, IIML 2016: "Expect at least one or two questions on ethics" [First-hand, read].
     - TAS assessors look for values and ethics [First-hand; search summary only; in-house].
     - P&G HR questions tested ethics (2013) [First-hand; search summary only].
     - The questions note listed ethics in its implication 7, but it was never built.
   - **Size:** small.
   - **Glaring:** nice-to-have. Evidence weak to moderate: one read account from 2016, nothing recent.

5. **The switch examples miss common Indian moves.**
   - **Missing today:** the switch concern's examples have no armed forces or government service to corporate, and no CA practice to a non-finance role.
   - **Parts:** the example list in planner step 4 only.
   - **Why:** IIMs and MDI run transition programmes for officers ([Careers360](https://news.careers360.com/iim-calcutta-lucknow-indore-jammu-executive-mba-management-courses-mdi-gurgaon-armed-forces-jobs/amp)) [Secondary; search summary only]. Leaving the Army and "Why MBA after CA" are standard admission questions [Admission only].
   - **Size:** small.
   - **Glaring:** nice-to-have. Placement evidence is weak, and the model may already catch these moves.

6. **No way to replay the question or slow the voice.**
   - **Missing today:** a student who missed the spoken question can only ask the interviewer to repeat it, which gets a rephrase, not the same words.
   - **Parts:** voice and the student page: a "Hear again" control that replays the cached TTS line, and optionally a slower rate.
   - **Why:** language-access concerns for non-English-medium students (IIMB placement chair [Secondary, read]; InsideIIM opinion [Secondary; search summary only]). No first-hand student evidence.
   - **Size:** small.
   - **Glaring:** nice-to-have.

Not ranked:
- **Bonds:** the notices are official, but they are for open recruitment, and we found no campus interview that asks about them.
- **"Why not the PPO company":** still not found.
- **Gap years and work-experience bands:** already handled.
- **Feedback naming Indian norms:** no evidence either way.
- **Hinglish quoting in feedback:** part of the parked speech-recognition test.
- **A hometown warm-up:** a judgement call, not a defect.

## Weak spots in this evidence

- **The HR round rests on one account:** a 2015 IIM Lucknow Deloitte (consulting) account. The rest of that picture comes from two recruiter pages and the earlier notes. No FMCG or operations account quotes HR-round questions.
- **Admission material dominates searches.** Searches on CGPA, backlogs, gap years, family business, CA, defence, Hinglish, ethics and other offers returned mostly admission interviews. We excluded all of it, so placement evidence on these topics is close to nil.
- **Many sources are search-summary only:** the P&G forum, the TAS in-house LinkedIn posts, the bond notices, the SPJIMR page, the IIMA guidelines and the IIMB PPO numbers.
- **Some pages we read had nothing usable:**
  - The InsideIIM "Questions asked by recruiters" series loaded with no questions.
  - The XLRI TAS account is a video.
- **Never found, after searching again:**
  - "Why didn't you take or get the PPO?"
  - a rural or field-posting question;
  - salary in campus interviews;
  - what placement mock feedback contains;
  - any first-hand account from a first-generation or non-English-medium student.
- **IIM Mumbai has no first-hand HR-round questions.** The NITIE accounts describe an HR round but quote no questions (questions note).
- **Next step:** ask IIM Mumbai's placement committee two things before sizing item 2:
  1. What does the HR round ask: relocation, plant or field work, shortlists, why this school?
  2. What does their mock feedback cover?

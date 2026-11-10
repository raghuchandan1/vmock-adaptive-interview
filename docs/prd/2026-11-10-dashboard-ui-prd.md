# PRD: Dashboard UI for adaptive interviews (`/dashboard`)

**Status:** Built as a prototype; the chosen direction · **Owner:** Raghu Chandan (Product) · **Date:** 10 Nov 2026
**Feature:** [Adaptive interviewer PRD](2026-11-10-adaptive-interviewer-prd.md) · **Earlier UI:** [Candidate UI PRD](2026-11-10-candidate-ui-prd.md) · **Design capture:** `docs/dashboard-design-notes.md` · **Spec:** `docs/superpowers/specs/2026-11-07-dashboard-adaptive-design.md`

---

## 1. Problem statement

Students use the live VMock candidate dashboard (www.vmock.com/dashboard), not the older candidate Interview page. The adaptive interviewer has two products: an interview built from a CV and a job description, and a line-by-line CV defence. They need a home there that doesn't confuse students. SMART Interview already asks for a JD and a CV and generates a fixed question set, so a separate "Resume + JD" tab would put two entries asking for the same inputs side by side.

## 2. Goals

| # | Goal | How we know |
|---|---|---|
| G1 | Students pick the right format without help | ≥85% of pilot students who start SMART Interview finish the format step on their first try; fewer than 10% switch formats after step 4 |
| G2 | Setup stays short | Median setup time under 2 minutes; CV Deep Dive with Whole CV under 1 minute |
| G3 | Feedback leads to the next attempt | ≥30% of students who open feedback click Practice again or "Practise this line again" in the same visit |
| G4 | Feedback is readable and accessible | All level text at least 4.5:1 contrast; one h1 per screen; every control usable from the keyboard |

Targets are hypotheses for the pilot.

## 3. Non-goals

| Non-goal | Why |
|---|---|
| Rebuilding VMock's Question set flow | It exists in VMock; the replica shows a static placeholder of its question list |
| The Company Interview tab and other library content | Not needed to judge the feature; tiles are static |
| JD skill extraction | Shown as a placeholder ("Filled in by VMock's job description parser") until VMock's parser is connected |
| Delivery of Speech and Non Verbal on this page | Content only; nothing is shown that the model didn't produce |
| Market-specific setup | The setup screens don't know the market; the server applies `MARKET` |

## 4. User stories

**Student with a target job**
- As a student, I want SMART Interview to ask how I want to practise (Question set or AI Interviewer) after I've given my JD and CV, so that I choose with my inputs already in.
- As a student without a JD, I want to skip it and give a domain and role, so that I can still get a relevant interview.
- As a student comparing formats, I want each option to show what the session looks like, what to expect and who it suits, so that I can decide quickly.

**Student defending a CV**
- As a student, I want CV Deep Dive as its own sidebar item, so that I find it without a JD.
- As a student, I want to test my whole CV or only chosen sections or bullets, so that I can focus on the lines I'm least sure of.
- As an MBA student, I want to set my placement stage in one tap, with style and length left at sensible defaults, so that setup stays short.

**Student after the interview**
- As a student, I want to see the one habit to fix first, with where it happened in my own words and how to say it, so that I know exactly what to change.
- As a student, I want each topic on its own page with clear sections, so that I can read it without hunting through tabs.
- As a student, I want my transcript highlighted where the feedback quotes me, so that I can see which sentences worked.
- As a student, I want "Practise this line again" on a CV topic, so that I can retry it straight away.
- As a returning student, I want my past interviews under Previously Recorded, so that I can reopen their feedback.

## 5. Requirements (all P0 built unless marked)

### Entry and lists

| # | Requirement | Path | Acceptance criteria |
|---|---|---|---|
| D1 | **Mock Interviews page** | `/dashboard/smart-interviews/practice/career-interviews` · `public/dash/practice.html`, `practice.js`, `dash.css` | The dashboard's top bar, tabs and sidebar. Static tile library (Mock Interview, Recommended). The SMART Interview button carries a NEW badge and opens the sheet |
| D2 | **CV Deep Dive page** | `/dashboard/smart-interviews/practice/cv-deep-dive` | Sidebar item with NEW. Hero: "Be ready to back up every line of your CV", "Your whole CV, or just the lines you choose". Its past interviews below |
| D3 | **Previously Recorded** | `…/career-interviews?view=recorded` (`&kind=cv`) | AI Interviewer and CV Deep Dive chips. Rows show the role, else the domain, plus type, placement stage, "Focused on N lines", date, answers, and View or Get Feedback. The room's Past interviews link lands here |

### SMART Interview sheet (`?entry=mock`)

| # | Requirement | Path | Acceptance criteria |
|---|---|---|---|
| D4 | **Steps** | `/dashboard/smart-interviews/practice/adaptive/setup?entry=mock` · `public/dash/setup.html`, `setup.js`, `setup.css` | Upload Job Description (previously added list, paste or PDF, Skip) → Select CV (samples, upload, paste) → Interview Format → Interview Details or Interview Questions |
| D5 | **Interview Format step** | same | Two full cards: Question set and AI Interviewer (NEW, person-with-speech-bubble icon). Each has a glimpse of the session, rows for questions, follow-ups, how you answer and feedback, and a "Best for" line. Nothing preselected unless `&format=questions` or `&format=ai`. Both work without a JD |
| D6 | **Interview Details (AI Interviewer)** | same | Type (Screening or Hiring manager), domain, role, placement stage, style, length. With a JD, domain and role are optional and a "Top skills" placeholder shows. Without a JD, both are required. Start Interview hands off via `sessionStorage` (`vmock_adaptive_setup`) |
| D7 | **Interview Questions (Question set)** | same | A static placeholder of VMock's question list. Start Practicing is disabled (not part of the prototype) |

### CV Deep Dive setup (`?entry=cv`)

| # | Requirement | Path | Acceptance criteria |
|---|---|---|---|
| D8 | **Select CV with chosen lines** | `/dashboard/smart-interviews/practice/adaptive/setup?entry=cv` | "Test me on: Whole CV \| Chosen lines". Chosen lines turns the preview into a checklist (sections, role lines, bullets; parsed in `setup.js`). At least one line per topic (3 or 4). All lines ticked counts as Whole CV. The lines go as `focus_lines` with the whole CV |
| D9 | **Interview Details** | same | Domain required, role optional. Placement stage as one row of pills with its description. Style and length folded under "More options · Standard style · About 15 min · Change". Laterals read "For experienced hires and one-year MBA programmes" |

### Room and feedback

| # | Requirement | Path | Acceptance criteria |
|---|---|---|---|
| D10 | **Lobby** | `/interviews/adaptive/room` · `public/dash/room.html`, `room.css` | Header "Candidate Dashboard \| AI Interviewer" or "CV Deep Dive". Interview card with the interviewer icon. Tips fold away once the plan is ready. Says "CV", not "resume". Fits without scrolling |
| D11 | **Live call** (P1 polish) | same | Push-to-talk, typing, End (two clicks, one line) |
| D12 | **Feedback Summary** | `/interviews/adaptive/room?feedback=<id>` · `public/dash/feedback-v2.js`, `feedback-v2.css`, base `feedback.css` | h1 is the role. How it went with a level tally. "Fix this first": goal, where it happened (topic, quote, link) and "Say it like this". Topic by topic (question asked, one line, follow-ups, result). Content Strength across answers as its own section. On a phone the habit comes straight after the summary |
| D13 | **Feedback Detailed** | same | Tabs Topic 1…N, then Across the interview. One topic per page with sticky section links and a glance strip (said unprompted / after a follow-up / missing). Each section is its own card: What you did (tinted cards with icons), How to answer it next time (numbered steps; improved answer in a tinted box with its Checked line), What a strong answer covers (boxed groups; aligned rows of level, element, reason and quote), Follow-ups. Previous and Next topic sit in a plain row |
| D14 | **Annotated transcript** | same | Every quoted line highlighted: went well green, to fix amber, element quotes by level. Clicking a quote scrolls to its line |
| D15 | **Practise this line again** | same → setup `?entry=cv&back=1` | A CV topic opens CV Deep Dive with that line chosen. If more lines are needed, it lands on Select CV with the count shown |
| D16 | **Waiting for feedback** | same | A running clock while feedback is written (about a minute). A reload during writing waits instead of erroring. Old sessions fall back to the current model |

## 6. Success metrics

**Leading (pilot, first 4 weeks)**
- Format step completion (G1) and format switches after step 4.
- Share of CV Deep Dives using Chosen lines. Expect 15–30%; under 5% means it's hidden, over 60% means Whole CV isn't trusted.
- Feedback interactions: section links used, quotes clicked, Practise this line again clicks (G3).

**Lagging (one placement season)**
- Re-attempt within 7 days and topic verdicts improving on re-attempts (shared with the feature PRD).

## 7. Open questions

| Question | Owner | Blocking? |
|---|---|---|
| Default format on the step: none (current), or AI Interviewer for students who came from its promotion? | Product, Design | No |
| Should AI Interviewer sessions appear in VMock's existing Previously Recorded lists, or keep their own chips? | Product, Engineering | Yes, for launch |
| Keep topic pages at about 2.5 screens, or also fold On Track checklist rows? | Design | No |
| Connect VMock's JD parser to fill "Top skills" before the interview? | Engineering | No |

## 8. Timeline considerations

- This is the UI to pilot. Ship with the feature PRD's phase 1.
- **Dependencies for production:** VMock's routing for SMART Interview, its sessions and Previously Recorded storage, analytics events for §6, and the JD parser for Top skills.
- The candidate UI stays as a frozen comparison and needs no further work.

# PRD: Candidate UI for adaptive interviews (`/vmock`)

**Status:** Built as a prototype; superseded as the main direction by the [Dashboard UI](2026-11-10-dashboard-ui-prd.md) · **Owner:** Raghu Chandan (Product) · **Date:** 10 Nov 2026
**Feature:** [Adaptive interviewer PRD](2026-11-10-adaptive-interviewer-prd.md) · **Feedback:** [Student feedback PRD](2026-11-03-adaptive-interview-feedback-prd.md)

---

## 1. Problem statement

VMock's candidate Interview page (candidate-uat-us.vmock.dev) has no place for a conversational interview. To judge the adaptive interviewer as a VMock product, stakeholders need to see it inside VMock's own screens: where a student finds it, how they set it up, what the interview room looks like, and how feedback fits beside VMock's Content Strength, Delivery of Speech and Non Verbal modules. This replica answers those questions without changing VMock's codebase.

## 2. Goals

| # | Goal | How we know |
|---|---|---|
| G1 | Stakeholders can walk the whole flow in VMock's look | Entry → setup → room → feedback works end to end, with no developer screens |
| G2 | Setup takes under 2 minutes for a returning student | Median time from Get Started to Prepare Interview under 2 minutes in pilot sessions |
| G3 | Feedback layouts can be compared on one interview | v3, v2 and v1 render the same saved feedback via `?fbview=` |
| G4 | Real and placeholder content are never confused | Every placeholder part can be outlined with `?sources=1` and labelled "VMock · hardcoded" |

## 3. Non-goals

| Non-goal | Why |
|---|---|
| The other tabs of VMock's Interview page | Only Custom and Adaptive work. The rest are visual placeholders |
| Real Delivery of Speech and Non Verbal | Values on v2 are generated from the session id until VMock's analysis exists |
| Pixel-perfect parity with production | A product-review copy; tokens are taken from UAT |
| Being the launch direction | The dashboard UI is the chosen direction; this stays for comparison |

## 4. User stories

- As a student on VMock's Interview page, I want an **Adaptive Interviews** tab, so that I can find the new interview beside the ones I know.
- As a student, I want a short wizard (job description, resume, interview details), so that I can set up an interview without thinking about prompts.
- As an MBA student, I want to choose my placement stage, so that the questions match summers, finals or lateral hiring.
- As a student in the room, I want to check my camera and microphone while the interviewer prepares, so that I'm ready when it starts.
- As a student after the interview, I want a summary first and details per question after, so that I see the main point before the detail.
- As a reviewer, I want to switch feedback versions and outline placeholders, so that I can judge which layout to build.

## 5. Requirements (all P0 built unless marked)

| # | Requirement | Path | Acceptance criteria |
|---|---|---|---|
| C1 | **Interview page with the Adaptive tab** | `/vmock/interview?tab=adaptive` · `public/vmock/interview.html`, `vmock.js`, `vmock.css` | Adaptive tab and a card on Custom Interviews open the wizard. Other tabs are placeholders |
| C2 | **Setup wizard** | `/vmock/adaptive-interview` · `public/vmock/setup.html`, `setup.js` | Steps: Get Started (resume only, or resume and JD) → Job description → Resume (sample, PDF or paste) → Interview details (type, domain required, role, placement stage, style, length). Prepare Interview stores the inputs in `sessionStorage` (`vmock_adaptive_setup`) and opens the room. `?back=1` reopens with the last inputs |
| C3 | **Interview room** | `/vmock/adaptive-interview/room` · `public/vmock/room.html`, `room.css`, logic in `public/student.js` | Lobby in VMock's recorder frame: interview card, preparing checklist, then "What to expect", camera preview and Join Interview. The live call has push-to-talk, typing and End (two clicks; "Click again to end" stays on one line) |
| C4 | **Feedback v3 (default)** | `…/room?feedback=<id>` · `public/vmock/feedback-v3.js`, `.css` | Summary (overall, goal, priorities, questions at a glance) and Detailed Summary (list of questions; per question: next time, what you did, answer, follow-ups, checklist). No placeholders |
| C5 | **Feedback v2** | `…&fbview=v2` · `public/vmock/feedback-v2.js`, `.css` | v3 plus VMock's modules: Delivery of Speech and Non Verbal (placeholders), STAR sub-checks with "What we checked" and sample lines, More content checks. `&sources=1` outlines each placeholder |
| C6 | **Feedback v1** (P1, kept for comparing) | `…&fbview=v1` or `…&fbview=classic` · `public/vmock/feedback.js`, `.css` | The first layout and its older content-only form |
| C7 | **Past feedback by link** | `?feedback=<session id>` | Opens a finished interview's feedback directly; an old version is regenerated |

## 6. Success metrics

- Leading: share of reviewers who complete the flow unaided (target 100% in review sessions); setup time (G2).
- Decision metric: which feedback version reviewers prefer. This drove the move to the dashboard UI's topic-by-topic layout.

## 7. Open questions

| Question | Owner | Blocking? |
|---|---|---|
| Keep this replica once the dashboard UI ships, or retire it? | Product | No |
| Which v2 placeholder modules does VMock's pipeline actually produce today? | Engineering | No |

## 8. Timeline considerations

Frozen for comparison. New UI work goes into the dashboard UI. Shared logic (`public/student.js`, the server, prompts) keeps both working.

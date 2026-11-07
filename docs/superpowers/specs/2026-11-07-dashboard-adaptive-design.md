# Adaptive interviews in the vmock.com dashboard design

Date: 2026-11-07. Status: approved in chat, awaiting spec review.

## Goal

A second prototype of the adaptive interview in the design of the live candidate dashboard
(www.vmock.com/dashboard, source in the `dashboard-ui` repo). The existing `/vmock/*` prototype
(new VMock shell) stays as it is.

What changes from `/vmock/*`: the entry points. "Resume + JD" and "Resume only" were two paths
inside one Adaptive Interviews tab. They become two products:

- **Mock Interview, Resume + JD**: a new sub-tab on the existing Mock Interviews page, next to
  "Mock Interview" and "Recommended". JD required.
- **CV Deep Dive**: a new item in the Practice sidebar. Resume only.

After the entry, the flow is the same as today (setup, interview room, feedback), with every
screen restyled in the dashboard design.

## Decisions (from the user)

| Topic | Decision |
|---|---|
| Design source | Copied from the live site (captured 2026-11-07); `dashboard-ui` is reference only, not changed |
| Mock entry | Third sub-tab "Resume + JD" on the Mock Interviews page |
| Setup per entry | Mock: JD required, types Screening round + Hiring manager round. CV Deep Dive: resume only, type fixed to Resume deep dive |
| Screens restyled | Setup, room and feedback all in the dashboard design |
| Feedback modules | Content only (as feedback v3): no Non Verbal / Delivery of Speech placeholders |
| Scores | No "Level N/5" or "Current Performance Level" anywhere (scoring is out of scope) |
| Past interviews | Listed on each entry page only; no Previously Recorded copy |

## Where it lives

- New files in `public/dash/`. Nothing under `public/vmock/` changes, apart from shared code being
  reused as-is (`student.js`, `shared.js`).
- New page routes in `server.js` `PAGES`, mirroring the real dashboard URLs:

| URL | File | Screen |
|---|---|---|
| `/dashboard/smart-interviews/practice/career-interviews` | `dash/practice.html` | Practice page, Mock Interviews (sub-tab via `?tab=library\|recommended\|adaptive`) |
| `/dashboard/smart-interviews/practice/cv-deep-dive` | `dash/practice.html` | Practice page, CV Deep Dive |
| `/dashboard/smart-interviews/practice/adaptive/setup` | `dash/setup.html` | Setup sheet (`?entry=mock\|cv`) |
| `/interviews/adaptive/room` | `dash/room.html` | Interview room + feedback (`?entry=mock\|cv`, `?feedback=<id>`) |

One `practice.html` serves both sidebar items; the script reads the path to pick the active item.

## Design tokens (captured from the live site)

- Font: `proxima-nova` (Typekit kit already used by `/vmock`), fallback "Helvetica Neue", Helvetica, Arial. Body 14px, #212529.
- Primary #0075cb; light blue fill #e6f1fa; sidebar active bg #eff6ff; soft button bg #f5faff.
- Page bg #eff2f5 (dashboard) / #f0f0f8 (results). White panels, radius 8px.
- Level pills (radius 18, 12px/500, padding 4px 18px): Needs Work bg #feedeb text #f34d3d;
  On Track bg #fdf5e8 text #ff9e2d; Good Job green (take exact value when building).
- Buttons: primary #0075cb, 40px tall, padding 5px 20px, radius ~4px; outlined blue; text-only grey Skip.
- Filter chips: pill radius 60, 34px tall; active #e6f1fa with #0075cb border.

Full capture notes, with every measured component, are in `docs/dashboard-design-notes.md`


## Screens

### 1. Practice page (`dash/practice.html`)

Copy of the dashboard shell: white top bar (logo, "Candidate Dashboard", Home / CV / Cover Letter /
Career / Elevator Pitch / **Interview** / Appointments / Jobs / Written Feedback, partner logo,
user pill), right icon rail, then the white Interviews container with tabs Practice (active) /
Learn / Previously Recorded / Script / Assessments. Only Practice is live; the other tabs and top
links are inert.

Left sidebar "INTERVIEWS": Mock Interviews, **CV Deep Dive** (new, right below), Requested,
Community, Career Conversations, Case, Custom, Technical, "SMART Interview" button, Bookmarks,
Resources links. Only Mock Interviews and CV Deep Dive are live.

**Mock Interviews** main area: header "Mock Interviews", sub-tabs with icons:
- *Mock Interview* and *Recommended*: static copy of the tile library (chips, 4-column tiles with
  illustration, title, "6 Questions · 10 - 12 min", bookmark, Attempted pill). Tiles do nothing.
  Placeholder illustrations: plain tinted blocks (no copied photos).
- ***Resume + JD*** (new): an intro card (what it is, ~10-15 min, feedback on every answer at
  the end), primary "Start interview" button to setup with `entry=mock`, then "Your past
  interviews" with every finished session whose type is not Resume deep dive. Each row opens
  `/interviews/adaptive/room?feedback=<id>`.

**CV Deep Dive** main area: header "CV Deep Dive", the same intro card shape (resume only, line by
line, be ready to back up every claim), "Start CV Deep Dive" button to setup with `entry=cv`, and
past sessions of type Resume deep dive.

Past list: same source and filter as `vmock.js` today (`/api/sessions`, ended, at least one answer,
no test runs), split by `interview_type === 'back_your_resume'`.

### 2. Setup sheet (`dash/setup.html`, `dash/setup.js`)

Copy of the SMART Interview full-screen sheet: page dimmed behind, white sheet with radius 16 16 0 0,
close (x) top right, title 20px bold + grey subtitle, footer with stepper bottom-left (numbered
circles joined by dashes, current step labelled) and Back / Next bottom-right.

| Step | Mock (`entry=mock`) | CV Deep Dive (`entry=cv`) |
|---|---|---|
| 1 | **Upload Job Description**: left "Sample job descriptions" list (our `/api/samples`), right textarea (#fafafa, radius 8) with PDF attach. Required: Next stays disabled while empty; no Skip | **Select CV** |
| 2 | **Select CV**: search box, "+ Upload New CV" outlined button, paste-text option, table Name / Added / Source with radio rows (selected row blue border, filled check); preview pane on the right shows the selected resume text | **Interview details** |
| 3 | **Interview details** | |

Interview details (left form, right summary card listing the chosen CV and, for Mock, the JD's first
line): Domain (required), Target role (optional), Placement stage, Interview type (Mock only:
Screening round / Hiring manager round; CV Deep Dive shows "Resume deep dive" as fixed text),
Style (Friendly / Standard / Challenging / Surprise me), Length (about 10 / 15 min). Footer on the
last step: primary "Start Practicing".

The real step 3 lists the generated questions. Ours does not: the plan must never reach the
browser during an interview, so step 3 is the details form instead.

Logic is `vmock/setup.js` adapted: same validation (resume at least 200 characters, domain
required, key present), same handoff (`sessionStorage` key `vmock_adaptive_setup`, same input
shape), plus `entry`. For `entry=cv`, `jd_text` is empty and `interview_type` is
`back_your_resume`. "Back from the room" (`?back=1`) reopens the last step with the last inputs,
as today. Closing the sheet returns to the entry page it came from.

### 3. Interview room (`dash/room.html`, `dash/room.css`)

Same markup contract and `student.js` as `vmock/room.html` (lobby, live call, feedback screens;
`takeHandoff`; `ROOM_LABELS`), restyled:

- Top bar as on the results/calibration pages: logo, "Candidate Dashboard | Mock Interviews" (or
  "| CV Deep Dive"), user pill.
- **Lobby** modelled on the calibration screen: left panel (~280px) with the interview card (type,
  role, company, stage) and three prep steps with icons (find a quiet room, hold Space or the
  button to talk, answer as you would in a real interview), plus "Change setup"; centre the
  camera/voice check area with a primary "Start interview" button.
- **Live call**: same layout family (left panel with the interview card and progress, centre
  interviewer captions and push-to-talk). The real recording screen could not be captured (the
  browser pane blocks the camera), so this one is designed in the dashboard style rather than
  copied.
- `data-setup-url` depends on the entry: `/dashboard/smart-interviews/practice/adaptive/setup?entry=<entry>&back=1`,
  set from the handoff's `entry` (or `?entry=` when opened directly). "New interview" goes to the
  same setup with no `back`.

### 4. Feedback (`dash/feedback.js`, `dash/feedback.css`)

A new renderer that replaces `VM.renderFeedback` on this page only, built from the same feedback
object v3 uses (no new fields, no prompt changes). Copy of `/interviews/:id/results`:

- Second bar: interview name, tabs **Summary | Detailed Feedback** (active blue, underlined),
  "Practice again" outlined button (to setup, same entry). No level or score.
- **Summary**: left panel: heading "How your interview went" with the overall in two lines; pills
  Overall / Q1..Qn; one module card "Content Strength" (title, pill from our verdict tally, grey
  description band, rows by rubric group with icon and small level tag, as v3's `contentCards`).
  Choosing Qn shows that question's rows in the card. Right panel "How to improve?": the goal for
  next time (marked High impact), "See it in question N", then "Also work on" priorities, then a
  primary "View Detailed Feedback" button.
- **Detailed Feedback**: Q1..Qn pills + the question text. Left: Content Strength as the only
  module tab; a vertical sub-nav per rating element (icon + name, active grey bg); content area
  with the blue tip banner ("Fix this to move this answer up"), the element heading + level pill,
  where it appeared with the verbatim quote, "How to answer it next time" (answer plan steps), the
  student's own line improved (bracketed blanks), went well / to fix, follow-ups asked, and the
  sample answer in the SAMPLE RESPONSE box only where v3 shows one. Right: "Script" tab with the
  transcript of that question and time-range chips from the topic `segment`.
- Warm-up / background moments, "no questions at the end" and JD must-have coverage: a final
  "Across the interview" item after Qn in the pills.
- Nothing judged: the same empty states as v3 (no overall, goal or priorities).
- Labels: Good Job / On Track / Needs Work map one-to-one to our three levels.

### 5. Out of scope

Previously Recorded tab copy; Non Verbal / Delivery of Speech; Learn / Script / Assessments tabs;
the other sidebar products; mobile bottom nav (pages must still not scroll sideways at phone width:
the sidebar collapses to a row of chips); any change to prompts, engine or API.

## Testing

- `npm test` still passes (no server logic changes beyond `PAGES`).
- Manual run in the browser pane with the mock OpenAI server or a real key: both entries through
  setup, room (browser voice), end, feedback; Change setup returns to the right entry; `?feedback=`
  opens a past session; phone width has no horizontal scroll.
- Compare each screen side by side with the live dashboard captures.

## Docs

CLAUDE.md gets a short "Dashboard replica (`/dashboard/...`)" paragraph next to the VMock replica
one: files, routes, entry split, feedback renderer.

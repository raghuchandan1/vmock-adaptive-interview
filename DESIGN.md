---
name: VMock Adaptive Interviews (student page)
description: A practice interview that looks and behaves like an ordinary video call.
colors:
  vmock-blue: "#2C6BC9"
  vmock-blue-hover: "#2459A8"
  blue-wash: "#E8F0FE"
  blue-deep-ink: "#0B3C82"
  ink: "#1F1F1F"
  ink-soft: "#444746"
  ink-faint: "#5F6368"
  paper: "#FFFFFF"
  fill: "#F1F3F4"
  hover-fill: "#F8F9FA"
  hairline: "#DADCE0"
  hairline-soft: "#E8EAED"
  field-stroke: "#C4C7C5"
  call-ground: "#202124"
  call-tile: "#3C4043"
  call-tile-deep: "#2D2F31"
  call-ink: "#E8EAED"
  call-ink-soft: "#BDC1C6"
  end-red: "#D93025"
  ok: "#188038"
  warn: "#B06000"
  danger: "#C5221F"
  level-good-bg: "#E6F4EA"
  level-good-ink: "#137333"
  level-mid-bg: "#FEF7E0"
  level-mid-ink: "#8A5300"
  level-low-bg: "#FCE8E6"
  level-low-ink: "#B3261E"
typography:
  headline:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title-small:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  captions:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  meta:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  logo:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.02em"
rounded:
  pill: "999px"
  tile: "12px"
  box: "12px"
  field: "8px"
  round: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.vmock-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.vmock-blue-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.fill}"
    textColor: "#80868B"
  button-primary-recording:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.vmock-blue}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.blue-wash}"
  button-text:
    textColor: "{colors.vmock-blue}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  button-end:
    backgroundColor: "{colors.end-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 26px"
  button-round:
    backgroundColor: "{colors.call-tile}"
    textColor: "{colors.call-ink}"
    rounded: "{rounded.round}"
    size: "48px"
  button-round-off:
    backgroundColor: "{colors.end-red}"
    textColor: "{colors.paper}"
  input-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  chip-choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.field}"
    padding: "7px 16px"
  chip-choice-selected:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.blue-deep-ink}"
  option-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.box}"
    padding: "14px 16px"
  option-card-selected:
    backgroundColor: "{colors.blue-wash}"
  call-tile:
    backgroundColor: "{colors.call-tile}"
    rounded: "{rounded.tile}"
  transcript-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    width: "380px"
  captions:
    backgroundColor: "rgba(32, 33, 36, .86)"
    textColor: "{colors.paper}"
    typography: "{typography.captions}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
  feedback-topic:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.box}"
    padding: "22px 24px"
  feedback-goal:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.blue-deep-ink}"
    rounded: "{rounded.box}"
    padding: "18px 22px"
  level-pill-good:
    backgroundColor: "{colors.level-good-bg}"
    textColor: "{colors.level-good-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
---

# Design System: VMock Adaptive Interviews (student page)

Scope: this system covers the student surface only (`/student`: `public/student.html`, `public/student.css` scoped under `body.student`, `public/student.js`, plus the shared feedback renderer `public/shared.js` as styled there). The developer/review page (`/`, `public/index.html` + `public/app.js`) is not part of this world; it keeps the older teal/Newsreader look from `public/styles.css` and should not be restyled from this file. `public/styles.css` is the shared base the student stylesheet loads and overrides; where the two disagree, `student.css` is the system.

## Overview

**Creative North Star: "The Ordinary Call"**

The practice interview is an ordinary video call, made at Google Meet's level of craft, so there is nothing new to learn and all attention goes to answering. Light, Meet-home screens (setup, pre-join lobby, feedback, past interviews) surround a dark call. The look is borrowed on purpose from the category's canon (Meet, Zoom, Teams): pill buttons, round dock buttons, 12px tiles, a white side panel, captions on a translucent dark box.

VMock blue is the only brand voice. It marks the primary action, whose turn it is (the speaking outline), and the current line of the transcript. Everything else is Google-grey neutrals. Density is calm and roomy on the light screens and fixed-to-viewport in the call: the call never scrolls, only the transcript does.

The world rejects the bespoke "AI interview product" look: no glows, no gradients, no chat bubbles on a card, no decorative illustration.

**Key Characteristics:**
- Light screens around a dark call; the call switches the page to a dark color scheme.
- One accent (VMock blue #2C6BC9) for primary action, turn-taking and the current line.
- Figtree for every role; weight (400 / 500 / 600 / 700) carries hierarchy, not a second face.
- Pills for text buttons, circles for icon buttons, 12px for tiles and boxes, 8px for fields and chips.
- Flat surfaces; depth only from the light/dark split and a few small functional shadows.
- Drawn stroke SVG icons (1.8 stroke, round caps), never glyphs.

## Colors

Google-grey neutrals with one recognisable blue; red appears only for ending the call and devices turned off.

### Primary
- **VMock Blue** (vmock-blue): primary pills, the speaking outline on the active tile, link and text buttons, focus rings on light screens, selected-choice borders, meters, step progress, the interviewer avatar. A brand commitment; keep it.
- **VMock Blue, pressed** (vmock-blue-hover): hover state of primary pills only.
- **Blue Wash** (blue-wash): the current transcript line, selected chips and option cards, the "Next time" goal box, hover of secondary and text buttons, the file drop zone while dragging.
- **Deep Blue Ink** (blue-deep-ink): text on blue wash where blue itself would be too light (selected chips, the goal title).

### Neutral (light screens)
- **Ink** (ink): headings and body text; also the recording pill's fill.
- **Ink Soft** (ink-soft): secondary body text, past transcript lines, unselected chip labels.
- **Ink Faint** (ink-faint): hints, metadata, timestamps, ledes.
- **Paper** (paper): page ground and every card, panel and field on the light screens.
- **Fill** (fill): the file drop zone and disabled primary pills.
- **Hover Fill** (hover-fill): hover of option cards, chips and past-interview rows; the "how to answer next time" block.
- **Hairline** (hairline): card, row and secondary-button borders.
- **Hairline Soft** (hairline-soft): internal dividers (panel answer area, lobby section rule), feedback block borders, meter track.
- **Field Stroke** (field-stroke): text field and chip borders, a step darker than hairline so inputs read as inputs.

### Neutral (the call)
- **Call Ground** (call-ground): the live page and dock background; also the lobby camera preview.
- **Call Tile** (call-tile): the interviewer tile and round dock buttons.
- **Call Tile Deep** (call-tile-deep): the self-view picture-in-picture when the camera is off.
- **Call Ink / Call Ink Soft** (call-ink, call-ink-soft): text on the call; timer and names in call-ink, state lines, interview title and dock hint in call-ink-soft.

### Status
- **End Red** (end-red): the End interview pill and a round device button in its off state. Nowhere else on the call.
- **OK / Warn / Danger** (ok, warn, danger): interviewer presence dots in the lobby (ready / waiting / failed) and warning status text in the answer area.
- **Level pairs** (level-good-*, level-mid-*, level-low-*): feedback level pills (Good job / On track / Needs work) and the small dots before "What went well" (good ink) and "What to fix" (low ink).

### Named Rules
**The One Blue Rule.** VMock blue is the only accent. It means "act here" or "this is live now" (primary action, speaker, current line). Never use it decoratively.

**The One Red Pill Rule.** The only red pill on screen is End interview. Recording is shown as a dark ink pill with a small red dot (#F28B82), so starting an answer never looks like ending the call.

## Typography

**Display Font:** Figtree (with system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Figtree
**Label/Mono Font:** Figtree; numbers that tick (timer, timestamps) use tabular figures.

**Character:** One friendly geometric sans in four weights, as a call app uses one UI face. Headlines tighten slightly (-0.02em); everything else is set at normal tracking.

### Hierarchy
- **Headline** (headline): screen titles on setup, feedback and past interviews; 26px under 900px. Balanced wrapping.
- **Title** (title): the lobby's interview brief heading; 20px for feedback section titles, 20px semibold for the host name.
- **Title Small** (title-small): feedback topic headings; 17px for the transcript panel title.
- **Captions** (captions): live captions on the interviewer tile; 15px / 1.4 on phones.
- **Body** (body): default text, fields, buttons (600 for buttons); ledes at 16px with a 60ch measure.
- **Body Small** (body-small): transcript lines, feedback secondary text, presence and drop-zone notes.
- **Label** (label): field labels and legends, chip labels (500), dock hints.
- **Meta** (meta): speaker names in the transcript and above captions, small content labels such as "The question". Sentence case, never uppercase-tracked.
- **Logo** (logo): the lowercase "vmock" wordmark in blue in the top bar.

### Named Rules
**The One Face Rule.** Figtree for every role. The base stylesheet's serif token is mapped to Figtree on this surface; do not reintroduce a serif for questions or quotes. Quoted student words are set in Figtree italic.

## Layout

- **Light screens:** 64px top bar (56px on phones) with the wordmark and "Practice interview" left, a link right. Main column max 1160px with 24px gutters (16px on phones). Setup is a single centred column (max 640px) in reading order. Feedback and past interviews use an 880px column.
- **Lobby (pre-join):** two columns, 1.55fr camera preview (16:9, 12px corners) and a 320px-minimum host column, 48px gap, vertically centred. Stacks under 900px with the preview at 30vh.
- **Live call:** fills the viewport (100vh, 100dvh on phones) and never scrolls. Grid: interviewer tile (fluid) plus a 380px white Transcript panel, 16px gaps and padding; an 84px dock below with three zones (time and title left, round buttons and End pill centred, "Hold Space to talk" right). Under 900px the tile takes 34vh above the panel, the dock is 72px with the title and hint hidden, and the self-view moves to the tile's top right at 112px.
- **Self view:** picture-in-picture at the tile's bottom right (248px, 16:9, 10px corners), mirrored.
- **Transcript panel:** history scrolls, short threads pin to the bottom, the answer control sits at the panel's foot behind a soft hairline.
- **Rhythm:** 8 / 12 / 16 / 24 / 48px; fields stack 26px apart; cards 16px apart; list rows 10px apart.
- **Breakpoint:** one, at 900px.

## Elevation & Depth

Flat. Depth comes from the light-screen / dark-call split and from tonal steps (call ground, tile, deep tile), not from shadows. The few shadows that exist are small and functional.

### Shadow Vocabulary
- **Primary hover** (`box-shadow: 0 1px 3px rgba(60, 64, 67, .3)`): primary pill on hover.
- **Self-view lift** (`box-shadow: 0 2px 6px rgba(0, 0, 0, .35)`): the picture-in-picture over the interviewer tile.
- **Speaking outline** (`box-shadow: inset 0 0 0 3px #2C6BC9`): the active speaker's tile, animated in 0.2s ease-out.
- **Field focus** (`box-shadow: 0 0 0 1px #2C6BC9` with a blue border): a 2px-looking blue ring on fields; selected option cards use the inset equivalent.
- **Name legibility** (`text-shadow: 0 1px 2px rgba(0, 0, 0, .5–.6)`): name tags over video.

### Named Rules
**The Moving Outline Rule.** Whose turn it is is shown by a 3px inset blue outline that moves from the interviewer tile (speaking) to the self-view (recording). It is the system's signature; no other element gets an outline at rest.

## Shapes

Canon video-call geometry. Pills (999px) for every text button, level pills and the sample selector. Perfect circles for icon buttons, avatars, presence dots and step markers. 12px for tiles, the lobby preview, the transcript panel, cards, option cards, the drop zone and feedback topics. 10px for the self-view and feedback blocks. 8px for text fields, choice chips, captions and nested "stronger version" boxes. Borders are 1px hairlines; the drop zone is dashed until a file is loaded.

## Components

### Buttons
- **Shape:** pill (999px); 15px Figtree 600, 20px line, 10px 24px padding; full-width variant has 13px vertical padding.
- **Primary:** VMock blue on white text; hover darkens and adds the small hover shadow; disabled is fill grey with #80868B text, full opacity.
- **Secondary:** white with a hairline border and blue text, optionally with an 18-22px icon; hover fills with blue wash.
- **Text button:** blue 14.5px 600 text, pill hover in blue wash.
- **Answer button (push-to-talk):** the primary pill; while recording it becomes an ink pill with a 9px red dot before the label.
- **Focus:** 2px blue outline, 2px offset; on the call the outline is light blue (#8AB4F8).
- **Motion:** 0.15s colour/shadow transitions; none under reduced motion.

### Dock buttons
- **Round:** 48px circle, call-tile fill, call-ink icon; hover #4D5156. When a device is off (aria-pressed false) the circle turns end red with a white icon and shows the "off" icon.
- **End interview:** 48px-high red pill, 26px horizontal padding (18px on phones), white 15px 600 label; hover #B3261E.

### Chips (choice chips)
- **Style:** Meet filter-chip style, 8px corners, 1px field-stroke border, 14px 500 ink-soft label, 7px 16px padding, wrapped with 8px gaps.
- **State:** selected fills with blue wash, border matches, label turns deep blue ink 600. Focus ring on the label.

### Option cards
- **Style:** 12px corners, hairline border, 14px 16px padding, a native radio tinted blue; hover #F8F9FA.
- **Selected:** blue border, inset 1px blue ring, blue wash fill, description text darkens to ink soft.

### Inputs / Fields
- **Style:** white, 1px field-stroke border, 8px corners, 12px 14px padding, 15px text; placeholder #747775; hover darkens border to ink faint.
- **Focus:** blue border plus 1px blue ring, no outline.
- **File drop zone:** fill grey, 1px dashed #A8ABAF, 12px corners, centred upload icon and two lines; dragging turns it solid blue on blue wash; loaded collapses to a white row with a document icon, file name, details and a replace action.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** paper.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 16px 20px (past rows), 22px 24px (feedback topics).

### Interviewer tile (signature)
Call-tile ground, 12px corners, centred 136px blue avatar with initials (88px on phones) and a state line beneath ("Speaking", "Thinking"); the avatar dims to 55% while thinking or transcribing. Name tag bottom left. Captions sit bottom left on a translucent dark box (rgba(32, 33, 36, .86), 8px corners) with a small "Interviewer" label; on phones the label hides and the box keeps the latest three lines. The self-view sits in the corner. The speaking outline lives here.

### Transcript panel
White, 12px corners, 380px wide. Title "Transcript" (17px 600). Each line: speaker (13px 600) and tabular time, then 14.5px text in ink soft. The current line runs edge to edge in blue wash with ink text. The foot holds a status line, an optional live caption of the student's words, a 4px blue level meter, the answer pill or a typing box.

### Lobby
Camera preview with mirrored video, name tag and a level meter; host column with a 52px avatar, name, presence dot (warn / blue / ok / danger / faint by state), a progress list (18px ring markers: spinning blue while current, solid blue with a drawn check when done; static under reduced motion), the interview brief and a full-width primary pill.

### Feedback
Goal box in blue wash (no border) with the "Next time" title in deep blue ink; topic cards with the question set as body text under a small "The question" label; feedback blocks with soft hairline borders and a coloured dot before "What went well" / "What to fix"; "next time" blocks on hover fill; level pills (12.5px 600, 3px 10px); quoted words in italic ink soft; an overview list of questions; disclosure summaries in blue.

### Past interviews
Stacked 12px-corner rows with hairline borders, title in 600, date and count in ink faint, a secondary "See feedback" pill at the right; on phones the button drops below the text.

## Do's and Don'ts

### Do:
- **Do** follow the category's canon: if Meet, Zoom or Teams would put a control in a place, put it there.
- **Do** keep VMock blue (#2C6BC9) for primary action, the speaking outline, the current transcript line and the small brand marks that share its meaning (wordmark, interviewer avatar, links, focus, meters and progress); never as decoration or a background.
- **Do** use pills for text buttons and 48px circles for icon buttons, with drawn stroke SVG icons (1.8 stroke, round caps).
- **Do** keep the live call inside the viewport; let only the transcript scroll.
- **Do** show the question as text (captions and transcript) alongside the voice.
- **Do** respect reduced motion: no spinner rotation, no outline or button transitions.

### Don't:
- **Don't** use glows, gradients or chat bubbles on a card; transcript lines are flat rows.
- **Don't** make any pill red except End interview; recording is an ink pill with a red dot.
- **Don't** add a second typeface or bring back the base stylesheet's serif on this surface.
- **Don't** use coloured side stripes on feedback blocks or the goal box; status is a small dot or a level pill.
- **Don't** use uppercase tracked labels; small labels are sentence case, 13px 600 ink faint.
- **Don't** apply this system to the developer page at `/`.

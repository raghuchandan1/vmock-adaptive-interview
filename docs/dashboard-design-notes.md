# vmock.com dashboard design capture (2026-11-07)

Font: proxima-nova (Typekit), fallback "Helvetica Neue", Helvetica, Arial. Body 14px, color #212529 / #222.
Primary blue #0075cb; light blue fill #e6f1fa; side-nav active bg #eff6ff; button-ish light #f5faff.
Page bg #eff2f5 (dashboard), #f0f0f8 (results). Cards white, radius 8px.

## Top bar (white, ~56px)
logo "vmock" + "Candidate Dashboard" | links Home CV Cover Letter Career Elevator Pitch Interview(active, 500) Appointments Jobs Written Feedback | partner logo | "TU Test User" pill | grid icon. Link 14px #444.
Right rail (icons: bell, check, notes, chat) ~44px wide white.
Browser warning banner: light blue bg, blue border, "Got it" primary btn.

## Interviews container (white, radius 8px, at x=24)
Tabs bar 50px: Practice (active 600, blue underline) Learn, Previously Recorded [count pill grey], Script, Assessments.
Left sidebar 224px: heading "INTERVIEWS" 13px 500 #888 uppercase. Items 56px tall, 14px #404040, icon left; active bg #eff6ff, radius 6, 600, blue right border bar.
Items: Mock Interviews, Requested Interviews, Community Interviews, Career Conversations, Case Interviews, Custom Interviews, Technical Interviews; then outlined button "(+) SMART Interview" (bg #f5faff, 0.5px #0075cb border, radius 4, blue 600); separator; Bookmarks; RESOURCES heading; links "Elevator pitch guide", "Interview guide" with new-tab icon.
Main: header "Mock Interviews" 16px 700 #222. Sub-tabs with icons: "Mock Interview" (active blue underline) | "Recommended". Right: "Update Preferences" (blue link w/ gear icon), search input bg #f2f2f2 radius 6 "Search Interviews".
Chips: pill radius 60, pad 6/16, 34h; active bg #e6f1fa border #0075cb blue 500; idle bg #f2f2f2 #666.
Tiles grid 4 col: white card, 1px border light grey, radius 8, image on top (illustration), title 16px 600 #222 truncated + bookmark icon, meta "6 Questions · 10 - 12 min" 14px; "Attempted" pill bottom-right bg #489cff white 12px radius 12px 0 8px.

## SMART Interview modal (full-screen sheet, radius 16 16 0 0)
Title 20px 700 ("Upload Job Description" / "Select CV"), sub 14px #555.
Step 1: left box "Previously added job descriptions" (1px #d2d2d2 radius 4) list w/ logo; right textarea bg #fafafa radius 8, attach icon bottom-left.
Step 2: "Select CV": search box, "+ Upload New CV (1 left)" outlined blue btn; table Name | Upload/Time | Module (chips CV, Career Fit); selected row blue border, filled blue check; right pane resume preview.
Step 3: left "CV" file card, right "Questions" list; footer "0 Questions • 0 mins", Prep Time input "10 sec", "Start Practicing" primary.
Footer: stepper bottom-left (circles 24px: active blue outline/green check-ish, others grey #999, dashes between; label of current step), right Skip (grey text) / Back (outlined) / Next (primary #0075cb, radius ~4, 40h, pad 5/20).

## Previously Recorded
Chips row (Mock Interviews [2] active, Requested, Community, Career Conversations, Case Prep >), View Bookmarked checkbox, search, Sort By.
Card per template: image, title, "No. of Attempts". Interview row: "Interview 1", date, Difficulty, Questions Attempted 5 of 5, link/share/kebab icons.
Expanded: video thumb; "You are on track!" + "Your interview level [Level 2]" (orange pill); three rows Non Verbal / Delivery of Speech / Content Strength each with level pill; right "Improvements" list with icons; "View Detailed Feedback" outlined blue btn.

## Template modal (click a tile): full-screen sheet
Left: image + title + bookmark, category; accordions "Career Info", "Previous Attempts". Right: tabs Basic/Intermediate/Advanced, "Select All", Filters (count), question rows (checkbox, Qn text, type label, add-to-draft icon, "120 sec" input). Footer "6 Questions • 12 mins", "Show Draft List (6)" outlined, "Start Practicing (200 left)" primary.

## Calibration (/interviews/calibration/mock-interview) - recording screen itself not reachable (camera blocked in pane)
Own top bar like results. Left panel ~280px: template thumb + name + "VMock"; steps with illustrations: Face Calibration / Maintain Upright Posture / Ensure Upper-body Visibility (title 600 + grey text); links "Check hardware", "Show Instructions". Centre: video area, hint "Position face inside the section above blue line", primary "Start Calibration" button. Error modal: illustration, title 600, text, "How to fix this:" expandable row, primary + link button.

## Results page /interviews/:id/results/summary
Own top bar: logo, "Candidate Dashboard | Mock Interviews", dropdown "Mock Interviews", partner, user.
Second bar: "Interview 1" select, tabs Summary | Detailed Feedback (active blue 600 underline), "Current Performance [Level 2]", "Re-attempt Interview (200 left)" outlined blue radius 5, link/play/share icons.
Summary: left white panel: icon + "Current Performance Level" + text; "Level (2)/5" orange circle; pills Overall Q1..Q5 (radius 16, active bg #e6f1fa border blue); 3 module cards (Non Verbal, Delivery of Speech, Content Strength) each: title, level pill, grey description band, rows with icon + name + small grey level tag; "View More" footer; legend Good Job (green) On Track (orange) Needs Work (red), "High Impact steps" icon.
Right panel: "How to improve ?" + text + "View Detailed Feedback" primary full-width; "Overall Improvements" list with small icons.
Detailed: Q1..Q5 pills + question text 16px 500. Left: module tabs (title 16px 600 + level pill) with blue underline; vertical sub-nav (icon + name, active grey bg); content: "Improve in this section to step up to level 3" blue banner, "Next steps for ..." row with arrow; heading + pill + "Know More"; accordions ("Topic Coverage" w/ Needs Work pill; "SEC Role" with red missing-point chips; text; SAMPLE RESPONSE box bg #fafafa border .5px #d2d2d2 radius 8 with tag header). Right: video w/ timeline, or "Script" tab with transcript + Highlights toggle.
Level pills: Needs Work bg #feedeb color #f34d3d; On Track bg #fdf5e8 color #ff9e2d; radius 18, 12px 500, pad 4/18. Good Job: green (check).

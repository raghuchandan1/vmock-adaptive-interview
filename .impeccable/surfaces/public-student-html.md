---
version: 1
slug: "public-student-html"
primary_target: "public/student.html"
related_targets: ["public/student.css","public/student.js"]
---

# Student page (/student)

Mode: Operate. Audience: university students practising alone on a laptop. Job: set up, join, answer out loud, read feedback, reread past feedback. Constraint: never show the hidden plan during the call; keep push-to-talk (Space) and typing.

## Direction contract

THESIS: the practice interview is an ordinary video call, done at Meet's level of craft, so nothing about the tool is new to learn and all attention goes to answering. Refuses the bespoke "AI interview product" look (glows, gradients, chat bubbles on a card).

OWN-WORLD: light Meet-home screens (white ground, #F1F3F4 fills, #DADCE0 hairlines, #1F1F1F ink, #5F6368 secondary) around a dark call (#202124 ground, #3C4043 tiles, #E8EAED text). VMock blue #2C6BC9 for primary pills, the speaking outline and the current transcript line. Pill buttons, 48px round icon buttons with drawn SVG icons, 12px tile corners, Figtree throughout.

STORY: the student sees a familiar call, understands whose turn it is from the blue outline and the panel button, answers, and leaves with feedback they can come back to.

FIRST VIEWPORT: live call. Left two-thirds: interviewer tile, avatar centred, captions of the current question near the bottom, the student's own camera as a corner tile. Right third: white "Transcript" panel, history above, current question highlighted, the answer control (Start answering / Done answering, or the typing box) at its foot. Bottom dock: time and interview title left; camera, type/speak and red End interview pill centred; "Hold Space to talk" right.

FORM: category standard (canon, chosen by the user from three built samples), executed at full fidelity. seed:7a10119bf910cd99

Signature interaction: the blue speaking outline moves between the interviewer tile and the student's tile as the turn changes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

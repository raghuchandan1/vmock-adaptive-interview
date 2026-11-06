---
target: feedback v2 (VMock room)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/raghubade/Documents/Code/vmock-adaptive-interview/.claude/worktrees/feedback-v2/public/vmock/feedback-v2.js"
target_fingerprint: "sha256:14312585a6b94b7e6bb92dc597a84f15746de7d454cf9e540cf669a0f1b89407"
target_path: /Users/raghubade/Documents/Code/vmock-adaptive-interview/.claude/worktrees/feedback-v2/public/vmock/feedback-v2.js
timestamp: 2026-11-05T20-09-22Z
slug: public-vmock-feedback-v2-js
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Phone question row not sticky; Q5 off-screen, no scroll cue |
| 2 | Match System / Real World | 2 | STAR/HSAR, Hz, dB, Depth & Clarity unexplained for freshers |
| 3 | User Control and Freedom | 3 | Last question ends on Previous only; no back-to-summary / Practice again |
| 4 | Consistency and Standards | 2 | High impact red vs grey; Overall cards contradict themselves |
| 5 | Error Prevention | 2 | Empty interview shows goal/priorities; placeholder metrics become advice |
| 6 | Recognition Rather Than Recall | 3 | Dots legend hidden on phones |
| 7 | Flexibility and Efficiency | 3 | Arrow keys, roving tabindex, Summary rows deep-link |
| 8 | Aesthetic and Minimalist Design | 2 | ~16 equal-weight Summary controls; goal duplicated; nested cards |
| 9 | Error Recovery | 2 | "Use the steps above" over one step; empty message below a contradicting goal |
| 10 | Help and Documentation | 2 | No explanation of levels or metrics |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict
Authored for the product (resume-line chip, verbatim quotes, fill-in blanks + "Checked" line, VMock levels). Generic parts (metric cards, traffic-light dots) inherited from VMock's recorder. Detector: CLI 8 findings, none in feedback v2 (setup/lobby/.agenda, room.html, styles.css:156); browser 12 / 22 / 27 findings (Summary / question / Overall Delivery): low-contrast 4.0-4.49:1 brand blue/grey/green on tints, nested-cards, straggler, line-length on #fbOverall, 10px labels in Also work on. text-occlusion = overlay artifacts. No page overflow at true 375px.

## Priority Issues
- [P0] Empty interview (87849ba3, 0 topics) still renders overall, goal and 3 priorities above the empty message; module tiles are dead buttons. Fix: guard on !fb.topics.length. (/impeccable harden)
- [P1] Placeholder Delivery/Non Verbal advice enters Also work on (Facial Expressions); placeholder levels in tiles/dots; random "face not visible". Fix: keep vmock items out of Also; mark "Sample, not measured". (/impeccable clarify)
- [P1] Overall Content Strength cards contradict ("Strong in every answer" vs "Strong in 0 of 1"; Next step on Good job). Fix: derive from label counts; reword next step on Good job. (/impeccable harden)
- [P1] One clear next step diluted: two High impact badges (one grey), goal duplicated in Also, goal not linked to a question, Detailed ends without goal + Practice again. (/impeccable distill)
- [P2] Module tiles open first needs-work question instead of Overall on that module; 10-11px text and 4.0-4.4:1 contrast on tints. (/impeccable polish)

## Persona Red Flags
- Jordan: Also items look static; jargon; three identical On track tiles; no dots legend on phone.
- Sam: rail roving tabindex without composite role; fill-in blanks read as real text.
- Casey: rail numbers only, not sticky, 36px targets, Q5 off-screen; 11px chips.
- Nervous fresher: red dots first; invented facial advice; same phrase praised and criticised; I/we contradiction; no encouraging close.

## Minor Observations
Q1/Q5 same topic indistinguishable on phone; too-short pane shows two Not scored switches; "[amount]" left blank though resume says 6 hours; Across the interview easy to miss; stragglers.

## Questions to Consider
- Summary built around one question showing the goal (their line, then improved)?
- Show Delivery/Non Verbal at all before real?
- Fix-before-quote order: test with real freshers.

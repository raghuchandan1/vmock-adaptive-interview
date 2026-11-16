# UAT report: review (feedback quality, Previously Recorded, phone width, reload/rejoin, concurrency) (flow `review`, window acct-review)
(Saved by the lead from uat-review's messages. Own account; Rohan uploaded (9 left). Times IST from own session API created_at/ended_at/generated_at + transcript offsets (±1 min). Turn = Nth interviewer line. Interviews 106, 112, 121, 142. Helpers /tmp/claude-502/uat/reviewbin/. Screenshots /tmp/claude-502/uat/shots/review-*.png)

## Entry notes
First visit: redirect to /dashboard/home ("Experience The All New VMock Home" + 5-step tour) then "Choose your Career preferences". Resume Deep Dive: upload ("Please wait!" ~50 s scoring) > whole resume / choose lines ("Tap a line to pick it, then Pick sub-section or Pick section…", counters; Next disabled until a line) > Interview details (Function* — list says "Consultancy" while preferences say "Consulting"; Target role optional; 10/15 min). Room controls: mic, camera, Pause, timer; "Switch to text mode"; End disabled until 4 turns.

## Results part 1 (scenarios 1-2)
1a PASS | 106 clean typed run; one question per turn, no praise; turn 10 ~19:43 "…The recruiter can confirm the starting salary for this role."
1b UNCONFIRMED (Major if real) | 106 after turn-1 answer ~19:30: "Connection lost / We couldn't stay connected to your interviewer…"; timer 17:24 after ~4 min; console ERR_TIMED_OUT (VPN likely); Reload + Rejoin 19:34 recovered. review-s1-connection-lost.png
1c FAIL Major | After every rejoin the room shows only the pending question. 106 turn 2 (19:34) "Thanks for walking me through your path. Your Kitecart checkout redesign cut cart abandonment from 71% to 58% across 2 million monthly sessions. How did you calculate that change?"; 112 turn 3 (~19:53) and turn 4 (~19:55). Feedback keeps full transcript. review-s1-rejoin-transcript-lost.png, review-s4-reload-lobby.png
1d FAIL Minor | 106 turn 8 (~19:42) two asks: "Got it. How did your move from operations analytics into product management unfold, including the months between roles?"
1e FAIL Major (Blocker if hard rule) | Scores: 106 "Score 96/100 • Good", "Motivation & Fit 92/100", "High Impact steps to improve your level score"; 112 "Score 25/100", "Motivation & Fit 0/100"; 142 "Score 28/100". review-s1-fb-tab2-score.png
1f FAIL Minor | 106 waiting screen 19:44 "Your Score is being calculated", "Judging each answer against its rubric". review-s2-waiting.png
1g FAIL Minor | Topic questions keep previous lead-in: 106 Topic 2 "Thanks for walking me through your path. …"; Topic 3 (turn 5 ~19:38) "Let's switch gears. Your Kitecart team prioritised a 40-item backlog every sprint. What was the toughest trade-off you had to make?"
1h PASS | 106 all 5 quotes verbatim, right topic. 1i PASS | samples add nothing beyond answers + CV.
1j PASS, Minor note | Fixes specific but mild; all Good Job, Next Steps "Keep it up!". Overall line shown while generating ("Your first comparison mixed a sale-period baseline with test-period control…") missing from final summary.
1k FAIL Major | 112 Next Steps ("Ground each role in evidence", "State the measurable result", "Make your motivation specific") not linked to a topic.
1l FAIL Minor (may be intended) | Warm-up rated: 112 turn 1 (19:51) "Walk me through your career so far." Needs Work; closing "No, that's all. Thank you." (106 after turn 10) ON TRACK.
1m FAIL Major | "Practise this line again" not present anywhere (106).
1n FAIL Minor | 106 "Ran 30 of 10 min" (disconnected time counts); every Detailed Feedback message stamped 0:27.
2a PASS | waiting screen % + stages ("This usually takes around 30 seconds"). 2b PASS | reload at 25% resumed at 79%, finished (106 ~19:45). 2c PASS | second tab shows finished feedback.
2d FAIL Minor | Latency 2m26s (106), 3m08s (112, 0% ~200 s), 8m29s (142) vs stated 30 s.

## Results part 2 (scenarios 3-5)
3a PASS (Minor note) | Previously Recorded, Resume Deep Dive chip: 106 "Associate Product Manager · Resume Deep Dive · Product Management · November 16, 2026 · 11 answers [View]"; 112 "Product Management · Resume Deep Dive · 7 answers [View]"; CareerBuddy chip: 121 "Associate Product Manager · Mock interview · 1 answer [Continue]". Page opens on Elevator Pitch chip ("No Previous Recording" first).
3b PASS | [View] opens /interviews/adaptive/feedback/106.
3c FAIL Major | 112 ended 20:13:42 during topic 3 at turn 8 ("Mm-hm. What showed you that the remaining work fit the sprint's capacity?"), no confirmation, no "ended early" marker. "Topic 4 · not reached"/"Topic 5 · not reached" Needs Work ("You did not answer because this question was not reached."), "Motivation & Fit 0/100", 25/100; Next Steps "Make your motivation specific…" for an unasked question. Repro 142 (ended 21:23:33): 28/100.
3d PASS | 121 left unfinished: [Continue] -> /room/121 Rejoin lobby.
4a FAIL Major/Minor | 112 reload after 2 answers (~19:53, turn 3 pending "Got it. What did you change in checkout to address that friction?"): reopened with same question, no skip; transcript lost (1c); timer reset 00:01; End's turn count reset (disabled until 4 more turns).
4b PASS (apart from 1c) | 112 ~19:55 close tab + reopen: Rejoin lobby kept timer 03:48, turn 4 pending "Okay. What counted as an abandoned cart in the 71% and 58% figures?"
4c PASS | 112 ~19:56 browser Back: leave-page prompt; Dismiss stays; Accept -> /dashboard/home; Forward -> Rejoin lobby works.
5a PASS | 112 idle from 19:57:20; "Session paused …[Resume]" ~20:02 (~297 s); timer frozen 10:00; Resume keeps state.
5b FAIL Minor | 112 ~20:03 Pause button: status "Paused" but timer keeps running (10:48 -> 11:09).

## Part 3: concurrency, voice, phone, accessibility
6 PASS | Two live interviews in one account stay separate. Run 1 20:09-20:13 (112 + 121); run 2 typed 21:19-21:23 (142 + 121), answers sent in both within 1 s at 21:22:27. Each room kept its own transcript; next questions referenced own answers (142 turn 4 "Right. You prioritised a 40-item backlog each sprint…"; 121 "Right. A manual fallback gives the warehouse a way to switch back quickly. Let's turn to distributor ordering…"). No crossover, no double AI turns, nothing auto-paused. Side effect: slower feedback. Not tested: both tabs on a real mic.
7 Not tested (voice paused). UNCONFIRMED earlier: 112 ~20:05 second of two spoken sentences dropped (turn 4 "What counted as an abandoned cart…"); next turn 5 "Okay. Did you keep other checkout changes constant when comparing the 71% and 58% rates?" (also yes/no).
8a PASS | 390px Mock Interviews ~20:20.
8b PASS, Minor | CareerBuddy dialog usable; illustration empty purple box.
8c FAIL Minor | Generate wizard footer overlaps: [Back] cut off; "1 2 3" over "Switch format".
8d FAIL Major | Resume Deep Dive line chooser at 390px: each line 4.8 px tall, unreadable; picking needs precise hover+click.
8e PASS | 121 lobby on phone ~20:35.
8f FAIL Minor | 121 live room ~20:36: typing and End work; CareerBuddy tile/status not shown (can't tell whose turn); transcript panel greyed.
8g FAIL Major | 106 feedback ~20:40: role/score bar covers tabs (taps don't register); Debrief wraps one letter per line ("V i e w F e e d b a c k"); Detailed 3 overlapping columns; Topic Feedback only via ?tab=topics.
9a PASS, Minor | 121 ~20:50 keyboard: Rejoin, mic, camera, text mode, Pause, End, text box reachable; Enter sends. Tab escapes lobby pop-up; faint focus outline on text box; logo link unnamed.
9b FAIL Minor | End Interview white on #E5484D = 3.91:1 contrast; placeholder "Ask me anything about your career....." unfit for an answer box.
9c PASS | Feedback tabs/buttons keyboard reachable (106).

## Part 4: latency, entry notes, outside scope
Latency (own session API, IST): 106 ended 19:43:59 ready 19:46:25 (2m26s); 112 ended 20:13:42 ready 20:16:50 (3m08s; 0% ~200 s while 121 live); 142 ended 21:23:33 ready 21:32:02 (8m29s; "queued" 21:23-~21:31, then processing, success); 121 never ended (feedback endpoint 409). None >15 min; screen says "This usually takes around 30 seconds".
End Interview disabled until 4 turns; count resets on every reload; ends at once with no confirmation.
Outside scope (mock bank, 121): turn 1 (20:09) double question "What is one development area you are actively working on, and how might it affect your judgement when engineering capacity, customer experience, and unit economics conflict during a high-pressure launch?"; ~20:52 near-duplicate consecutive questions "How would you trace one affected order through the inventory updates to find where the counts diverged?" then "What would you inspect first in one order's history to establish where the inventory count diverged?" (Minor).

## Interview IDs
106 | Resume Deep Dive whole, PM, target APM, 10 min, rohan | started 19:15 | clean run + feedback audit + reload/second tab during feedback | finished, feedback 19:46:25
112 | Resume Deep Dive whole, PM, no role, 10 min | started 19:51 | reload/rejoin/back, pause, concurrency run 1, voice (pre-rule), ended early 20:13:42 | feedback 20:16:50
121 | Mock > Product Management > Associate Product Manager, 18 min | started 20:09 | concurrency both runs, phone room, keyboard, left unfinished | status paused, [Continue]
142 | Resume Deep Dive whole, PM, target Product Analyst, 10 min | started 21:19 | concurrency typed redo, ended early 21:23:33 | feedback 21:32:02
Risks: cause of 1b unknown (VPN?); 112's first 4 answers and one in 121 were voice before the typing-only rule.

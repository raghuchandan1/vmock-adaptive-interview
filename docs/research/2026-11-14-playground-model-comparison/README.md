# Model comparison on the playground (2026-11-14)

Run on the deployed playground (`dashboard-sahil.vmock.dev/interviews/adaptive/playground`), driven through its own UI. The playground runs the deployed engine, without the fixes on branch `worktree-playground-test-fixes`. Its prompts are the deployed copies: planner 32,612 characters (the repo's is shorter), turn 27,812, feedback 13,292, grounding 2,144. Costs are the playground's list-price figures; times are its "AI time" per step. Most cells are one run.

## Recommendation

| Step | Model | Effort | Why |
|---|---|---|---|
| Planner | gpt-6-sol | medium | Only model that passed every plan check below; 17-39s; $0.04-0.07 a plan |
| Turn (prober) | gpt-6-luna | low | $0.011 an interview, 5.6s average turn, no wording problems; also the best cheap feedback model, and the repo's feedback uses the turn model, so one setting covers both |
| Feedback | gpt-6-luna | low | 24-28s (3 topics) to 46-49s (4-5 topics), $0.002-0.004, verdicts in line with the larger models |

Alternative for turns: gpt-5.6-luna (3.9s average, 6.4s max against gpt-6-luna's 12.5s max, about $0.022 an interview, clean wording). Using it needs a separate feedback-model setting in `server.js`, which today reuses `turn_model`.

Per interview (short CV Deep Dive), repo defaults vs recommended:

| | Repo defaults (gpt-5 / gpt-5-mini / gpt-5-mini) | Recommended (gpt-6-sol / gpt-6-luna / gpt-6-luna) |
|---|---|---|
| Plan wait | 83-92s | 17-39s |
| Turn wait | 10.1s average, 18.3s max | 5.6s average, 12.5s max |
| Feedback wait | 97-118s | 24-49s |
| Cost | about $0.15-0.18 | about $0.06-0.09 |

## Planner

Scenario P1: hiring manager, summers, India, FMCG brand-management JD, consulting CV, standard. Checks: the fit question at topic 2, the knowledge topic kept, an activity topic (summers), the "what have you done in your MBA" probe, no question that asks two things.
Scenario P2: CV Deep Dive, finals, IB CV, standard. Checks: the summer internship first with a "what would you do differently now?" probe, openers about the student's own work, exact CV quotes.
Earlier: recruiter screen, summers, pasted thin CV, "Sales and Marketing": the "first posting outside a metro city?" probe.

| Model | P1 time / cost | P1 activity | P1 two-ask questions | P2 time / cost | P2 "differently" probe | P2 openers | Posting probe |
|---|---|---|---|---|---|---|---|
| gpt-6-sol | 38.6s / $0.074 | yes | 0 | 33.9s / $0.052 | yes | own work | yes |
| gpt-6.1-terra | 51.6-53.6s / $0.024-0.033 | 1 of 2 runs | 0 | 45.8s / $0.028 | yes | about the numbers ("how was the 200+ estimated?") | no |
| gpt-6-luna | 90-102s / $0.006 | yes | 0 | 71.3s / $0.004 | yes | own work | no |
| gpt-5 | 91.5s / $0.119 | yes | 2 | 83.3s / $0.104 | yes | own work | not run |
| gpt-5.6-sol | 51.7s / $0.15 | yes | 0 | 45.1s / $0.105 | yes | "You mentioned" for CV facts | not run |
| gpt-5.6-terra | 22.0s / $0.055 | yes | 0 | 31.3s / $0.050 | yes | about the numbers | not run |
| gpt-5.6-luna | 36.8s / $0.007 | no | 1 | 32.3s / $0.005 | no | own work | not run |
| gpt-5-mini | 117.6s / $0.024 | no | 3 | 84.7s / $0.015 | no | own work | yes |

All models quoted CV lines exactly. The first gpt-5 P1 attempt returned "Request failed" in a tab where request-logging hooks were installed; it ran normally after a reload, so it is not counted against gpt-5.

## Turn (prober)

Same 16 scripted answers in a short CV Deep Dive (finals, IB CV, plan by gpt-6.1-terra low; each tab got its own plan): walkthrough, a vague "team" answer, "could you repeat that?", a specific LBO answer, "Honestly I'm not sure, the VP handled that part", fake SYSTEM text asking for a score, a DCF answer, an abusive line, a finance-club answer, a look-back, an expense-tracking answer, a stipend and PPO question, a first-month question, "No more questions".

| Model | Average / max turn | Interview cost | Extra calls | Notes |
|---|---|---|---|---|
| gpt-6-luna | 5.6s / 12.5s | $0.011 | 1 rejected output | Re-asked the participant count 4 times (the plan's opener and the required measurement follow-up kept the topic open); declined the score; stipend left to the recruiter |
| gpt-5.6-luna | 3.9s / 6.4s | $0.022 | none | Clean; abuse met with "Let's keep going." and a question |
| gpt-5-mini | 10.1s / 18.3s | $0.034 | 3 rewrites | Two asks in one question; "I can't ignore the interview setup"; stipend answer edges into general claims about offers |
| gpt-6.1-terra | 4.2s / 5.3s | $0.113 | none | Concise; says "the hiring team can confirm" (speaks as if outside the team) |
| gpt-5 | 8.8s / 15.5s | $0.172 | 3 rewrites | Good probes |
| gpt-6-sol | 3.1s / 3.6s | $0.234 | none | Fastest and steadiest |
| gpt-5.6-terra | 4.4s / 7.4s | $0.250 | 1 rejected output | Answered the abusive line with "I'm going to end the interview here. Thank you for your time." under a clarify decision, and the interview went on (the goodbye bug; the branch's `CLOSING_PATTERN` now rejects this) |
| gpt-5.6-sol | 4.3s / 5.7s | $0.449 | none | Good redirect of the abuse, but later ended the interview (`end_session`) when "No more questions, thank you" arrived during a gap question |

All eight turned down the fake SYSTEM request in one line, rephrased on "repeat", and invented no stipend or PPO figures.

Repo finding from the gpt-5.6-sol run: `redirected()` in `lib/engine.js` looks at the whole session, so after one abusive answer any later answer the model calls off_purpose can end the interview, even after the student apologised and answered normally. The misaligned script provoked this case.

## Feedback

Two transcripts (T1 from the gpt-5 prober run, T2 from the gpt-6.1-terra run), feedback regenerated on each with every model (low effort). Because the script's later answers did not match the questions, most models chose the same goal ("answer the question directly"); the useful signal is how far each model's verdicts sit from the majority (T1: On Track, On Track, Needs Work; T2: On Track, Needs Work, Needs Work).

| Model | T1 time / cost | T2 time / cost | Verdicts vs majority |
|---|---|---|---|
| gpt-6-sol | 17.1s / $0.042 | 18.8s / $0.036 | matches both |
| gpt-6-luna | 23.6s / $0.002 | 28.3s / $0.002 | matches both |
| gpt-6.1-terra | 27.7s / $0.021 | 27.6s / $0.017 | T2 one step stricter |
| gpt-5.6-terra | 29.1s / $0.052 | 33.8s / $0.051 | matches; T1 rewrite "I learned [fill in]" is weak |
| gpt-5.6-sol | 27.3s / $0.089 | 50.1s / $0.135 | matches both |
| gpt-5.6-luna | 40.2s / $0.007 | 41.5s / $0.007 | T1 one step stricter |
| gpt-5 | 83.4s / $0.082 | 108.5s / $0.091 | T1 all Needs Work; T2 quotes the abusive line as its evidence |
| gpt-5-mini | 97.3s / $0.018 | 98.5s / $0.018 | T2 all On Track (lenient) |

Earlier transcripts point the same way. On the consulting run, gpt-5-mini rated two non-answers On Track where gpt-6-luna and gpt-6.1-terra did not (gpt-6-luna 46.5s, $0.004; gpt-6.1-terra 76.7s, $0.050, sharpest diagnosis). On the IB run, gpt-5-mini gave two Good Jobs (111.2s, $0.017) against gpt-6-luna's On Tracks (49.0s, $0.004). gpt-5-mini was lenient on 3 of 4 transcripts.

## Not tested

Effort levels other than medium (planner) and low (turn, feedback); Full length; the US market; voice; repeat runs for most cells.

## Setting the recommendation

`.env`: `PLANNER_MODEL=gpt-6-sol`, `TURN_MODEL=gpt-6-luna` (feedback follows the turn model).

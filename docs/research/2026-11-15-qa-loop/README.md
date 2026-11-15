# QA loop: test, fix, retest (2026-11-14 to 2026-11-15)

A tester agent ran real interviews against the local server (planner and feedback gpt-5.6-sol, turns gpt-5.6-luna; the key has no gpt-6 access), and a fixer agent fixed what it found, for 14 rounds. Each round reran a fixed set of scenarios with a model playing the student, plus new scenarios for paths not yet covered.

## Scenarios

| | Setup |
| --- | --- |
| A | Hiring manager, standard, balanced, Rohan (APM) + Brightpath PM JD |
| B | Recruiter screen, short, supportive, summers, Ananya (fresher) + Lumen Pay JD; stipend question at the end |
| C | CV Deep Dive, standard, probing, finals, two chosen lines, "we"-heavy student |
| D / D2 | US market; off-topic, abuse, apology / off-topic then manipulation twice |
| E | Finals with a real MBA summer internship |
| F / G | Two abusive answers in a row |
| H | Laterals, US, probing, manager resume, Senior PM JD |
| I | Summers, first-year MBA, hiring manager (fit angle varies by seed) |
| J | One off-topic answer, then recovers |
| K / L | Vague answers on one claim so a second-chance topic is added (CV line with / without a number) |
| M | Abusive twice in the warm-up |
| N | Two "not sure" answers in a row on a topic |
| O | Rambling student (330–430 words per answer) |

## Scores

| Round | Score | Main fixes that followed |
| --- | --- | --- |
| 1 | 72 | second-chance on the wrong skill, CV Deep Dive repeats, owed motivation probes, conduct in feedback |
| 2 | 78 | second abuse ends, recruiter-screen top claim, "rate" false positive, reflection rated |
| 3 | 80 | feedback resend kept ratings, laterals "why now", pivots never replace knowledge |
| 4 | 83 | spelled-out numbers, same-line role cover, MBA probe in hiring manager, all-good topics |
| 5 | 86 | second-chance subject without numbers, rewrite keeps owed rung |
| 6 | 88 | resends fixed in code (6/10 → 1/10 on replay), covered decision faults |
| 7 | 89 | warm-up abuse ends, adverb "not sure", cap-only to-fix, brevity ask |
| 8 | 91 | goal action, length goal, no re-measuring after "not sure" |
| 9 | 93 | scenario rewrites survive grounding, spread length cut-ins |
| 10 | 93 | early start (create in ~5 ms, plan in the background) |
| 11 | 93 | unanswered last follow-up not faulted, grounding never empties a rewrite |
| 12 | 94 | react follow-ups built in, planned questions verbatim, goals linked |
| 13 | 95 | fixed opener lead-ins, disguised react checks refused |
| 14 | 95 | confirmation |

## State at the end (round 14)

- Create 0.1 s; plan 28–53 s in the background (hidden by the warm-up at normal pace); turns about 3.5–4.5 s; feedback 20–30 s (44–50 s when sent back, 3 of 15 runs).
- Feedback fields consistent in 13 of 15 sessions (one is a checker artefact on an ended-early topic).
- About 150–200k input and 12–16k output tokens per 15-minute session.

Open polish items: an evasive phrase can still be echoed in a react follow-up ("When you say things improved, …"); a redirect after an off-topic answer can ask three things; a fully vague topic whose rewrite grounding removes entirely ships with no "say it like this" (a bracketed template would help); one duplicated lead-in on the told-story opener path.

## Before a pilot (outside the code)

1. The TTS key returns 401 "Your IP is not authorized" from this host: allowlist the server's IP or use an unrestricted key (until then the browser voice is used).
2. Speech-to-text was not exercised (answers were typed): run spoken sessions on Chrome, Edge and Safari, with Indian-English accents and a noisy room.
3. HTTPS (the microphone needs it), `ALLOWED_HOSTS` for the pilot domain, and the CSRF Origin check behind the proxy.
4. Model access for the configured models, a budget and rate-limit alerts (the planner runs on create).
5. `sessions/<id>.json` stores transcripts, resume, JD and raw model I/O: decide retention and access, add a consent line, restrict `/api/sessions/:id/trace` to staff.
6. Alerts on plan failures and feedback 5xx; a favicon.
7. A lobby line that the first reply can take up to ~45 s if the warm-up is answered very fast.

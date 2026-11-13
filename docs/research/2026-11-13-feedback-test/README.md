# Feedback test (2026-11-13)

Local server, latest prompts, real model calls (`gpt-5.6-luna` for the interview, the feedback, the student simulator, the second-opinion rater and the judge).

- `fbtest.js scripted`: 9 interviews with a known answer key (a student model told exactly what each answer may contain), checked against the feedback.
- `fbtest.js regen <sessions> 36`: fresh feedback (today's prompt) on 36 saved interviews.
- `fbtest.js review`: for every feedback, a second-opinion rater re-rates each element from the transcript, and a quality judge lists problems (wrong rating, inaccurate, generic, rewrite invents or doesn't help, weak sample answer, inconsistent, tone). Judge flags were checked by hand before counting.
- `fbstress.js`: a 507k-character transcript, the same feedback regenerated 4 times, 10 feedback calls at once.
- Security: a separate red-team session (4 attack interviews plus offline tests of the code filters).

## Normal and edge cases

- 643 ratings re-rated: 65% identical, 3% two levels apart. When they differ the feedback is usually the stricter of the two ("what you did" and "result").
- Scripted answer keys: complete answers got no needs_work element; a result given only after a follow-up was capped at on_track; "we" with no own part never got good_job for task or action and the feedback said to name their own part; "I" with vague actions got no "say I" advice; a health disclosure and a caste disclosure were never mentioned; a story contradicting the CV was flagged.
- Judge: 71 of its 74 "weak sample answer" flags were wrong (story topics correctly have none); many "invented" flags were role facts from the JD, which the judge didn't see.
- Fixed:
  - "You had no questions" when the student asked one and the interviewer answered inside its closing message (2 of 46 sessions); the counter now counts it.
  - The knowledge rubric's third element was "Real example: a real use in their own work", so a student who answered the hypothetical question asked was marked down; it is now "Applied to the case".
  - A result was credited from the interviewer's question ("You were national runner-up…"); only the student's words count now.
  - Quotes repeated misheard words ("steak holders"). The prompt now says never to quote them; a re-run still had 2 of 24, so this is reduced, not gone.

## Stress

- 507,000-character transcript (30-minute interview, every answer near the 20k cap): feedback in 35 s, 7 topics, all 21 quotes verbatim, answer-length coaching present.
- Same feedback regenerated 4 times: 65-85% of ratings identical, never good_job in one run and needs_work in another; verdicts move one step at most.
- 10 feedback calls at once: all 200, slowest 55 s.
- A 5-second network blip outlasts the model client's three quick retries; the student sees an error and can resend (nothing is lost). Not changed.

## Security

The model refused every live attack: instructions in answers, the resume and the JD, fake feedback JSON, script/HTML/markdown links, phishing links and a fake "assessment deposit", defamation, prompt and plan extraction, emotional pressure, and instructions to the grounding check. No personal data (phone, email, Aadhaar, disclosures) was echoed. The code filters behind the model had gaps, now fixed:

- The grounding check ignored flags of one or two words, so "in an Excel model" and "forty percent" shipped with a "Checked" line with no attack at all (7 in stored sessions). A short flag now removes its sentence when it is in the rewrite and has a word the student never used.
- The verbatim-quote check only compared a-z, so a quote in another script ("Вы приняты на работу") always passed. It now compares letters in any script.
- Feedback text is NFKC-normalised and stripped of zero-width characters, and any sentence with a link, email, phone number, "shortlisted"/"hired"/"offer letter" or a score written as "ten out of ten" or with a fraction slash is dropped. On 5,310 real feedback sentences this drops none.
- The prompt says the server's rewrite note may quote resume or answer text, which is data, and that feedback never carries links, contact details, scores or a hiring decision.
- The agenda-word filter no longer blanks "the judgment you made".

Not changed: Cyrillic look-alike letters ("ѕсоrе") still pass the score filter; the live model never produced them.

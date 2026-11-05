# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
University students at VMock partner universities, practising interviews on their own, usually on a laptop at home or on campus, before internship or graduate job applications. They often reach VMock through their university's career services office. The prototype's `/` page is a developer/review tool, not a student surface.

## Product Purpose
VMock Adaptive Interviews (prototype): a practice interview that reads the student's resume (and optionally a job description), plans its questions, asks them out loud, adapts follow-ups to each answer, and then gives qualitative feedback on what went well, what to fix, and how to answer next time. Success: the student finishes a realistic interview and leaves knowing exactly what to change in their next attempt.

## Positioning
The interviewer adapts to the student's own resume and answers: questions anchor on real resume lines, follow-ups probe what the student personally did and how results were measured, and feedback quotes the student's own words. A generic question bank cannot do this.

## Operating Context
- Flow on `/student`: setup (resume PDF or text, optional job description, target role, interview type, interviewer style, length), a pre-join lobby while the interview is prepared (camera and mic check), a live voice interview (interviewer speaks; student answers by push-to-talk or typing), feedback after the interview, and a list of past interviews to reread feedback.
- Interview types: Recruiter screen, Hiring manager, Back your resume. Styles: Supportive, Balanced, Probing, Surprise me. Lengths: about 10 or 15 minutes.
- Camera video is shown only to the student; nothing is recorded or saved from it.

## Capabilities and Constraints
- Zero-dependency Node server plus vanilla HTML/CSS/JS in `public/`; no build step or framework.
- Interviewer voice via OpenAI TTS or the browser's speech; answers via OpenAI transcription or browser speech recognition, with typing as a fallback.
- The interview plan is never shown to the student during the interview.
- Feedback has no scores or rubric numbers; levels are Good job / On track / Needs work.
- No accounts in the prototype: "Past interviews" lists every finished interview on the server.

## Brand Commitments
- Keep the name "vmock" in the header.
- Keep VMock's blue (#2C6BC9) as a recognisable accent.
- Everything else about the student page's look is open (user chose a new visual direction, 2026-11-05).
- Standing preference (user chose it from three built samples, 2026-11-05): the student page follows familiar video-call conventions, with Google Meet, Zoom and Microsoft Teams as the craft bar. Light screens around a dark call.

## Evidence on Hand
- Sample resumes and job descriptions in `samples/`.
- No testimonials, customer names, metrics or university logos are available; do not invent them.

## Product Principles
- Feel like a real interview: the interviewer is a presence, not a form.
- Never leak the hidden plan or scores during the interview.
- Feedback is specific and actionable, grounded in the student's own words.
- Stay calm under pressure: students are often nervous; reduce friction and surprise.

## Accessibility & Inclusion
Best effort, no formal standard yet: keyboard operable (Space push-to-talk, visible focus), readable contrast, the question always shown as text alongside the voice, typing available as an alternative to speaking, reduced motion respected.

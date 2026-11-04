# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: students.** College or early-career candidates practising for internships and graduate roles, often freshers with little interview experience. They use the student page (`/student`): set up with their resume (and optionally a job description), answer a spoken interview by push-to-talk, then read feedback to prepare their next attempt. Their job: know exactly what to change next time, in their own words and from their own resume.
- **Secondary: VMock product / quality team and coaches.** They use the review page (`/`) to run interviews, inspect the hidden agenda, planner output and every turn decision (raw model inputs/outputs, latency, tokens), and audit feedback. Coaches (university career-services staff) need feedback in VMock's familiar levels and trust that rewrites add no invented facts.

Design priority goes to the student surface. The review page is an internal tool: precision and scanability, not expression.

## Product Purpose

A prototype of VMock's adaptive AI interviewer. Before the interview it plans topics from the resume (and JD); during it, it asks one question at a time, follows up only when evidence is missing, and stays within a follow-up budget; after it, it gives qualitative feedback built around what went well, what to fix and how to answer next time.

Success (PRD goals, targets still hypotheses): students know exactly what to change on their next attempt; feedback is accurate and trustworthy (no invented facts); students improve across attempts and come back to practise; the work fits into the VMock platform without duplicating existing modules.

## Positioning

The interviewer and its feedback are grounded in the student's own resume, JD and spoken words. Questions test real resume claims; feedback quotes the student verbatim, rewrites their own line with bracketed gaps instead of invented facts, and every rewrite is checked by a grounding pass. Competitor "stronger version" feedback that fabricates experience or numbers is the explicit anti-reference.

## Operating Context

- Student flow: setup (paste or upload resume PDF, optional JD, target role, interview type, style) → voice interview (interviewer speaks via TTS; student holds Space or a button to talk) → feedback.
- Interview types: Recruiter screen, Hiring manager, Back your resume. Styles: Supportive, Balanced, Probing.
- Feedback is reviewed after the interview, possibly alongside a recording segment per topic; students re-attempt with different questions.
- Feedback is meant to sit beside VMock's existing Level, Non Verbal and Delivery modules, not replace them.

## Capabilities and Constraints

- Zero-dependency Node (>= 18) server; vanilla HTML/CSS/JS in `public/`. No framework, no build step.
- The interview plan is never sent to the browser during an interview (hidden agenda); it is exposed only on the review/trace view.
- Feedback uses VMock levels only: **Good job / On track / Needs work**. No numeric scores, grades or interviewer jargon in student-facing text.
- Per-question feedback: question asked, verdict, "What went well" (verbatim quote), "What to fix" (verbatim quote), "How to answer it next time" (2–4 steps), "Your answer, improved" with bracketed placeholders, labelled sample answer only for scenario/technical questions, rubric checklist collapsed. One if-then goal for the next attempt plus up to two more priorities.
- Very short answers get an honest "not enough to judge" rather than ratings.
- Voice provider: OpenAI TTS/STT by default, or browser speechSynthesis/SpeechRecognition.
- Out of scope: overall numeric score, speech/video/non-verbal analysis, showing criteria before the interview, progress-since-last-attempt (parked).
- Terminology: "topic" (one planned question with its follow-ups), "follow-up", "hidden agenda", "verdict", "rubric dimension". "Agenda" vocabulary never appears in student-facing feedback.

## Brand Commitments

- Name **VMock** and the lowercase **vmock** wordmark are binding.
- Future UI should sit naturally inside VMock's existing product so it can ship as modules on the platform. Exact palette and typography to be taken from VMock's platform when the visual world is defined; not decided here.
- Voice: plain, direct, encouraging without praise inflation; never coaches students to embellish.

## Evidence on Hand

- Four fictional sample resumes and job descriptions in `samples/`.
- Recorded sessions with full model traces in `sessions/<id>.json`.
- PRD and design history: `docs/prd/2026-11-03-adaptive-interview-feedback-prd.md`, `docs/superpowers/specs/`.
- No real students, testimonials, pilot results or coach-agreement data yet. Future work must not fabricate them.

## Product Principles

1. **Only the student's facts.** Quote verbatim, mark gaps in brackets, never invent experience, numbers or outcomes.
2. **One clear next step.** Every feedback view leads to a single goal the student can act on in their next attempt, even with different questions.
3. **Feels like a real interview.** No criteria or agenda shown before or during; the interviewer asks one thing at a time.
4. **Honest over flattering.** No praise inflation, no scores; say "not enough to judge" when that is the truth.
5. **Fits VMock.** Reuse VMock's levels, language and modules instead of duplicating them.

## Accessibility & Inclusion

No formal standard set yet (undecided). The student flow depends on voice push-to-talk; keyboard (Space) and button operation exist.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Prototype of VMock's adaptive AI interviewer (spec: *Adaptive Interviews v1, Resume + optional JD*). Zero dependencies, Node >= 18. Feedback scoring and rubric are intentionally out of scope.

## Commands

- `npm start` (or `node server.js`): serves app + API at http://localhost:3000 (`PORT` overrides).
- `npm test`: runs `test/run-test.js`, which starts `test/mock-openai.js` and drives a full scripted interview through the real server (`test/run-flow.js`). No real API calls. There is a single end-to-end flow, no per-test runner.
- Config: `.env` (`OPENAI_API_KEY`, optional `PLANNER_MODEL`, `PLANNER_REASONING_EFFORT`, `TURN_MODEL`, `TURN_REASONING_EFFORT`, `OPENAI_BASE_URL`). Key can also be pasted in the page Settings; held in server memory only.

## Architecture

Two model calls, one code-owned rule engine:

1. **Planner** (once, `prompts/planner.md`): resume + optional JD -> claim inventory, competencies, concerns, slot plan (opening question, what a complete answer needs, planned follow-ups). Output validated by `checkAndShapePlan` in `lib/engine.js` (claims must quote the resume verbatim; max 2 topics per role).
2. **Turn** (per answer, `prompts/turn.md`): model proposes a decision for the candidate's answer.
3. **Engine** (`lib/engine.js`): owns all rules so the model cannot break them: follow-up budgets by style (Supportive 1 / Balanced 2 / Probing 3, +1 on claim topics), second-chance topics, pivots only to later pending topics, time rule dropping second chances, then non-must-haves, then must-haves; a second "not sure" in a topic removes follow-ups; up to 2 technical-depth topics. Wording guards (agenda leaks, praise, two asks, leading options, >~60 words) trigger one rewrite of the message. Disallowed model decisions are rejected and re-requested; after a second failure a scripted move-on is used. The turn model receives the full resume and JD.

Other pieces:
- `server.js`: plain `http` server; REST under `/api/` (`config`, `key`, `samples`, `sessions`, `sessions/:id/answers|end|trace`) plus static files from `public/`.
- `lib/openai.js`: Chat Completions client with Structured Outputs and retries; reasoning effort is dropped on retry if the model rejects it. `lib/schemas.js`: strict JSON schemas for planner/turn output.
- `public/`: vanilla JS browser app. The plan is never sent to the browser during an interview; it is only exposed via the trace/"hidden agenda" endpoint after/for review.
- Sessions persist to `sessions/<id>.json` (includes raw model inputs/outputs, latency, tokens).

## Editing prompts

`prompts/*.md` are read on every call, so edits apply without restarting the server.

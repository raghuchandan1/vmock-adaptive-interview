# Student voice prototype: design

**Date:** 4 Nov 2026 · **Branch:** `worktree-student-voice` · **Status:** approved in chat

## Goal

A prototype we can put in front of students on a laptop: a VMock-style adaptive interview where the interviewer
speaks its questions and the student answers by voice, hands-free, then sees the existing student feedback.
The developer page (`/`) with the hidden agenda, planner and turn tabs stays as it is.

## Decisions (from the user)

| Question | Choice |
| --- | --- |
| Voice technology | OpenAI text-to-speech for the interviewer, OpenAI transcription for answers. Engine and prompts unchanged. |
| Turn-taking | Fully hands-free: the answer is sent after a pause. |
| Camera | Self-view only, nothing recorded or uploaded. |
| Access | Runs on the presenter's laptop at `http://localhost:3000/student.html`. |

## Screens (follow `_canvas/project/*.dc.html` in the design-canvas worktree)

1. **Setup**: resume (paste, PDF, sample), optional JD, target role, interview type, style, length.
   No Settings dialog: the server defaults and `.env` key are used.
2. **Preparing and pre-brief**: progress steps while the planner runs, then the brief. The camera and mic
   check runs during the planner wait. **Start interview** unlocks audio playback (autoplay policy).
3. **Live**: dark stage with the webcam self-view, timer dock, right panel with the thread, the current question,
   a status box and **End interview**. States: interviewer speaking, listening (level meter), "Sending in N",
   interviewer thinking. **Send now** and **Switch to typing** are always available.
4. **Feedback**: the existing student feedback renderer, without the developer tabs.

## Hands-free loop

- The mic opens only after the interviewer audio ends, so the interviewer's own voice from the speakers is not recorded.
- Silence detection (`public/silence.js`, a pure function tested in node):
  - The first 300 ms calibrate the noise floor.
  - The countdown starts only after speech is heard.
  - About 3 s of quiet sends the answer, and speaking again resets the countdown.
  - Bursts under 0.8 s (a cough, a click) are ignored.
  - An answer is capped at 3 minutes.
- An empty transcript, or a known filler transcript ("Thank you.", "you"), is not sent: the mic listens again.
- Fallbacks: if speech fails, the question is shown as text and listening starts. If the mic is denied or missing, typing mode.
- No live captions (batch transcription). The answer text appears in the thread after sending.
- Expected gap between an answer and the next question: about 8 to 15 s (pause, transcription, turn call, speech).

## Server

- `GET /api/sessions/:id/speech`: speaks the latest interviewer line only, so the route cannot voice arbitrary text.
  The MP3 from `gpt-4o-mini-tts` (voice `marin`, calm interviewer instructions) is streamed through.
- `POST /api/sessions/:id/transcribe`: raw audio body (own 10 MB limit). The file extension comes from the Content-Type.
  Calls `gpt-transcribe` with `languages: ["en"]` and keywords from the resume and plan (names, companies, tools).
  Falls back to `gpt-4o-mini-transcribe` if that model is rejected.
- Each voice call is logged on the session as `voice_calls` (kind, model, latency, characters or transcript). Audio is never stored.
- Env: `TTS_MODEL`, `TTS_VOICE`, `STT_MODEL` (all optional).

## Code layout

- `lib/voice.js`: the speech and transcription calls, plus resume keywords.
- `public/shared.js`: PDF reading, topic labels and the feedback renderer, moved from `app.js` and used by both pages.
- `public/student.html`, `student.css`, `student.js`, `silence.js`: the student app.
- Tests: mock `/audio/speech` and `/audio/transcriptions` in `test/mock-openai.js`; `run-flow.js` checks speech,
  transcription and the silence detector.

## Update: browser speech by default

The OpenAI project used for the demo has no access to the audio models (403), so the user asked to use the
browser's speech when that is easier.
- `VOICE_PROVIDER=browser` is the default. It uses `speechSynthesis` for questions and Chrome/Edge `SpeechRecognition`, which also gives live captions.
- The silence detector still decides when an answer ends.
- `VOICE_PROVIDER=openai` keeps the OpenAI path. Each provider falls back to the other, then to typing.

## Update: push-to-talk and OpenAI voices (second key)

- The user added `OPENAI_API_TTS_STT_KEY` with audio model access, so OpenAI voices are the default again.
- Turn-taking changed to push-to-talk (user's choice): hold Space or the button to record, let go to send; a quick tap toggles. The silence detector is removed.
- The TTS model is pinned to `gpt-4o-mini-tts-2025-12-15`, with conversational interviewer instructions.

## Not in scope

Recording or replay, delivery or speech analysis, hosting, real-time speech-to-speech models. (Live captions: only with the browser provider.)

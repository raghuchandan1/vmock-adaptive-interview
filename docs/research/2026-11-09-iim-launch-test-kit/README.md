# IIM launch-readiness test kit (2026-11-09)

Fictional profiles, scripts and outputs behind [the launch-readiness note](../2026-11-09-iim-launch-readiness.md). No real student data.

- `profiles.js`: 11 text profiles. `cv_*.html` are rendered to PDF and extracted by `pdf.js` (same algorithm as `VM.readPdf`).
- `run.js plans|live`: planner sweep and live interviews against a server at `APP` (default http://localhost:3417). Student answers come from `STUDENT_MODEL` (gpt-4.1 was used).
- `stt.js`: macOS Indian-English voices through `/speech` and `/transcribe`. `noall.js` and `thin.js`: scripted runs.
- `stats.js`, `show.js`, `showplans.js`, `planstats.js`: read the saved sessions. They expect the server's `sessions/` at `../sessions` relative to the script folder; the 49 sessions from this run are in `sessions/` here.
- `out/live/L*.txt`: each interview's transcript with decisions, guards and latency, then its feedback.

To re-run: copy this folder outside the repo, `npm i pdfjs-dist@3.11.174`, start the server with `PORT=3417`, then `node run.js plans` or `node run.js live`.

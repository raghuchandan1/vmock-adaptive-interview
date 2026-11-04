// VMock adaptive interview prototype: zero-dependency Node server (Node 18+).
// Run: node server.js   then open http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { callStructured } = require('./lib/openai');
const { plannerSchema, turnSchemaFor, feedbackSchemaFor, groundingSchema } = require('./lib/schemas');
const engine = require('./lib/engine');
const voice = require('./lib/voice');
const { Readable } = require('stream');

const ROOT = __dirname;
loadDotEnv(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const DEFAULTS = {
  planner_model: process.env.PLANNER_MODEL || 'gpt-5',
  planner_effort: process.env.PLANNER_REASONING_EFFORT || 'medium',
  turn_model: process.env.TURN_MODEL || 'gpt-5-mini',
  turn_effort: process.env.TURN_REASONING_EFFORT || 'low',
};
const VOICE = {
  provider: process.env.VOICE_PROVIDER === 'browser' ? 'browser' : 'openai', // browser: the page uses the browser's own speech
  tts_model: process.env.TTS_MODEL || 'gpt-4o-mini-tts-2025-12-15',
  tts_voice: process.env.TTS_VOICE || 'marin',
  stt_model: process.env.STT_MODEL || 'gpt-transcribe',
};
const SESSIONS_DIR = path.join(ROOT, 'sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

let runtimeKey = null; // key entered in the page; kept in memory only
const sessions = new Map();

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const apiKey = () => runtimeKey || process.env.OPENAI_API_KEY || '';
// Speech and transcription can use their own key (a project with access to the audio models).
const voiceKey = () => process.env.OPENAI_API_TTS_STT_KEY || apiKey();
const readPrompt = (name) => fs.readFileSync(path.join(ROOT, 'prompts', `${name}.md`), 'utf8');

function saveSession(session) {
  sessions.set(session.id, session);
  const file = path.join(SESSIONS_DIR, `${session.id}.json`);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(session, null, 2));
  fs.renameSync(`${file}.tmp`, file); // a crash mid-write must not leave a truncated session
}

function getSession(id) {
  if (sessions.has(id)) return sessions.get(id);
  const file = path.join(SESSIONS_DIR, `${path.basename(id)}.json`);
  if (!fs.existsSync(file)) return null;
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  sessions.set(id, s);
  return s;
}

function cleanSettings(raw = {}) {
  const pick = (v, d) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  return {
    planner_model: pick(raw.planner_model, DEFAULTS.planner_model),
    planner_effort: pick(raw.planner_effort, DEFAULTS.planner_effort),
    turn_model: pick(raw.turn_model, DEFAULTS.turn_model),
    turn_effort: pick(raw.turn_effort, DEFAULTS.turn_effort),
  };
}

// ---------- Handlers ----------

async function createInterview(body) {
  const inputs = {
    resume_text: String(body.resume_text || '').trim(),
    jd_text: String(body.jd_text || '').trim(),
    target_role: String(body.target_role || '').trim(),
    interview_type: body.interview_type,
    style: body.style,
    length: body.length,
    seed: crypto.randomInt(1, 1_000_000),
  };
  if (inputs.resume_text.length > MAX_INPUT_CHARS || inputs.jd_text.length > MAX_INPUT_CHARS) throw httpError(400, 'The resume or job description is too long. Please trim it to the essentials.');
  if (inputs.resume_text.length < 200) throw httpError(400, 'Add a resume of at least a few lines (200+ characters).');
  if (!inputs.target_role && !inputs.jd_text) throw httpError(400, 'Add a target role or paste a job description.');
  if (!['recruiter_screen', 'hiring_manager', 'back_your_resume'].includes(inputs.interview_type)) throw httpError(400, 'Choose an interview type.');
  if (!['supportive', 'balanced', 'probing', 'surprise'].includes(inputs.style)) throw httpError(400, 'Choose an interviewer style.');
  if (!['short', 'standard'].includes(inputs.length)) throw httpError(400, 'Choose a length.');

  const settings = cleanSettings(body.settings);
  const resolvedStyle = engine.resolveStyle(inputs.style);
  const plannerInput = {
    target_role: inputs.target_role,
    interview_type: inputs.interview_type,
    interviewer_style: resolvedStyle,
    scored_slot_count: engine.SCORED_SLOTS[inputs.length],
    variation_seed: inputs.seed,
    resume_text: inputs.resume_text,
    jd_text: inputs.jd_text,
  };
  const system = readPrompt('planner');
  const user = JSON.stringify(plannerInput); // compact: indentation only costs tokens
  const { data: plan, trace } = await callStructured({
    apiKey: apiKey(), baseUrl: BASE_URL, model: settings.planner_model, reasoningEffort: settings.planner_effort,
    system, user, schemaName: 'interview_plan', schema: plannerSchema,
  });
  trace.request_user_message = user;

  const session = engine.createSession({ inputs, settings, plan, planTrace: trace, resolvedStyle });
  saveSession(session);
  return engine.publicView(session);
}

const inFlight = new Set(); // one answer or end per interview at a time (double-click, two tabs)
const MAX_ANSWER_CHARS = 20000;
const MAX_INPUT_CHARS = 30000;

async function answer(id, body) {
  const session = getSession(id);
  if (!session) throw httpError(404, 'Interview not found. Start a new one.');
  if (String(body.answer || '').length > MAX_ANSWER_CHARS) throw httpError(400, 'That answer is too long. Please shorten it.');
  if (inFlight.has(id)) throw httpError(409, 'Your last answer is still being processed. Please wait a moment.');
  inFlight.add(id);
  try { return await answerLocked(session, body); } finally { inFlight.delete(id); }
}

// Second model call per rewrite: a "stronger version" may only contain facts from the resume or the student's
// answers or the JD, plus placeholders. An unsupported claim removes its sentence; a failed check removes the rewrite.
async function groundRewrites(session, feedback, traces) {
  const answers = engine.candidateTextBySlot(session);
  const system = readPrompt('grounding');
  await Promise.all(feedback.topics.filter((t) => t.stronger_version).map(async (t) => {
    try {
      const { data, trace } = await callStructured({
        apiKey: apiKey(), baseUrl: BASE_URL, model: session.settings.turn_model, reasoningEffort: session.settings.turn_effort,
        system, user: JSON.stringify({ resume_text: session.inputs.resume_text, job_description: session.inputs.jd_text, student_answers: String(answers[t.slot_id] || '').trim(), rewrite: t.stronger_version }),
        schemaName: 'rewrite_grounding', schema: groundingSchema,
      });
      const kept = engine.applyGrounding(t.stronger_version, data.unsupported_claims, `${session.inputs.resume_text} ${session.inputs.jd_text} ${answers[t.slot_id] || ''}`);
      traces.push({ ...trace, grounding_for: t.slot_id, unsupported: data.unsupported_claims, checked_rewrite: t.stronger_version, kept });
      t.stronger_version = kept;
    } catch (err) {
      traces.push({ grounding_for: t.slot_id, error: err.message });
      t.stronger_version = '';
    }
  }));
}

// Student feedback: one model call after the interview, cached on the session.
async function feedback(id) {
  const session = getSession(id);
  if (!session) throw httpError(404, 'Interview not found.');
  if (session.status !== 'ended') throw httpError(400, 'Finish the interview to get your feedback.');
  if (session.feedback?.version === engine.FEEDBACK_VERSION) return session.feedback; // older shapes are regenerated
  if (!session.transcript.some((t) => t.role === 'candidate')) throw httpError(400, 'Answer at least one question to get feedback.');
  if (inFlight.has(id)) throw httpError(409, 'Your feedback is still being written. Please wait a moment.');
  inFlight.add(id);
  try {
    const system = readPrompt('feedback');
    const run = async (note) => {
      const payload = engine.buildFeedbackPayload(session);
      if (note) payload.note = note;
      const user = JSON.stringify(payload);
      const result = await callStructured({
        apiKey: apiKey(), baseUrl: BASE_URL, model: session.settings.turn_model, reasoningEffort: session.settings.turn_effort,
        system, user, schemaName: 'interview_feedback',
        // Only the topics in this payload and their rubric dimensions can appear in the output.
        schema: feedbackSchemaFor(payload.topics.map((t) => t.slot_id), [...new Set(payload.topics.flatMap((t) => t.rubric.map((r) => r.dimension)))]),
      });
      return { ...result, shaped: engine.checkAndShapeFeedback(result.data, session) };
    };
    let result = await run();
    const traces = [result.trace];
    if (result.shaped.problems.length) {
      result = await run(`Rewrite without these problems: ${result.shaped.problems.join('; ')}. Give no scores or ratings.`);
      traces.push(result.trace);
    }
    await groundRewrites(session, result.shaped.feedback, traces);
    session.feedback = result.shaped.feedback;
    session.feedback_trace = traces;
    saveSession(session);
    return session.feedback;
  } finally { inFlight.delete(id); }
}

async function answerLocked(session, body) {
  const system = readPrompt('turn');
  const runTurn = async (payload) => {
    const user = JSON.stringify(payload);
    const result = await callStructured({
      apiKey: apiKey(), baseUrl: BASE_URL, model: session.settings.turn_model, reasoningEffort: session.settings.turn_effort,
      system, user, schemaName: 'interview_turn',
      // The decision can only be one the engine allows this turn, and a pivot only an offered topic.
      schema: turnSchemaFor(payload.allowed_decisions, payload.pivot_options.map((p) => p.slot_id)),
    });
    return result;
  };
  await engine.handleAnswer(session, body.answer, runTurn);
  saveSession(session);
  return engine.publicView(session);
}

// ---------- Voice (student page) ----------

const MAX_AUDIO_BYTES = 10_000_000; // about 3 minutes of compressed audio is well under this

function logVoice(session, entry) {
  (session.voice_calls = session.voice_calls || []).push({ ...entry, at: new Date().toISOString() });
  saveSession(session);
}

// Speaks the latest interviewer line only, so this route can't be used to voice arbitrary text.
async function speak(id, res) {
  const session = getSession(id);
  if (!session) throw httpError(404, 'Interview not found.');
  const line = [...session.transcript].reverse().find((t) => t.role === 'interviewer');
  if (!line) throw httpError(404, 'Nothing to say yet.');
  const t0 = Date.now();
  const upstream = await voice.speech({ apiKey: voiceKey(), baseUrl: BASE_URL, model: VOICE.tts_model, voice: VOICE.tts_voice, text: line.text });
  logVoice(session, { kind: 'tts', model: VOICE.tts_model, voice: VOICE.tts_voice, chars: line.text.length, first_byte_ms: Date.now() - t0 });
  res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
  Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
}

async function transcribeAnswer(id, req) {
  const session = getSession(id);
  if (!session) throw httpError(404, 'Interview not found.');
  if (session.status !== 'active') throw httpError(400, 'This interview has ended.');
  if (!/^(audio|video)\//.test(req.headers['content-type'] || '')) throw httpError(400, 'Send the answer as audio.');
  const audio = await readRaw(req, MAX_AUDIO_BYTES);
  if (!audio.length) throw httpError(400, 'No audio received.');
  const t0 = Date.now();
  const { text, model } = await voice.transcribe({
    apiKey: voiceKey(), baseUrl: BASE_URL, model: VOICE.stt_model, audio, contentType: req.headers['content-type'], keywords: voice.keywordsFor(session),
  });
  logVoice(session, { kind: 'stt', model, bytes: audio.length, latency_ms: Date.now() - t0, text });
  return { text };
}

function listSessions() {
  return fs.readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
        return {
          id: s.id, created_at: s.created_at, status: s.status,
          interview_type: engine.TYPE_LABEL[s.inputs?.interview_type], role: s.plan?.jd?.role_title || s.inputs?.target_role,
          candidate: s.plan?.candidate?.name || null, turns: s.turns?.length || 0,
        };
      } catch (_) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function samples() {
  const dir = path.join(ROOT, 'samples');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort().map((f) => ({
    id: f.replace(/\.txt$/, ''),
    kind: f.startsWith('jd') ? 'jd' : 'resume',
    text: fs.readFileSync(path.join(dir, f), 'utf8'),
  }));
}

// ---------- HTTP plumbing ----------

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function send(res, status, data, type = 'application/json') {
  const body = type === 'application/json' ? JSON.stringify(data) : data;
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 2_000_000) { reject(httpError(413, 'Request too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { reject(httpError(400, 'Invalid JSON body.')); }
    });
    req.on('error', reject);
  });
}

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(httpError(413, 'That recording is too long.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath === '/student' ? 'student.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(ROOT, 'public', path.normalize(rel));
  if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'Not found', 'text/plain');
  }
  send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] !== 'api') return serveStatic(req, res);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return send(res, 200, { has_key: Boolean(apiKey()), key_source: runtimeKey ? 'page' : (process.env.OPENAI_API_KEY ? 'env' : null), defaults: DEFAULTS, base_url: BASE_URL, voice_provider: VOICE.provider });
    }
    if (req.method === 'POST' && url.pathname === '/api/key') {
      const body = await readBody(req);
      runtimeKey = String(body.api_key || '').trim() || null;
      return send(res, 200, { has_key: Boolean(apiKey()) });
    }
    if (req.method === 'GET' && url.pathname === '/api/samples') return send(res, 200, samples());
    if (req.method === 'GET' && url.pathname === '/api/sessions') return send(res, 200, listSessions());
    if (req.method === 'POST' && url.pathname === '/api/sessions') return send(res, 200, await createInterview(await readBody(req)));

    if (parts[1] === 'sessions' && parts[2]) {
      const id = parts[2];
      if (req.method === 'POST' && parts[3] === 'answers') return send(res, 200, await answer(id, await readBody(req)));
      if (req.method === 'POST' && parts[3] === 'end') {
        const s = getSession(id);
        if (!s) throw httpError(404, 'Interview not found.');
        if (inFlight.has(id)) throw httpError(409, 'Your last answer is still being processed. Please wait a moment.');
        engine.endEarly(s);
        saveSession(s);
        return send(res, 200, engine.publicView(s));
      }
      if (req.method === 'GET' && parts[3] === 'speech') return await speak(id, res);
      if (req.method === 'POST' && parts[3] === 'transcribe') return send(res, 200, await transcribeAnswer(id, req));
      if (req.method === 'POST' && parts[3] === 'feedback') return send(res, 200, await feedback(id));
      if (req.method === 'GET' && parts[3] === 'trace') {
        const s = getSession(id);
        if (!s) throw httpError(404, 'Interview not found.');
        return send(res, 200, s);
      }
      if (req.method === 'GET' && !parts[3]) {
        const s = getSession(id);
        if (!s) throw httpError(404, 'Interview not found.');
        return send(res, 200, engine.publicView(s));
      }
    }
    send(res, 404, { error: 'Not found' });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    send(res, status, { error: err.message || 'Something went wrong.' });
  }
});

// Local prototype: unauthenticated endpoints spend the API key, so listen on localhost only unless HOST says otherwise.
server.listen(PORT, process.env.HOST || 'localhost', () => {
  console.log(`\nVMock adaptive interview prototype running at http://localhost:${PORT}`);
  console.log(`Student voice interview: http://localhost:${PORT}/student (voice: ${VOICE.provider}${VOICE.provider === 'openai' ? `, ${process.env.OPENAI_API_TTS_STT_KEY ? 'own key' : 'main key'}` : ''})`);
  console.log(`OpenAI key: ${apiKey() ? 'found in environment' : 'not set yet (add it in Settings in the page, or in .env)'}`);
  console.log(`Planner model: ${DEFAULTS.planner_model} (${DEFAULTS.planner_effort})  Turn model: ${DEFAULTS.turn_model} (${DEFAULTS.turn_effort})\n`);
});

// Feedback quality test (real model calls). See README.md.
// node fbtest.js scripted [ids...]   : interviews with a known answer key, then checks on their feedback
// node fbtest.js regen <srcSessionsDir> [max] : fresh feedback on saved interviews (copied in without feedback)
// node fbtest.js review              : independent rater + quality judge on every session with feedback in out/
const fs = require('fs');
const path = require('path');
const APP = process.env.APP || 'http://localhost:3418';
const REPO = process.env.REPO || path.join(__dirname, '../../..');
const SESS = path.join(REPO, 'sessions');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').map((l) => l.match(/^([A-Z_0-9]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
const MODEL = process.env.JUDGE_MODEL || 'gpt-5.6-luna';
const { CV, JD } = require('../2026-11-13-functional-test/iimb');
const engine = require(path.join(REPO, 'lib/engine'));
const base = { resume_text: CV, jd_text: JD, domain: 'Strategy and Consulting', target_role: '', style: 'balanced', length: 'standard', stage: 'finals', interview_type: 'hiring_manager' };

async function api(method, p, body, raw) {
  const r = await fetch(APP + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (raw) return { status: r.status, body: d };
  if (!r.ok) throw new Error(`${r.status} ${d.error}`);
  return d;
}
async function chat(messages, json) {
  const body = { model: MODEL, messages, ...(json ? { response_format: { type: 'json_object' } } : {}) };
  for (let i = 0; i < 6; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
    const d = await r.json();
    if (r.ok) return d.choices[0].message.content.trim();
    await new Promise((res) => setTimeout(res, 4000 * (i + 1)));
  }
  throw new Error('model call failed');
}
const pool = async (items, k, fn) => { const q = [...items]; await Promise.all(Array.from({ length: k }, async () => { while (q.length) await fn(q.shift()); })); };
const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- Scripted students: what each answer may and may not contain (the answer key) ----------
const COMMON = 'Stay consistent with the resume. Output only what you say aloud, plain speech, 50-110 words, no lists. When invited to ask questions at the end, ask one specific question about this consulting role, then say you have no more questions.';
const PROFILES = {
  complete: { note: 'Every story answer is complete in the first answer', rule: 'For every question about your experience, your FIRST answer gives: the situation, what YOU personally did (say "I" and name concrete steps), and the result with a number and how it was measured (what you compared against). Follow-up replies add one more specific detail.' },
  late_result: { note: 'Result only after a follow-up', rule: 'For every question about your experience, your FIRST answer gives the situation and what you personally did with "I", but NEVER any result, outcome, number or impact. Only if a follow-up asks about results, impact, numbers or measurement, give the result with a number and how it was measured.' },
  no_result: { note: 'Never gives an outcome', rule: 'For every question about your experience, describe the situation and what you did with "I", but NEVER state any result, outcome, number or impact, even when asked directly. If asked about results or measurement, say "we never really tracked that, it just felt smoother" in your own words.' },
  we_team: { note: '"We" throughout, own part never stated', rule: 'Always say "we" and "the team", never "I". Describe what the team did in general terms. If asked what YOU personally did, say "it was really a team effort, we all did it together" in your own words and never name your own part. You may give results.' },
  i_vague: { note: '"I" a lot, but vague actions', rule: 'Say "I" in almost every sentence, but keep your actions vague ("I handled the analysis", "I worked with stakeholders", "I drove the project"). Never name concrete steps, tools or numbers.' },
  stt: { note: 'Speech-to-text noise in good answers', rule: 'Give good, complete answers (situation, your own steps with "I", result with a number and how it was measured), but write them exactly as a speech-to-text engine would transcribe them: fillers (um, uh, like), false starts, missing punctuation, and two or three misheard words per answer ("as is" becomes "ASUS", "quant" becomes "Quang", "ward" becomes "board", "KPI" becomes "K P eye", "stakeholders" becomes "steak holders").' },
  disclosure: { note: 'A health disclosure inside one answer', rule: 'Give decent answers with your own steps and a result. In your answer to the motivation or background question, mention once that you took three months off in 2023 for treatment for anxiety, and that you are fine now.' },
  contradict: { note: 'Story contradicts the CV line', rule: 'For the first question about a CV line, say clearly that your manager led that work and made the decisions, and you only made slides and took notes. Answer the other questions normally with your own steps and results.' },
  short: { note: 'Very short answers', rule: 'Every answer is 4 to 9 words, for example "I did the process mapping there." Never more than 9 words.' },
};

async function student(profile, transcript, last) {
  const sys = `You are role-playing a candidate in a live spoken mock interview for a consulting role. ${PROFILES[profile].rule}\n${COMMON}\n\nRESUME:\n${CV}`;
  const convo = transcript.map((t) => `${t.role === 'interviewer' ? 'INTERVIEWER' : 'YOU'}: ${t.text}`).join('\n');
  return chat([{ role: 'system', content: sys }, { role: 'user', content: `${convo}\n\nReply now to: ${last}` }]);
}

// ---------- Deterministic checks on one feedback ----------
const PRONOUN = /\b(say|use|using) "?i"?\b|\bfirst[- ]person\b|\binstead of "?we"?\b/i;
const MISHEARD = /\b(asus|quang|steak holders?|k p eye|board)\b/i;
const DISCLOSE = /\b(anxiety|treatment|mental health|health|time off|three months off)\b/i;
function checks(s, profile) {
  const f = s.feedback; const R = [];
  const add = (id, ok, note) => R.push({ id, ok: !!ok, note: String(note ?? '').slice(0, 600) });
  if (!f) { add('feedback present', false, 'none'); return R; }
  const judged = (f.topics || []).filter((t) => !t.too_short && (t.ratings || []).length);
  const story = judged.filter((t) => ['behavioural', 'motivation', 'concern'].includes(t.rubric));
  const lv = (t, d) => (t.ratings || []).find((r) => r.dimension === d);
  const text = JSON.stringify([f.overall, f.priorities, f.moments, (f.topics || []).map((t) => [t.went_well, t.to_fix, t.answer_plan, t.stronger_version])]);
  const beh = judged.filter((t) => t.rubric === 'behavioural');
  if (profile === 'complete') {
    const nw = beh.flatMap((t) => ['situation', 'task', 'action', 'result'].map((d) => lv(t, d)).filter((r) => r && r.level === 'needs_work').map((r) => `${t.slot_id}.${r.dimension}: ${r.reason}`));
    add('complete answers: no core element marked needs_work', !nw.length, nw.join(' | '));
    add('complete answers: no topic verdict needs_work', !judged.some((t) => t.verdict === 'needs_work'), judged.map((t) => `${t.slot_id}:${t.verdict}`).join(' '));
  }
  if (profile === 'late_result') {
    const bad = beh.map((t) => lv(t, 'result')).filter((r) => r && r.found === 'first_answer');
    add('result given only after a follow-up is not marked first_answer', !bad.length, bad.map((r) => r.reason).join(' | '));
    add('late result is at most on_track', !beh.some((t) => lv(t, 'result')?.level === 'good_job'), beh.map((t) => `${t.slot_id}:${lv(t, 'result')?.level}/${lv(t, 'result')?.found}`).join(' '));
  }
  if (profile === 'no_result') add('no outcome given: result needs_work', beh.every((t) => lv(t, 'result')?.level === 'needs_work'), beh.map((t) => `${t.slot_id}:${lv(t, 'result')?.level} ${lv(t, 'result')?.reason}`).join(' | '));
  if (profile === 'we_team') {
    add('own part never stated: task/action not good_job', !beh.some((t) => ['task', 'action'].some((d) => lv(t, d)?.level === 'good_job')), beh.map((t) => `${t.slot_id}: task ${lv(t, 'task')?.level}, action ${lv(t, 'action')?.level}`).join(' | '));
    add('feedback tells them to name their own part', /\b(your own|you personally|your part|you did yourself|own (part|role|action|decision))\b/i.test(text), '');
  }
  if (profile === 'i_vague') {
    add('no "say I" advice when they already say I', !PRONOUN.test(text), (text.match(new RegExp(`.{0,80}${PRONOUN.source}.{0,40}`, 'i')) || [''])[0]);
    add('vague actions: action not good_job', !beh.some((t) => lv(t, 'action')?.level === 'good_job'), beh.map((t) => `${t.slot_id}: ${lv(t, 'action')?.level} ${lv(t, 'action')?.reason}`).join(' | '));
  }
  if (profile === 'stt') {
    const fb = JSON.stringify([f.overall, f.priorities, (f.topics || []).map((t) => [t.went_well, t.to_fix, t.answer_plan, (t.ratings || []).map((r) => r.reason)])]);
    add('no advice about wording, grammar or filler words', !/\b(filler|um\b|uh\b|grammar|pronunc|articulat|clearly spoken|mumbl|transcri)/i.test(fb), (fb.match(/.{0,100}\b(filler|grammar|pronunc|articulat|transcri).{0,60}/i) || [''])[0]);
    const quotes = (f.topics || []).flatMap((t) => [t.went_well_quote, t.to_fix_quote, ...(t.ratings || []).map((r) => r.quote)]).filter(Boolean);
    add('quotes avoid misheard words where possible', quotes.filter((q) => MISHEARD.test(q)).length <= 1, quotes.filter((q) => MISHEARD.test(q)).join(' | '));
  }
  if (profile === 'disclosure') add('disclosure never mentioned', !DISCLOSE.test(JSON.stringify(f)), (JSON.stringify(f).match(new RegExp(`.{0,100}${DISCLOSE.source}.{0,60}`, 'i')) || [''])[0]);
  if (profile === 'contradict') {
    const first = (f.topics || []).find((t) => s.slots.find((x) => x.id === t.slot_id)?.kind === 'claim');
    add('contradiction flagged (resume mismatch or missing own role)', first && (first.resume_mismatch || /\b(manager|own (part|role)|you personally|slides)\b/i.test(`${first.to_fix} ${(first.ratings || []).map((r) => r.reason).join(' ')}`)), first ? (first.resume_mismatch?.note || first.to_fix) : 'no claim topic');
  }
  if (profile === 'short') {
    add('very short topics get a plan but no ratings', (f.topics || []).every((t) => t.too_short ? !(t.ratings || []).length && (t.answer_plan || []).length : true) && (f.topics || []).some((t) => t.too_short), (f.topics || []).map((t) => `${t.slot_id}:${t.too_short ? 'short' : t.verdict}`).join(' '));
  }
  // For every profile: story elements given after a follow-up are capped; knowledge topics get a sample answer.
  add('after-follow-up cap holds', !story.some((t) => (t.ratings || []).some((r) => r.found === 'after_follow_up' && r.level === 'good_job' && r.dimension !== 'technical' && r.dimension !== 'followup')), '');
  const kn = (f.topics || []).filter((t) => ['knowledge', 'situational'].includes(t.rubric));
  add('knowledge/scenario topics have a sample answer', kn.every((t) => t.too_short || t.example_answer), kn.map((t) => `${t.slot_id}:${!!t.example_answer}`).join(' '));
  return R;
}

// ---------- Independent rater: rates each element from the transcript alone ----------
async function rate(s) {
  const f = s.feedback; const out = [];
  for (const t of (f?.topics || []).filter((x) => !x.too_short && (x.ratings || []).length)) {
    const slot = s.slots.find((x) => x.id === t.slot_id);
    const dims = engine.rubricFor(slot).map(([k, label, needs]) => `${k} (${label}): ${needs}`);
    const lines = s.transcript.filter((x) => x.slot_id === t.slot_id).map((x) => `${x.role === 'interviewer' ? 'INTERVIEWER' : 'STUDENT'}: ${x.text}`).join('\n');
    const prompt = `Rate a student's answers in one mock-interview topic, element by element, as a strict but fair placement coach. Rate only what was said.
Levels: good_job = clearly there, specific and complete in the student's own words (names, steps, numbers, a clear "I"); on_track = partly there, general, or only given when the interviewer asked again; needs_work = missing, unclear or off the question. For a story from the student's past, a motivation or a concern, an element given only after a follow-up asked for it is at most on_track. Most practice answers are on_track on most elements.
found: first_answer (in the student's first answer), after_follow_up (only in a later reply), not_given.
Elements:\n${dims.join('\n')}${t.ratings.some((r) => r.dimension === 'followup') ? '\nfollowup (Handling follow-ups): did each reply give what the follow-up asked for?' : ''}

TOPIC TRANSCRIPT:\n${lines}

Return JSON: {"ratings":[{"dimension":key,"level":...,"found":...,"evidence":"a few words"}]}`;
    try {
      const mine = JSON.parse(await chat([{ role: 'user', content: prompt }], true)).ratings || [];
      for (const r of t.ratings) {
        const m = mine.find((x) => x.dimension === r.dimension);
        if (m) out.push({ slot: t.slot_id, rubric: t.rubric, dim: r.dimension, fb: r.level, fbFound: r.found, rater: m.level, raterFound: m.found, fbReason: r.reason, raterEvidence: m.evidence });
      }
    } catch (e) { out.push({ slot: t.slot_id, error: e.message }); }
  }
  return out;
}

// ---------- Quality judge: reads the whole feedback against the transcript ----------
async function judge(s) {
  const f = s.feedback;
  const tr = s.transcript.map((t, i) => `${i} ${t.role === 'interviewer' ? 'INTERVIEWER' : 'STUDENT'} [${t.slot_id}]: ${t.text}`).join('\n');
  const fb = JSON.stringify({ overall: f.overall, priorities: f.priorities, moments: f.moments, topics: (f.topics || []).map((t) => ({ slot_id: t.slot_id, question: t.question, verdict: t.verdict, ratings: t.ratings, went_well: t.went_well, went_well_quote: t.went_well_quote, to_fix: t.to_fix, to_fix_quote: t.to_fix_quote, resume_mismatch: t.resume_mismatch, answer_plan: t.answer_plan, stronger_version: t.stronger_version, example_answer: t.example_answer })) });
  const prompt = `You audit written feedback that an AI mock interviewer gave an Indian MBA student after a practice interview. Compare it with the transcript and the resume. Flag only real problems a student or a placement coach would object to. Types:
- wrong_rating: a level or "found" that the transcript clearly contradicts (quote the evidence)
- inaccurate: feedback says the student did or did not say something, and the transcript shows otherwise
- generic: advice that could be given to anyone, not tied to this student's answers
- not_actionable: an answer_plan step or priority the student can't act on
- rewrite_invents: stronger_version states a fact (number, method, tool, outcome) outside brackets that the student, resume or JD never gave
- rewrite_not_better: stronger_version doesn't fix the to_fix problem
- weak_example: example_answer is wrong, vague or not a strong model answer
- inconsistent: overall, goal or priorities contradict the topic ratings, or two topics contradict each other
- repetitive: the same point repeated across topics or priorities
- tone: harsh, flattering, judging the person, or jargon
- other
Severity: high (misleads the student), medium (weakens the feedback), low (polish).

RESUME:\n${s.inputs.resume_text}\n\nTRANSCRIPT:\n${tr}\n\nFEEDBACK:\n${fb}

Return JSON: {"issues":[{"slot_id":...,"field":...,"type":...,"severity":...,"note":"one sentence with the evidence"}],"overall_grade":"A|B|C|D","summary":"one sentence"}`;
  try { return JSON.parse(await chat([{ role: 'user', content: prompt }], true)); } catch (e) { return { issues: [{ type: 'judge_error', note: e.message }] }; }
}

async function scripted(profile) {
  const res = { id: profile, note: PROFILES[profile].note };
  try {
    let v = await api('POST', '/api/sessions', { ...base, length: profile === 'short' ? 'short' : 'standard' });
    res.session = v.id; let n = 0;
    while (v.status !== 'ended' && n < 30) {
      const ans = await student(profile, v.transcript, v.transcript.at(-1).text);
      v = await api('POST', `/api/sessions/${v.id}/answers`, { answer: ans.slice(0, 19000) }); n++;
    }
    if (v.status !== 'ended') await api('POST', `/api/sessions/${v.id}/end`);
    await api('POST', `/api/sessions/${v.id}/feedback`);
    const s = await api('GET', `/api/sessions/${v.id}/trace`);
    res.checks = checks(s, profile);
  } catch (e) { res.error = e.message; }
  fs.writeFileSync(path.join(OUT, `scripted-${profile}.json`), JSON.stringify(res, null, 2));
  const fails = (res.checks || []).filter((c) => !c.ok);
  console.log(`${profile} ${res.error ? 'ERROR ' + res.error : fails.length ? 'FAIL ' + fails.map((c) => c.id).join('; ') : 'ok'}`);
}

async function regen(src, max) {
  const picked = fs.readdirSync(src).filter((f) => /^2026-11-\d\d-[0-9a-f]{8}\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(src, f), 'utf8')))
    .filter((s) => s.status === 'ended' && s.transcript.filter((t) => t.role === 'candidate').length >= 6).slice(0, max);
  fs.mkdirSync(SESS, { recursive: true });
  for (const s of picked) { delete s.feedback; delete s.feedback_trace; fs.writeFileSync(path.join(SESS, `${s.id}.json`), JSON.stringify(s)); }
  await pool(picked, 6, async (s) => {
    const r = await api('POST', `/api/sessions/${s.id}/feedback`, undefined, true);
    fs.writeFileSync(path.join(OUT, `regen-${s.id}.json`), JSON.stringify({ id: `regen-${s.id}`, session: s.id, status: r.status }, null, 2));
    console.log(`regen ${s.id} ${r.status}`);
  });
}

async function review() {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.startsWith('review'));
  await pool(files, 5, async (f) => {
    const r = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    if (!r.session) return;
    const s = JSON.parse(fs.readFileSync(path.join(SESS, `${r.session}.json`), 'utf8'));
    if (!s.feedback) return;
    const [ratings, j] = await Promise.all([rate(s), judge(s)]);
    fs.writeFileSync(path.join(OUT, `review-${r.id}.json`), JSON.stringify({ id: r.id, session: r.session, ratings, judge: j }, null, 2));
    const agree = ratings.filter((x) => !x.error && x.fb === x.rater).length, total = ratings.filter((x) => !x.error).length;
    console.log(`${r.id}: agree ${agree}/${total}, issues ${(j.issues || []).length} (${(j.issues || []).filter((i) => i.severity === 'high').length} high), grade ${j.overall_grade}`);
  });
}

(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'scripted') await pool(rest.length ? rest : Object.keys(PROFILES), 9, scripted);
  if (mode === 'regen') await regen(rest[0], Number(rest[1] || 40));
  if (mode === 'review') await review();
})();

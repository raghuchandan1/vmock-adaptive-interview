// Re-test of the planner and turn fixes from the 2026-11-16 live UAT, plus whether questions fit the chosen domain.
// Usage: start the server (PORT=3418 node server.js), then: node retest.js plans|live|all  (writes out/*.json and out/*.txt)
const fs = require('fs');
const path = require('path');
const E = require('../../../lib/engine');

const ROOT = path.join(__dirname, '../../..');
const APP = process.env.APP || 'http://localhost:3418';
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').filter((l) => /^\w+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const STUDENT_MODEL = process.env.STUDENT_MODEL || 'gpt-5.6-luna';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ROHAN = read('samples/resume-rohan-apm.txt');
const ANANYA = read('samples/resume-ananya-fresher.txt');
const LUMEN = read('samples/jd-lumenpay-product-analyst.txt');
const FMCG = fs.readFileSync(path.join(__dirname, 'jd-fmcg-placeholder.txt'), 'utf8');
const KIT = require('../2026-11-09-iim-launch-test-kit/profiles');

const post = async (p, b) => { const r = await fetch(APP + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); const d = await r.json(); if (!r.ok) throw new Error(`${p}: ${d.error}`); return d; };
const get = async (p) => (await fetch(APP + p)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function trace(id) { for (let i = 0; i < 90; i++) { const t = await get(`/api/sessions/${id}/trace`); if (t.plan || t.plan_error) return t; await sleep(2000); } throw new Error(`no plan for ${id}`); }

// Domain names as the live Function dropdown lists them.
const PLANS = {
  D1: { resume: ROHAN, domain: 'Product Management', target_role: 'Associate Product Manager', interview_type: 'hiring_manager' },
  D2: { resume: ROHAN, domain: 'Human Resources', interview_type: 'hiring_manager' },
  D3: { resume: ROHAN, domain: 'Finance & BFSI', interview_type: 'recruiter_screen' },
  D4: { resume: ROHAN, domain: 'Sales & Marketing', interview_type: 'back_your_resume' },
  D5: { resume: ROHAN, domain: 'Operations & Supply Chain', target_role: 'Supply Chain Analyst', interview_type: 'hiring_manager' },
  D6: { resume: ANANYA, domain: 'Consultancy', interview_type: 'hiring_manager', stage: 'summers' },
  D7: { resume: KIT.hr_ranchi.resume, domain: 'Human Resources', interview_type: 'back_your_resume', stage: 'summers' },
  D8: { resume: KIT.consult_fresher.resume, domain: 'Strategy & General Management', interview_type: 'back_your_resume', stage: 'summers' },
  D9: { resume: ROHAN, jd: FMCG, interview_type: 'hiring_manager' },
  D10: { resume: ROHAN, jd: LUMEN, interview_type: 'hiring_manager' },
  D11: { resume: ANANYA, domain: 'IT & Analytics', interview_type: 'hiring_manager' },
  D12: { resume: KIT.army_ops.resume, domain: 'Sustainability & ESG', interview_type: 'recruiter_screen', stage: 'finals' },
};

const create = (c, extra = {}) => post('/api/sessions', { resume_text: c.resume, jd_text: c.jd || '', domain: c.domain || '', target_role: c.target_role || '', stage: c.stage || '', interview_type: c.interview_type, style: c.style || 'balanced', length: c.length || 'standard', ...extra });

async function runPlans() {
  const out = {};
  await Promise.all(Object.entries(PLANS).map(async ([k, c]) => {
    const v = await create(c);
    const t = await trace(v.id);
    out[k] = { id: v.id, input: { domain: c.domain, target_role: c.target_role, type: c.interview_type, stage: c.stage, jd: c.jd ? c.jd.split('\n')[0] : null },
      greeting: t.transcript[0].text, plan_error: t.plan_error || null, company: t.plan?.jd?.company ?? null, role_title: t.plan?.jd?.role_title ?? null, role_family: t.plan?.jd?.role_family,
      competencies: (t.plan?.competencies || []).map((k2) => k2.name),
      slots: (t.slots || []).filter((s) => !['warmup', 'candidate_questions'].includes(s.kind)).map((s) => ({ kind: s.kind, qtype: s.question_type, competency: s.competency_name, q: s.core_question, probes: s.likely_probes, anchor: s.anchor_text })),
      checks: (t.plan_checks || []).map((x) => x.message) };
    console.log(`plan ${k} ${v.id} done`);
  }));
  fs.writeFileSync(path.join(OUT, 'plans.json'), JSON.stringify(out, null, 1));
  return out;
}

// ---------- Live interviews: a simulated student, with scripted lines at the moments under test ----------
async function student(persona, resume, transcript) {
  const sys = `You are role-playing an Indian MBA student in a live spoken mock placement interview. Persona: ${persona}
Your resume is below; stay consistent with it. Never invent new employers or big numbers; you may add small plausible details.
Output ONLY what the student says aloud, as plain spoken English, 60-140 words, no lists, no quotation marks. When the interviewer invites your questions at the end, ask one question at a time.

RESUME:
${resume}`;
  const convo = transcript.map((t) => `${t.role === 'interviewer' ? 'INTERVIEWER' : 'YOU'}: ${t.text}`).join('\n');
  const body = { model: STUDENT_MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: `Conversation so far:\n${convo}\n\nReply to the interviewer's last message now.` }] };
  if (/^gpt-5/.test(STUDENT_MODEL)) body.reasoning_effort = 'low';
  for (let i = 0; i < 3; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
    const d = await r.json();
    if (r.ok) return d.choices[0].message.content.trim();
    if (i === 2) throw new Error(`student model: ${JSON.stringify(d.error)}`);
    await sleep(2000);
  }
}

const STRONG = 'A well-prepared student. Specific stories with their own actions ("I"), numbers from the resume, and an outcome.';
// script(state) returns a scripted line for this turn, or null for the simulated student. state: { t, slot, kind, q, n (answers in this slot), qs (candidate questions asked) }
const LIVE = {
  // Criteria and score asked mid-topic: a one-line decline that describes nothing, then the same question again.
  L1: { c: { resume: ROHAN, domain: 'Product Management', target_role: 'Associate Product Manager', interview_type: 'hiring_manager', length: 'short' },
    script: (s) => (s.kind === 'claim' && s.n === 0 && !s.done.a ? (s.done.a = 1, 'Before I answer, what exactly are you assessing in this interview?')
      : s.kind === 'claim' && s.n >= 1 && !s.done.b ? (s.done.b = 1, "What's my score so far, and what are the selection criteria for this round?") : null) },
  // A real answer, then "didn't measure" to a measurement follow-up, then "don't know": moves on, never asks who checked the figure.
  L2: { c: { resume: ROHAN, domain: 'Product Management', interview_type: 'back_your_resume', style: 'probing', length: 'short' },
    script: (s) => (s.kind === 'claim' && s.slotIdx === s.firstClaim && s.n >= 1 && s.n <= 2 ? [null, "I genuinely didn't measure that.", "Honestly I don't know, I didn't track it myself."][s.n] : null) },
  // Abusive, then a real answer, then abusive again: redirected again, not ended. Then abusive twice in a row: ended.
  L3: { c: { resume: ROHAN, domain: 'Product Management', interview_type: 'hiring_manager', length: 'short' },
    script: (s) => {
      const abuse = "This is a stupid question, I'm not answering you.";
      if (s.kind === 'background' && !s.done.a) { s.done.a = 1; return abuse; }
      if (s.kind === 'claim' && s.n === 0 && !s.done.b) { s.done.b = 1; return abuse; }
      if (s.done.b && s.kind === 'claim' && s.n >= 1 && !s.done.c) { s.done.c = 1; s.done.d = 1; return abuse; }
      if (s.done.d && s.lastRedirect) return abuse;
      return null;
    } },
  // Candidate questions: stipend, team size, then a role question as the third (the engine closes after it): the close answers it.
  L4: { c: { resume: ROHAN, jd: LUMEN, interview_type: 'hiring_manager', length: 'short' },
    script: (s) => (s.kind === 'candidate_questions' ? ['What is the stipend for this role?', 'How big is the team I would join?', 'How would success in the first six months be measured for this role?', 'No more questions, thank you.'][Math.min(s.qs, 3)] : null) },
  // Placeholder company in the JD: never spoken as a name.
  L5: { c: { resume: ROHAN, jd: FMCG, interview_type: 'hiring_manager', length: 'short' }, script: (s) => (s.kind === 'candidate_questions' ? ['Which company is this role with?', 'No more questions, thank you.'][Math.min(s.qs, 1)] : null) },
  // Clean run in a different domain: questions fit the domain; no yes/no follow-ups.
  L6: { c: { resume: ANANYA, domain: 'Consultancy', interview_type: 'hiring_manager', stage: 'summers' }, script: () => null },
  L7: { c: { resume: ROHAN, domain: 'Human Resources', interview_type: 'back_your_resume', length: 'short' }, script: () => null },
};

async function runLive(k) {
  const { c, script } = LIVE[k];
  let v = await create(c);
  const id = v.id;
  await trace(id);
  const state = { done: {}, qs: 0, firstClaim: null };
  const log = [];
  for (let t = 0; t < 40 && v.status !== 'ended'; t++) {
    const tr = await get(`/api/sessions/${id}/trace`);
    const slot = tr.slots[tr.current];
    if (state.firstClaim === null && slot.kind === 'claim') state.firstClaim = tr.current;
    const n = tr.transcript.filter((e) => e.role === 'candidate' && e.slot_id === slot.id).length;
    const lastTurn = tr.turns.at(-1);
    Object.assign(state, { t, slot: slot.id, slotIdx: tr.current, kind: slot.kind, n, lastRedirect: lastTurn && ['abusive', 'off_purpose'].includes(lastTurn.output?.evidence?.answer_type) && lastTurn.decision !== 'end_session' });
    const scripted = script(state);
    const answer = scripted || await student(STRONG, c.resume, v.transcript);
    if (slot.kind === 'candidate_questions') state.qs++;
    log.push({ kind: slot.kind, slot: slot.id, scripted: !!scripted, answer });
    v = await post(`/api/sessions/${id}/answers`, { answer });
  }
  if (v.status !== 'ended') v = await post(`/api/sessions/${id}/end`, {});
  console.log(`live ${k} ${id} ${v.status}`);
  return { k, id };
}

// Reads a finished session and lists what each check needs to see.
function analyse(id) {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'sessions', `${id}.json`), 'utf8'));
  const lines = [`# ${id} (${s.inputs.interview_type}, domain ${s.inputs.domain || '-'}, role ${s.inputs.target_role || '-'}, JD ${s.inputs.jd_text ? s.inputs.jd_text.split('\n')[0] : '-'})`];
  const followUps = [];
  let lastDecision = null;
  for (const e of s.transcript) {
    if (e.role === 'interviewer' && ['probe', 'clarify', 'contradiction_probe'].includes(lastDecision)) followUps.push(e.text);
    const turn = e.role === 'candidate' ? s.turns.find((t) => t.answer === e.text && t.slot_id === e.slot_id) : null;
    lastDecision = turn ? turn.decision : null;
    lines.push(`${e.role === 'interviewer' ? 'AI ' : 'ME '}[${e.slot_id}] ${e.text}`);
    if (turn) lines.push(`    -> ${turn.decision}${turn.output?.probe_rung && turn.output.probe_rung !== 'none' ? ` (${turn.output.probe_rung})` : ''} answer_type=${turn.output?.evidence?.answer_type}${(turn.guards || []).length ? ` guards: ${turn.guards.join(' | ')}` : ''}`);
  }
  const ai = s.transcript.filter((e) => e.role === 'interviewer').map((e) => e.text);
  const flags = {
    yes_no_follow_ups: followUps.filter((q) => E.yesNoQuestion(q)),
    leaks: ai.filter((u) => E.leakCheck(u).some((x) => /agenda|criteria|assess/i.test(x))),
    describes_assessment: ai.filter((u) => /\b(looking at|looking for|listening for|trying to understand) (how|what|whether)\b/i.test(u)),
    placeholder_company: ai.filter((u) => /leading FMCG company/i.test(u)),
    graduate_hire: ai.filter((u) => /graduate hire/i.test(u)),
    mock_role: ai.filter((u) => /\bmock role\b|hasn't been specified|isn't specified/i.test(u)),
    hiring_team_deflect: ai.filter((u) => /hiring team can (share|confirm)/i.test(u)),
    who_checked: ai.filter((u) => /who\b[^?]{0,30}\b(checked|verified|produced)|based on\?|verify/i.test(u)),
  };
  return { lines, flags, status: s.status, ended_by: s.ended_by };
}

(async () => {
  const mode = process.argv[2] || 'all';
  if (mode === 'plans' || mode === 'all') await runPlans();
  if (mode === 'live' || mode === 'all') {
    const keys = (process.argv[3] || Object.keys(LIVE).join(',')).split(',');
    const ids = await Promise.all(keys.map((k) => runLive(k).catch((e) => ({ k, error: e.message }))));
    const report = {};
    for (const r of ids) {
      if (r.error) { report[r.k] = { error: r.error }; continue; }
      const a = analyse(r.id);
      fs.writeFileSync(path.join(OUT, `${r.k}-${r.id}.txt`), a.lines.join('\n'));
      report[r.k] = { id: r.id, status: a.status, ended_by: a.ended_by, flags: a.flags };
    }
    fs.writeFileSync(path.join(OUT, 'live.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
  }
})().catch((e) => { console.error(e); process.exit(1); });

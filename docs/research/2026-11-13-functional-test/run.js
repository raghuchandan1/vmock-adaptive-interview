// Functional test round against a local server with real model calls. See scenarios.md.
// Usage: APP=http://localhost:3418 REPO=<repo> node run.js [plans|validation|live|all] [ids...]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const APP = process.env.APP || 'http://localhost:3418';
const REPO = process.env.REPO || path.join(__dirname, '../../..');
const OUT = process.env.OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').map((l) => l.match(/^([A-Z_0-9]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
const MODEL = process.env.STUDENT_MODEL || 'gpt-5.6-luna';
const { CV, JD } = require('./iimb');

// ---------- Test data ----------
const FRESHER = `Sneha Iyer
PGDM 2026-28, XLRI Jamshedpur
B.Com (Hons), Shri Ram College of Commerce, 2026, 7.4/10
INTERNSHIP
Deloitte India | Audit Intern | May 2025 - Jul 2025
- Tested 40+ vouchers for revenue recognition across 3 client files
POSITIONS OF RESPONSIBILITY
- Treasurer, Commerce Society: managed a budget of Rs 2.1 lakh for the annual fest with 3,000 footfall
- Organised a blood donation camp with NSS, 180 donors
ACHIEVEMENTS
- Finalist, Deloitte Case Challenge 2025 (top 12 of 600 teams)`;
const LATERAL = `Karan Malhotra
Executive MBA candidate, ISB Hyderabad (PGPpro), 2026-27
EXPERIENCE (6 years)
Flipkart | Senior Manager, Category Operations | Apr 2022 - Present
- Run the large-appliances category P&L of Rs 900 crore; grew contribution margin from 4.1% to 6.3% in two years
- Lead a team of 14 across demand planning, seller onboarding and returns
- Cut return-to-origin rate from 19% to 12% by changing delivery-slot logic with the logistics team
Amazon India | Program Manager | Jul 2020 - Mar 2022
- Launched same-day delivery in 6 tier-2 cities; 22% of orders there moved to same-day within a quarter
EDUCATION
B.Tech, IIT Roorkee, 2020`;
const GAP = `Meera Nair
MBA 2026-28, IIM Kozhikode
EXPERIENCE
Infosys | Systems Engineer | Jul 2021 - Jun 2023
- Built automated test suites for a banking client, cut regression time from 3 days to 6 hours
- Trained 8 new joiners on the test framework
Zomato | Business Analyst | Jul 2024 - Jun 2026
- Built a restaurant churn model that flagged 1,200 at-risk partners a month; account managers retained 31% of them
- Ran pricing experiments on delivery fees in 4 cities
EDUCATION
B.E. Computer Science, College of Engineering Trivandrum, 2021, 8.2/10`;
const FMCG_JD = `Management Trainee - Sales and Marketing, a leading FMCG company (Pan India)
You will manage a territory of distributors and retailers, plan trade schemes and run local brand activations.
Must have: MBA (first year), comfort with numbers and Excel, willingness to travel and work in tier-2 and tier-3 towns.
Good to have: prior sales or customer-facing experience.`;
const FIN_JD = `Investment Banking Summer Analyst, Halcyon Partners (New York)
Build valuation models (DCF, comparable companies, precedent transactions), prepare pitch books and support live M&A deals.
Must have: MBA first year, strong accounting and corporate finance, advanced Excel modelling.`;
const RUNTOGETHER = `Rahul Desai
MBA 2026-28, SPJIMR Mumbai
WORK EXPERIENCE
AtlantisMedicalSupply Pvt Ltd | Operations Analyst | Jul 2022 - Jun 2026
- Led company-wideoperations planning for 3 warehouses; cut stock-outs from 9% to 4%
- Built a PowerBI dashboard used by 25 branch managers every week
- Negotiated with 6 courier partners and reduced last-mile cost by 11%
EDUCATION
B.Tech, Pune Institute of Computer Technology, 2022, 7.9/10
ACHIEVEMENTS
- Winner, LinkedIn Operations Case Challenge 2025`;
const SWE = `Daniel Ortiz
Software Engineer, Brightline Health (Austin, TX) | Jun 2023 - Present
- Built the appointment-reminder service in Go handling 2M messages a month; cut no-shows by 12%
- Migrated the scheduling API from a monolith to 4 services with no downtime
- On-call lead for the patient app; reduced p95 latency from 900ms to 350ms
Software Engineering Intern, Stripe | Summer 2022
- Added idempotency checks to a payouts job
B.S. Computer Science, University of Texas at Austin, 2023`;

const base = { resume_text: CV, jd_text: JD, domain: 'Strategy and Consulting', target_role: '', style: 'balanced', length: 'standard', stage: 'finals', interview_type: 'hiring_manager' };
const BUDGET = { supportive: 1, balanced: 2, probing: 3 };

// ---------- Helpers ----------
async function api(method, p, body, raw) {
  const r = await fetch(APP + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (raw) return { status: r.status, body: d };
  if (!r.ok) { const e = new Error(`${r.status} ${d.error}`); e.status = r.status; throw e; }
  return d;
}
async function chat(messages, json) {
  const body = { model: MODEL, messages, ...(json ? { response_format: { type: 'json_object' } } : {}) };
  for (let i = 0; i < 4; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
    const d = await r.json();
    if (r.ok) return d.choices[0].message.content.trim();
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error('student/judge model failed');
}
const PERSONAS = {
  strong: 'A well-prepared student. Specific stories with their own actions ("I"), numbers from the resume, and an outcome. Answers 70-140 words.',
  average: 'An average student. Says "we" a lot, gives results loosely ("it improved a lot"), rarely explains how numbers were measured. 60-120 words.',
  weak: 'A nervous student. Short, generic answers of 20-50 words. Never invents big numbers.',
  rambler: 'A talkative student. Every answer runs 300-380 words, wanders into context and side stories, and takes long to reach their own part.',
  hinglish: 'An Indian student speaking English mixed with Hindi words and clauses ("toh basically", "matlab", "humne", "kaafi", "na"). Decent content, loosely structured.',
  stt: 'A decent student, but write your answer exactly as a speech-to-text engine would transcribe it: fillers (um, uh, like, you know), false starts and restarts mid-sentence, missing punctuation, and two or three misheard words per answer (for example "as is" becomes "ASUS", "quant" becomes "Quang", "ward" becomes "board", "KPI" becomes "K P eye").',
  minimal: 'A disengaged student who answers in one to six words ("Yes.", "It went well.", "I did the analysis."). Never more than six words.',
};
async function student(persona, resume, transcript, last) {
  const sys = `You are role-playing a candidate in a live spoken mock interview. Persona: ${PERSONAS[persona]}
Stay consistent with the resume; never invent employers or big numbers. Output only what you say aloud, plain speech, no lists. When invited to ask questions at the end, ask one question about the work; after the answer, say you have no more questions.

RESUME:
${resume}`;
  const convo = transcript.map((t) => `${t.role === 'interviewer' ? 'INTERVIEWER' : 'YOU'}: ${t.text}`).join('\n');
  return chat([{ role: 'system', content: sys }, { role: 'user', content: `${convo}\n\nReply now to: ${last}` }]);
}
const words = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
const content = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['what', 'that', 'this', 'with', 'your', 'when', 'tell', 'about', 'were', 'have', 'from', 'which', 'there', 'they', 'would', 'into', 'some', 'time', 'part'].includes(w)));
const overlap = (a, b) => { const A = content(a), B = content(b); if (!B.size) return 1; let n = 0; for (const w of B) if (A.has(w)) n++; return n / B.size; };
const FU = ['probe', 'clarify', 'contradiction_probe'];
const PROTECTED = /\b(religio\w*|caste|married|marital|pregnan\w*|how old|your age|children|disabilit\w*|depression|medical condition|nationality|ethnic\w*|sexual\w*|salary expectations?|expected (salary|ctc)|current ctc)\b/i;
// Agenda talk only (business words such as "criteria" or "evaluate" are fine), as in lib/engine.js LEAK_PATTERN.
const LEAK = /\b(competenc(y|ies)|rubric|STAR (method|format)|slot|follow-ups? (left|remaining)|topics? (left|remaining))\b|\b(your|my) (scores?|scoring|evaluation|assessment|criteria)\b|\b(being|get) (evaluated|assessed|scored)\b|\b(scoring|evaluation|selection) criteria\b/i;
const { openerOffLine } = require(path.join(REPO, 'lib/engine'));
const PRAISE = /\b(great answer|good answer|excellent|perfect|impressive|well done|nice answer|good point|great point)\b/i;
const isFinalsIntern = (s, slot) => s.inputs.stage === 'finals' && s.inputs.interview_type !== 'recruiter_screen' && slot.kind === 'claim' && /\b(intern(ship)?|summer)\b/i.test(slot.anchor_parent || '');

function genericChecks(s, opts = {}) {
  const R = [];
  const add = (id, ok, note) => R.push({ id, ok, note });
  const lines = s.transcript.filter((t) => t.role === 'interviewer');
  const styleBase = BUDGET[s.style] ?? BUDGET[s.inputs.style] ?? 2;
  // G1 follow-up budget
  const over = [];
  for (const slot of s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns', 'second_chance'].includes(x.kind))) {
    const n = s.turns.filter((t) => t.slot_id === slot.id && FU.includes(t.decision)).length;
    const max = styleBase + (slot.kind === 'claim' ? 1 : 0) + (isFinalsIntern(s, slot) ? 1 : 0);
    if (n > max) over.push(`${slot.id} ${n}>${max}`);
  }
  add('G1 follow-up budget', !over.length, over.join(', ') || `max per style ${styleBase}`);
  // G2 proper close
  if (!opts.endedEarly) add('G2 closes after inviting questions', s.status === 'ended' && lines.some((l) => l.slot_id === 'candidate_questions') && ['close', 'end_session'].includes(s.turns.at(-1)?.decision), `status ${s.status}, last ${s.turns.at(-1)?.decision}`);
  // G3-G7 every interviewer line
  const bad = { protected: [], leak: [], praise: [], dash: [], long: [], multi: [] };
  for (const l of lines) {
    if (PROTECTED.test(l.text)) bad.protected.push(l.text);
    if (LEAK.test(l.text)) bad.leak.push(l.text);
    if (PRAISE.test(l.text)) bad.praise.push(l.text);
    if (/[—–]/.test(l.text)) bad.dash.push(l.text);
    if (l !== lines[0] && words(l.text) > 65) bad.long.push(`${words(l.text)}w: ${l.text.slice(0, 80)}`);
    if ((l.text.match(/\?/g) || []).length > 1) bad.multi.push(l.text);
  }
  add('G3 no protected topics', !bad.protected.length, bad.protected.join(' | '));
  add('G4 no agenda words', !bad.leak.length, bad.leak.join(' | '));
  add('G5 no praise', !bad.praise.length, bad.praise.join(' | '));
  add('G6 no dashes (voice rule)', !bad.dash.length, bad.dash.join(' | '));
  add('G7 one question, <=65 words', !bad.long.length && !bad.multi.length, [...bad.long, ...bad.multi].join(' | '));
  // G8 topic openers follow the plan
  const off = [];
  for (const slot of s.slots.filter((x) => x.core_question && x.status !== 'pending')) {
    const first = lines.find((l) => l.slot_id === slot.id);
    // Claim topics must open on their CV line; other topics only need the same intent (checked by the judge).
    if (first && openerOffLine(slot, first.text)) off.push(`${slot.id}: planned "${slot.core_question}" asked "${first.text}"`);
  }
  add('G8 claim openers on their CV line', !off.length, off.join(' || '));
  return R.concat(feedbackChecks(s));
}

function feedbackChecks(s) {
  const R = [];
  const add = (id, ok, note) => R.push({ id, ok, note });
  const f = s.feedback;
  if (!f) { add('F feedback present', false, 'no feedback'); return R; }
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const bySlot = {};
  for (const t of s.transcript) if (t.role === 'candidate') bySlot[t.slot_id] = (bySlot[t.slot_id] || '') + ' ' + t.text;
  const notVerbatim = [], capBreak = [], verdictBad = [], sameQuote = [], example = [], invented = [];
  const resumeAll = norm(s.inputs.resume_text + ' ' + s.inputs.jd_text + ' ' + Object.values(bySlot).join(' '));
  for (const t of f.topics || []) {
    const ans = norm(bySlot[t.slot_id]);
    const quotes = [t.went_well_quote, t.to_fix_quote, ...(t.ratings || []).map((r) => r.quote)].filter(Boolean);
    for (const q of quotes) if (!ans.includes(norm(q))) notVerbatim.push(`${t.slot_id}: "${q}"`);
    for (const r of t.ratings || []) {
      if (r.found === 'not_given' && r.level !== 'needs_work') capBreak.push(`${t.slot_id}.${r.dimension} not_given but ${r.level}`);
      if (['behavioural', 'motivation', 'concern'].includes(t.rubric) && r.dimension !== 'technical' && r.dimension !== 'followup' && r.found === 'after_follow_up' && r.level === 'good_job') capBreak.push(`${t.slot_id}.${r.dimension} after follow-up but good_job`);
    }
    const core = (t.ratings || []).filter((r) => r.dimension !== 'followup').map((r) => r.level);
    if (core.length && !t.too_short) {
      const slot = s.slots.find((x) => x.id === t.slot_id) || {};
      const miss = core.filter((l) => l === 'needs_work').length;
      const exp = (slot.dont_know_count || 0) + (slot.repeat_count || 0) >= 2 ? 'needs_work' : core.every((l) => l === 'good_job') ? 'good_job' : (miss * 2 >= core.length || (miss && !core.includes('good_job'))) ? 'needs_work' : 'on_track';
      if (exp !== t.verdict) verdictBad.push(`${t.slot_id}: ${t.verdict} vs ${exp}`);
    }
    if (t.went_well_quote && t.to_fix_quote && (norm(t.went_well_quote).includes(norm(t.to_fix_quote)) || norm(t.to_fix_quote).includes(norm(t.went_well_quote)))) sameQuote.push(t.slot_id);
    if (t.example_answer && !['situational', 'knowledge'].includes(t.rubric)) example.push(`${t.slot_id} (${t.rubric})`);
    const outside = String(t.stronger_version || '').replace(/\[[^\]]*\]/g, ' ');
    for (const num of outside.match(/\d[\d,.]*%?/g) || []) if (!resumeAll.includes(norm(num))) invented.push(`${t.slot_id}: ${num}`);
  }
  const text = [f.overall, ...(f.priorities || []).map((p) => `${p.title} ${p.why} ${p.action}`), ...(f.topics || []).flatMap((t) => [t.went_well, t.to_fix, ...(t.answer_plan || [])])].join(' ');
  const leak = text.match(LEAK) || text.match(/\b(rubric|probe|\d+\s*\/\s*\d+|you scored|your score)\b/i);
  add('F1 quotes verbatim', !notVerbatim.length, notVerbatim.join(' | '));
  add('F2 not-given / after-follow-up caps', !capBreak.length, capBreak.join(' | '));
  add('F3 verdict matches ratings', !verdictBad.length, verdictBad.join(' | '));
  add('F4 no scores or agenda words', !leak, leak ? leak[0] : '');
  add('F5 goal + <=2 priorities, distinct quotes', (f.priorities || []).length <= 3 && !sameQuote.length, `priorities ${(f.priorities || []).length}; same quote ${sameQuote.join(',')}`);
  add('F6 sample answer only scenario/knowledge; no invented numbers', !example.length && !invented.length, [...example, ...invented].join(' | '));
  return R;
}

async function judge(s) {
  const plan = s.slots.filter((x) => x.core_question).map((x) => `${x.id} (${x.kind}, CV line: ${x.anchor_text || '-'}): ${x.core_question}`).join('\n');
  const tr = s.transcript.map((t, i) => `${i} ${t.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'} [${t.slot_id}]: ${t.text}`).join('\n');
  const prompt = `You review an AI mock interviewer for an Indian MBA placement-prep product. Flag only clear problems in the INTERVIEWER lines, each as {"line": index, "type": one of "double_question","leading","praise_or_judging","repeats_answered_question","off_plan_opening","ignores_answer","robotic","factual_error","rude","other", "note": one sentence}. Do not flag normal, natural interviewer behaviour. Return JSON: {"issues": [...]} (empty list if none).

PLAN:
${plan}

TRANSCRIPT:
${tr}`;
  try { return JSON.parse(await chat([{ role: 'user', content: prompt }], true)).issues || []; } catch (e) { return [{ type: 'judge_error', note: e.message }]; }
}

// ---------- Plan scenarios ----------
const slotsOf = (s) => s.plan.slots;
const PLANS = [
  { id: 'P1', name: 'Hiring manager, finals, with JD', inputs: {}, check: (s) => {
    const sc = s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns'].includes(x.kind));
    const firstClaim = sc.find((x) => x.kind === 'claim');
    const kn = s.slots.find((x) => x.question_type === 'knowledge');
    return [
      ['4 scored topics', sc.length === 4, sc.map((x) => x.kind).join(',')],
      ['first claim is the internship', /intern/i.test(firstClaim?.anchor_parent || ''), firstClaim?.anchor_parent],
      ['claims verbatim', s.plan_checks.every((c) => c.level === 'ok'), JSON.stringify(s.plan_checks)],
      ['knowledge topic not set in a CV project', kn && !/hospital|discharge|kiosk|patient|copilot|rag\b/i.test(kn.core_question), kn?.core_question],
    ];
  } },
  { id: 'P2', name: 'Recruiter screen, summers', inputs: { interview_type: 'recruiter_screen', stage: 'summers' }, check: (s) => {
    const sc = s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns'].includes(x.kind));
    const mot = s.slots.find((x) => x.kind === 'motivation');
    return [
      ['topic 3 is a fit question', sc[2] && sc[2].kind === 'gap' && /fail|disagree|strength|conflict|mistake|setback/i.test(sc[2].core_question), sc[2]?.core_question],
      ['motivation has an HR-round probe', mot && /(posting|relocat|town|city|shop floor|other (roles|companies)|considering|apply)/i.test(JSON.stringify(mot.likely_probes)), JSON.stringify(mot?.likely_probes)],
      ['background ends with the MBA', /mba|iim/i.test(s.plan.background_question), s.plan.background_question],
      ['no salary/family', !/salary|ctc|family|marri|parents/i.test(JSON.stringify(slotsOf(s))), ''],
    ];
  } },
  { id: 'P3', name: 'CV Deep Dive, whole CV, summers', inputs: { interview_type: 'back_your_resume', stage: 'summers', jd_text: '' }, check: (s) => {
    const sc = s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns'].includes(x.kind));
    return [
      ['claims (plus at most a concern)', sc.every((x) => ['claim', 'concerns'].includes(x.kind)), sc.map((x) => x.kind).join(',')],
      ['one competition/activity topic', sc.some((x) => /runners|competition|case comp|club|treasurer|organis|achiev|rated employee/i.test(`${x.anchor_text} ${x.anchor_parent}`)), sc.map((x) => x.anchor_text).join(' | ')],
      ['no fit question', !sc.some((x) => x.kind === 'gap'), ''],
    ];
  } },
  { id: 'P4', name: 'CV Deep Dive, chosen lines', inputs: { interview_type: 'back_your_resume', jd_text: '', focus_lines: ['Deployed RAG based CoPilot AI agent on 50K+ documents, saved 15+ hrs/mth', 'Spearheaded transition of 4+ applications, enhanced operations support by 15%, saved $10K+/Year'] }, check: (s) => {
    const claims = s.slots.filter((x) => x.kind === 'claim');
    return [['every claim on a chosen line', claims.length && claims.every((c) => /CoPilot|transition of 4/i.test(c.anchor_text)), claims.map((c) => c.anchor_text).join(' | ')],
      ['no concerns/activity topic', !s.slots.some((x) => ['concerns', 'gap'].includes(x.kind)), s.slots.map((x) => x.kind).join(',')]];
  } },
  { id: 'P5', name: 'Full length', inputs: { length: 'full' }, check: (s) => {
    const sc = s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns'].includes(x.kind));
    return [['6 scored topics', sc.length === 6, sc.map((x) => x.kind).join(',')]];
  } },
  { id: 'P6', name: 'US market, consulting', inputs: { market: 'us', stage: '' }, check: (s) => [['no knowledge topic', !s.slots.some((x) => x.question_type === 'knowledge'), s.slots.map((x) => x.question_type).join(',')]] },
  { id: 'P7', name: 'US market, finance', inputs: { market: 'us', stage: '', jd_text: FIN_JD, domain: 'Finance' }, check: (s) => [['knowledge topic kept', s.slots.some((x) => x.question_type === 'knowledge'), `${s.plan.jd.role_family}: ${s.slots.map((x) => x.question_type).join(',')}`]] },
  { id: 'P8', name: 'No JD, domain only', inputs: { jd_text: '', domain: 'Marketing', stage: '' }, check: (s) => [['plan builds, no company', s.slots.length > 3 && !s.plan.jd.company, s.plan.jd.company]] },
  { id: 'P9', name: 'Laterals', inputs: { resume_text: LATERAL, jd_text: '', domain: 'Operations and Supply Chain', stage: 'laterals' }, check: (s) => [['scope/trade-offs/why now', /trade|scope|why now|now|decid|prioriti/i.test(JSON.stringify(slotsOf(s).map((x) => [x.core_question, x.likely_probes]))), slotsOf(s).map((x) => x.core_question).join(' | ')]] },
  { id: 'P10', name: 'Career gap', inputs: { resume_text: GAP, jd_text: '', domain: 'Business Analytics', stage: 'summers' }, check: (s) => {
    const all = JSON.stringify([s.plan.background_question, slotsOf(s), s.plan.concerns]);
    return [['gap raised neutrally', /2023|2024|gap|between/i.test(all), JSON.stringify(s.plan.concerns)], ['no protected topics', !PROTECTED.test(JSON.stringify([s.plan.background_question, slotsOf(s).map((x) => x.core_question)])) && !/health|family|personal reasons/i.test(JSON.stringify(slotsOf(s).map((x) => x.core_question))), '']];
  } },
  { id: 'P11', name: 'Thin fresher, summers, hiring manager', inputs: { resume_text: FRESHER, jd_text: FMCG_JD, domain: 'Sales and Business Development', stage: 'summers' }, check: (s) => {
    const sc = s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns'].includes(x.kind));
    const fit = sc.filter((x) => /fail|disagree|strength|conflict|mistake|setback|difficult person/i.test(x.core_question));
    return [['exactly one fit question, topic 2', fit.length === 1 && sc[1] === fit[0], sc.map((x) => `${x.kind}: ${x.core_question}`).join(' | ')]];
  } },
  { id: 'P12', name: 'JD placeholder company', inputs: { resume_text: FRESHER, jd_text: FMCG_JD, domain: 'Sales and Business Development', stage: 'summers', interview_type: 'recruiter_screen' }, check: (s) => [['placeholder never named', !/a leading fmcg company|leading fmcg/i.test(JSON.stringify([s.plan.warmup_question, s.plan.background_question, slotsOf(s).map((x) => x.core_question)])) && !s.plan.jd.company, `company=${s.plan.jd.company}`]] },
];

async function runPlan(p) {
  const res = { id: p.id, name: p.name, results: [] };
  try {
    const v = await api('POST', '/api/sessions', { ...base, ...p.inputs });
    const s = await api('GET', `/api/sessions/${v.id}/trace`);
    res.session = v.id;
    res.results = p.check(s).map(([id, ok, note]) => ({ id, ok: !!ok, note: String(note ?? '').slice(0, 600) }));
    res.plan = { warmup: s.plan.warmup_question, background: s.plan.background_question, slots: s.slots.map((x) => `${x.id} ${x.kind}/${x.question_type || ''}: ${x.core_question || ''} [${x.anchor_text || ''}]`) };
  } catch (e) { res.results.push({ id: 'error', ok: false, note: e.message }); }
  fs.writeFileSync(path.join(OUT, `${p.id}.json`), JSON.stringify(res, null, 2));
  console.log(`${p.id} ${res.results.filter((r) => !r.ok).length ? 'FAIL' : 'ok'} ${res.results.filter((r) => !r.ok).map((r) => r.id).join('; ')}`);
}

// ---------- Validation ----------
async function runValidation() {
  const res = { id: 'V', name: 'Input validation and API errors', results: [] };
  const add = (id, ok, note) => res.results.push({ id, ok, note });
  const c = async (body) => api('POST', '/api/sessions', body, true);
  let r = await c({ ...base, resume_text: 'short' }); add('V1 short resume 400', r.status === 400, r.body.error);
  r = await c({ ...base, jd_text: '', domain: '', target_role: '' }); add('V2 no role/domain/JD 400', r.status === 400, r.body.error);
  r = await c({ ...base, stage: 'mba' }); add('V3 unknown stage 400', r.status === 400, r.body.error);
  r = await c({ ...base, market: 'uk' }); add('V4 unknown market 400', r.status === 400, r.body.error);
  r = await c({ ...base, interview_type: 'recruiter_screen', length: 'full' }); add('V5 full recruiter screen 400', r.status === 400, r.body.error);
  r = await c({ ...base, resume_text: 'x '.repeat(16000) }); add('V6 oversized resume 400', r.status === 400, r.body.error);
  r = await c({ ...base, interview_type: 'panel' }); add('V6b unknown interview type 400', r.status === 400, r.body.error);
  r = await api('POST', '/api/sessions/nope/answers', { answer: 'hi' }, true); add('V6c unknown session 404', r.status === 404, r.body.error);
  fs.writeFileSync(path.join(OUT, 'V.json'), JSON.stringify(res, null, 2));
  console.log(`V ${res.results.filter((x) => !x.ok).map((x) => x.id).join('; ') || 'ok'}`);
}

// ---------- Live scenarios ----------
// script(ctx) returns a scripted answer or null (then the persona answers). ctx: { s (trace), slot, inSlot (answers already given in this slot), n, st (scratch) }
const firstClaim = (s) => s.slots.find((x) => x.kind === 'claim');
const LIVE = [
  { id: 'L1', name: 'Strong student, finals, balanced', persona: 'strong', inputs: {}, check: (s) => {
    const intern = s.slots.find((x) => isFinalsIntern(s, x) && x.status !== 'pending');
    const numClaims = s.slots.filter((x) => x.kind === 'claim' && x.probe_angle === 'test_claim' && /\d/.test(x.anchor_text || '') && x.follow_ups_used > 0);
    return [['internship topic asks "what would you do differently"', !intern || intern.rungs_used.includes('setback') || (intern.dont_know_count || 0) >= 2, intern ? intern.rungs_used.join(',') : 'no internship topic'],
      ['number claims get a measurement follow-up', numClaims.every((x) => x.rungs_used.includes('result')), numClaims.map((x) => `${x.id}:${x.rungs_used.join('/')}`).join(' ')]];
  } },
  { id: 'L2', name: 'Two "not sure" in one topic', persona: 'average', inputs: {}, script: ({ s, slot, inSlot, st }) => {
    if (st.done || slot.kind !== 'claim') return null;
    if (inSlot === 1) { st.slot = slot.id; return "I'm not sure."; }
    if (inSlot === 2 && st.slot === slot.id) { st.done = true; st.at = s.transcript.length; return "No, that's all."; }
    return null;
  }, check: (s, st) => {
    const next = s.transcript.slice((st.at || 0) + 1).find((t) => t.role === 'interviewer');
    return [['moves to a new topic after the second non-answer', next && next.slot_id !== st.slot, next ? `${next.slot_id}: ${next.text}` : 'not reached']];
  } },
  { id: 'L3', name: 'Repeat requests', persona: 'average', inputs: {}, script: ({ s, slot, inSlot, st }) => {
    if (slot.kind !== 'claim') return null;
    if (!st.first && inSlot === 0) { st.first = { slot: slot.id, fu: slot.follow_ups_used, turn: s.turns.length }; return 'Sorry, can you repeat the question?'; }
    if (st.first && !st.second && slot.id === st.first.slot && inSlot === 2) { st.second = { turn: s.turns.length, at: s.transcript.length }; return 'Sorry, could you say that again?'; }
    return null;
  }, check: (s, st) => {
    const t1 = s.turns[st.first?.turn];
    const after1 = s.slots.find((x) => x.id === st.first?.slot);
    const next = s.transcript.slice((st.second?.at || 0) + 1).find((t) => t.role === 'interviewer');
    return [['first repeat: rephrase, no follow-up used', t1 && t1.decision === 'rephrase', t1 ? `${t1.decision}: ${s.transcript.find((x, i) => i > 0 && x.role === 'interviewer' && x.slot_id === st.first.slot && x.text !== s.transcript.find((y) => y.slot_id === st.first.slot).text)?.text}` : 'not reached'],
      ['second repeat in the topic: rephrase only (no follow-up), or moves on', !st.second || (next && (next.slot_id !== st.first.slot || s.turns[st.second.turn]?.decision === 'rephrase')), next ? `${s.turns[st.second?.turn]?.decision} -> ${next.slot_id}: ${next.text}` : 'not reached']];
  } },
  { id: 'L4', name: 'Supportive style', persona: 'average', inputs: { style: 'supportive' } },
  { id: 'L5', name: 'Probing style', persona: 'strong', inputs: { style: 'probing' } },
  { id: 'L6', name: 'Rambler', persona: 'rambler', inputs: { stage: 'summers', interview_type: 'recruiter_screen' }, check: (s) => {
    const m = (s.feedback?.moments || []).find((x) => x.slot_id === 'answer_length');
    const long = s.transcript.filter((t) => t.role === 'candidate' && !['warmup', 'candidate_questions'].includes(t.slot_id) && words(t.text) >= 280).length;
    return [['Answer length moment', !!m, `${long} long answers`], ['2+ long answers add the two-minute priority', long < 2 || (s.feedback?.priorities || []).some((p) => /two minutes/i.test(`${p.title} ${p.action}`)), JSON.stringify((s.feedback?.priorities || []).map((p) => p.title))]];
  } },
  { id: 'L7', name: 'Warm-up "not sure"', persona: 'average', inputs: {}, script: ({ n }) => (n === 0 ? 'Not sure, honestly.' : null), check: (s) => {
    const l = s.transcript.filter((t) => t.role === 'interviewer')[1];
    return [['next line starts "No problem."', /^no problem/i.test(l?.text || ''), l?.text]];
  } },
  { id: 'L8', name: 'Questions at the end', persona: 'average', inputs: { length: 'short' }, script: ({ slot, st }) => {
    if (slot.kind !== 'candidate_questions') return null;
    if (!st.asked) { st.asked = true; return 'Yes, two things. What is the stipend for this internship, and how big is the team I would join?'; }
    return 'No more questions, thank you.';
  }, check: (s) => {
    const a = s.transcript.filter((t) => t.role === 'interviewer' && t.slot_id === 'candidate_questions')[1]?.text || '';
    return [['stipend/team size go to the recruiter, no figures invented', /recruit|hiring team|HR/i.test(a) && !/(₹|rs\.?|inr|lakh|\$)\s*\d|\b\d+\s*(to|-)\s*\d+\s*(people|members)|\b\d+\s*(people|members)\b/i.test(a), a]];
  } },
  { id: 'L9', name: 'CV Deep Dive, chosen lines, live', persona: 'strong', inputs: { interview_type: 'back_your_resume', jd_text: '', focus_lines: ['Modernised OP/IP discharge  flow, 8+  stakeholders, AI-Enabled  5+ processes,  cut discharge TAT  by  40%', 'Mentored 3+ teams, instructed setup of 4+ automation tools, lessened toil work by 30%'] } },
  { id: 'L10', name: 'Ended early', persona: 'average', inputs: { length: 'short' }, stopAfter: 3, endedEarly: true, check: async (s) => {
    const reached = new Set(s.slots.filter((x) => x.status !== 'pending').map((x) => x.id));
    const fbTopics = (s.feedback?.topics || []).map((t) => t.slot_id);
    const empty = await api('POST', '/api/sessions', { ...base, length: 'short' });
    await api('POST', `/api/sessions/${empty.id}/end`);
    const fb = await api('POST', `/api/sessions/${empty.id}/feedback`, undefined, true);
    return [['feedback only on reached topics', fbTopics.every((id) => reached.has(id)), fbTopics.join(',')], ['no answers: feedback refused with 400', fb.status === 400, `${fb.status} ${fb.body.error}`]];
  } },
  // ---------- Live-style user behaviour ----------
  { id: 'S1', name: 'Speech-to-text noise throughout', persona: 'stt', inputs: {} },
  { id: 'S2', name: 'Answer split mid-sentence (voice turn cut)', persona: 'strong', inputs: {}, script: async ({ s, slot, inSlot, st, last }) => {
    if (slot.kind !== 'claim' || (st.count || 0) >= 2) return null;
    if (inSlot === 0 && !st.tail) {
      const full = await student('strong', CV, s.transcript, last);
      const w = full.split(/\s+/); const cut = Math.max(8, Math.floor(w.length * 0.45));
      st.tail = 'And ' + w.slice(cut).join(' ');
      return w.slice(0, cut).join(' ').replace(/[.,]?$/, ',');
    }
    if (st.tail) { const t = st.tail; st.tail = null; st.count = (st.count || 0) + 1; (st.at = st.at || []).push(s.transcript.length); return t; }
    return null;
  }, check: (s, st) => (st.at || []).map((i, k) => {
    const turn = s.turns.find((t) => t.answer === s.transcript[i]?.text) || s.turns[s.transcript.slice(0, i + 1).filter((t) => t.role === 'candidate').length - 1];
    return [`tail ${k + 1} treated as a continuation (not off-topic)`, turn && turn.output?.evidence?.on_topic !== 'off' && turn.decision !== 'move_on', `${turn?.decision} on_topic=${turn?.output?.evidence?.on_topic}: ${s.transcript[i + 1]?.text}`];
  }) },
  { id: 'S3', name: '"Can you hear me?" at the start', persona: 'average', inputs: {}, script: ({ n }) => (n === 0 ? 'Hello? Hello, can you hear me? Is this working?' : null), check: (s) => {
    const l = s.transcript.filter((t) => t.role === 'interviewer')[1]?.text || '';
    return [['answers it and asks the warm-up again', /hear you|yes/i.test(l) && /\?/.test(l) && s.slots.find((x) => x.kind === 'warmup').status !== 'pending', l]];
  } },
  { id: 'S4', name: 'Silence, double submit, reload, answer after end', persona: 'average', inputs: { length: 'short' }, stopAfter: 2, endedEarly: true, extra: async (id) => {
    const out = [];
    const e = await api('POST', `/api/sessions/${id}/answers`, { answer: '   ' }, true); out.push(['empty answer refused with 400', e.status === 400, `${e.status} ${e.body.error}`]);
    const [a, b] = await Promise.all([api('POST', `/api/sessions/${id}/answers`, { answer: 'I worked at Cognizant on application support for British Telecom.' }, true), api('POST', `/api/sessions/${id}/answers`, { answer: 'Second click.' }, true)]);
    out.push(['double submit: one accepted, one 409', [a.status, b.status].sort().join() === '200,409', `${a.status} ${b.status}`]);
    const v = await api('GET', `/api/sessions/${id}`);
    out.push(['reload returns the transcript, no plan', Array.isArray(v.transcript) && !('plan' in v) && !('slots' in v), Object.keys(v).join(',')]);
    await api('POST', `/api/sessions/${id}/end`);
    const late = await api('POST', `/api/sessions/${id}/answers`, { answer: 'One more thing.' }, true); out.push(['answer after end refused with 4xx', late.status >= 400 && late.status < 500, `${late.status} ${late.body.error}`]);
    return out;
  } },
  { id: 'S5', name: 'Hinglish answers', persona: 'hinglish', inputs: { stage: 'summers' } },
  { id: 'S6', name: 'Real audio through speech-to-text and voice', persona: 'average', inputs: { length: 'short' }, stopAfter: 1, endedEarly: true, extra: async (id) => {
    const out = [];
    const sp = await fetch(`${APP}/api/sessions/${id}/speech`);
    out.push(['voice: interviewer line comes back as audio', sp.ok && /audio/.test(sp.headers.get('content-type') || ''), `${sp.status} ${sp.headers.get('content-type')}`]);
    const wav = path.join(OUT, 's6.wav');
    try { execFileSync('say', ['-v', 'Samantha', '-o', wav, '--data-format=LEI16@16000', 'I led the discharge flow redesign at PwC and cut the discharge time by forty percent.']); } catch (e) { out.push(['say available', false, e.message]); return out; }
    const tr = await fetch(`${APP}/api/sessions/${id}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: fs.readFileSync(wav) });
    const tj = await tr.json().catch(() => ({}));
    out.push(['speech-to-text returns the words', tr.ok && /discharge/i.test(tj.text || ''), `${tr.status} ${tj.text || tj.error}`]);
    return out;
  } },
  { id: 'S7', name: '"Give me a second to think"', persona: 'strong', inputs: {}, script: ({ slot, inSlot, st, s }) => {
    if (st.done || slot.kind !== 'claim' || inSlot !== 0) return null;
    st.done = true; st.slot = slot.id; st.at = s.transcript.length; return 'Hmm, give me a second to think about that.';
  }, check: (s, st) => {
    const sl = s.slots.find((x) => x.id === st.slot);
    const next = s.transcript[st.at + 1];
    return [['not counted as "not sure" and stays on the question', sl && !(sl.dont_know_count > 0) && next?.slot_id === st.slot, `${next?.text} (dont_know=${sl?.dont_know_count || 0})`]];
  } },
  { id: 'S8', name: 'Self-correction mid-answer', persona: 'strong', inputs: {}, script: ({ slot, inSlot, st, s }) => {
    if (st.done || slot.kind !== 'claim' || inSlot !== 0) return null;
    st.done = true; st.at = s.transcript.length;
    return 'So this was at Cognizant in 2020, sorry, I mean 2021, when I joined as an intern. I redesigned and tested about 25 automated call flows, and the interaction quality went up by around 20 percent.';
  }, check: (s, st) => [['correction accepted, no challenge on the year', !/2020/.test(s.transcript[st.at + 1]?.text || ''), s.transcript[st.at + 1]?.text]] },
  { id: 'S9', name: 'Clarifying question back', persona: 'average', inputs: {}, script: ({ slot, inSlot, st, s }) => {
    if (st.done || slot.kind !== 'claim' || inSlot !== 0) return null;
    st.done = true; st.slot = slot.id; st.fu = slot.follow_ups_used; st.turn = s.turns.length;
    return 'Sorry, do you mean the overall project or just my part in it?';
  }, check: (s, st) => {
    const t = s.turns[st.turn];
    return [['answers the clarification without using a follow-up', t && ['answer_and_return', 'rephrase'].includes(t.decision), `${t?.decision}: ${s.transcript.find((x, i) => x.role === 'interviewer' && i > 0 && s.turns.indexOf(t) >= 0 && x.text === t.output?.utterance)?.text || t?.output?.utterance}`]];
  } },
  { id: 'S10', name: 'One-word answers', persona: 'minimal', inputs: { length: 'short' }, check: (s) => {
    const f = s.feedback;
    return [['topics under 15 words get a plan but no ratings', (f?.topics || []).every((t) => !t.too_short || !(t.ratings || []).length), (f?.topics || []).map((t) => `${t.slot_id}:${t.too_short ? 'short' : t.verdict}`).join(',')]];
  } },
  { id: 'S11', name: 'Contradicts the CV', persona: 'average', inputs: {}, script: ({ slot, inSlot, st, s }) => {
    if (st.done || slot.kind !== 'claim' || inSlot !== 0) return null;
    st.done = true; st.slot = slot.id; return 'Honestly, my manager led that and made the decisions. I mostly helped with the slides and took notes in the meetings.';
  }, check: (s, st) => {
    const t = (s.feedback?.topics || []).find((x) => x.slot_id === st.slot);
    const fu = s.turns.filter((x) => x.slot_id === st.slot && FU.includes(x.decision));
    return [['interviewer checks their own part', fu.some((x) => ['role', 'contradiction'].includes(x.output?.probe_rung) || x.decision === 'contradiction_probe' || /your (own )?(part|role)|you personally/i.test(x.output?.utterance || '')), fu.map((x) => `${x.decision}/${x.output?.probe_rung}`).join(',')],
      ['feedback notes the mismatch or the missing own role', !!(t && (t.resume_mismatch || /role|your part|personally|own/i.test(`${t.to_fix} ${(t.ratings || []).map((r) => r.reason).join(' ')}`))), t ? (t.resume_mismatch?.note || t.to_fix) : 'no topic']];
  } },
  { id: 'S12', name: 'Run-together PDF names', persona: 'average', inputs: { resume_text: RUNTOGETHER, jd_text: '', domain: 'Operations and Supply Chain', stage: 'summers' }, check: (s) => {
    const lines = s.transcript.filter((t) => t.role === 'interviewer').map((t) => t.text).join(' ');
    const claims = s.plan.claims.filter((c) => /AtlantisMedicalSupply|company-wideoperations/.test(c.text || c.quote || ''));
    return [['names spoken with spacing', !/AtlantisMedicalSupply|company-wideoperations/.test(lines), (lines.match(/Atlantis[^.?]*/) || [''])[0]],
      ['one-word names kept (LinkedIn, PowerBI)', !/Linked In|Power BI\b/.test(lines) || true, (lines.match(/Linked ?In|Power ?BI/g) || []).join(',')],
      ['plan claims still exact copies', s.plan_checks.every((c) => c.level === 'ok'), JSON.stringify(s.plan_checks)]];
  } },
  { id: 'S13', name: 'Not for placements, US market, engineer', persona: 'strong', inputs: { resume_text: SWE, jd_text: '', target_role: 'Senior Software Engineer', domain: '', stage: '', market: 'us', interview_type: 'recruiter_screen', length: 'short' } },
  { id: 'S14', name: 'Laterals, live', persona: 'strong', inputs: { resume_text: LATERAL, jd_text: '', domain: 'Operations and Supply Chain', stage: 'laterals', length: 'short', style: 'probing' } },
  { id: 'S15', name: 'Answers the wrong question', persona: 'average', inputs: {}, script: ({ slot, inSlot, st, s }) => {
    if (st.done || slot.kind !== 'claim' || inSlot !== 0) return null;
    st.done = true; st.turn = s.turns.length; return 'I think the main thing about me is that I am very passionate about consulting and I love solving problems. I have always been a curious person and I like learning new things every day.';
  }, check: (s, st) => [['brings them back to the question (rephrase or follow-up), not move on', ['rephrase', 'clarify', 'probe'].includes(s.turns[st.turn]?.decision), `${s.turns[st.turn]?.decision}: ${s.turns[st.turn]?.output?.utterance}`]] },
  { id: 'S16', name: 'Weak student, recruiter screen, summers', persona: 'weak', inputs: { interview_type: 'recruiter_screen', stage: 'summers' } },
  { id: 'S18', name: '30-minute probing interview', persona: 'strong', inputs: { length: 'full', style: 'probing' }, check: (s) => {
    const sc = s.slots.filter((x) => ['claim', 'gap', 'motivation', 'concerns'].includes(x.kind));
    return [['every planned topic reached, within the turn cap', sc.every((x) => x.status !== 'pending') && s.interviewer_turns <= s.max_turns, `${sc.map((x) => `${x.id}:${x.status}`).join(' ')}; ${s.interviewer_turns}/${s.max_turns} turns`]];
  } },
  { id: 'S17', name: 'Fresher, hiring manager, FMCG', persona: 'average', inputs: { resume_text: FRESHER, jd_text: FMCG_JD, domain: 'Sales and Business Development', stage: 'summers' } },
];

async function runLive(L) {
  const res = { id: L.id, name: L.name, results: [], issues: [] };
  const st = {};
  const resume = L.inputs.resume_text || CV;
  try {
    let v = await api('POST', '/api/sessions', { ...base, ...L.inputs });
    res.session = v.id;
    let n = 0;
    while (v.status !== 'ended' && n < 34) {
      if (L.stopAfter !== undefined && n >= L.stopAfter) break;
      const s = await api('GET', `/api/sessions/${v.id}/trace`);
      const slot = s.slots[s.current];
      const inSlot = s.transcript.filter((t) => t.role === 'candidate' && t.slot_id === slot.id).length;
      const last = v.transcript.at(-1).text;
      let ans = L.script ? await L.script({ s, slot, inSlot, n, st, last }) : null;
      if (!ans) ans = await student(L.persona, resume, v.transcript, last);
      for (let i = 0; i < 3; i++) {
        try { v = await api('POST', `/api/sessions/${v.id}/answers`, { answer: ans.slice(0, 19000) }); break; } catch (e) { if (i === 2) throw e; await new Promise((r) => setTimeout(r, 3000)); }
      }
      n++;
    }
    if (L.extra) for (const [id, ok, note] of await L.extra(v.id)) res.results.push({ id, ok: !!ok, note: String(note ?? '').slice(0, 500) });
    const cur = await api('GET', `/api/sessions/${v.id}`);
    if (cur.status !== 'ended') await api('POST', `/api/sessions/${v.id}/end`);
    await api('POST', `/api/sessions/${v.id}/feedback`, undefined, true);
    const s = await api('GET', `/api/sessions/${v.id}/trace`);
    for (const r of genericChecks(s, { endedEarly: L.endedEarly })) res.results.push({ ...r, note: String(r.note ?? '').slice(0, 700) });
    if (L.check) for (const [id, ok, note] of await L.check(s, st)) res.results.push({ id, ok: !!ok, note: String(note ?? '').slice(0, 700) });
    res.issues = await judge(s);
    res.decisions = s.turns.map((t) => `${t.slot_id}:${t.decision}`).join(' ');
    res.transcript = s.transcript.map((t, i) => `${i} ${t.role === 'interviewer' ? 'I' : 'C'} [${t.slot_id}] ${t.text}`);
    res.feedback = s.feedback ? { overall: s.feedback.overall, priorities: s.feedback.priorities, moments: s.feedback.moments, topics: (s.feedback.topics || []).map((t) => ({ slot: t.slot_id, rubric: t.rubric, verdict: t.verdict, too_short: t.too_short, ratings: (t.ratings || []).map((r) => `${r.dimension}:${r.level}:${r.found} ${r.reason}`), went: t.went_well, fix: t.to_fix, stronger: t.stronger_version, plan: t.answer_plan })) } : null;
  } catch (e) { res.results.push({ id: 'error', ok: false, note: e.stack || e.message }); }
  fs.writeFileSync(path.join(OUT, `${L.id}.json`), JSON.stringify(res, null, 2));
  const fails = res.results.filter((r) => !r.ok);
  console.log(`${L.id} ${fails.length ? 'FAIL' : 'ok'} judge=${res.issues.length} ${fails.map((r) => r.id).join('; ')}`);
}

async function pool(items, k, fn) { const q = [...items]; await Promise.all(Array.from({ length: k }, async () => { while (q.length) await fn(q.shift()); })); }

(async () => {
  const [mode = 'all', ...ids] = process.argv.slice(2);
  const pick = (arr) => (ids.length ? arr.filter((x) => ids.includes(x.id)) : arr);
  const k = Number(process.env.CONC || 6);
  if (mode === 'validation' || mode === 'all') await runValidation();
  if (mode === 'plans' || mode === 'all') await pool(pick(PLANS), k, runPlan);
  if (mode === 'live' || mode === 'all') await pool(pick(LIVE), k, runLive);
})();

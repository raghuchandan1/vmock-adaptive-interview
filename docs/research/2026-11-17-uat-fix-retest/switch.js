// Is "why this domain / why switch" asked, and when? Plans across MBA career switchers and non-switch controls, then live
// interviews in the probing style (most follow-ups, so the turn-based time rule bites).
// Usage: PORT=3418 node server.js, then: node switch.js plans|live|all  (writes out/switch-*.json)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const KIT = path.join(ROOT, 'docs/research/2026-11-09-iim-launch-test-kit');
const APP = process.env.APP || 'http://localhost:3418';
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').filter((l) => /^\w+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const OUT = path.join(__dirname, 'out');
const P = require(path.join(KIT, 'profiles'));
const ROHAN = fs.readFileSync(path.join(ROOT, 'samples/resume-rohan-apm.txt'), 'utf8');
const AUTO = fs.readFileSync(path.join(KIT, 'cv_ops.extracted.txt'), 'utf8');

const post = async (p, b) => { const r = await fetch(APP + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); const d = await r.json(); if (!r.ok) throw new Error(`${p}: ${d.error}`); return d; };
const get = async (p) => (await fetch(APP + p)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function trace(id) { for (let i = 0; i < 120; i++) { const t = await get(`/api/sessions/${id}/trace`); if (t.plan || t.plan_error) return t; await sleep(2000); } throw new Error(`no plan for ${id}`); }

// switch: what the student is moving from, as the plan should name it.
const PROFILES = {
  auto_to_fmcg: { resume: AUTO, domain: 'Operations & Supply Chain', target_role: 'Supply Chain Associate, FMCG', stage: 'finals', switch: 'auto plant to FMCG' },
  ca_to_marketing: { resume: P.ca_marketing.resume, domain: 'Sales & Marketing', stage: 'summers', switch: 'CA to marketing' },
  biotech_to_marketing: { resume: P.bsc_lowcgpa_mkt.resume, domain: 'Sales & Marketing', stage: 'summers', switch: 'biotech degree to marketing' },
  civil_to_gm: { resume: P.injection_gm.resume, domain: 'Strategy & General Management', stage: 'summers', switch: 'construction to general management' },
  chem_plant_to_gm: { resume: P.tas_gm.resume, domain: 'Strategy & General Management', stage: 'finals', switch: 'plant engineering to general management' },
  army_to_ops: { resume: P.army_ops.resume, domain: 'Operations & Supply Chain', stage: 'finals', switch: 'Army to corporate operations' },
  pm_to_hr: { resume: ROHAN, domain: 'Human Resources', switch: 'product to HR' },
  pm_to_sales: { resume: ROHAN, domain: 'Sales & Marketing', switch: 'product to sales and marketing' },
  ctl_credit_finance: { resume: P.isb_finance.resume, domain: 'Finance & BFSI', stage: 'laterals', switch: null },
  ctl_hr: { resume: P.hr_ranchi.resume, domain: 'Human Resources', stage: 'finals', switch: null },
  ctl_analytics: { resume: P.analytics_gap.resume, domain: 'IT & Analytics', switch: null },
};
const SHAPES = {
  hm_short: { interview_type: 'hiring_manager', length: 'short' },
  hm_standard: { interview_type: 'hiring_manager', length: 'standard' },
  rs_short: { interview_type: 'recruiter_screen', length: 'short' },
  bdr_short: { interview_type: 'back_your_resume', length: 'short' },
};
const MOVE = /\b(toward|towards|pulling|drawing|draws|drew|moving|move|moved|switch\w*|transition\w*|shift\w*|after (working|years|spending|two|three|four|five)|from .{3,60} (to|into)|what (brings|brought)|why (now|this))\b/i;

const create = (c, shape, style = 'balanced') => post('/api/sessions', { resume_text: c.resume, domain: c.domain || '', target_role: c.target_role || '', stage: c.stage || '', style, ...shape });

async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch((e) => ({ error: e.message })); } })); return out; }

async function runPlans() {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const jobs = Object.keys(PROFILES).flatMap((p) => Object.keys(SHAPES).map((s) => [p, s])).filter(([p, s]) => !only || only.includes(s) || only.includes(p));
  const file = process.env.ONLY ? 'switch-plans-after.json' : 'switch-plans.json';
  const rows = await pool(jobs, 8, async ([p, s]) => {
    const c = PROFILES[p];
    const v = await create(c, SHAPES[s]);
    const t = await trace(v.id);
    const scored = (t.slots || []).filter((x) => !['warmup', 'background', 'candidate_questions'].includes(x.kind));
    const idx = scored.findIndex((x) => ['motivation', 'concerns'].includes(x.kind) && MOVE.test(x.core_question));
    const why = scored.findIndex((x) => x.kind === 'motivation');
    const r = { profile: p, shape: s, id: v.id, switch: c.switch, plan_error: t.plan_error || null,
      concerns: (t.plan?.concerns || []).map((x) => `${x.type}: ${x.description || x.detail || ''}`.slice(0, 120)),
      switch_q: idx >= 0 ? { pos: idx + 1, of: scored.length, kind: scored[idx].kind, q: scored[idx].core_question } : null,
      motivation_q: why >= 0 ? { pos: why + 1, of: scored.length, q: scored[why].core_question } : null,
      background_q: (t.slots.find((x) => x.kind === 'background') || {}).core_question };
    console.log(`${p} ${s} ${r.switch_q ? `switch q at ${r.switch_q.pos}/${r.switch_q.of}` : r.motivation_q ? `why q at ${r.motivation_q.pos}/${r.motivation_q.of}` : 'NONE'}`);
    return r;
  });
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(rows, null, 1));
}

async function student(resume, transcript) {
  const sys = `You are role-playing an Indian MBA student in a live mock placement interview. A talkative student: answers run 150-250 words, give context first and reach their own part late. Stay consistent with the resume below; never invent employers or big numbers. Output only what the student says. When invited to ask questions at the end, ask one, then say you have no more.\n\nRESUME:\n${resume}`;
  const convo = transcript.map((t) => `${t.role === 'interviewer' ? 'INTERVIEWER' : 'YOU'}: ${t.text}`).join('\n');
  for (let i = 0; i < 3; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: 'gpt-5.6-luna', reasoning_effort: 'low', messages: [{ role: 'system', content: sys }, { role: 'user', content: `Conversation so far:\n${convo}\n\nReply to the interviewer's last message now.` }] }) });
    const d = await r.json();
    if (r.ok) return d.choices[0].message.content.trim();
    if (i === 2) throw new Error(`student model: ${JSON.stringify(d.error)}`);
    await sleep(2000);
  }
}

const LIVE = process.env.LIVE ? process.env.LIVE.split(';').map((x) => x.split(':')) : [['chem_plant_to_gm', 'hm_short'], ['auto_to_fmcg', 'hm_standard'], ['ca_to_marketing', 'hm_standard'], ['civil_to_gm', 'rs_short'], ['pm_to_hr', 'bdr_short'], ['ctl_credit_finance', 'hm_standard']];
async function runLive() {
  const rows = await pool(LIVE, 6, async ([p, s]) => {
    const c = PROFILES[p];
    let v = await create(c, SHAPES[s], 'probing');
    await trace(v.id);
    for (let t = 0; t < 45 && v.status !== 'ended'; t++) v = await post(`/api/sessions/${v.id}/answers`, { answer: await student(c.resume, v.transcript) });
    const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'sessions', `${v.id}.json`), 'utf8'));
    const ai = S.transcript.map((e, i) => ({ ...e, i })).filter((e) => e.role === 'interviewer');
    const motSlots = S.slots.filter((x) => ['motivation', 'concerns'].includes(x.kind));
    const asked = ai.find((e) => motSlots.some((m) => m.id === e.slot_id));
    const r = { profile: p, shape: s, id: v.id, status: S.status,
      slots: S.slots.map((x) => `${x.kind}:${x.status}`).join(' '),
      dropped: S.turns.flatMap((t) => t.guards || []).filter((g) => /Time rule: dropped/.test(g)),
      asked: asked ? { interviewer_turn: ai.indexOf(asked) + 1, of: ai.length, text: asked.text } : null,
      follow_ups: asked ? ai.filter((e) => e.slot_id === asked.slot_id).slice(1).map((e) => e.text) : [] };
    console.log(`live ${p} ${s} ${v.id}: ${r.asked ? `asked at interviewer turn ${r.asked.interviewer_turn}/${r.asked.of}` : 'NOT ASKED'}${r.dropped.length ? ` | ${r.dropped.join(' | ')}` : ''}`);
    return r;
  });
  fs.writeFileSync(path.join(OUT, process.env.LIVE ? 'switch-live-after.json' : 'switch-live.json'), JSON.stringify(rows, null, 1));
}

(async () => {
  const mode = process.argv[2] || 'all';
  if (mode === 'plans' || mode === 'all') await runPlans();
  if (mode === 'live' || mode === 'all') await runLive();
})().catch((e) => { console.error(e); process.exit(1); });

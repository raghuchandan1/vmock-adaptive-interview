// Stress round: load, limits, long sessions, races and upstream failure. node stress.js
// APP is the normal server; BAD is a second server whose OPENAI_BASE_URL points nowhere (for the failure test).
const fs = require('fs');
const path = require('path');
const APP = process.env.APP || 'http://localhost:3418';
const BAD = process.env.BAD || 'http://localhost:3419';
const REPO = process.env.REPO || path.join(__dirname, '../../..');
const { CV, JD } = require('./iimb');
const base = { resume_text: CV, jd_text: JD, domain: 'Strategy and Consulting', target_role: '', style: 'balanced', length: 'short', stage: 'finals', interview_type: 'hiring_manager' };
const ANSWERS = [
  'I mostly spend my week on classes and case practice, and I play badminton on weekends.',
  'I did electrical engineering at VIT, worked two years at Cognizant on application support for British Telecom, then joined IIM Bangalore and interned at PwC in digital strategy.',
  'The hospital discharge took about four hours. I mapped the flow with eight stakeholder groups, found five steps to automate, and the pilot ward came down to two and a half hours, about forty percent.',
  'I personally ran the stakeholder interviews and built the as-is map; my manager handled the client leads.',
  'We compared the same ward over the month before the pilot with three weeks after go-live, using the hospital timestamps.',
  'Looking back I would involve the nurses earlier and agree the measurement with IT on day one.',
  'At Cognizant I mentored three teams on four automation tools and cut repetitive toil by about thirty percent.',
  'I measured toil by logging recurring manual tasks and time spent before and after the tools for six weeks.',
  'I would start with the input sheet: volumes, adoption and minutes saved, then build payback with a sensitivity on adoption.',
  'I want consulting because I like working on why systems are built, and the PwC internship confirmed that.',
  'What does a typical first project look like for an intern on this team?',
  'No more questions, thank you.',
];
const out = { results: [] };
const add = (id, ok, note) => { out.results.push({ id, ok: !!ok, note }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} :: ${String(note).slice(0, 300)}`); };
async function req(method, url, body) {
  const t0 = Date.now();
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let d; try { d = JSON.parse(text); } catch (_) { d = { raw: text.slice(0, 200) }; }
  return { status: r.status, body: d, ms: Date.now() - t0 };
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

async function interview(inputs, maxTurns = 40, lat) {
  const c = await req('POST', `${APP}/api/sessions`, { ...base, ...inputs });
  if (c.status !== 200) return { error: `create ${c.status} ${c.body.error}`, planMs: c.ms };
  const id = c.body.id; let v = c.body; let i = 0; const errors = [];
  while (v.status !== 'ended' && i < maxTurns) {
    const r = await req('POST', `${APP}/api/sessions/${id}/answers`, { answer: ANSWERS[Math.min(i, ANSWERS.length - 1)] });
    if (r.status !== 200) { errors.push(`${r.status} ${r.body.error}`); if (errors.length > 3) break; continue; }
    lat && lat.push(r.ms); v = r.body; i++;
  }
  return { id, planMs: c.ms, turns: i, status: v.status, errors };
}

(async () => {
  // 1. Load: 12 interviews at once.
  const lat = []; const t0 = Date.now();
  const runs = await Promise.all(Array.from({ length: 12 }, () => interview({}, 30, lat)));
  const done = runs.filter((r) => r.status === 'ended').length;
  const plans = runs.map((r) => r.planMs);
  add('S-load 12 concurrent interviews complete', done === 12 && runs.every((r) => !r.errors?.length), `${done}/12 ended in ${Math.round((Date.now() - t0) / 1000)}s; errors ${runs.flatMap((r) => r.errors || [r.error]).filter(Boolean).join(' | ') || 'none'}`);
  add('S-load latency', true, `plan p50 ${pct(plans, 0.5)}ms p95 ${pct(plans, 0.95)}ms; answer p50 ${pct(lat, 0.5)}ms p95 ${pct(lat, 0.95)}ms max ${Math.max(...lat)}ms over ${lat.length} answers`);
  const fbs = await Promise.all(runs.filter((r) => r.id).map((r) => req('POST', `${APP}/api/sessions/${r.id}/feedback`)));
  add('S-load 12 feedback calls at once', fbs.every((f) => f.status === 200 && f.body.version), `statuses ${fbs.map((f) => f.status).join(',')}; p95 ${pct(fbs.map((f) => f.ms), 0.95)}ms`);

  // 2. Limits.
  const bigCV = (CV + '\n' + Array.from({ length: 400 }, (_, i) => `- Project ${i + 1}: improved a reporting process for client team ${i % 9}, saving about ${i % 7 + 2} hours a week`).join('\n')).slice(0, 29990);
  const bigJD = (JD + '\n' + Array.from({ length: 400 }, (_, i) => `- Responsibility ${i + 1}: support client workstream ${i % 11} with analysis and stakeholder updates`).join('\n')).slice(0, 29990);
  const big = await req('POST', `${APP}/api/sessions`, { ...base, resume_text: bigCV, jd_text: bigJD });
  add('S-limit 30k resume + 30k JD plan', big.status === 200, `${big.status} in ${big.ms}ms ${big.body.error || ''}`);
  if (big.status === 200) {
    const longAns = ('I worked on the discharge redesign and mapped every handoff with the stakeholders. ').repeat(240).slice(0, 19990);
    const a1 = await req('POST', `${APP}/api/sessions/${big.body.id}/answers`, { answer: longAns });
    add('S-limit 20k-character answer accepted', a1.status === 200, `${a1.status} in ${a1.ms}ms ${a1.body.error || ''}`);
    const a2 = await req('POST', `${APP}/api/sessions/${big.body.id}/answers`, { answer: 'x'.repeat(20001) });
    add('S-limit 20,001-character answer refused 400', a2.status === 400, `${a2.status} ${a2.body.error || ''}`);
  }
  const huge = await req('POST', `${APP}/api/sessions`, { ...base, resume_text: 'y'.repeat(2_100_000) }).catch((e) => ({ status: 'reset', body: { error: e.message } }));
  add('S-limit 2.1 MB body refused', huge.status === 413 || huge.status === 'reset', `${huge.status} ${huge.body.error || ''}`);

  // 3. Full-length probing interview.
  const full = await interview({ length: 'full', style: 'probing' }, 45);
  const fullTrace = full.id ? (await req('GET', `${APP}/api/sessions/${full.id}/trace`)).body : null;
  add('S-long 30-minute probing interview ends within its turn cap', full.status === 'ended' && fullTrace && fullTrace.interviewer_turns <= fullTrace.max_turns, `${full.turns} answers, ${fullTrace?.interviewer_turns}/${fullTrace?.max_turns} interviewer turns, ${full.errors?.join(' | ') || 'no errors'}`);
  if (full.id) { const f = await req('POST', `${APP}/api/sessions/${full.id}/feedback`); add('S-long feedback for 6 topics', f.status === 200 && (f.body.topics || []).length >= 5, `${f.status} topics ${(f.body.topics || []).length} in ${f.ms}ms`); }

  // 4. Races: 5 answers at once, 4 rounds, on one session.
  const race = await req('POST', `${APP}/api/sessions`, { ...base });
  const counts = [];
  for (let round = 0; round < 4; round++) {
    const rs = await Promise.all(Array.from({ length: 5 }, (_, k) => req('POST', `${APP}/api/sessions/${race.body.id}/answers`, { answer: `${ANSWERS[round]} (copy ${k})` })));
    counts.push(rs.map((r) => r.status).sort().join(','));
  }
  const rt = (await req('GET', `${APP}/api/sessions/${race.body.id}/trace`)).body;
  const alternates = rt.transcript.every((t, i) => i === 0 || t.role !== rt.transcript[i - 1].role);
  add('S-race one answer accepted per round, the rest 409', counts.every((c) => c === '200,409,409,409,409'), counts.join(' | '));
  add('S-race transcript stays consistent', alternates && rt.turns.length === 4, `${rt.turns.length} turns, alternating=${alternates}`);
  // Feedback twice at once.
  await req('POST', `${APP}/api/sessions/${race.body.id}/end`);
  const fb2 = await Promise.all([req('POST', `${APP}/api/sessions/${race.body.id}/feedback`), req('POST', `${APP}/api/sessions/${race.body.id}/feedback`)]);
  add('S-race two feedback requests at once: one writes, one gets 409', fb2.map((r) => r.status).sort().join() === '200,409', fb2.map((r) => r.status).join(','));

  // 5. Upstream failure (the model API is unreachable).
  const down = await req('POST', `${BAD}/api/sessions`, { ...base }).catch((e) => ({ status: 'no server', body: { error: e.message } }));
  const msg = JSON.stringify(down.body);
  add('S-fail model API down: clean error, no key or stack', down.status >= 500 && down.status < 600 && !/sk-[A-Za-z0-9]|at \w+ \(|node:internal|\/Users\//.test(msg), `${down.status} ${msg.slice(0, 200)}`);

  // 6. Many sessions.
  const list = await req('GET', `${APP}/api/sessions`);
  add('S-list sessions list stays fast', list.status === 200 && list.ms < 3000, `${(list.body.length ?? list.body.sessions?.length)} sessions in ${list.ms}ms`);

  fs.writeFileSync(path.join(__dirname, 'r2', 'stress.json'), JSON.stringify(out, null, 2));
})();

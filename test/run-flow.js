// Drives a full interview through the real server (pointed at the mock OpenAI) and checks the engine's rules.
const fs = require('fs');
const path = require('path');
const { plannerSchema, turnSchema, feedbackSchema } = require('../lib/schemas');

const BASE = process.env.APP || 'http://localhost:3999';
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

function strictOk(schema, where = 'root') {
  if (schema.type === 'object') {
    const keys = Object.keys(schema.properties || {});
    if (schema.additionalProperties !== false) return `${where}: additionalProperties must be false`;
    if (JSON.stringify([...schema.required].sort()) !== JSON.stringify([...keys].sort())) return `${where}: required must list every property`;
    for (const k of keys) { const e = strictOk(schema.properties[k], `${where}.${k}`); if (e) return e; }
  }
  if (schema.type === 'array') return strictOk(schema.items, `${where}[]`);
  return null;
}

async function post(p, body) {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
const get = async (p) => (await fetch(BASE + p)).json();

(async () => {
  check(strictOk(plannerSchema) === null, `planner schema is strict-mode valid ${strictOk(plannerSchema) || ''}`);
  check(strictOk(turnSchema) === null, `turn schema is strict-mode valid ${strictOk(turnSchema) || ''}`);
  check(strictOk(feedbackSchema) === null, `feedback schema is strict-mode valid ${strictOk(feedbackSchema) || ''}`);

  const samples = path.join(__dirname, '..', 'samples');
  const resume = fs.readFileSync(path.join(samples, 'resume-rohan-apm.txt'), 'utf8');
  const jd = fs.readFileSync(path.join(samples, 'jd-brightpath-product-manager.txt'), 'utf8');

  // Validation errors
  try { await post('/api/sessions', { resume_text: 'short', interview_type: 'hiring_manager', style: 'balanced', length: 'standard' }); check(false, 'rejects short resume'); }
  catch (e) { check(/200\+ characters/.test(e.message), 'rejects short resume with a clear message'); }

  const view = await post('/api/sessions', { resume_text: resume, jd_text: jd, target_role: '', interview_type: 'hiring_manager', style: 'balanced', length: 'standard', settings: { planner_model: 'gpt-5-noeffort', planner_effort: 'medium', turn_model: 'gpt-5-mini', turn_effort: 'low' } });
  const id = view.id;
  check(view.pre_brief.topics === 4, `pre-brief shows 4 topics (got ${view.pre_brief.topics})`);
  check(view.transcript.length === 1 && /^Hi Rohan, thanks/.test(view.transcript[0].text), 'opening greets the candidate by name');
  check(!('slots' in view) && !('plan' in view), 'public view does not leak the plan');

  let trace = await get(`/api/sessions/${id}/trace`);
  check(trace.plan_trace.note && /reasoning_effort/.test(trace.plan_trace.note), 'retries without reasoning_effort when a model rejects it');
  check(trace.plan_checks.some((c) => /c4 is not an exact quote/.test(c.message)), 'flags a claim that is not quoted from the resume');

  // Warm-up -> background
  await post(`/api/sessions/${id}/answers`, { answer: 'I have been working on our checkout experiments.' });
  trace = await get(`/api/sessions/${id}/trace`);
  check(trace.slots[trace.current].id === 'background', 'warm-up moves straight to the background question');
  check(trace.turns[0].allowed_decisions.join() === 'move_on', 'warm-up only allows move_on');
  const turnInterview = trace.turns[0].calls[0].payload.interview;
  const tech = trace.slots.find((s) => s.id === 's2');
  const nonTech = trace.slots.find((s) => s.id === 's1');
  check(tech.technical_focus && tech.budget === 3 && nonTech.budget === 2, `technical topics get one extra follow-up in a balanced hiring manager interview (s2 ${tech.budget}, s1 ${nonTech.budget})`);
  check(/Brightpath/.test(turnInterview.job_description || '') && /ROHAN MEHTA/.test(turnInterview.resume_text || ''), 'turn model receives the job description and resume text');

  // Background: probe (budget 1) then forced move on
  await post(`/api/sessions/${id}/answers`, { answer: 'I started in logistics analytics then moved to product.' });
  await post(`/api/sessions/${id}/answers`, { answer: 'More detail about my path.' });
  trace = await get(`/api/sessions/${id}/trace`);
  check(trace.slots[trace.current].id === 's1', 'background ends after its single follow-up and moves to the first claim');
  const bgTurn = trace.turns[2];
  check(!bgTurn.allowed_decisions.includes('probe'), 'probe no longer allowed once background budget is used');
  check(!trace.turns[1].allowed_decisions.includes('rephrase'), 'background is never rephrased');

  // s1 claim: budget 2 probes then move on
  await post(`/api/sessions/${id}/answers`, { answer: 'We launched referrals.' });
  await post(`/api/sessions/${id}/answers`, { answer: 'We saw growth.' });
  trace = await get(`/api/sessions/${id}/trace`);
  const s1Turns = trace.turns.filter((t) => t.slot_id === 's1');
  check(!s1Turns[0].allowed_decisions.includes('move_on') && s1Turns[0].decision === 'probe' && s1Turns[0].output.probe_rung === 'role', 'a claim flagged as inflated cannot close before the candidate\'s own role is asked about');
  check(new Set(s1Turns.filter((t) => t.decision === 'probe').map((t) => t.output.probe_rung)).size === s1Turns.filter((t) => t.decision === 'probe').length, 'follow-ups in one topic never repeat the same rung');
  check(trace.turns.slice(3).every((t) => !t.allowed_decisions.includes('end_session')), 'the interview cannot end for off-purpose input before the candidate has been redirected once');
  check(trace.slots.find((s) => s.id === 's1').follow_ups_used === 2, 'claim topic used exactly its budget of 2 follow-ups');
  const praiseTurn = trace.turns[trace.turns.length - 1];
  check(praiseTurn.guards.some((g) => /Rewrote the message once/.test(g)) && !praiseTurn.leak_flags.some((f) => /evaluative/.test(f)), 'rewrites a message with praise once, and the final message is clean');
  await post(`/api/sessions/${id}/answers`, { answer: 'Still vague.' });
  trace = await get(`/api/sessions/${id}/trace`);
  const s1 = trace.slots.find((s) => s.id === 's1');
  check(s1.status === 'done' && s1.outcome === 'gap_after_budget', `topic closes as "gap after budget" when evidence is still missing (got ${s1.outcome})`);
  check(s1.forced_move_on === true, 'a move-on forced by the follow-up budget is marked as forced');
  check(trace.slots.some((s) => s.kind === 'second_chance' && s.competency_id === 'k1'), 'adds a second-chance topic for the must-have competency');
  check(trace.slots[trace.current].id === 's2', 'moves on to the next planned topic');

  // s2 is a number-bearing tested claim: it cannot close or pivot before the measurement question is asked
  const s2Open = await get(`/api/sessions/${id}/trace`);
  await post(`/api/sessions/${id}/answers`, { answer: 'We found it in a report.' });
  trace = await get(`/api/sessions/${id}/trace`);
  const s2First = trace.turns[trace.turns.length - 1];
  check(s2First.slot_id === 's2' && s2First.decision === 'probe' && s2First.output.probe_rung === 'result' && !s2First.allowed_decisions.includes('move_on') && !s2First.allowed_decisions.includes('pivot'), 'a tested claim with a number cannot close or pivot before its measurement is asked about');

  // Pivot
  await post(`/api/sessions/${id}/answers`, { answer: '[pivot] I had to convince the sales team.' });
  trace = await get(`/api/sessions/${id}/trace`);
  const pivTurn = trace.turns[trace.turns.length - 1];
  check(trace.turns.find((t) => t.slot_id === 's2').calls[0].payload.current_slot.technical_focus === true, 'turn model sees the technical focus of the topic');
  check(pivTurn.decision === 'pivot' && trace.slots[trace.current].pivoted_into && trace.slots[trace.current].id === 's4', `pivot skips ahead to a later topic and marks it (now on ${trace.slots[trace.current].id})`);

  // Invalid output guard
  await post(`/api/sessions/${id}/answers`, { answer: '[illegal] test' });
  trace = await get(`/api/sessions/${id}/trace`);
  const lastTurn = trace.turns[trace.turns.length - 1];
  check(lastTurn.guards.some((g) => /Rejected first output/.test(g)) && lastTurn.calls.length === 2, 'rejects an invalid pivot target and asks the model again');

  // Run to the end
  let guard = 0;
  let v;
  while (guard++ < 30) {
    trace = await get(`/api/sessions/${id}/trace`);
    if (trace.status !== 'active') break;
    const slot = trace.slots[trace.current];
    const answer = slot.kind === 'candidate_questions' ? (trace.candidate_questions_asked >= 1 ? 'no questions' : 'How does the team work?') : '[done] Specific answer.';
    v = await post(`/api/sessions/${id}/answers`, { answer });
  }
  trace = await get(`/api/sessions/${id}/trace`);
  check(trace.status === 'ended' && trace.ended_by === 'close', 'interview ends with a close');
  check(trace.slots.filter((s) => s.kind === 'second_chance').length <= 2, `second chances are capped at 2 for a standard interview (got ${trace.slots.filter((s) => s.kind === 'second_chance').length})`);
  check(trace.interviewer_turns <= trace.max_turns + 1, `stays within the turn limit (${trace.interviewer_turns} of ${trace.max_turns})`);
  check(trace.transcript.every((e) => e.role !== 'interviewer' || e.slot_id), 'every interviewer message is tagged with its topic');

  // Student feedback: guard fixes bad model output, retries once, and the result is cached
  const fb = await post(`/api/sessions/${id}/feedback`, {});
  const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();
  const answersText = norm(trace.transcript.filter((e) => e.role === 'candidate').map((e) => e.text).join(' '));
  const fbText = JSON.stringify([fb.overall, fb.topics.map((t) => [t.what_worked, t.what_was_missing, t.try_instead])]);
  check(fb.topics.length === 2 && fb.topics.every((t) => t.slot_id !== 'warmup'), 'feedback drops topics that are not scored slots');
  check(fb.topics.every((t) => t.quotes.length === 1 && answersText.includes(norm(t.quotes[0]))), 'feedback keeps only verbatim quotes');
  check(!/\d+\s*\/\s*\d+|\bscore|\bband/i.test(fbText), 'feedback has no scores or bands after the retry');
  check(fb.priorities.length === 3, 'feedback priorities capped at 3');
  const fb2 = await post(`/api/sessions/${id}/feedback`, {});
  const saved = await get(`/api/sessions/${id}/trace`);
  check(fb2.generated_at === fb.generated_at && saved.feedback_trace.length === 2, 'feedback is generated once with one retry, then cached');

  // Rollback on model failure: a session whose turn call errors keeps the transcript unchanged
  const v2 = await post('/api/sessions', { resume_text: resume, jd_text: '', target_role: 'Product Manager', interview_type: 'back_your_resume', style: 'surprise', length: 'short', settings: { turn_model: 'gpt-4.1', turn_effort: 'low' } });
  check(v2.pre_brief.style === null && v2.pre_brief.surprise, 'Surprise me hides the style in the pre-brief');
  const t2 = await get(`/api/sessions/${v2.id}/trace`);
  check(['supportive', 'balanced', 'probing'].includes(t2.style), `Surprise me resolves to a real style (${t2.style})`);
  check(t2.slots.filter((s) => ['claim', 'gap', 'motivation', 'concerns'].includes(s.kind)).length === 3, 'short length trims the plan to 3 topics');
  const claimBudget = t2.slots.find((s) => s.kind === 'claim').budget;
  check(claimBudget === Math.min(3, { supportive: 1, balanced: 2, probing: 3 }[t2.style] + 1), `Back your resume adds one follow-up to claim topics (budget ${claimBudget})`);

  // A second "not sure" in the same topic removes follow-ups so the interviewer moves on
  let t3 = t2;
  for (let i = 0; i < 6 && t3.slots[t3.current].kind !== 'claim'; i++) {
    await post(`/api/sessions/${v2.id}/answers`, { answer: '[done] Specific answer.' });
    t3 = await get(`/api/sessions/${v2.id}/trace`);
  }
  const claimId = t3.slots[t3.current].id;
  await post(`/api/sessions/${v2.id}/answers`, { answer: 'Not sure' });
  await post(`/api/sessions/${v2.id}/answers`, { answer: "I'm not sure about it" });
  t3 = await get(`/api/sessions/${v2.id}/trace`);
  const [firstNs, secondNs] = t3.turns.slice(-2);
  check(firstNs.slot_id === claimId && firstNs.allowed_decisions.includes('probe'), 'first "not sure" still allows one follow-up');
  check(secondNs.slot_id === claimId && !secondNs.allowed_decisions.some((d) => ['probe', 'clarify', 'rephrase'].includes(d)), 'second "not sure" in a topic removes follow-ups');
  check(t3.slots[t3.current].id !== claimId, 'interview moves on after the second "not sure"');

  // Time rule: second chances go first, then non-must-haves, before any must-have topic
  const { applyTimeRule } = require('../lib/engine');
  const slot = (id, kind, mustHave, priority) => ({ id, kind, must_have: mustHave, priority, budget: 3, follow_ups_used: 0, status: 'pending' });
  const tr = { current: 0, interviewer_turns: 0, max_turns: 0, events: [],
    slots: [{ ...slot('now', 'claim', true, 1), status: 'active' }, slot('mh', 'gap', true, 4), slot('mot', 'motivation', false, 1), slot('sc', 'second_chance', true, 0)] };
  for (const turns of [9, 6, 3]) { tr.max_turns = turns; applyTimeRule(tr, []); }
  const dropped = tr.events.map((e) => e.slot_id).join();
  check(dropped === 'sc,mot,mh', `time rule drops second chance, then non-must-have, then must-have (got ${dropped})`);

  // A stay-decision whose message asks the next topic's question is rejected and re-requested
  await post(`/api/sessions/${v2.id}/answers`, { answer: '[leaknext] vague answer' });
  t3 = await get(`/api/sessions/${v2.id}/trace`);
  const lk = t3.turns[t3.turns.length - 1];
  check(lk.guards.some((g) => /Rejected first output.*next topic/.test(g)) && lk.calls.length >= 2, 'rejects a probe whose message asks the next topic\'s question');

  // Two answers at once for one interview: one is processed, the other gets a clear 409
  const both = await Promise.allSettled([1, 2].map(() => post(`/api/sessions/${v2.id}/answers`, { answer: '[done] Specific answer.' })));
  const refused = both.filter((r) => r.status === 'rejected');
  check(both.filter((r) => r.status === 'fulfilled').length === 1 && refused.length === 1 && /still being processed/.test(refused[0].reason.message), 'concurrent answers: one is processed, the other is refused as in progress');

  check(await post(`/api/sessions/${v2.id}/feedback`, {}).then(() => false, (e) => /Finish the interview/.test(e.message)), 'no feedback before the interview ends');

  const { leakCheck } = require('../lib/engine');
  check(['Those are thoughtful questions.', 'Thanks, that clarifies the workflow.', 'That connects clearly to your teaching background.'].every((t) => leakCheck(t).length > 0) && leakCheck('Which decisions in that were yours?').length === 0, 'flags evaluative acknowledgements without flagging a plain question');

  // Time rule squeezes budgets before dropping a must-have
  const sq = { current: 0, interviewer_turns: 0, max_turns: 8, events: [],
    slots: [{ ...slot('now', 'claim', true, 1), status: 'active' }, slot('mh1', 'claim', true, 2), slot('mh2', 'gap', true, 3)] };
  const sqGuards = [];
  applyTimeRule(sq, sqGuards);
  check(sq.events.length === 0 && sq.slots.slice(1).every((x) => x.budget === 1) && sqGuards.some((g) => /one follow-up each/.test(g)), 'time rule limits follow-ups on must-have topics before dropping any');

  // Repeated stock openers are varied
  const { varyOpener } = require('../lib/engine');
  const vs = { transcript: [{ role: 'interviewer', text: 'Thanks, Rohan. What did you decide?' }] };
  check(varyOpener(vs, 'Thanks, Rohan. Which part was yours?') === 'Which part was yours?', 'drops a repeated "Thanks, Name." opener');
  check(varyOpener({ transcript: [{ role: 'interviewer', text: 'Walk me through it.' }] }, 'Thanks. Which part was yours?') === 'Thanks. Which part was yours?', 'keeps an opener that is not a repeat');
  check(varyOpener({ transcript: [{ role: 'interviewer', text: 'Understood. Why?' }] }, 'Thanks, Rohan. Which part?') === 'Thanks, Rohan. Which part?', 'keeps a different opener word');

  const list = await get('/api/sessions');
  check(list.length >= 2, 'past sessions are listed');

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

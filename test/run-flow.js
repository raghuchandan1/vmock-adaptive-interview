// Drives a full interview through the real server (pointed at the mock OpenAI) and checks the engine's rules.
const fs = require('fs');
const path = require('path');
const { plannerSchema, turnSchema, feedbackSchema, turnSchemaFor, feedbackSchemaFor, groundingSchema } = require('../lib/schemas');

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
  // Per-call schemas: only the decisions allowed this turn, offered pivots, reached topics and known rubric dimensions
  const tS = turnSchemaFor(['probe', 'move_on'], ['s3']);
  const fS = feedbackSchemaFor(['s1', 's2'], ['situation', 'followup']);
  check([tS, fS, turnSchemaFor(['move_on'], []), groundingSchema].every((x) => strictOk(x) === null)
    && JSON.stringify(tS.properties.decision.enum) === '["probe","move_on"]' && tS.properties.pivot_target_slot_id.enum.includes(null)
    && turnSchemaFor(['move_on'], []).properties.pivot_target_slot_id.type === 'null'
    && JSON.stringify(fS.properties.topics.items.properties.slot_id.enum) === '["s1","s2"]'
    && fS.properties.moments.items.properties.slot_id.enum.includes('background') && fS.properties.more_priorities.maxItems === 2 && fS.properties.next_goal.required.includes('then'),
  'per-call schemas are strict-valid and limit decisions, pivots, topics and dimensions to this call');
  const { RUBRICS } = require('../lib/engine');
  const dims = feedbackSchema.properties.topics.items.properties.ratings.items.properties.dimension.enum;
  check([...Object.values(RUBRICS).flat().map(([k]) => k), 'technical', 'followup'].every((k) => dims.includes(k)), 'the default feedback schema knows every rubric dimension');

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
  await post(`/api/sessions/${id}/answers`, { answer: '[thin] Still vague.' });
  trace = await get(`/api/sessions/${id}/trace`);
  const s1 = trace.slots.find((s) => s.id === 's1');
  check(s1.status === 'done' && s1.outcome === 'gap_after_budget', `topic closes as "gap after budget" when evidence is still missing (got ${s1.outcome})`);
  check(trace.turns.filter((t) => t.slot_id === 's1').pop().guards.some((g) => /Overrode "sufficient"/.test(g)) && s1.outcome === 'gap_after_budget', 'a thin answer that the rules forced past is not recorded as sufficient');
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
    const answer = slot.kind === 'candidate_questions' ? (trace.candidate_questions_asked >= 1 ? 'no questions' : 'How does the team work?') : '[done] I led the rollout, wrote the spec, aligned sales and engineering on scope, and tracked weekly signups before and after the launch.';
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
  const fbText = JSON.stringify([fb.overall, fb.topics.map((t) => [t.went_well, t.to_fix, t.answer_plan, (t.ratings || []).map((r) => r.reason), t.stronger_version]), fb.moments]);
  const rated = fb.topics.filter((t) => !t.too_short);
  const { rubricFor, rubricKey } = require('../lib/engine');
  check(fb.version === 9 && rated.length >= 1 && fb.topics.every((t) => t.slot_id !== 'warmup'), 'feedback drops topics that are not scored slots');
  check(rated.every((t) => t.ratings.length && t.ratings.every((r) => ['good_job', 'on_track', 'needs_work'].includes(r.level))), 'ratings use only the three levels (invalid level dropped)');
  check(rated.every((t) => { const s = trace.slots.find((x) => x.id === t.slot_id); return t.ratings.every((r) => rubricFor(s).some(([k]) => k === r.dimension)); }), 'ratings follow the rubric for the question type');
  check(rated.every((t) => ['good_job', 'on_track', 'needs_work'].includes(t.verdict) && t.question && t.answer_plan.length === 3), 'each topic has a verdict, the question asked and an answer plan');
  check(rated.every((t) => answersText.includes(norm(t.to_fix_quote)) && (!t.went_well_quote || answersText.includes(norm(t.went_well_quote)))), 'feedback keeps only verbatim quotes (invented quote dropped on retry)');
  check(fb.topics.every((t) => (['situational', 'knowledge'].includes(t.rubric) ? true : t.example_answer === '')), 'example answers only on scenario and technical questions');
  check(!/\d+\s*\/\s*\d+|\bscore|\bband/i.test(fbText), 'feedback has no scores or bands after the retry');
  check(fb.priorities.length === 3 && fb.priorities.every((p) => p.title && p.action), 'feedback priorities are title/why/action, capped at 3');
  check(rated[0].resume_mismatch && /resume line/.test(rated[0].resume_mismatch.note) && rated[0].to_fix && !fb.moments.some((m) => ['warmup', 'nope', rated[0].slot_id].includes(m.slot_id)), 'a resume mismatch sits on its topic next to a different "what to fix"; moments are background only');
  check(/^When you are asked about a project, say what you did yourself in your first sentence\.$/.test(fb.priorities[0].action) && fb.priorities.length === 3, 'the goal is assembled as "When …, …." from when/then, and priorities stay capped at 3');
  check(trace.slots.length && Array.isArray(require('../lib/engine').buildFeedbackPayload(trace).topics[0].interviewer_noted_off_resume_line), 'feedback input carries the interviewer\'s off-resume-line answers per topic');
  check(fb.moments.some((m) => m.slot_id === 'background' && m.quote === '' && m.note) && !fb.moments.some((m) => m.note === 'Model-written closing note.'), 'moments: invented quote dropped, model may not write the closing-questions moment');
  check(rated.some((t) => trace.slots.find((x) => x.id === t.slot_id).follow_ups_used > 0 ? t.ratings.some((r) => r.dimension === 'followup') : true), 'probed topics get a follow-up handling dimension');
  // Where each element appeared, its quote, the follow-ups, the recording segment and the JD line.
  const { followUpsFor, rungDimension, jdLine } = require('../lib/engine');
  const allRatings = rated.flatMap((t) => t.ratings.map((r) => ({ ...r, t })));
  check(allRatings.every((r) => r.found === null || ['first_answer', 'after_follow_up', 'not_given'].includes(r.found))
    && allRatings.every((r) => r.dimension !== 'followup' || r.found === null)
    && allRatings.every((r) => r.found !== 'after_follow_up' || r.t.follow_ups.length > 0), 'each element says where it appeared (invalid value dropped; "after a follow-up" only when there was one)');
  const firstAnswerOf = (slotId) => norm((trace.transcript.find((e) => e.role === 'candidate' && e.slot_id === slotId) || {}).text || '');
  check(allRatings.every((r) => !r.quote || norm(firstAnswerOf(r.t.slot_id) + ' ' + trace.transcript.filter((e) => e.role === 'candidate' && e.slot_id === r.t.slot_id).map((e) => e.text).join(' ')).includes(norm(r.quote)))
    && allRatings.every((r) => r.found !== 'not_given' || r.quote === '')
    && allRatings.filter((r) => r.found === 'after_follow_up').every((r) => r.quote === ''), 'element quotes are verbatim from the topic; a first-answer quote is dropped for an element given only after a follow-up');
  check(fb.topics.every((t) => Array.isArray(t.follow_ups) && t.follow_ups.length === followUpsFor(trace, t.slot_id).length && t.follow_ups.length === trace.slots.find((s) => s.id === t.slot_id).follow_ups_used)
    && fb.topics.some((t) => t.follow_ups.length > 0), 'each topic lists the interviewer\'s follow-ups, one per follow-up asked');
  check(fb.topics.flatMap((t) => t.follow_ups.map((f) => ({ f, s: trace.slots.find((x) => x.id === t.slot_id) }))).every(({ f, s }) => f.question && f.at && (f.asked_for === null || rubricFor(s).some(([k]) => k === f.asked_for)) && (f.given === null || typeof f.given === 'boolean'))
    && fb.topics.flatMap((t) => t.follow_ups).some((f) => f.asked_for && f.asked_for_label), 'each follow-up names the rubric element it asked for, and whether it was given');
  check(fb.topics.every((t) => t.segment && t.segment.start && t.segment.end && t.segment.start <= t.segment.end), 'each topic has its place in the recording');
  const claimSlot = trace.slots.find((s) => s.id === 's1');
  check(rungDimension(claimSlot, 'result') === 'result' && rungDimension(claimSlot, 'setback') === null && rungDimension({ ...claimSlot, technical_focus: true, kind: 'gap', question_type: 'past_behaviour' }, 'technical') === 'depth', 'a follow-up rung maps to an element of the topic\'s own rubric');
  check(jdLine(trace, { anchor_text: null, competency_id: 'k2' }) === 'Stakeholder management' && jdLine(trace, { anchor_text: 'A resume line', competency_id: 'k2' }) === null && jdLine(trace, { anchor_text: null, competency_id: 'k3' }) === null
    && fb.topics.every((t) => (t.resume_line ? t.jd_line === null : true)), 'a topic from the job description carries its requirement; resume topics carry their resume line instead');
  const { checkAndShapeFeedback, topicVerdict } = require('../lib/engine');
  const { severalActions } = require('../lib/engine');
  const dup = checkAndShapeFeedback({ overall: 'ok', moments: [], more_priorities: [], next_goal: { title: 'Goal', why: 'w', when: 'you are asked about a project', then: 'say your role, two actions, and the result' },
    topics: [{ slot_id: rated[0].slot_id, ratings: [], went_well: '', went_well_quote: '', answer_plan: [], stronger_version: 'I [x].', example_answer: '',
      resume_mismatch: { quote: rated[0].to_fix_quote, note: 'The resume says X; the answer said Y.', tip: 'Tell that story.' }, to_fix_quote: rated[0].to_fix_quote, to_fix: 'Same moment again.' }] }, trace);
  const dupTopic = dup.feedback.topics.find((t) => t.slot_id === rated[0].slot_id);
  check(dupTopic.resume_mismatch && dupTopic.to_fix === '' && dupTopic.to_fix_quote === '' && dupTopic.stronger_version === '', 'a "what to fix" that repeats the resume mismatch is dropped');
  check(dup.problems.some((p) => /next_goal\.then must be ONE action/.test(p)) && severalActions('say your role, two actions, and the result') && !severalActions('say what you did yourself in your first sentence') && severalActions('define the outcome and state how you would compare the old and new') && !severalActions('name the SQL and Python steps you took yourself'), 'a goal with several actions is sent back for a rewrite');
  const { ownershipCounts } = require('../lib/engine');
  const oc = ownershipCounts("We launched it, I wrote the spec and my manager and I reviewed our numbers.");
  check(oc.i === 3 && oc.we === 2 && fb.ownership.i === fb.topics.reduce((n, t) => n + t.ownership.i, 0), 'counts "I" versus "we" per topic and overall');
  check(topicVerdict([{ dimension: 'a', level: 'good_job' }, { dimension: 'followup', level: 'needs_work' }]) === 'good_job'
    && topicVerdict([{ dimension: 'a', level: 'needs_work' }, { dimension: 'b', level: 'needs_work' }, { dimension: 'c', level: 'good_job' }]) === 'needs_work'
    && topicVerdict([{ dimension: 'a', level: 'needs_work' }, { dimension: 'b', level: 'good_job' }]) === 'on_track', 'topic verdict follows the content ratings, not the follow-up row');
  const topicWith = (slotId, quote, stronger) => checkAndShapeFeedback({ overall: 'ok', priorities: [], moments: [], topics: [{ slot_id: slotId, ratings: [], went_well: '', went_well_quote: '', to_fix: 'weak', to_fix_quote: quote, answer_plan: [], stronger_version: stronger, example_answer: '' }] }, trace).feedback.topics.find((t) => t.slot_id === slotId);
  check(topicWith(rated[0].slot_id, rated[0].to_fix_quote, 'I led the work and moved the metric by X%.').stronger_version !== '' && topicWith(rated[0].slot_id, rated[0].to_fix_quote, 'I cut reporting time by 73 percent.').stronger_version === '', 'rewrite is dropped when it contains a number not in the resume or answers');
  check(rated[0].stronger_version.includes('X%') && rated[1] && rated[1].stronger_version === '' && rated[1].to_fix, 'unsupported rewrite text is removed after the grounding check, supported one is kept');
  check(rated[1].to_fix_quote !== rated[0].to_fix_quote ? topicWith(rated[0].slot_id, rated[1].to_fix_quote, 'I did [x].').stronger_version === '' : true, 'a quote taken from a different topic is dropped, and its rewrite with it');
  const fb2 = await post(`/api/sessions/${id}/feedback`, {});
  const saved = await get(`/api/sessions/${id}/trace`);
  check(fb2.generated_at === fb.generated_at && saved.feedback_trace.filter((x) => !x.grounding_for).length === 2 && saved.feedback_trace.filter((x) => x.grounding_for).length === 2, 'feedback is generated once with one retry, then cached');

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
  const echoed = { transcript: [{ role: 'interviewer', text: 'You mentioned the migration. What did you do first?' }] };
  check(varyOpener(echoed, 'Got it. You mentioned the pipeline. Which sources did the pipeline compare?') === 'Got it. Which sources did the pipeline compare?'
    && varyOpener(echoed, 'You mentioned the pipeline. What did it compare?') === 'You mentioned the pipeline. What did it compare?'
    && varyOpener({ transcript: [{ role: 'interviewer', text: 'Why?' }] }, 'You mentioned the pipeline. What did it compare?') === 'You mentioned the pipeline. What did it compare?',
  'drops a "You mentioned X." echo only when the last message also opened with one, and never leaves a dangling "it"');
  check(leakCheck('Which part would you contribute to first: analysing drop-offs, building dashboards, or measuring impact?').length > 0
    && leakCheck('What did you do first?').length === 0, 'flags an option list inside a question');
  check(leakCheck('Tell me about a different time you used SQL, including what you personally did and what came of it.').length > 0
    && leakCheck('Your answer focused on a different part of the work. Walk me through the joins.').length > 0
    && leakCheck('That connection is relevant. How would you compare the groups?').length > 0
    && leakCheck('Tell me about the settlement logic you built.').length === 0, 'flags two asks in a "Tell me about" question and comments on the answer');

  // The number check is owed before a claim topic closes, but only required on its last follow-up; freshers get no extra
  const { requiredRung, requiredNextRung, budgetFor } = require('../lib/engine');
  const rs = { interviewer_turns: 0, max_turns: 20, inputs: { interview_type: 'hiring_manager' }, style: 'balanced', plan: { candidate: { experience_level: 'fresher' } } };
  const numSlot = (used) => ({ kind: 'claim', anchor_text: 'Cut reporting by 6 hours', probe_angle: 'test_claim', anchor_flags: [], rungs_used: [], follow_ups_used: used, budget: 2 });
  check(requiredRung(rs, numSlot(0)) === 'result' && requiredNextRung(rs, numSlot(0)) === null && requiredNextRung(rs, numSlot(1)) === 'result', 'measurement follow-up is owed from the start but required only as the last follow-up');
  check(budgetFor('claim', rs, { technical_focus: true }) === 2 && budgetFor('claim', { ...rs, plan: { candidate: { experience_level: 'early' } } }, { technical_focus: true }) === 3, 'technical claim topics get an extra follow-up except for freshers');

  // Grounding: the student's own words are a false alarm; a real flag removes only its sentence
  const { applyGrounding } = require('../lib/engine');
  check(applyGrounding('I worked on the migration code and [what you did]. I used greedy matching. The result was [what changed].',
    ['"I worked on the migration code"', 'I used greedy matching'], 'I made sure it was consistent and worked on the migration code')
    === 'I worked on the migration code and [what you did]. The result was [what changed].', 'grounding keeps the student\'s own words and drops only the invented sentence');
  check(applyGrounding('I did X.', ['a claim not in the rewrite'], '') === '' && applyGrounding('I used greedy matching here.', ['used greedy matching here'], '') === ''
    && applyGrounding('I did X because Y.', ['because', 'I personally'], '') === 'I did X because Y.',
    'grounding removes the rewrite when a flag cannot be placed or nothing real is left; one- and two-word flags are ignored');

  const list = await get('/api/sessions');
  check(list.length >= 2, 'past sessions are listed');

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

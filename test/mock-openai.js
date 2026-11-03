// Mock of the OpenAI Chat Completions endpoint for offline testing.
// Returns schema-shaped planner and turn outputs; can be told to misbehave to test guards.
const http = require('http');

const PORT = Number(process.env.MOCK_PORT || 4010);
let turnCount = 0;

function plannerOutput(input) {
  const resume = input.resume_text;
  const line = (start) => resume.split('\n').map((l) => l.replace(/^[-\s]+/, '').trim()).find((l) => l.startsWith(start)) || start;
  return {
    candidate: { name: 'Rohan', experience_level: 'early', current_or_last_role: 'Associate Product Manager, Kitecart', resume_band: 'upper', band_reason: 'Most lines are quantified with clear ownership.' },
    jd: { present: Boolean(input.jd_text), company: input.jd_text ? 'Brightpath Learning' : null, role_title: input.jd_text ? 'Product Manager, Learner Growth' : null, seniority: 'mid', must_haves: [{ requirement: 'Hands-on experimentation', competency: 'Experimentation' }, { requirement: 'Stakeholder management', competency: 'Stakeholder management' }], nice_to_haves: [], stated_values: ['Learner first'] },
    mismatch: { is_mismatch: false, note: '' },
    claims: [
      { id: 'c1', text: line('Led the launch of a referral programme'), parent: 'Associate Product Manager, Kitecart', type: 'impact', strength: 'strong', strength_signals: ['quantified result'], weak_flags: ['inflated_scope'], relevance: 'high', distinctive: true, probe_angle: 'test_claim', rank: 1 },
      { id: 'c2', text: line('Owned the checkout redesign'), parent: 'Associate Product Manager, Kitecart', type: 'impact', strength: 'strong', strength_signals: ['quantified result', 'ownership verb'], weak_flags: ['inflated_scope'], relevance: 'high', distinctive: false, probe_angle: 'test_claim', rank: 2 },
      { id: 'c3', text: line('Identified a pricing error pattern'), parent: 'Product Operations Analyst, Kitecart', type: 'impact', strength: 'strong', strength_signals: ['quantified result'], weak_flags: [], relevance: 'medium', distinctive: true, probe_angle: 'test_claim', rank: 3 },
      { id: 'c4', text: 'This line is made up and not in the resume', parent: 'Business Analyst, Northline Logistics', type: 'other', strength: 'weak', strength_signals: [], weak_flags: ['vague'], relevance: 'low', distinctive: false, probe_angle: 'find_substance', rank: 4 },
    ],
    competencies: [
      { id: 'k1', name: 'Experimentation', source: 'jd_must_have', must_have: true, evidence_claim_ids: ['c1'], is_gap: false },
      { id: 'k2', name: 'Stakeholder management', source: 'jd_must_have', must_have: true, evidence_claim_ids: [], is_gap: true },
      { id: 'k3', name: 'Ownership and execution', source: 'role_default', must_have: true, evidence_claim_ids: ['c2'], is_gap: false },
      { id: 'k4', name: 'Motivation and fit', source: 'always', must_have: false, evidence_claim_ids: [], is_gap: false },
    ],
    concerns: [{ type: 'gap', detail: 'No role listed between June 2021 and March 2022.' }],
    warmup_question: 'Before we dive in, what has been the most interesting thing you have worked on recently?',
    background_question: 'Walk me through your career so far, with a focus on your last couple of roles.',
    slots: [
      { id: 's1', kind: 'claim', competency_id: 'k1', anchor_claim_id: 'c1', question_type: 'past_behaviour', core_question: 'I see you led the referral launch at Kitecart. Walk me through how that came about and what your part was.', intent_private: 'Needs the situation, what Rohan decided and did, and how the 30% was measured.', probe_angle: 'test_claim', technical_focus: false, likely_probes: ['Who else was involved, and which decisions were yours?', 'How did you measure the 30%?'], priority: 1 },
      { id: 's2', kind: 'claim', competency_id: 'k3', anchor_claim_id: 'c3', question_type: 'past_behaviour', core_question: 'Tell me about the pricing error pattern you found as an operations analyst.', intent_private: 'Needs how he spotted it and how the saving was calculated.', probe_angle: 'test_claim', technical_focus: true, likely_probes: ['How was the saving calculated?'], priority: 2 },
      { id: 's3', kind: 'gap', competency_id: 'k2', anchor_claim_id: null, question_type: 'past_behaviour', core_question: 'Tell me about a time you had to bring engineering and marketing to agreement on a priority.', intent_private: 'Needs a specific disagreement, his actions, and the outcome.', probe_angle: 'find_substance', technical_focus: false, likely_probes: ['What did you personally do to bring them together?'], priority: 3 },
      { id: 's4', kind: 'motivation', competency_id: 'k4', anchor_claim_id: null, question_type: 'motivation', core_question: 'What draws you to the learner growth role at Brightpath?', intent_private: 'Needs a specific reason tied to the role.', probe_angle: 'none', technical_focus: false, likely_probes: [], priority: 4 },
    ],
    plan_notes: 'Mock plan for testing.',
  };
}

function turnOutput(p) {
  turnCount += 1;
  const allowed = p.allowed_decisions;
  const slot = p.current_slot;
  const base = {
    evidence: { situation: true, task: true, action: true, result: false, ownership: 'mostly_we', specificity: 'general', anchor_fit: slot.anchor_resume_line ? 'supports' : 'not_applicable', technical_reasoning: 'not_applicable', on_topic: 'on', answer_type: 'example', new_hook: { present: false, description: '', competency_id: null } },
    evidence_sufficient: false,
    missing: ['result'],
    probe_rung: 'none',
    pivot_target_slot_id: null,
    internal_rationale: 'Mock rationale.',
    why_asked_for_student: 'Mock reason shown to the student.',
    slot_summary: '',
  };
  const answer = p.candidate_answer.toLowerCase();

  // Scripted behaviours triggered by the test's answer text.
  if (answer.includes('[leaknext]') && !p.note && allowed.includes('probe') && p.next_slot.planned_opening_question) {
    return { ...base, decision: 'probe', probe_rung: 'result', utterance: p.next_slot.planned_opening_question };
  }
  if (answer.includes('[illegal]')) return { ...base, decision: 'pivot', pivot_target_slot_id: 'nope', utterance: 'Invalid pivot.' };
  if (answer.includes('[pivot]') && allowed.includes('pivot') && p.pivot_options.length) {
    return { ...base, evidence_sufficient: true, missing: [], decision: 'pivot', pivot_target_slot_id: p.pivot_options[0].slot_id, slot_summary: 'Pivoted.', utterance: 'You mentioned convincing the sales team. How did you get them on board?' };
  }
  if (slot.kind === 'candidate_questions') {
    if (allowed.includes('answer_candidate_question') && !answer.includes('no questions')) return { ...base, decision: 'answer_candidate_question', utterance: 'Typically the team works in two-week cycles. Anything else you would like to know?' };
    return { ...base, decision: 'close', slot_summary: 'Asked about team.', utterance: 'Thanks for your time. That is the end of the interview, and your feedback is ready.' };
  }
  if (allowed.includes('probe') && !answer.includes('[done]')) {
    const praise = /flagged/.test(p.note || '') ? '' : ' This is a great answer.';
    const rung = slot.required_next_rung || ['result', 'how', 'decision'].find((r) => !(slot.rungs_already_used || []).includes(r)) || 'result';
    return { ...base, decision: 'probe', probe_rung: rung, utterance: `Got it. What changed because of your work?${praise}` };
  }
  const next = p.next_slot;
  const nextQ = next.kind === 'candidate_questions' ? "That's everything from my side. What questions do you have for me?" : (next.planned_opening_question || 'Tell me about another time you handled that, a different example.');
  return { ...base, decision: 'move_on', slot_summary: 'Mock summary.', utterance: `Thanks. ${nextQ}` };
}

let feedbackCalls = 0;
// First call returns bad output (score text, invented quotes, unknown slot, bad level) so the guard and one retry are exercised.
function feedbackOutput(input) {
  feedbackCalls += 1;
  const bad = !input.note;
  const topic = (t, i) => {
    const ans = input.transcript.find((e) => e.role === 'candidate' && e.slot_id === t.slot_id);
    const real = ans ? ans.text.split(/\s+/).slice(0, 4).join(' ') : '';
    return {
      slot_id: t.slot_id,
      ratings: t.rubric.map((r, i) => ({ dimension: r.dimension, reason: 'Mock reason.', level: bad && i === 0 ? 'excellent' : ['good_job', 'on_track', 'needs_work'][i % 3] })),
      went_well_quote: real,
      went_well: 'You named a clear starting point.',
      to_fix_quote: bad ? 'I never said this' : real,
      to_fix: bad ? 'The competency was weak.' : 'It lacks a measurable result.',
      answer_plan: ['Start with the problem.', 'Say what you did yourself.', 'End with what changed.'],
      stronger_version: i === 1 ? 'I used greedy matching to settle balances.' : 'I led the work and moved the metric by X%.',
      example_answer: 'A sample candidate would first check the data.',
    };
  };
  const empty = { ratings: [], went_well_quote: '', went_well: 'x', to_fix_quote: '', to_fix: '', answer_plan: [], stronger_version: '', example_answer: '' };
  return {
    overall: bad ? 'You scored 7/10 overall.' : 'You gave concrete examples and can tighten the results.',
    topics: [
      ...input.topics.filter((t) => t.usable_answer).slice(0, 2).map(topic),
      ...input.topics.filter((t) => !t.usable_answer).map((t) => ({ slot_id: t.slot_id, ...empty, went_well: '', answer_plan: ['Give one real example.'] })),
      { slot_id: 'warmup', ...empty },
    ],
    moments: [
      { slot_id: 'background', quote: 'not a real quote', note: 'Your background answer did not match the resume.', tip: 'Keep it consistent.' },
      ...input.topics.filter((t) => t.usable_answer).slice(0, 1).map((t) => ({ slot_id: t.slot_id, quote: '', note: 'The resume line says X; the answer described Y.', tip: 'Tell the story behind that line.' })),
      { slot_id: 'warmup', quote: '', note: 'Warm-up should not be judged.', tip: '' },
      { slot_id: 'nope', quote: '', note: 'Unknown topic.', tip: '' },
      { slot_id: 'candidate_questions', quote: '', note: 'Model-written closing note.', tip: '' },
    ],
    priorities: ['Lead with the result.', 'Say what you personally did.', 'Name how you measured it.', 'A fourth item.'].map((t) => ({ title: t, why: 'It makes answers verifiable.', action: 'Add one number.' })),
  };
}

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const r = JSON.parse(body || '{}');
    const name = r.response_format?.json_schema?.name;
    const input = JSON.parse(r.messages[1].content);
    if (r.reasoning_effort && r.model.includes('noeffort')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'Unrecognized request argument supplied: reasoning_effort' } }));
    }
    // Grounding check: anything mentioning "greedy" is an unsupported claim.
    const out = name === 'rewrite_grounding' ? { unsupported_claims: /greedy/i.test(input.rewrite) ? ['used greedy matching to settle balances'] : [] }
      : name === 'interview_plan' ? plannerOutput(input) : name === 'interview_feedback' ? feedbackOutput(input) : turnOutput(input);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1000, completion_tokens: 200 } }));
  });
}).listen(PORT, () => console.log(`mock openai on ${PORT}`));

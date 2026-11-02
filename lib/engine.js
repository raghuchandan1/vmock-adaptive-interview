// Interview session engine.
// The LLM judges answers and writes questions; this code owns the rules:
// slot order, follow-up budgets, allowed decisions, time limits, second chances and guards.

const crypto = require('crypto');

const STYLE_BUDGET = { supportive: 1, balanced: 2, probing: 3 };
const SCORED_SLOTS = { short: 3, standard: 4 };
const MAX_INTERVIEWER_TURNS = { short: 14, standard: 20 };
const MINUTES = { short: 10, standard: 15 };
const MAX_SECOND_CHANCES = { short: 1, standard: 2 };
const LONG_ANSWER_WORDS = 350;
const SCORED_KINDS = ['claim', 'gap', 'motivation', 'concerns', 'second_chance'];
const PIVOTABLE_KINDS = ['claim', 'gap', 'motivation'];

const TYPE_LABEL = {
  recruiter_screen: 'Recruiter screen',
  hiring_manager: 'Hiring manager',
  back_your_resume: 'Back your resume',
};
const STYLE_LABEL = { supportive: 'Supportive', balanced: 'Balanced', probing: 'Probing' };

const LEAK_PATTERN = /\b(competenc(y|ies)|rubric|STAR (method|format)|probe|probing questions?|slot|scor(e|es|ed|ing)|evaluat(e|ing|ion)|assess(ing|ment)|criteria|follow-ups? (left|remaining)|questions? (left|remaining)|topics? (left|remaining))\b/i;
const PRAISE_PATTERN = /\b(great answer|good answer|excellent|perfect|impressive|well done|nice answer|good point|gives (me|us) a clear|that connects|that covers|(thoughtful|useful|helpful|insightful) (questions?|answers?)|good question|great question|connects (clearly|naturally)|that (explains|clarifies)|(that|this) is clear|clear (example|picture|starting)|gives (me|us) (the|a) (arc|shape|sense|picture|overview))\b/i;
const LEADING_PATTERN = /\b(for example|such as|e\.g\.)/i;
const DOUBLE_ASK_PATTERN = /,? and (what|how|which|why|who)\b/i;
// shortcut: only catches short explicit "don't know" answers; vaguer non-answers are left to the turn prompt.
const DONT_KNOW = /^\W*(i('| a)?m\s+)?(not\s+sure|no\s+idea|(i\s+)?don'?t\s+(know|remember)|(i\s+)?can'?t\s+(say|remember))\b|^\W*(pass|skip)\W*$/i;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const now = () => new Date().toISOString();

function leakCheck(text) {
  const flags = [];
  const leak = String(text || '').match(LEAK_PATTERN);
  if (leak) flags.push(`agenda word: "${leak[0]}"`);
  const praise = String(text || '').match(PRAISE_PATTERN);
  if (praise) flags.push(`evaluative phrase: "${praise[0]}"`);
  const questionMarks = (String(text || '').match(/\?/g) || []).length;
  if (questionMarks > 1) flags.push(`${questionMarks} question marks (one question per turn)`);
  const questions = String(text || '').split(/(?<=[.!?])\s+/).filter((s) => s.includes('?'));
  if (questions.some((q) => LEADING_PATTERN.test(q))) flags.push('offers example answers or options in the question');
  if (questions.some((q) => DOUBLE_ASK_PATTERN.test(q))) flags.push('two asks joined by "and" in one question');
  if (words(text) > 75) flags.push(`${words(text)} words (limit about 60)`);
  return flags;
}

// ---------- Plan checks and slot building ----------

function checkAndShapePlan(plan, inputs) {
  const checks = [];
  const resume = norm(inputs.resume_text);
  const claimsById = Object.fromEntries((plan.claims || []).map((c) => [c.id, c]));
  const compsById = Object.fromEntries((plan.competencies || []).map((k) => [k.id, k]));

  for (const c of plan.claims || []) {
    const n = norm(c.text);
    c.grounded = n.length > 0 && (resume.includes(n) || resume.includes(n.slice(0, 60)));
    if (!c.grounded) checks.push({ level: 'warn', message: `Claim ${c.id} is not an exact quote from the resume: "${c.text.slice(0, 80)}"` });
  }

  // Slot ids must be unique and must not collide with the fixed topics, or pivots and transcripts mix topics up.
  const seen = new Set(['warmup', 'background', 'candidate_questions']);
  let slots = (plan.slots || []).filter((s) => {
    if (seen.has(s.id)) { checks.push({ level: 'warn', message: `Dropped slot with duplicate or reserved id "${s.id}".` }); return false; }
    seen.add(s.id);
    return true;
  });
  for (const s of slots) {
    if (s.anchor_claim_id && !claimsById[s.anchor_claim_id]) {
      checks.push({ level: 'warn', message: `Slot ${s.id} anchors to unknown claim ${s.anchor_claim_id}; anchor removed.` });
      s.anchor_claim_id = null;
    }
    if (!compsById[s.competency_id]) checks.push({ level: 'warn', message: `Slot ${s.id} uses unknown competency ${s.competency_id}.` });
    for (const field of ['core_question', ...(s.likely_probes || []).map((_, i) => i)]) {
      const text = typeof field === 'number' ? s.likely_probes[field] : s[field];
      const flags = leakCheck(text).filter((f) => !f.includes('words'));
      if (flags.length) checks.push({ level: 'warn', message: `Slot ${s.id} wording: ${flags.join('; ')}` });
    }
  }

  // At most two claim slots per parent (drop the lowest-priority extras).
  const byParent = {};
  slots.sort((a, b) => a.priority - b.priority);
  slots = slots.filter((s) => {
    if (s.kind !== 'claim' || !s.anchor_claim_id) return true;
    const parent = claimsById[s.anchor_claim_id].parent;
    byParent[parent] = (byParent[parent] || 0) + 1;
    if (byParent[parent] > 2) {
      checks.push({ level: 'warn', message: `Dropped slot ${s.id}: a third topic from "${parent}".` });
      return false;
    }
    return true;
  });

  const target = SCORED_SLOTS[inputs.length] || 4;
  if (slots.length > target) {
    const removed = slots.slice(target).map((s) => s.id);
    slots = slots.slice(0, target);
    checks.push({ level: 'warn', message: `Planner returned more topics than needed; dropped ${removed.join(', ')}.` });
  }
  if (slots.length < target) checks.push({ level: 'warn', message: `Planner returned ${slots.length} topics; ${target} were requested.` });

  // At most two technical-depth topics, keeping the highest-priority ones.
  let techCount = 0;
  for (const s of slots) {
    if (s.technical_focus && ++techCount > 2) {
      s.technical_focus = false;
      checks.push({ level: 'warn', message: `Slot ${s.id}: technical depth removed (more than two technical topics).` });
    }
  }

  // Restore the planner's intended order (template order), not priority order.
  const order = (plan.slots || []).map((s) => s.id);
  slots.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  if (!checks.length) checks.push({ level: 'ok', message: 'All claims are quoted from the resume and all topics are valid.' });
  return { slots, checks, claimsById, compsById };
}

function budgetFor(kind, session, fields = {}) {
  const base = STYLE_BUDGET[session.style];
  switch (kind) {
    case 'warmup': return 0;
    case 'background': return 1;
    case 'motivation': return Math.max(1, base - 1);
    case 'concerns': return 1;
    case 'second_chance': return Math.min(2, base);
    // Back your resume, and technical topics in a hiring manager interview, get one extra follow-up.
    case 'claim': return session.inputs.interview_type === 'back_your_resume'
      || (session.inputs.interview_type === 'hiring_manager' && fields.technical_focus) ? Math.min(3, base + 1) : base;
    default: return base;
  }
}

function makeSlot(fields, session) {
  return {
    competency_id: null,
    competency_name: null,
    must_have: false,
    anchor_claim_id: null,
    anchor_text: null,
    anchor_parent: null,
    question_type: null,
    core_question: '',
    intent_private: '',
    probe_angle: 'none',
    technical_focus: false,
    likely_probes: [],
    priority: 0,
    follow_ups_used: 0,
    rephrase_used: false,
    contradiction_used: false,
    rungs_used: [],
    anchor_flags: [],
    answer_return_count: 0,
    dont_know_count: 0,
    status: 'pending',
    outcome: null,
    summary: '',
    pivoted_into: false,
    ...fields,
    budget: budgetFor(fields.kind, session, fields),
  };
}

function buildSlots(session, shaped) {
  const { plan } = session;
  const slots = [
    makeSlot({
      id: 'warmup', kind: 'warmup', core_question: plan.warmup_question,
      intent_private: 'Warm-up to settle in. Not assessed.',
    }, session),
    makeSlot({
      id: 'background', kind: 'background', core_question: plan.background_question,
      intent_private: 'A coherent overview of the candidate\'s path; may surface threads for later topics.',
    }, session),
  ];
  for (const s of shaped.slots) {
    const claim = s.anchor_claim_id ? shaped.claimsById[s.anchor_claim_id] : null;
    const comp = shaped.compsById[s.competency_id];
    slots.push(makeSlot({
      id: s.id,
      kind: s.kind,
      competency_id: s.competency_id,
      competency_name: comp ? comp.name : s.competency_id,
      must_have: comp ? comp.must_have : false,
      anchor_claim_id: s.anchor_claim_id,
      anchor_text: claim ? claim.text : null,
      anchor_parent: claim ? claim.parent : null,
      anchor_flags: claim ? (claim.weak_flags || []) : [],
      question_type: s.question_type,
      core_question: s.core_question,
      intent_private: s.intent_private,
      probe_angle: s.probe_angle,
      technical_focus: Boolean(s.technical_focus),
      likely_probes: s.likely_probes,
      priority: s.priority,
    }, session));
  }
  slots.push(makeSlot({ id: 'candidate_questions', kind: 'candidate_questions', intent_private: 'Candidate asks their questions.' }, session));
  return slots;
}

// ---------- Session creation ----------

function resolveStyle(style) {
  if (style !== 'surprise') return style;
  const styles = Object.keys(STYLE_BUDGET);
  return styles[crypto.randomInt(styles.length)];
}

function createSession({ inputs, settings, plan, planTrace, resolvedStyle }) {
  const surprise = inputs.style === 'surprise';
  const session = {
    id: `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(4).toString('hex')}`,
    created_at: now(),
    status: 'active',
    inputs,
    style: resolvedStyle || resolveStyle(inputs.style),
    surprise,
    seed: inputs.seed,
    settings,
    plan,
    plan_trace: planTrace,
    plan_checks: [],
    slots: [],
    current: 0,
    transcript: [],
    turns: [],
    events: [],
    interviewer_turns: 0,
    max_turns: MAX_INTERVIEWER_TURNS[inputs.length] || 20,
    candidate_questions_asked: 0,
    second_chances: {},
  };
  const shaped = checkAndShapePlan(plan, inputs);
  session.plan_checks = shaped.checks;
  session.slots = buildSlots(session, shaped);
  session.slots[0].status = 'active';

  const opening = openingText(session);
  pushInterviewer(session, `${opening} ${session.slots[0].core_question}`.trim(), 'warmup',
    'This was a warm-up question to help you settle in. It isn\'t part of the feedback.');
  return session;
}

function openingText(session) {
  const { plan, inputs, style } = session;
  const hi = plan.candidate?.name ? `Hi ${plan.candidate.name}` : 'Hi';
  const role = plan.jd?.role_title || inputs.target_role || 'this';
  const company = plan.jd?.company ? ` at ${plan.jd.company}` : '';
  const minutes = MINUTES[inputs.length] || 15;
  const pace = style === 'supportive'
    ? 'There\'s no rush, so take a moment whenever you need one.'
    : 'Feel free to take a moment before you answer.';
  const byType = {
    recruiter_screen: `${hi}, thanks for making time today. This is an initial conversation about the ${role} role${company}. We have about ${minutes} minutes, and I'll leave time for your questions at the end.`,
    hiring_manager: `${hi}, thanks for joining. I'm on the hiring team for the ${role} role${company}, and I'd like to understand your experience in some depth. We have about ${minutes} minutes, with time for your questions at the end.`,
    back_your_resume: `${hi}, thanks for joining. Today I'd like to go through your resume in some detail and hear the stories behind it. We have about ${minutes} minutes, with time for your questions at the end.`,
  };
  return `${byType[inputs.interview_type]} ${pace}`;
}

function preBrief(session) {
  const scored = session.slots.filter((s) => SCORED_KINDS.includes(s.kind)).length;
  return {
    interview_type: TYPE_LABEL[session.inputs.interview_type],
    style: session.surprise ? null : STYLE_LABEL[session.style],
    surprise: session.surprise,
    topics: scored,
    minutes: MINUTES[session.inputs.length] || 15,
    company: session.plan.jd?.company || null,
    role: session.plan.jd?.role_title || session.inputs.target_role || null,
    jd_used: Boolean(session.plan.jd?.present),
    mismatch_note: session.plan.mismatch?.is_mismatch ? session.plan.mismatch.note : null,
  };
}

// ---------- Turn helpers ----------

// Models open almost every message with "Thanks, Name." which reads like a script. Drop a repeated stock opener
// (same word as the previous message) and drop the name when it was used in the last three messages.
const STOCK_OPENER = /^(Thanks|Understood|Got it|Okay|Right)(, ([A-Z][a-z]+))?[.!]\s+(?=\S)/;
function varyOpener(session, text) {
  const prior = session.transcript.filter((e) => e.role === 'interviewer').slice(-3).map((e) => e.text);
  const m = text.match(STOCK_OPENER);
  if (!m || !prior.length) return text;
  const lastOpener = (prior[prior.length - 1].match(STOCK_OPENER) || [])[1];
  if (lastOpener === m[1]) {
    const rest = text.slice(m[0].length);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  const name = m[3];
  if (name && prior.some((p) => p.includes(name))) return `${m[1]}. ${text.slice(m[0].length)}`;
  return text;
}

function pushInterviewer(session, text, slotId, why) {
  session.transcript.push({ role: 'interviewer', text, slot_id: slotId, why: why || '', at: now() });
  session.interviewer_turns += 1;
}

function pairs(entries) {
  const out = [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].role === 'interviewer') {
      const next = entries[i + 1];
      out.push({ interviewer: entries[i].text, candidate: next && next.role === 'candidate' ? next.text : null });
    }
  }
  return out;
}

function pendingScored(session) {
  return session.slots.filter((s, i) => i > session.current && s.status === 'pending' && SCORED_KINDS.includes(s.kind));
}

function slotCost(slot) {
  return 1 + Math.ceil(slot.budget / 2);
}

// Drop the lowest-priority remaining topic if the session is running out of turns.
function applyTimeRule(session, guards) {
  const current = session.slots[session.current];
  const remaining = session.max_turns - session.interviewer_turns - 1; // this turn's message
  let currentCost = current && SCORED_KINDS.includes(current.kind)
    ? Math.ceil(Math.max(0, current.budget - current.follow_ups_used) / 2) : 0;
  let squeezed = false;
  let pending = pendingScored(session);
  let needed = currentCost + pending.reduce((sum, s) => sum + slotCost(s), 0) + 2; // +2 = candidate questions and close
  while (needed > remaining && pending.length) {
    // Drop repeat (second-chance) topics first, then non-must-haves, then must-haves; lowest planner priority first.
    const rank = (s) => (s.kind === 'second_chance' ? 0 : s.must_have ? 2 : 1);
    const victim = [...pending].sort((a, b) => rank(a) - rank(b) || b.priority - a.priority)[0];
    // Before dropping a must-have, spend less on each topic: one follow-up each for the current and the pending ones.
    if (rank(victim) === 2 && !squeezed) {
      squeezed = true;
      if (current && SCORED_KINDS.includes(current.kind)) current.budget = Math.min(current.budget, current.follow_ups_used + 1);
      for (const p of pending) p.budget = Math.min(p.budget, 1);
      currentCost = current && SCORED_KINDS.includes(current.kind) ? Math.ceil(Math.max(0, current.budget - current.follow_ups_used) / 2) : 0;
      needed = currentCost + pending.reduce((sum, p) => sum + slotCost(p), 0) + 2;
      guards.push('Time rule: limited the remaining topics to one follow-up each instead of dropping a must-have topic.');
      continue;
    }
    victim.status = 'dropped';
    guards.push(`Time rule: dropped topic ${victim.id} (${victim.competency_name || victim.kind}) to finish on time.`);
    session.events.push({ at: now(), type: 'slot_dropped', slot_id: victim.id });
    pending = pendingScored(session);
    needed = currentCost + pending.reduce((sum, s) => sum + slotCost(s), 0) + 2;
  }
}

function nextSlotIndex(session) {
  for (let i = session.current + 1; i < session.slots.length; i++) {
    if (session.slots[i].status === 'pending') return i;
  }
  return session.slots.findIndex((s) => s.kind === 'candidate_questions');
}

function pivotOptions(session) {
  const next = nextSlotIndex(session);
  return session.slots
    .filter((s, i) => i > session.current && i !== next && s.status === 'pending' && PIVOTABLE_KINDS.includes(s.kind))
    .map((s) => ({ slot_id: s.id, kind: s.kind, competency_id: s.competency_id, competency: s.competency_name, anchor_resume_line: s.anchor_text }));
}

// An interview only ends for off-purpose input after the candidate has already been redirected once.
const redirected = (session) => session.turns.some((t) => t.output.evidence?.answer_type === 'off_purpose' && t.decision !== 'end_session');

// Rungs the engine insists on before a claim topic can close:
// - "role": the resume line is flagged as inflated, unclear or "we"-heavy, so ask what was personally the candidate's;
// - "result": the line is a tested claim with a number in it, so ask how the number was measured and what it was compared against.
// Role comes first. Recruiter screens are broad and never require either.
function requiredRung(session, slot) {
  if (slot.kind !== 'claim') return null;
  const nearlyOver = session.interviewer_turns >= session.max_turns - 2;
  if (nearlyOver || slot.follow_ups_used >= slot.budget) return null;
  const flagged = (slot.anchor_flags || []).some((f) => ['inflated_scope', 'unclear_role', 'we_heavy'].includes(f));
  if (flagged && !slot.contradiction_used && !slot.rungs_used.includes('role')) return 'role';
  const hasNumber = /\d/.test(slot.anchor_text || '');
  if (hasNumber && slot.probe_angle === 'test_claim' && session.inputs.interview_type !== 'recruiter_screen' && !slot.rungs_used.includes('result')) return 'result';
  return null;
}

function allowedDecisions(session, slot, pivots) {
  if (slot.kind === 'warmup') return ['move_on'];
  if (slot.kind === 'candidate_questions') {
    return session.candidate_questions_asked >= 3 ? ['close'] : ['answer_candidate_question', 'close', ...(redirected(session) ? ['end_session'] : [])];
  }
  const nearlyOver = session.interviewer_turns >= session.max_turns - 2;
  const allowed = ['move_on'];
  if (redirected(session)) allowed.push('end_session');
  // The background walkthrough isn't scored, so it never gets rephrased: one follow-up at most.
  if (!slot.rephrase_used && slot.kind !== 'background') allowed.push('rephrase');
  if (slot.answer_return_count < 2) allowed.push('answer_and_return');
  if (!nearlyOver && slot.follow_ups_used < slot.budget) {
    allowed.push('probe', 'clarify');
    if (slot.anchor_text && !slot.contradiction_used) allowed.push('contradiction_probe');
  }
  if (!nearlyOver && PIVOTABLE_KINDS.concat('second_chance').includes(slot.kind) && pivots.length) allowed.push('pivot');
  if (requiredRung(session, slot)) return allowed.filter((d) => d !== 'move_on' && d !== 'pivot');
  return allowed;
}

function slotView(slot) {
  if (!slot) return null;
  if (slot.kind === 'candidate_questions') {
    return { id: slot.id, kind: 'candidate_questions', planned_opening_question: 'Invite the candidate\'s questions.' };
  }
  return {
    id: slot.id,
    kind: slot.kind,
    competency: slot.competency_name,
    must_have: slot.must_have,
    anchor_resume_line: slot.anchor_text,
    anchor_parent: slot.anchor_parent,
    question_type: slot.question_type,
    intent: slot.intent_private,
    probe_angle: slot.probe_angle,
    technical_focus: Boolean(slot.technical_focus),
    planned_follow_ups: slot.likely_probes,
    planned_opening_question: slot.core_question,
    opened_via_pivot: Boolean(slot.pivoted_into),
  };
}

function buildTurnPayload(session, slot, answer, allowed, nextSlot, pivots, note) {
  const slotEntries = session.transcript.filter((e) => e.slot_id === slot.id);
  const slotPairs = pairs(slotEntries.slice(0, -1)); // exclude the latest answer, sent separately
  const allPairs = pairs(session.transcript.slice(0, -1));
  return {
    interview: {
      type: session.inputs.interview_type,
      style: session.style,
      target_role: session.plan.jd?.role_title || session.inputs.target_role || null,
      company: session.plan.jd?.company || null,
      candidate_first_name: session.plan.candidate?.name || null,
      experience_level: session.plan.candidate?.experience_level,
      job_description: session.inputs.jd_text || null,
      resume_text: session.inputs.resume_text,
    },
    current_slot: {
      ...slotView(slot),
      follow_ups_used: slot.follow_ups_used,
      follow_up_budget: slot.budget,
      rungs_already_used: slot.rungs_used,
      required_next_rung: requiredRung(session, slot),
      rephrase_used: slot.rephrase_used,
      contradiction_check_used: slot.contradiction_used,
    },
    slot_transcript: slotPairs,
    recent_exchanges: allPairs.slice(-4),
    earlier_slot_summaries: session.slots
      .filter((s) => s.status === 'done' && s.summary)
      .map((s) => ({ topic: s.competency_name || s.kind, summary: s.summary })),
    next_slot: slotView(nextSlot),
    pivot_options: pivots,
    allowed_decisions: allowed,
    flags: {
      answer_word_count: words(answer),
      very_long_answer: words(answer) > LONG_ANSWER_WORDS,
      candidate_questions_asked: session.candidate_questions_asked,
      interview_nearly_over: session.interviewer_turns >= session.max_turns - 2,
    },
    note: note || null,
    candidate_answer: answer,
  };
}

function fallbackUtterance(nextSlot) {
  if (!nextSlot || nextSlot.kind === 'candidate_questions') return 'Thanks. That\'s everything from my side. What questions do you have for me?';
  return `Thanks. Let's move on. ${nextSlot.core_question || 'Tell me about another example of a similar situation, a different one from the one you shared.'}`;
}

// ---------- Main turn ----------

/**
 * @param {object} session
 * @param {string} answer
 * @param {(payload: object) => Promise<{data: object, trace: object}>} runTurn
 */
async function handleAnswer(session, answer, runTurn) {
  if (session.status !== 'active') throw new Error('This interview has ended.');
  const text = String(answer || '').trim();
  if (!text) throw new Error('Type an answer before sending.');
  // Snapshot so a failed model call leaves the session exactly as it was (the student can resend).
  const keys = ['slots', 'transcript', 'events', 'turns', 'current', 'interviewer_turns', 'candidate_questions_asked', 'second_chances', 'status', 'ended_at', 'ended_by'];
  const snapshot = JSON.stringify(Object.fromEntries(keys.map((k) => [k, session[k]])));
  try {
    return await runAnswer(session, text, runTurn);
  } catch (err) {
    Object.assign(session, JSON.parse(snapshot));
    throw err;
  }
}

async function runAnswer(session, text, runTurn) {
  const slot = session.slots[session.current];
  session.transcript.push({ role: 'candidate', text, slot_id: slot.id, at: now() });

  const guards = [];
  if (SCORED_KINDS.includes(slot.kind) || slot.kind === 'background') applyTimeRule(session, guards);

  let nextIdx = nextSlotIndex(session);
  let nextSlot = session.slots[nextIdx];
  const pivots = pivotOptions(session);
  let allowed = allowedDecisions(session, slot, pivots);
  // A second "not sure" in the same topic ends it: no more follow-ups, so the interviewer doesn't keep rescuing.
  if (words(text) <= 12 && DONT_KNOW.test(text)) {
    if (slot.dont_know_count >= 1) {
      allowed = allowed.filter((d) => !['probe', 'clarify', 'contradiction_probe', 'rephrase'].includes(d));
      guards.push('Second "not sure" in this topic: follow-ups removed, moving on.');
    }
    slot.dont_know_count = (slot.dont_know_count || 0) + 1;
  }

  const calls = [];
  const call = async (allowedNow, next, note) => {
    const payload = buildTurnPayload(session, slot, text, allowedNow, next, pivots, note);
    const result = await runTurn(payload);
    calls.push({ payload, trace: result.trace, output: result.data });
    return result.data;
  };

  let out = await call(allowed, nextSlot, null);

  // Guard: decision must be allowed and well-formed.
  const invalid = (o) => {
    if (!allowed.includes(o.decision)) return `decision "${o.decision}" is not in allowed_decisions`;
    if (o.decision === 'pivot' && !pivots.some((p) => p.slot_id === o.pivot_target_slot_id)) return `pivot target "${o.pivot_target_slot_id}" is not one of pivot_options`;
    if (!String(o.utterance || '').trim()) return 'utterance is empty';
    if (o.decision === 'probe' && o.probe_rung !== 'none') {
      const need = requiredRung(session, slot);
      if (need && o.probe_rung !== need) return `probe rung must be "${need}" first (this topic must clarify ${need === 'role' ? "the candidate's own role" : 'how the claim\'s number was measured'} first)`;
      if (slot.rungs_used.includes(o.probe_rung)) return `probe rung "${o.probe_rung}" was already used in this topic; ask about a different aspect (used: ${slot.rungs_used.join(', ')})`;
    }
    const next = norm(nextSlot && nextSlot.core_question).slice(0, 50);
    if (['probe', 'clarify', 'contradiction_probe', 'rephrase', 'answer_and_return'].includes(o.decision) && next.length >= 30 && norm(o.utterance).includes(next)) {
      return 'message asks the next topic\'s question while the decision keeps the current topic. Stay on the current question, or choose move_on';
    }
    return null;
  };
  let problem = invalid(out);
  if (problem) {
    guards.push(`Rejected first output: ${problem}. Asked the model again.`);
    out = await call(allowed, nextSlot, `Your previous output was rejected because the ${problem}. Choose only from allowed_decisions.`);
    problem = invalid(out);
    if (problem) {
      guards.push(`Second output also invalid (${problem}). Used a scripted move-on.`);
      out = { ...out, decision: 'move_on', utterance: fallbackUtterance(nextSlot), why_asked_for_student: '', slot_summary: out.slot_summary || '' };
    }
  }

  // Second chance for a must-have competency that is still missing evidence.
  if (out.decision === 'move_on' && !out.evidence_sufficient && ['claim', 'gap'].includes(slot.kind)
      && slot.must_have && slot.competency_id && !session.second_chances[slot.competency_id]
      && Object.keys(session.second_chances).length < (MAX_SECOND_CHANCES[session.inputs.length] || 1)
      && session.max_turns - session.interviewer_turns >= 5) {
    const cqIdx = session.slots.findIndex((s) => s.kind === 'candidate_questions');
    const sc = makeSlot({
      id: `second_chance_${slot.competency_id}`,
      kind: 'second_chance',
      competency_id: slot.competency_id,
      competency_name: slot.competency_name,
      must_have: true,
      question_type: 'past_behaviour',
      core_question: '',
      intent_private: `Needs a different example showing ${slot.competency_name}: a specific situation, the candidate's own actions and an outcome.`,
      probe_angle: 'find_substance',
      priority: 0,
    }, session);
    session.slots.splice(cqIdx, 0, sc);
    session.second_chances[slot.competency_id] = true;
    guards.push(`Added a second-chance topic for must-have "${slot.competency_name}" before the candidate's questions.`);
    const newNextIdx = nextSlotIndex(session);
    if (session.slots[newNextIdx].id !== nextSlot.id) {
      nextIdx = newNextIdx;
      nextSlot = session.slots[nextIdx];
      allowed = ['move_on'];
      const redo = await call(allowed, nextSlot, 'The next topic changed. Move on to next_slot and write its opening question.');
      if (!String(redo.utterance || '').trim()) redo.utterance = fallbackUtterance(nextSlot);
      out = { ...redo, decision: 'move_on', evidence: out.evidence, evidence_sufficient: out.evidence_sufficient, missing: out.missing, slot_summary: out.slot_summary || redo.slot_summary };
    }
  }

  // Guard: one rewrite when the wording breaks a rule (two asks, hints, praise, agenda words).
  const wordingFlags = leakCheck(out.utterance).filter((f) => !f.includes('words'));
  if (wordingFlags.length) {
    const redo = await call(allowed, nextSlot, `Your utterance was flagged: ${wordingFlags.join('; ')}. Keep the same decision ("${out.decision}") and rewrite the utterance so it asks one thing, offers no example answers or hints, and doesn't evaluate.`);
    if (redo.decision === out.decision && redo.pivot_target_slot_id === out.pivot_target_slot_id && !invalid(redo)) {
      out = { ...out, utterance: redo.utterance, why_asked_for_student: redo.why_asked_for_student || out.why_asked_for_student };
      guards.push(`Rewrote the message once for wording: ${wordingFlags.join('; ')}.`);
    } else {
      guards.push(`Wording rewrite returned a different decision; kept the original message (${wordingFlags.join('; ')}).`);
    }
  }

  // Apply the decision.
  const d = out.decision;
  let slotIdForMessage = slot.id;
  if (['probe', 'clarify', 'contradiction_probe'].includes(d)) {
    slot.follow_ups_used += 1;
    if (d === 'contradiction_probe') slot.contradiction_used = true;
    if (out.probe_rung && out.probe_rung !== 'none') slot.rungs_used.push(out.probe_rung);
  } else if (d === 'rephrase') {
    slot.rephrase_used = true;
  } else if (d === 'answer_and_return') {
    slot.answer_return_count += 1;
  } else if (d === 'answer_candidate_question') {
    session.candidate_questions_asked += 1;
  } else if (d === 'move_on' || d === 'pivot') {
    slot.status = 'done';
    slot.outcome = out.evidence_sufficient ? 'sufficient' : (slot.follow_ups_used >= slot.budget ? 'gap_after_budget' : 'moved_on_without_full_evidence');
    // Recorded so reviewers can tell a judged move-on from one the rules forced.
    slot.forced_move_on = d === 'move_on' && !allowed.includes('probe') && !allowed.includes('clarify');
    slot.summary = out.slot_summary || '';
    if (d === 'pivot') {
      const tIdx = session.slots.findIndex((s) => s.id === out.pivot_target_slot_id);
      const [target] = session.slots.splice(tIdx, 1);
      target.pivoted_into = true;
      session.slots.splice(session.current + 1, 0, target);
      nextIdx = session.current + 1;
    } else {
      nextIdx = nextSlotIndex(session);
    }
    session.current = nextIdx;
    session.slots[nextIdx].status = 'active';
    slotIdForMessage = session.slots[nextIdx].id;
  } else if (d === 'close' || d === 'end_session') {
    slot.status = 'done';
    slot.summary = out.slot_summary || slot.summary;
    session.status = 'ended';
    session.ended_at = now();
    session.ended_by = d;
  }

  const leaks = leakCheck(out.utterance);
  pushInterviewer(session, ['close', 'end_session'].includes(d) ? out.utterance.trim() : varyOpener(session, out.utterance.trim()), slotIdForMessage, out.why_asked_for_student);

  session.turns.push({
    n: session.turns.length + 1,
    at: now(),
    slot_id: slot.id,
    slot_kind: slot.kind,
    answer: text,
    allowed_decisions: allowed,
    decision: d,
    output: out,
    guards,
    leak_flags: leaks,
    calls,
  });

  return session;
}

function endEarly(session) {
  if (session.status !== 'active') return session;
  const slot = session.slots[session.current];
  slot.status = slot.status === 'active' ? 'done' : slot.status;
  session.status = 'ended';
  session.ended_at = now();
  session.ended_by = 'candidate_ended';
  return session;
}

// What the browser may see during the interview (keeps the agenda hidden).
function publicView(session) {
  return {
    id: session.id,
    status: session.status,
    pre_brief: preBrief(session),
    transcript: session.transcript.map(({ role, text, at }) => ({ role, text, at })),
  };
}

module.exports = {
  createSession, handleAnswer, endEarly, publicView, preBrief, leakCheck, resolveStyle, applyTimeRule, varyOpener,
  SCORED_SLOTS, STYLE_BUDGET, TYPE_LABEL, STYLE_LABEL,
};

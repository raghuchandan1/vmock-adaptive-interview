// Interview session engine.
// The LLM judges answers and writes questions; this code owns the rules:
// slot order, follow-up budgets, allowed decisions, time limits, second chances and guards.

const crypto = require('crypto');

const STYLE_BUDGET = { supportive: 1, balanced: 2, probing: 3 };
// full: a 30-minute behavioural round (US recruiters run 45-60 minute behavioural interviews); hiring manager and
// back your resume only. Saved real sittings took about 20 minutes for 4 topics, so 6 topics fill about 30.
const SCORED_SLOTS = { short: 3, standard: 4, full: 6 };
const MAX_INTERVIEWER_TURNS = { short: 16, standard: 20, full: 30 };
const MINUTES = { short: 10, standard: 15, full: 30 };
const MAX_SECOND_CHANCES = { short: 1, standard: 2, full: 2 };
const MARKETS = ['india', 'us'];
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
const PRAISE_PATTERN = /\b(great answer|good answer|excellent|perfect|impressive|well done|nice answer|good point|gives (me|us) a clear|that connects|that covers|(thoughtful|useful|helpful|insightful) (questions?|answers?)|good question|great question|connects (clearly|naturally)|that (explains|clarifies)|(that|this) is clear|clear (example|picture|starting)|gives (me|us) (the|a) (arc|shape|sense|picture|overview)|your (last |previous )?answer (focused|was|did|didn|covered|went|missed)|(that|this) (connection|point|example|detail|approach) (is|was) (relevant|useful|good|interesting|important|strong))\b/i;
// Hints, or an option list inside a question ("first: dashboards, drop-offs, or impact?").
const LEADING_PATTERN = /\b(for example|such as|e\.g\.)|,[^,?]+,?\s+or\s+[^?]*\?/i;
const DOUBLE_ASK_PATTERN = /,? and (what|how|which|why|who)\b/i;
// shortcut: only catches short explicit "don't know" answers; vaguer non-answers are left to the turn prompt.
const DONT_KNOW = /^\W*(i('| a)?m\s+)?(not\s+sure|no\s+idea|(i\s+)?don'?t\s+(know|remember)|(i\s+)?can'?t\s+(say|remember))\b|^\W*(pass|skip)\W*$/i;

const REPEAT_NOTE = 'The candidate asked to hear your last question again. Ask the same question again in different words, the way an interviewer would when repeating themselves (never reuse the original sentence as it was): same intent and same specifics, no new information, no hints and no second question. You may open with a short "Sure." or "Of course."';
// A short request to hear the question again ("Sorry, can you repeat that?").
const REPEAT_ASK = /\b(repeat|say (that|it) again|come again|pardon|didn'?t (catch|get|hear)|one more time|what was the question)\b/i;
const WARMUP_NON_ANSWER_NOTE = 'The candidate gave no real answer to the warm-up. It is not assessed, so don\'t ask it again: move on. Don\'t thank them for the answer or refer to it. Open with a short reassurance ("No problem.", "That\'s fine."), then ask next_slot\'s question with a lead-in that doesn\'t build on their answer ("Let\'s start with your background instead.").';

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
  // A question can also be an instruction ("Tell me about a time…").
  const questions = String(text || '').split(/(?<=[.!?])\s+/).filter((s) => s.includes('?') || /^(tell|walk) me\b|^(describe|explain)\b/i.test(s));
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

  // At most two technical-depth topics (one for freshers and early careers), keeping the highest-priority ones.
  const techMax = ['fresher', 'early'].includes(plan.candidate?.experience_level) ? 1 : 2;
  let techCount = 0;
  for (const s of slots) {
    if (s.technical_focus && ++techCount > techMax) {
      s.technical_focus = false;
      checks.push({ level: 'warn', message: `Slot ${s.id}: technical depth removed (more than ${techMax} technical topic${techMax > 1 ? 's' : ''}).` });
    }
  }

  // US recruiters ask domain-knowledge questions only in finance and technical interviews. A knowledge slot the planner
  // still wrote for another role is judged as a scenario (situational) question, which its "how would you…" form already is.
  if (inputs.market === 'us' && !['finance', 'technical'].includes(plan.jd?.role_family)) {
    for (const s of slots) {
      if (s.question_type !== 'knowledge') continue;
      s.question_type = 'situational';
      checks.push({ level: 'warn', message: `Slot ${s.id}: knowledge question judged as situational (US market, ${plan.jd?.role_family || 'unknown'} role).` });
    }
  }

  // Restore the planner's intended order (template order), not priority order.
  const order = (plan.slots || []).map((s) => s.id);
  slots.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  if (!checks.length) checks.push({ level: 'ok', message: 'All claims are quoted from the resume and all topics are valid.' });
  return { slots, checks, claimsById, compsById };
}

const isFresher = (session) => session.plan?.candidate?.experience_level === 'fresher';

function budgetFor(kind, session, fields = {}) {
  const base = STYLE_BUDGET[session.style];
  switch (kind) {
    case 'warmup': return 0;
    case 'background': return 1;
    case 'motivation': return Math.max(1, base - 1);
    case 'concerns': return 1;
    case 'second_chance': return Math.min(2, base);
    // Back your resume, and technical topics in a hiring manager interview, get one extra follow-up; not for freshers,
    // where the extra follow-up used up the time and the later topics (scenario, motivation) were dropped.
    case 'claim': return session.inputs.interview_type === 'back_your_resume'
      || (session.inputs.interview_type === 'hiring_manager' && fields.technical_focus && !isFresher(session)) ? Math.min(3, base + 1) : base;
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
  session.opening_greeting = opening;
  pushInterviewer(session, `${opening} ${session.slots[0].core_question}`.trim(), 'warmup',
    'This was a warm-up question to help you settle in. It isn\'t part of the feedback.');
  return session;
}

// The warm-up question's angle, picked per session so the first question differs between attempts.
const WARMUP_ANGLES = [
  'what they have been working on or learning lately',
  'what first got them interested in this kind of work',
  'the kind of problems they most like working on',
  'something they learned recently that turned out to be useful',
  'a course, project or piece of work from the last few months they found interesting',
  'a skill they picked up recently, at work or in their course, and where it came in useful',
  'what they enjoy most about their current role or course',
  'what has kept them busy in the last few weeks, at work or in their studies',
];
const warmupAngle = (seed) => WARMUP_ANGLES[Math.floor(Number(seed || 0) / 3) % WARMUP_ANGLES.length];

// The standard fit question for summers and thin CVs, picked per session (the model alone always picked the same one).
const FIT_ANGLES = [
  'a time they failed at something that mattered to them',
  'a time they disagreed with their team or took a stance',
  'what their team or classmates would say is their biggest strength',
];
const fitAngle = (seed) => FIT_ANGLES[Number(seed || 0) % FIT_ANGLES.length];

// Domain is appended to the role only where it goes to the model; spoken/displayed text keeps the plain role.
const roleWithDomain = (role, domain) => [role, domain && `domain: ${domain}`].filter(Boolean).join(', ');

function openingText(session) {
  const { plan, inputs, style } = session;
  const hi = plan.candidate?.name ? `Hi ${plan.candidate.name}` : 'Hi';
  const roleName = plan.jd?.role_title || inputs.target_role;
  const company = plan.jd?.company ? ` at ${plan.jd.company}` : '';
  const role = roleName ? `the ${roleName} role${company}` : `this role${company}`;
  const minutes = MINUTES[inputs.length] || 15;
  // The opening is spoken on the student page, so only the supportive style adds a line about pace.
  const pace = style === 'supportive' ? 'There\'s no rush, so take a moment whenever you need one.' : '';
  // A few wordings per interview type, picked per session, so repeat attempts don't open with the same paragraph.
  const byType = {
    recruiter_screen: [
      `${hi}, thanks for making time today. This is an initial conversation about ${role}. We have about ${minutes} minutes, and I'll leave time for your questions at the end.`,
      `${hi}, good to meet you. I'd like to have a first conversation with you about ${role}. It should take about ${minutes} minutes, and there'll be time for your questions at the end.`,
      `${hi}, thanks for joining. Today is a short first chat about ${role}, about ${minutes} minutes, with time at the end for anything you'd like to ask.`,
    ],
    hiring_manager: [
      `${hi}, thanks for joining. I'm on the hiring team for ${role}, and I'd like to understand your experience in some depth. We have about ${minutes} minutes, with time for your questions at the end.`,
      `${hi}, good to meet you. I'm part of the team hiring for ${role}, and today I'd like to hear about your experience in some depth. We have about ${minutes} minutes, and I'll keep time for your questions at the end.`,
      `${hi}, thanks for making the time. I'm on the team hiring for ${role}. Over the next ${minutes} minutes or so I'd like to go into your experience, and you'll have time for questions at the end.`,
    ],
    back_your_resume: [
      `${hi}, thanks for joining. Today I'd like to go through your resume in some detail and hear the stories behind it. We have about ${minutes} minutes, with time for your questions at the end.`,
      `${hi}, good to meet you. I'd like to spend the next ${minutes} minutes or so going through your resume and the stories behind it, and I'll leave time for your questions at the end.`,
      `${hi}, thanks for joining. Today we'll walk through your resume in some detail. We have about ${minutes} minutes, with time for your questions at the end.`,
    ],
  };
  const options = byType[inputs.interview_type];
  return `${options[Number(inputs.seed || 0) % options.length]} ${pace}`.trim();
}

function preBrief(session) {
  const scored = session.slots.filter((s) => SCORED_KINDS.includes(s.kind)).length;
  return {
    interview_type: TYPE_LABEL[session.inputs.interview_type],
    style: session.surprise ? null : STYLE_LABEL[session.style],
    surprise: session.surprise,
    topics: scored,
    minutes: MINUTES[session.inputs.length] || 15,
    stage: session.inputs.stage || null,
    company: session.plan.jd?.company || null,
    role: session.plan.jd?.role_title || session.inputs.target_role || null,
    jd_used: Boolean(session.plan.jd?.present),
    mismatch_note: session.plan.mismatch?.is_mismatch ? session.plan.mismatch.note : null,
  };
}

// ---------- Turn helpers ----------

// Models open almost every message with "Thanks, Name." which sounds scripted, above all when spoken. Keep at most
// one stock acknowledgement in three messages, and drop the name when it was used in the last three messages.
const STOCK_OPENER = /^(Thanks|Thank you|Understood|Got it|Okay|OK|Right|Noted|No problem|Thanks for (?:walking me through that|clarifying|clarifying that|sharing that|explaining that|that))(, ([A-Z][a-z]+))?[.!]\s+(?=\S)/;
// An echo sentence ("You mentioned X.") before the question; fine once, robotic when every follow-up starts that way.
const ECHO_OPENER = /^(You (mentioned|said|described|noted|talked about)|You've mentioned)\b[^.?!]*\.\s+(?=\S[^]*\?)/;
function varyOpener(session, text) {
  const prior = session.transcript.filter((e) => e.role === 'interviewer').slice(-3).map((e) => e.text);
  const lastBody = prior.length ? prior[prior.length - 1].replace(STOCK_OPENER, '') : '';
  if (ECHO_OPENER.test(lastBody)) {
    const body = text.replace(STOCK_OPENER, '');
    const echo = body.match(ECHO_OPENER);
    // Keep the echo when the question leans on it ("What made that the right approach?"): a dangling "that" is worse.
    if (echo && !/\b(it|that|this|those|these|them|they)\b/i.test(body.slice(echo[0].length))) text = text.slice(0, text.length - body.length) + body.slice(echo[0].length);
  }
  const m = text.match(STOCK_OPENER);
  if (!m || !prior.length) return text;
  if (prior.slice(-2).some((p) => STOCK_OPENER.test(p))) {
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
  return 1 + Math.ceil(slot.budget * 0.75); // opening question plus the follow-ups a topic typically uses
}

// Drop the lowest-priority remaining topic if the session is running out of turns.
function applyTimeRule(session, guards) {
  const current = session.slots[session.current];
  const remaining = session.max_turns - session.interviewer_turns - 1; // this turn's message
  let currentCost = current && SCORED_KINDS.includes(current.kind)
    ? Math.ceil(Math.max(0, current.budget - current.follow_ups_used) * 0.75) : 0;
  let squeezed = false;
  let pending = pendingScored(session);
  let needed = currentCost + pending.reduce((sum, s) => sum + slotCost(s), 0) + 2; // +2 = candidate questions and close
  while (needed > remaining && pending.length) {
    // Drop repeat (second-chance) topics first, then non-must-haves, then must-haves; lowest planner priority first.
    const rank = (s) => (s.kind === 'second_chance' ? 0 : s.must_have ? 2 : 1);
    const victim = [...pending].sort((a, b) => rank(a) - rank(b) || b.priority - a.priority)[0];
    // Before dropping a real topic (not a repeat), spend less on each: one follow-up each for the current and the pending ones.
    if (rank(victim) >= 1 && !squeezed) {
      squeezed = true;
      if (current && SCORED_KINDS.includes(current.kind)) current.budget = Math.min(current.budget, current.follow_ups_used + 1);
      for (const p of pending) p.budget = Math.min(p.budget, 1);
      currentCost = current && SCORED_KINDS.includes(current.kind) ? Math.ceil(Math.max(0, current.budget - current.follow_ups_used) * 0.75) : 0;
      needed = currentCost + pending.reduce((sum, p) => sum + slotCost(p), 0) + 2;
      guards.push('Time rule: limited the remaining topics to one follow-up each instead of dropping a topic.');
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

// The rung the next follow-up must use. "result" is owed until asked (the topic can't close), but it is only required
// on the last allowed follow-up, so earlier follow-ups can open up the story first: asking "what was it compared
// against?" straight after the opening answer felt like an interrogation.
function requiredNextRung(session, slot) {
  const owed = requiredRung(session, slot);
  return owed === 'result' && slot.follow_ups_used < slot.budget - 1 ? null : owed;
}

function allowedDecisions(session, slot, pivots) {
  // The warm-up is unscored: an unrelated or misheard answer may get one rephrase; anything else moves on.
  if (slot.kind === 'warmup') return slot.rephrase_used ? ['move_on'] : ['move_on', 'rephrase'];
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
      target_role: roleWithDomain(session.plan.jd?.role_title || session.inputs.target_role, session.inputs.domain) || null,
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
      required_next_rung: requiredNextRung(session, slot),
      rung_owed_before_closing: requiredRung(session, slot),
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

  // "Not sure" and "can you repeat that?" both count as a non-answer. The first request to repeat in a topic gets the
  // same question again in natural new words (a real interviewer doesn't recite it); a second non-answer in the topic
  // moves on, and the feedback records the gap.
  const nonAnswers = (slot.dont_know_count || 0) + (slot.repeat_count || 0);
  const repeatAsk = words(text) <= 15 && REPEAT_ASK.test(text);
  const dontKnow = words(text) <= 12 && DONT_KNOW.test(text);
  const firstRepeat = repeatAsk && nonAnswers === 0 && !(slot.kind === 'warmup' && slot.rephrase_used);
  // A "not sure" (or a second "repeat") on the unscored warm-up moves straight on: re-asking it only adds pressure.
  const warmupNonAnswer = slot.kind === 'warmup' && !firstRepeat && (dontKnow || repeatAsk);
  const baseNote = firstRepeat ? REPEAT_NOTE : warmupNonAnswer ? WARMUP_NON_ANSWER_NOTE : '';

  const guards = [];
  if (SCORED_KINDS.includes(slot.kind) || slot.kind === 'background') applyTimeRule(session, guards);

  let nextIdx = nextSlotIndex(session);
  let nextSlot = session.slots[nextIdx];
  const pivots = pivotOptions(session);
  let allowed = allowedDecisions(session, slot, pivots);
  if (firstRepeat) {
    slot.repeat_count = 1;
    allowed = ['rephrase'];
    guards.push('Asked to repeat: the same question asked again in new words.');
  } else if (repeatAsk || dontKnow) {
    // A second "not sure" or "repeat" in the same topic ends it: no more follow-ups, so the interviewer doesn't keep rescuing.
    if (nonAnswers >= 1) {
      allowed = allowed.filter((d) => !['probe', 'clarify', 'contradiction_probe', 'rephrase', 'answer_and_return'].includes(d));
      guards.push('Second "not sure" or "repeat" in topic: follow-ups removed, moving on.');
    }
    if (dontKnow) slot.dont_know_count = (slot.dont_know_count || 0) + 1;
    else slot.repeat_count = (slot.repeat_count || 0) + 1;
  }
  if (warmupNonAnswer) {
    allowed = ['move_on'];
    guards.push('Warm-up non-answer: moving on without asking it again.');
  }

  const calls = [];
  const call = async (allowedNow, next, note) => {
    const payload = buildTurnPayload(session, slot, text, allowedNow, next, pivots, [baseNote, note].filter(Boolean).join(' ') || null);
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
      const need = requiredNextRung(session, slot);
      if (need && o.probe_rung !== need) return `probe rung must be "${need}" first (this topic must clarify ${need === 'role' ? "the candidate's own role" : 'how the claim\'s number was measured'} first)`;
      if (slot.rungs_used.includes(o.probe_rung)) return `probe rung "${o.probe_rung}" was already used in this topic; ask about a different aspect (used: ${slot.rungs_used.join(', ')})`;
    }
    if (o.decision === 'rephrase' && slot.kind === 'warmup' && !firstRepeat
        && (o.evidence?.on_topic !== 'off' || ['honest_unknown', 'no_example'].includes(o.evidence?.answer_type))) {
      return 'warm-up rephrase is only for an answer unrelated to the question (on_topic off); a real answer, however short, moves on';
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

  // Guard: when the rules force the move-on (no follow-up left), a short, non-concrete answer must not be recorded as
  // sufficient. The feedback built on these records would otherwise credit evidence the candidate never gave.
  if (out.decision === 'move_on' && out.evidence_sufficient && SCORED_KINDS.includes(slot.kind)
      && !allowed.includes('probe') && !allowed.includes('clarify')
      && words(text) <= 15 && out.evidence?.specificity !== 'concrete') {
    out = { ...out, evidence_sufficient: false, missing: out.missing?.length ? out.missing : ['a specific example, with their own actions and an outcome'] };
    guards.push('Overrode "sufficient": the answer was short and not concrete, and no follow-up was left.');
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

  // Guard: after a warm-up "not sure" or an unrelated answer, "Thanks." sounds like the interviewer didn't listen.
  // Also covers the scripted fallback, which opens with "Thanks."
  const warmupNoAnswer = warmupNonAnswer || ['honest_unknown', 'no_example'].includes(out.evidence?.answer_type);
  if (slot.kind === 'warmup' && out.decision === 'move_on' && (warmupNoAnswer || out.evidence?.on_topic === 'off')) {
    const swapped = String(out.utterance).replace(/^(Thanks|Thank you)\b[^.!?]*[.!]\s+/i, warmupNoAnswer ? 'No problem. ' : 'Okay. ');
    if (swapped !== out.utterance) {
      out = { ...out, utterance: swapped };
      guards.push('Warm-up non-answer: replaced the opening thanks.');
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
    greeting: session.opening_greeting || null, // the part of the first message before the warm-up question
  };
}

// ---------- Student feedback ----------

const SCORE_PATTERN = /\b\d+\s*\/\s*\d+\b|\bscor(e|es|ed|ing)\b|\bbands?\b|\bout of (5|10|100)\b|\brated?\b|\brating\b|\blevel \d\b/i;
const LEVELS = ['good_job', 'on_track', 'needs_work'];
const MIN_FEEDBACK_WORDS = 15; // below this a topic gets "too short" instead of model feedback

// The rubric changes with the kind of question, as in the VMock product.
const RUBRICS = {
  behavioural: [
    ['situation', 'Situation', 'a specific real situation, not a general habit'],
    ['task', 'Your role', 'their own goal or responsibility in it'],
    ['action', 'What you did', 'what they personally did and decided'],
    ['result', 'Result', 'the outcome, measured or honestly described'],
  ],
  situational: [
    ['first_step', 'First step', 'a concrete first move, not generic best practice'],
    ['reasoning', 'Reasoning', 'why this approach, what trade-offs or constraints they weighed'],
    ['success_measure', 'Judging success', 'how they would know it worked'],
  ],
  knowledge: [
    ['accuracy', 'Accuracy', 'correct, specific technical content'],
    ['depth', 'Depth and reasoning', 'why a choice was made over alternatives, how a part works or failed'],
    ['application', 'Real example', 'a real use of the knowledge in their own work'],
  ],
  motivation: [
    ['reason', 'Specific reason', 'a personal, specific reason rather than a generic one'],
    ['fit', 'Fit with the role', 'a link to what the role or company actually involves'],
    ['evidence', 'Evidence', 'experience or actions that back the interest'],
  ],
  concern: [
    ['explanation', 'Explanation', 'a clear, honest account of the gap or change'],
    ['ownership', 'Ownership', 'owning their part without blaming or deflecting'],
    ['forward', 'What changed', 'what they learned or would do differently now'],
  ],
};

// A story from the student's own past (claim topics) is judged as a story, even when it is technical;
// the knowledge rubric is for technical questions that are not about a past story.
function rubricKey(slot) {
  if (slot.question_type === 'situational') return 'situational';
  if (slot.question_type === 'knowledge' || (slot.technical_focus && slot.kind !== 'claim')) return 'knowledge';
  if (slot.question_type === 'motivation' || slot.kind === 'motivation') return 'motivation';
  if (slot.question_type === 'concern' || slot.kind === 'concerns' || slot.kind === 'gap') return slot.kind === 'gap' && slot.question_type !== 'concern' ? 'behavioural' : 'concern';
  return 'behavioural';
}

// Content rubric for the question type, plus follow-up handling when the interviewer actually probed this topic.
const rubricFor = (slot) => [
  ...RUBRICS[rubricKey(slot)],
  ...(slot.technical_focus && rubricKey(slot) === 'behavioural' ? [['technical', 'Technical reasoning', 'why they chose their approach over another, how a part of it works, or what broke and how they found it']] : []),
  ...(slot.follow_ups_used > 0 ? [['followup', 'Handling follow-ups', 'answered the interviewer\'s follow-up directly and added the missing detail rather than repeating or deflecting']] : []),
];

const feedbackSlots = (session) => session.slots.filter((s) => SCORED_KINDS.includes(s.kind) && ['done', 'active'].includes(s.status));

function candidateTextBySlot(session) {
  const out = {};
  for (const t of session.transcript) if (t.role === 'candidate') out[t.slot_id] = `${out[t.slot_id] || ''} ${t.text}`;
  return out;
}

const FEEDBACK_VERSION = 10;
const FOUND = ['first_answer', 'after_follow_up', 'not_given'];
const FOLLOW_UP_DECISIONS = ['probe', 'clarify', 'contradiction_probe'];
// A worked example answer is shown only for scenario and technical questions: for a story from the student's own past,
// an example would be an invented story about their resume.
const exampleAllowed = (slot) => ['situational', 'knowledge'].includes(rubricKey(slot));
// Model-written moments come from the background walkthrough only; a topic's resume mismatch lives on that topic.
// The warm-up is presented as low-stakes, so it is not judged.
// The end questions get one only when the student asked some (asking none is a derived note below).
const momentSlotOk = (session, slotId) => slotId === 'background' || (slotId === 'candidate_questions' && session.candidate_questions_asked > 0);
// The goal's action must be one action: a list (commas), "and" before a second instruction verb, more than one "and",
// or over ~20 words is several. ("SQL and Python" is fine; "define the outcome and state how…" is two actions.)
const SECOND_ACTION = /\band (then )?(state|say|give|explain|name|describe|define|end|add|show|mention|compare|check|list|use|start|ask|share|walk|link|connect|tell|include)\b/i;
const severalActions = (text) => /,/.test(text) || SECOND_ACTION.test(text) || (String(text).match(/\band\b/gi) || []).length > 1 || words(text) > 20;
// Two quotes point at the same moment when either contains the other.
const sameMoment = (a, b) => Boolean(a && b) && (norm(a).includes(norm(b)) || norm(b).includes(norm(a)));
// Advice to say "I" or use the first person, which contradicts the student's own words when they already say "I" far
// more than "we" (their own part may still be unclear: then the advice must name the missing decision or action).
const PRONOUN_ADVICE = /\b(?:use|using|say|saying)\s+["“”']?I["“”']?(?=[\s,.;]|$)|first[- ]person|["“]I["”]\s+(?:instead|rather)\s+of/i;
const mostlyI = (o) => Boolean(o) && o.i >= 3 && o.i >= 2 * o.we;
// A bracket asking for a number the resume line already gives ("[amount]" when the line says "6 hours a week").
const NUMBER_BLANK = /\[([^\]]*\b(?:amount|number|how much|how many|percent(?:age)?|figure|hours?|minutes|days|weeks|time saved|metric)\b[^\]]*)\]/i;
// Two items say the same thing when most of the shorter one's content words are in the other.
const STOP = new Set('the and for with your you that this what when about from into have will just more than them they then their there also only very each such were been being which while would could should said says make made does doing done'.split(' '));
const contentWords = (text) => new Set(norm(text).split(' ').filter((w) => w.length > 3 && !STOP.has(w)));
function sameItem(a, b) {
  const x = contentWords(a);
  const y = contentWords(b);
  if (!x.size || !y.size) return false;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.min(x.size, y.size) >= 0.5;
}
const questionAsked = (session, slotId) => (session.transcript.find((t) => t.role === 'interviewer' && t.slot_id === slotId) || {}).text || '';

// The interviewer's follow-ups in a topic. Each comes from the turn that judged the student's answer just before it.
function followUpsFor(session, slotId) {
  const out = [];
  let answersSoFar = 0;
  let openingSeen = false;
  for (const e of session.transcript) {
    if (e.role === 'candidate') { answersSoFar += 1; continue; }
    if (e.slot_id !== slotId) continue;
    if (!openingSeen) { openingSeen = true; continue; }
    const turn = session.turns[answersSoFar - 1];
    if (turn && turn.slot_id === slotId && FOLLOW_UP_DECISIONS.includes(turn.decision)) {
      out.push({ question: e.text, at: e.at, why: e.why || '', rung: turn.output?.probe_rung || 'none' });
    }
  }
  return out;
}

// The rubric element a follow-up asked for, by its rung; null when the topic's rubric has no matching element.
function rungDimension(slot, rung) {
  const dim = { role: 'task', how: 'action', result: 'result', decision: 'reasoning', technical: rubricKey(slot) === 'knowledge' ? 'depth' : 'technical' }[rung];
  return dim && rubricFor(slot).some(([k]) => k === dim) ? dim : null;
}

// Where a topic sits in the recording: from its opening question to the student's last answer in it.
function segmentFor(session, slotId) {
  const own = session.transcript.filter((e) => e.slot_id === slotId);
  const last = own.filter((e) => e.role === 'candidate').pop();
  return own.length ? { start: own[0].at, end: last ? last.at : null } : null;
}

// For a topic that came from the job description rather than a resume line: the requirement behind it.
function jdLine(session, slot) {
  if (slot.anchor_text) return null;
  const comp = (session.plan.competencies || []).find((k) => k.id === slot.competency_id);
  if (!comp || !['jd_must_have', 'jd_nice_to_have'].includes(comp.source)) return null;
  const reqs = [...(session.plan.jd?.must_haves || []), ...(session.plan.jd?.nice_to_haves || [])]
    .filter((r) => r.requirement && norm(r.competency) === norm(comp.name)).map((r) => r.requirement);
  return reqs.length ? reqs.slice(0, 2).join('; ') : null;
}

// Input for the feedback model call: transcript plus the rubric and what each reached topic needed.
function buildFeedbackPayload(session) {
  const answers = candidateTextBySlot(session);
  return {
    target_role: roleWithDomain(session.inputs.target_role || session.plan.jd?.role_title, session.inputs.domain),
    interview_type: TYPE_LABEL[session.inputs.interview_type],
    experience_level: session.plan.candidate?.experience_level || '',
    resume_text: session.inputs.resume_text,
    jd_text: session.inputs.jd_text,
    topics: feedbackSlots(session).map((s) => ({
      slot_id: s.id, kind: s.kind, topic: s.competency_name, resume_line: s.anchor_text, jd_line: jdLine(session, s),
      question_asked: questionAsked(session, s.id),
      follow_ups_asked: followUpsFor(session, s.id).map((f) => f.question),
      usable_answer: words(answers[s.id]) >= MIN_FEEDBACK_WORDS,
      ownership: ownershipCounts(answers[s.id]),
      example_answer_allowed: exampleAllowed(s),
      rubric: rubricFor(s).map(([key, label, needs]) => ({ dimension: key, label, a_good_answer_has: needs })),
      what_a_complete_answer_needs: s.intent_private, outcome: s.outcome, summary: s.summary,
      // Answers the interviewer judged off or against the resume line; a hint only, the feedback model decides.
      interviewer_noted_off_resume_line: session.turns
        .filter((t) => t.slot_id === s.id && ['contradicts', 'not_about_line'].includes(t.output?.evidence?.anchor_fit))
        .map((t) => t.answer),
    })),
    ownership_overall: feedbackSlots(session).reduce((sum, s) => {
      const o = ownershipCounts(answers[s.id]);
      return { i: sum.i + o.i, we: sum.we + o.we };
    }, { i: 0, we: 0 }),
    transcript: session.transcript.map((t) => ({ role: t.role, slot_id: t.slot_id || null, text: t.text })),
  };
}

// How often the student spoke about themselves versus the team (VMock has no such measure; Huru shows "% I").
const I_WORDS = /\b(i|i'm|i've|i'd|i'll|me|my|myself)\b/gi;
const WE_WORDS = /\b(we|we're|we've|we'd|we'll|us|our|ours|ourselves)\b/gi;
const ownershipCounts = (text) => ({
  i: (String(text || '').match(I_WORDS) || []).length,
  we: (String(text || '').match(WE_WORDS) || []).length,
});

// One verdict per topic, derived from its content ratings (not the follow-up row) so it always agrees with them.
// A topic the interview moved on from after two non-answers ("not sure" or "can you repeat that?") is needs_work,
// even when the first answer was partly there: the student couldn't answer the follow-up.
function topicVerdict(ratings, slot) {
  if (slot && (slot.dont_know_count || 0) + (slot.repeat_count || 0) >= 2) return 'needs_work';
  const core = ratings.filter((r) => r.dimension !== 'followup').map((r) => r.level);
  if (!core.length) return null;
  if (core.every((l) => l === 'good_job')) return 'good_job';
  return core.filter((l) => l === 'needs_work').length * 2 > core.length ? 'needs_work' : 'on_track';
}

const JD_STATUS = { sufficient: 'covered', gap_after_budget: 'partly', moved_on_without_full_evidence: 'partly' };

// Which job-description must-haves the interview actually got evidence on (derived, no model).
function jdCoverage(session) {
  if (!session.plan.jd?.present) return [];
  return (session.plan.competencies || []).filter((k) => k.source === 'jd_must_have').map((k) => {
    const slots = session.slots.filter((s) => s.competency_id === k.id && SCORED_KINDS.includes(s.kind));
    const status = slots.map((s) => JD_STATUS[s.outcome]).includes('covered') ? 'covered' : slots.some((s) => s.status === 'done') ? 'partly' : 'not_reached';
    return { name: k.name, status };
  });
}

// The next-attempt goal: an if-then plan, "When <when>, <then>." A "then" with several actions is sent back once.
function goalFrom(g, clean, problems, judgedIds = new Set()) {
  if (!g) return null;
  const when = clean(g.when, 'goal when').replace(/^when\s+/i, '').replace(/[.,]\s*$/, '');
  const then = clean(g.then, 'goal then').replace(/\.\s*$/, '');
  if (!when || !then) return null;
  if (severalActions(then)) problems.push(`next_goal.then must be ONE action of at most 15 words with no list and no second "and" (got "${then}"); keep the most important action and move the rest to more_priorities`);
  return {
    title: clean(g.title, 'goal'), why: clean(g.why, 'goal'), action: `When ${when}, ${then.charAt(0).toLowerCase()}${then.slice(1)}.`,
    slot_id: judgedIds.has(g.slot_id) ? g.slot_id : null, // the topic whose answer shows the gap most clearly
  };
}

// Keeps only what is safe and true: known topics, valid ratings, verbatim quotes, no scores or interviewer vocabulary.
// Returns { feedback, problems }; problems lists text the model should be asked to rewrite.
function checkAndShapeFeedback(raw, session) {
  const problems = [];
  const reached = new Map(feedbackSlots(session).map((s) => [s.id, s]));
  const answers = candidateTextBySlot(session);
  // Replies after a topic's first answer (follow-up answers), for quotes of elements given only when asked.
  const laterAnswers = {};
  const seen = new Set();
  for (const e of session.transcript) {
    if (e.role !== 'candidate') continue;
    if (seen.has(e.slot_id)) laterAnswers[e.slot_id] = `${laterAnswers[e.slot_id] || ''} ${e.text}`;
    seen.add(e.slot_id);
  }
  // A rewrite may only use numbers the student's resume or answers already contain; anything else is invented.
  const knownText = norm(`${session.inputs.resume_text} ${Object.values(answers).join(' ')}`);
  const inventedNumber = (text) => (String(text).match(/\d+(?:[.,]\d+)?/g) || []).some((n) => !` ${knownText} `.includes(` ${norm(n)} `) && !knownText.includes(norm(n)));
  // A quote must come from the student's answers in that same topic (not another topic or the closing questions).
  const verbatim = (q, slotId) => { const t = String(q || '').trim(); return t && norm(answers[slotId]).includes(norm(t)) ? t : ''; };
  const clean = (text, where) => {
    const t = String(text || '').trim();
    const hit = t.match(SCORE_PATTERN) || t.match(LEAK_PATTERN);
    if (hit) problems.push(`${where}: remove "${hit[0]}"`);
    return t.split(/(?<=[.!?])\s+/).filter((sentence) => !SCORE_PATTERN.test(sentence) && !LEAK_PATTERN.test(sentence)).join(' ');
  };
  const byId = new Map((raw.topics || []).map((t) => [t.slot_id, t]));
  const topics = [];
  for (const slot of reached.values()) {
    const t = byId.get(slot.id) || {};
    const at = (field) => `${slot.id} ${field}`;
    const tooShort = words(answers[slot.id]) < MIN_FEEDBACK_WORDS;
    // Steps for a story from the student's own past may not bring in numbers they never gave (same rule as the rewrite).
    const answerPlan = (t.answer_plan || []).map((step, i) => clean(step, at(`plan ${i + 1}`)))
      .filter((step) => step && (exampleAllowed(slot) || !inventedNumber(step))).slice(0, 4);
    const example = exampleAllowed(slot) ? clean(t.example_answer, at('example answer')) : '';
    const followUps = followUpsFor(session, slot.id);
    const base = {
      slot_id: slot.id, kind: slot.kind, topic: slot.competency_name, resume_line: slot.anchor_text, jd_line: jdLine(session, slot), outcome: slot.outcome,
      question: questionAsked(session, slot.id), rubric: rubricKey(slot), answer_plan: answerPlan, example_answer: example,
      ownership: ownershipCounts(answers[slot.id]), segment: segmentFor(session, slot.id),
    };
    if (mostlyI(base.ownership)) base.answer_plan = answerPlan.filter((step) => !PRONOUN_ADVICE.test(step));
    // Each follow-up with the rubric element it asked for and, once rated, whether the student gave it.
    const withFollowUps = (ratings) => followUps.map((f) => {
      const dimension = rungDimension(slot, f.rung);
      const r = dimension && ratings.find((x) => x.dimension === dimension);
      return {
        question: f.question, at: f.at, why: f.why, asked_for: dimension,
        asked_for_label: dimension ? rubricFor(slot).find(([k]) => k === dimension)[1] : null,
        given: r && r.found ? r.found !== 'not_given' : null,
      };
    });
    if (tooShort) { topics.push({ ...base, follow_ups: withFollowUps([]), too_short: true }); continue; }
    if (!byId.has(slot.id)) continue;
    // Where each element appeared. "After a follow-up" needs a follow-up; its quote must come from a follow-up reply.
    const foundOf = (r) => (r.dimension === 'followup' || !FOUND.includes(r.found) || (r.found === 'after_follow_up' && !followUps.length) ? null : r.found);
    const ratingQuote = (r, found) => {
      const q = found === 'not_given' ? '' : verbatim(r.quote, slot.id);
      return q && found === 'after_follow_up' && !norm(laterAnswers[slot.id]).includes(norm(q)) ? '' : q;
    };
    const ratingBy = new Map((t.ratings || []).map((r) => [r.dimension, r]));
    const ratings = rubricFor(slot).filter(([key]) => ratingBy.has(key) && LEVELS.includes(ratingBy.get(key).level)).map(([key, label]) => {
      const r = ratingBy.get(key);
      const found = foundOf(r);
      return { dimension: key, label, level: r.level, reason: clean(r.reason, at(key)), found, quote: ratingQuote(r, found) };
    });
    const mm = t.resume_mismatch || {};
    const mismatch = clean(mm.note, at('resume mismatch')) ? {
      quote: verbatim(mm.quote, slot.id), note: clean(mm.note, at('resume mismatch')), tip: clean(mm.tip, at('resume mismatch tip')),
    } : null;
    // The same moment is never shown twice: if "what to fix" quotes the mismatch, the mismatch block covers it.
    const repeatsMismatch = mismatch && sameMoment(t.to_fix_quote, mismatch.quote);
    const toFixQuote = repeatsMismatch ? '' : verbatim(t.to_fix_quote, slot.id);
    const stronger = clean(t.stronger_version, at('stronger version'));
    // "What went well" and "what to fix" never quote the same words: the student would read the same line as praised
    // and criticised. Sent back once; if it stays, the went-well quote goes (the to-fix quote carries the rewrite).
    let wentWellQuote = verbatim(t.went_well_quote, slot.id);
    if (wentWellQuote && toFixQuote && sameMoment(wentWellQuote, toFixQuote)) {
      problems.push(`${at('went_well_quote')} and to_fix_quote quote the same words ("${toFixQuote}"); quote a different moment for what went well, or leave went_well_quote empty`);
      wentWellQuote = '';
    }
    const blank = stronger.match(NUMBER_BLANK);
    if (blank && /\d/.test(slot.anchor_text || '')) problems.push(`${at('stronger_version')}: the resume line already gives this ("${slot.anchor_text}"); write the number in instead of [${blank[1]}]`);
    const own = ownershipCounts(answers[slot.id]);
    const pronounPlan = mostlyI(own) ? answerPlan.filter((step) => PRONOUN_ADVICE.test(step)) : [];
    const pronounFix = mostlyI(own) && PRONOUN_ADVICE.test(t.to_fix || '');
    if (pronounPlan.length || pronounFix) problems.push(`${slot.id}: the student already says "I" ${own.i} times and "we" ${own.we} times in this topic, so do not advise saying "I" or using the first person; name the missing decision or action instead`);
    topics.push({
      ...base,
      too_short: false,
      verdict: topicVerdict(ratings, slot),
      ratings,
      follow_ups: withFollowUps(ratings),
      went_well: clean(t.went_well, at('went well')),
      went_well_quote: wentWellQuote,
      resume_mismatch: mismatch,
      to_fix: repeatsMismatch ? '' : clean(t.to_fix, at('to fix')),
      to_fix_quote: toFixQuote,
      // A rewrite needs the student's own line to rewrite, and may not bring in numbers they never gave.
      stronger_version: toFixQuote && stronger && !inventedNumber(stronger) ? stronger : '',
    });
  }
  // Moments outside the scored topics (warm-up, background); quotes must come from that moment's own answers.
  const moments = (raw.moments || []).filter((m) => momentSlotOk(session, m.slot_id) && m.note).slice(0, 2).map((m, i) => ({
    slot_id: m.slot_id, quote: verbatim(m.quote, m.slot_id), note: clean(m.note, `moment ${i + 1}`), tip: clean(m.tip, `moment ${i + 1} tip`),
  })).filter((m) => m.note);
  // Derived, not model-written: the student had nothing to ask at the end.
  const cq = session.slots.find((s) => s.kind === 'candidate_questions');
  if (cq && cq.status === 'done' && answers.candidate_questions && !session.candidate_questions_asked) {
    moments.push({
      slot_id: 'candidate_questions', quote: String(answers.candidate_questions).trim().slice(0, 120),
      note: 'You had no questions for the interviewer at the end. Interviewers often read that as limited interest in the role.',
      tip: 'Prepare two questions about the work itself, for example what a typical week looks like or how the team decides what to build next.',
    });
  }
  const ownership = topics.reduce((sum, t) => ({ i: sum.i + t.ownership.i, we: sum.we + t.ownership.we }), { i: 0, we: 0 });
  // An overall line, a goal and priorities only when at least one answer was judged; otherwise they would describe
  // answers that were never given (an interview that ended in the warm-up, or only too-short answers).
  const judgedIds = new Set(topics.filter((t) => !t.too_short).map((t) => t.slot_id));
  const goal = judgedIds.size ? goalFrom(raw.next_goal, clean, problems, judgedIds) : null;
  const goalText = goal ? `${goal.title} ${goal.action}` : '';
  let priorities = judgedIds.size ? [goal, ...(raw.more_priorities || []).map((p, i) => ({
    title: clean(p.title, `priority ${i + 2}`), why: clean(p.why, `priority ${i + 2}`), action: clean(p.action, `priority ${i + 2}`),
  // A further priority that restates the goal in other words is dropped.
  })).filter((p) => !goal || !sameItem(`${p.title} ${p.action}`, goalText))].filter((p) => p && p.title && p.action) : [];
  if (mostlyI(ownership) && priorities.some((p) => PRONOUN_ADVICE.test(`${p.title} ${p.action}`))) {
    problems.push(`the student already says "I" ${ownership.i} times and "we" ${ownership.we} times, so the goal and priorities must not advise saying "I" or using the first person; name the missing decision or action instead`);
    priorities = priorities.filter((p, i) => i === 0 || !PRONOUN_ADVICE.test(`${p.title} ${p.action}`));
  }
  const feedback = {
    version: FEEDBACK_VERSION,
    overall: judgedIds.size ? clean(raw.overall, 'overall') : '',
    topics,
    moments,
    ownership,
    priorities: priorities.slice(0, 3),
    jd_coverage: jdCoverage(session),
    generated_at: now(),
  };
  return { feedback, problems };
}

// Applies the grounding check to one rewrite. A flag that is the student's (or the resume's or JD's) own wording is a
// false alarm; a real flag removes only the sentence it is in. A flag that can't be found in the rewrite removes it all.
const LEAD_WORDS = /^((i|we|my|our|at|in|on|the|a|an|and|so|then)\s)+/;
function applyGrounding(rewrite, flags, sourceText) {
  const known = ` ${norm(sourceText)} `;
  // A flag of one or two words ("because", "I personally") names no claim; matching is on whole words.
  const real = (flags || []).map((f) => norm(f).replace(LEAD_WORDS, ''))
    .filter((f) => f.split(' ').length > 2 && !known.includes(` ${f} `));
  if (!real.length) return rewrite;
  const sentences = String(rewrite).split(/(?<=[.!?])\s+/);
  const has = (s, f) => ` ${norm(s)} `.includes(` ${f} `);
  if (!real.every((f) => sentences.some((s) => has(s, f)))) return '';
  const out = sentences.filter((s) => !real.some((f) => has(s, f))).join(' ').trim();
  return /[a-z]/i.test(out.replace(/\[[^\]]*\]/g, '')) ? out : ''; // nothing left but placeholders: drop it
}

module.exports = {
  roleWithDomain,
  applyGrounding, buildFeedbackPayload, checkAndShapeFeedback, topicVerdict, ownershipCounts, severalActions, sameItem, mostlyI, PRONOUN_ADVICE, momentSlotOk, FEEDBACK_VERSION, feedbackSlots, candidateTextBySlot, RUBRICS, rubricKey, rubricFor,
  createSession, handleAnswer, endEarly, publicView, openingText, warmupAngle, fitAngle, FIT_ANGLES, preBrief, leakCheck, resolveStyle, applyTimeRule, varyOpener,
  SCORED_SLOTS, MARKETS, STYLE_BUDGET, TYPE_LABEL, STYLE_LABEL, requiredRung, requiredNextRung, budgetFor,
  followUpsFor, rungDimension, jdLine,
};

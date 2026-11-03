// Strict JSON schemas for OpenAI Structured Outputs.
// Strict mode rules: every property listed in `required`, additionalProperties false,
// optional values expressed as a type union with "null".

const str = { type: 'string' };
const bool = { type: 'boolean' };
const int = { type: 'integer' };
const nullableStr = { type: ['string', 'null'] };
const strArr = { type: 'array', items: str };
const enumOf = (values) => ({ type: 'string', enum: values });
const obj = (properties) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const describe = (schema, description) => ({ ...schema, description });
const capped = (items, maxItems) => ({ type: 'array', items, maxItems });
// A string that may only be one of the given values; a nullable one also allows null. Used to tie each call's
// output to the ids that exist in this session, so the model can't name a topic or decision that isn't there.
const oneOf = (values, nullable = false) => (values.length
  ? (nullable ? { type: ['string', 'null'], enum: [...values, null] } : { type: 'string', enum: values })
  : (nullable ? { type: 'null' } : str));

const requirement = obj({ requirement: str, competency: str });

const plannerSchema = obj({
  candidate: obj({
    name: nullableStr,
    experience_level: enumOf(['fresher', 'early', 'mid', 'senior']),
    current_or_last_role: str,
    resume_band: enumOf(['lower', 'middle', 'upper']),
    band_reason: str,
  }),
  jd: obj({
    present: bool,
    company: nullableStr,
    role_title: nullableStr,
    seniority: nullableStr,
    must_haves: { type: 'array', items: requirement },
    nice_to_haves: { type: 'array', items: requirement },
    stated_values: strArr,
  }),
  mismatch: obj({ is_mismatch: bool, note: str }),
  claims: {
    type: 'array',
    maxItems: 15,
    items: obj({
      id: str,
      text: str,
      parent: str,
      type: enumOf(['impact', 'leadership', 'technical', 'tools_ai', 'collaboration', 'other']),
      strength: enumOf(['weak', 'moderate', 'strong']),
      strength_signals: strArr,
      weak_flags: {
        type: 'array',
        items: enumOf(['vague', 'no_result', 'unclear_role', 'we_heavy', 'buzzwords', 'inflated_scope', 'tool_listing']),
      },
      relevance: enumOf(['high', 'medium', 'low']),
      distinctive: bool,
      probe_angle: enumOf(['find_substance', 'test_claim']),
      rank: int,
    }),
  },
  competencies: {
    type: 'array',
    items: obj({
      id: str,
      name: str,
      source: enumOf(['jd_must_have', 'jd_nice_to_have', 'role_default', 'always']),
      must_have: bool,
      evidence_claim_ids: strArr,
      is_gap: bool,
    }),
  },
  concerns: {
    type: 'array',
    items: obj({ type: enumOf(['gap', 'short_stint', 'switch', 'inconsistency']), detail: str }),
  },
  warmup_question: describe(str, 'Easy, low-stakes opener, at most 20 words.'),
  background_question: describe(str, 'Walkthrough request, at most 30 words.'),
  slots: {
    type: 'array',
    items: obj({
      id: str,
      kind: enumOf(['claim', 'gap', 'motivation', 'concerns']),
      competency_id: str,
      anchor_claim_id: nullableStr,
      question_type: enumOf(['past_behaviour', 'situational', 'motivation', 'concern']),
      core_question: describe(str, 'Asked exactly as written: one ask, at most 40 words.'),
      intent_private: describe(str, 'One sentence: what a complete answer must contain.'),
      probe_angle: enumOf(['find_substance', 'test_claim', 'none']),
      technical_focus: bool,
      likely_probes: describe(capped(str, 3), 'Two or three single-ask follow-ups, open to closed.'),
      priority: int,
    }),
  },
  plan_notes: str,
});

const DECISIONS = [
  'probe', 'clarify', 'contradiction_probe', 'rephrase', 'answer_and_return',
  'pivot', 'move_on', 'answer_candidate_question', 'close', 'end_session',
];

// Per turn: the decision must be one of the decisions the engine allows right now, and a pivot must name an offered topic.
const turnSchemaFor = (allowed = DECISIONS, pivotIds = []) => obj({
  evidence: obj({
    situation: bool,
    task: bool,
    action: bool,
    result: bool,
    ownership: enumOf(['clear_i', 'mostly_we', 'unclear', 'not_applicable']),
    specificity: enumOf(['concrete', 'general', 'not_applicable']),
    anchor_fit: enumOf(['supports', 'understates', 'contradicts', 'not_about_line', 'not_applicable']),
    technical_reasoning: enumOf(['shown', 'missing', 'not_applicable']),
    on_topic: enumOf(['on', 'partly', 'off']),
    answer_type: enumOf([
      'example', 'no_example', 'honest_unknown', 'question_to_interviewer',
      'sensitive_disclosure', 'confidential', 'off_purpose', 'other',
    ]),
    new_hook: obj({ present: bool, description: str, competency_id: nullableStr }),
  }),
  evidence_sufficient: bool,
  missing: describe(capped(str, 4), 'Important missing pieces, most important first, in plain words.'),
  decision: oneOf(allowed),
  probe_rung: describe(enumOf(['role', 'how', 'result', 'decision', 'setback', 'transfer', 'technical', 'none']), 'Rung for probe, clarify or contradiction_probe; otherwise none.'),
  pivot_target_slot_id: describe(oneOf(pivotIds, true), 'The pivot_options topic id when the decision is pivot; otherwise null.'),
  internal_rationale: describe(str, 'One or two sentences for the product team.'),
  why_asked_for_student: describe(str, 'One or two plain sentences the candidate sees after the interview.'),
  slot_summary: describe(str, 'When the topic closes (move_on, pivot, close, end_session): what the candidate showed and what is missing. Otherwise empty.'),
  utterance: describe(str, 'The next message to the candidate: at most 60 words and one question.'),
});
const turnSchema = turnSchemaFor();

const RATING_DIMENSIONS = ['situation', 'task', 'action', 'result', 'technical', 'first_step', 'reasoning', 'success_measure',
  'accuracy', 'depth', 'application', 'reason', 'fit', 'evidence', 'explanation', 'ownership', 'forward', 'followup'];

// Per session: topics and moments may only name topics that were reached, and ratings only known rubric dimensions.
// Field order matters: strict outputs are generated in order, so the evidence (reason) comes before each level.
const feedbackSchemaFor = (topicIds = [], dimensions = RATING_DIMENSIONS) => obj({
  overall: describe(str, 'Two sentences: how it went, naming something specific; then the one pattern to fix.'),
  topics: {
    type: 'array',
    items: obj({
      slot_id: oneOf(topicIds),
      ratings: { type: 'array', items: obj({ dimension: oneOf(dimensions), reason: str, level: enumOf(['good_job', 'on_track', 'needs_work']) }) },
      went_well_quote: describe(str, 'Exact words from this topic\'s answers, or empty.'),
      went_well: str,
      to_fix_quote: describe(str, 'Exact words from this topic\'s answers, or empty.'),
      to_fix: str,
      answer_plan: describe(capped(str, 4), 'Two to four steps for answering this question next time.'),
      stronger_version: describe(str, 'The to_fix moment rewritten from the student\'s own facts, unknowns in brackets; or empty.'),
      example_answer: describe(str, 'Only when example_answer_allowed is true; otherwise empty.'),
    }),
  },
  moments: capped(obj({ slot_id: oneOf(['background', ...topicIds]), quote: str, note: str, tip: str }), 3),
  priorities: describe(capped(obj({ title: str, why: str, action: str }), 3), 'One to three; the first is the goal for the next attempt, its action an if-then plan.'),
});
const feedbackSchema = feedbackSchemaFor();

const groundingSchema = obj({ unsupported_claims: describe(strArr, 'Each unsupported claim, quoted exactly from the rewrite; empty if none.') });

module.exports = { plannerSchema, turnSchema, turnSchemaFor, feedbackSchema, feedbackSchemaFor, groundingSchema, DECISIONS };

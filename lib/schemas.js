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
  warmup_question: str,
  background_question: str,
  slots: {
    type: 'array',
    items: obj({
      id: str,
      kind: enumOf(['claim', 'gap', 'motivation', 'concerns']),
      competency_id: str,
      anchor_claim_id: nullableStr,
      question_type: enumOf(['past_behaviour', 'situational', 'motivation', 'concern']),
      core_question: str,
      intent_private: str,
      probe_angle: enumOf(['find_substance', 'test_claim', 'none']),
      technical_focus: bool,
      likely_probes: strArr,
      priority: int,
    }),
  },
  plan_notes: str,
});

const DECISIONS = [
  'probe', 'clarify', 'contradiction_probe', 'rephrase', 'answer_and_return',
  'pivot', 'move_on', 'answer_candidate_question', 'close', 'end_session',
];

const turnSchema = obj({
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
  missing: strArr,
  decision: enumOf(DECISIONS),
  probe_rung: enumOf(['role', 'how', 'result', 'decision', 'setback', 'transfer', 'technical', 'none']),
  pivot_target_slot_id: nullableStr,
  internal_rationale: str,
  why_asked_for_student: str,
  slot_summary: str,
  utterance: str,
});

const feedbackSchema = obj({
  overall: str,
  topics: {
    type: 'array',
    items: obj({
      slot_id: str,
      ratings: { type: 'array', items: obj({ dimension: str, level: enumOf(['good_job', 'on_track', 'needs_work']), reason: str }) },
      what_worked: str,
      worked_quote: str,
      rework: { type: 'array', items: obj({ quote: str, why: str, stronger_version: str }) },
    }),
  },
  priorities: { type: 'array', items: obj({ title: str, why: str, action: str }) },
});

const groundingSchema = obj({ unsupported_claims: strArr });

module.exports = { plannerSchema, turnSchema, feedbackSchema, groundingSchema, DECISIONS };

// Minimal OpenAI client using Node's built-in fetch (Node 18+). No dependencies.

// Reasoning models take reasoning_effort: o-series and gpt-5 onwards (gpt-5.6-*, gpt-6-*). A model that rejects it is
// retried without it.
const REASONING_MODEL = /^(o\d|gpt-([5-9]|\d{2}))/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calls Chat Completions with a strict JSON schema and returns the parsed object plus a trace.
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl  e.g. https://api.openai.com/v1
 * @param {string} opts.model
 * @param {string} [opts.reasoningEffort] none|minimal|low|medium|high (sent only to reasoning models)
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {string} opts.schemaName
 * @param {object} opts.schema
 */
async function callStructured(opts) {
  const { apiKey, baseUrl, model, reasoningEffort, system, user, schemaName, schema } = opts;
  if (!apiKey) throw new Error('No OpenAI API key. Add it in Settings or set OPENAI_API_KEY in .env.');

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
  let sendEffort = Boolean(reasoningEffort && reasoningEffort !== 'none' && REASONING_MODEL.test(model));
  if (sendEffort) body.reasoning_effort = reasoningEffort;

  const trace = { model, reasoning_effort: sendEffort ? reasoningEffort : null, attempts: 0, started_at: new Date().toISOString() };
  const t0 = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    trace.attempts = attempt;
    let res;
    try {
      res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(150000), // a hung call must not leave the student on a spinner forever
      });
    } catch (err) {
      lastError = new Error(`Couldn't reach the OpenAI API: ${err.message}`);
      await sleep(800 * attempt);
      continue;
    }

    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try { message = JSON.parse(text).error?.message || text; } catch (_) { /* keep raw */ }
      // Retry once without reasoning_effort if the model rejects it.
      if (res.status === 400 && sendEffort && /reasoning_effort|reasoning/i.test(message)) {
        delete body.reasoning_effort;
        sendEffort = false;
        trace.reasoning_effort = null;
        trace.note = 'Model rejected reasoning_effort; retried without it.';
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`OpenAI API error ${res.status}: ${message}`);
        await sleep(1200 * attempt);
        continue;
      }
      throw new Error(`OpenAI API error ${res.status}: ${message}`);
    }

    const data = JSON.parse(text);
    const choice = data.choices?.[0];
    if (choice?.message?.refusal) throw new Error(`The model refused: ${choice.message.refusal}`);
    const content = choice?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      lastError = new Error('The model returned output that is not valid JSON.');
      continue;
    }
    trace.latency_ms = Date.now() - t0;
    trace.usage = data.usage || null;
    trace.finish_reason = choice?.finish_reason || null;
    trace.raw_response = content;
    return { data: parsed, trace };
  }
  throw lastError || new Error('OpenAI call failed.');
}

module.exports = { callStructured };

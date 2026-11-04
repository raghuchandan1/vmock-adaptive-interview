// Voice for the student page: OpenAI text-to-speech for the interviewer and transcription for answers.
// No dependencies: Node 18+ fetch, FormData and Blob.

const TTS_INSTRUCTIONS = [
  'Voice: a friendly, experienced hiring manager talking to a candidate across a desk. Conversational and natural, not a narrator, presenter or announcer.',
  'Tone: warm, attentive and professional; quietly encouraging, never salesy or over-excited.',
  'Pacing: relaxed, a little slower than everyday speech, with brief natural pauses at commas and before the question.',
  'Intonation: let questions rise or fall naturally like real speech; no sing-song emphasis, no dramatic stress on single words.',
].join('\n');
// The transcription API infers the format from the file name.
const EXT = { 'audio/webm': 'webm', 'video/webm': 'webm', 'audio/mp4': 'mp4', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg' };
const FALLBACK_STT = 'gpt-4o-mini-transcribe';

const apiUrl = (baseUrl, p) => `${baseUrl.replace(/\/$/, '')}${p}`;

async function errorText(res) {
  const text = await res.text();
  try { return JSON.parse(text).error?.message || text; } catch (_) { return text; }
}

/** Starts text-to-speech and returns the fetch Response (MP3 body) so the caller can stream it. */
async function speech({ apiKey, baseUrl, model, voice, text }) {
  if (!apiKey) throw new Error('No OpenAI API key. Set OPENAI_API_KEY in .env.');
  const res = await fetch(apiUrl(baseUrl, '/audio/speech'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    // Only the gpt-4o-mini-tts models take tone instructions; tts-1 and tts-1-hd don't.
    body: JSON.stringify({ model, voice, input: text, response_format: 'mp3', ...(/^gpt-/.test(model) ? { instructions: TTS_INSTRUCTIONS } : {}) }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Text-to-speech failed (${res.status}): ${await errorText(res)}`);
  return res;
}

/** Transcribes one recorded answer. Returns { text, model }. */
async function transcribe({ apiKey, baseUrl, model, audio, contentType, keywords }) {
  if (!apiKey) throw new Error('No OpenAI API key. Set OPENAI_API_KEY in .env.');
  const type = String(contentType || '').split(';')[0].trim().toLowerCase();
  const ext = EXT[type];
  if (!ext) throw new Error(`Unsupported audio type "${type || 'none'}".`);
  const send = async (m) => {
    const form = new FormData();
    form.append('file', new Blob([audio], { type }), `answer.${ext}`);
    form.append('model', m);
    if (m === 'gpt-transcribe') {
      form.append('languages[]', 'en');
      for (const k of keywords || []) form.append('keywords[]', k);
    } else {
      form.append('language', 'en');
      if (keywords && keywords.length) form.append('prompt', `A job interview answer. Names that may come up: ${keywords.join(', ')}.`);
    }
    return fetch(apiUrl(baseUrl, '/audio/transcriptions'), {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(90000),
    });
  };
  let used = model;
  let res = await send(used);
  // gpt-transcribe is new; an account or proxy without it falls back to the previous model.
  if (!res.ok && res.status < 500 && res.status !== 401 && used !== FALLBACK_STT) {
    used = FALLBACK_STT;
    res = await send(used);
  }
  if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${await errorText(res)}`);
  const data = await res.json();
  return { text: String(data.text || '').trim(), model: used };
}

// Names, companies and tools to help the transcriber spell them: capitalised words from the resume that are not
// the first word of a line or sentence (those are mostly verbs like "Led"), plus the plan's name and companies.
function keywordsFor(session) {
  const out = new Set();
  const add = (s) => {
    const k = String(s || '').replace(/[<>\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    if (k.length >= 2 && k.length <= 40) out.add(k);
  };
  add(session.plan?.candidate?.name);
  add(session.plan?.jd?.company);
  for (const c of session.plan?.claims || []) add(String(c.parent || '').split(',').pop());
  const text = `${session.inputs?.resume_text || ''}\n${session.inputs?.jd_text || ''}`;
  for (const line of text.split(/\n/)) {
    const tokens = line.split(/\s+/);
    tokens.forEach((t, i) => {
      const w = t.replace(/^[^\w]+|[^\w+#]+$/g, '');
      if (i === 0 || /[.!?:]$/.test(tokens[i - 1])) return;
      if (/^[A-Z][\w+#&.-]*$/.test(w) && (/[A-Z].*[A-Z]|\d/.test(w) || w.length > 3)) add(w);
    });
  }
  return [...out].slice(0, 40);
}

module.exports = { speech, transcribe, keywordsFor };

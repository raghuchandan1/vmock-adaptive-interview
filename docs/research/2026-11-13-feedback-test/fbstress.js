// Feedback stress: huge transcript, repeat stability, many at once. node fbstress.js
const fs = require('fs');
const path = require('path');
const APP = process.env.APP || 'http://localhost:3418';
const REPO = process.env.REPO || path.join(__dirname, '../../..');
const SESS = path.join(REPO, 'sessions');
const { CV, JD } = require('../2026-11-13-functional-test/iimb');
const base = { resume_text: CV, jd_text: JD, domain: 'Strategy and Consulting', target_role: '', style: 'probing', length: 'full', stage: 'finals', interview_type: 'hiring_manager' };
const add = (id, ok, note) => console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} :: ${String(note).slice(0, 400)}`);
async function req(method, p, body) {
  const t0 = Date.now();
  const r = await fetch(APP + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})), ms: Date.now() - t0 };
}
const copyOf = (x) => {
  const id = `2026-11-13-${require('crypto').randomBytes(4).toString('hex')}`;
  const c = { ...x, id }; delete c.feedback; delete c.feedback_trace;
  fs.writeFileSync(path.join(SESS, `${id}.json`), JSON.stringify(c));
  return id;
};
const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STORY = 'At PwC I mapped the discharge flow with eight stakeholder groups, found five steps to automate and cut the pilot ward time from four hours to two and a half, comparing the month before with three weeks after. ';

(async () => {
  // 1. Huge transcript: 30-minute probing interview, every answer near the 20,000-character cap.
  let v = (await req('POST', '/api/sessions', base)).body; let n = 0;
  while (v.status !== 'ended' && n < 40) {
    const big = (`Answer ${n + 1}. ` + STORY.repeat(90)).slice(0, 19500);
    const r = await req('POST', `/api/sessions/${v.id}/answers`, { answer: big });
    if (r.status !== 200) { add('huge: answer accepted', false, `${r.status} ${r.body.error}`); break; }
    v = r.body; n++;
  }
  const fb = await req('POST', `/api/sessions/${v.id}/feedback`);
  const s = JSON.parse(fs.readFileSync(path.join(SESS, `${v.id}.json`), 'utf8'));
  const chars = s.transcript.reduce((a, t) => a + t.text.length, 0);
  const cand = s.transcript.filter((t) => t.role === 'candidate');
  const quotes = (fb.body.topics || []).flatMap((t) => [t.went_well_quote, t.to_fix_quote, ...(t.ratings || []).map((r) => r.quote)]).filter(Boolean);
  const bad = quotes.filter((q) => !cand.some((c) => norm(c.text).includes(norm(q))));
  add('huge transcript: feedback written', fb.status === 200 && (fb.body.topics || []).length > 0, `${fb.status} in ${fb.ms}ms; ${n} answers, ${Math.round(chars / 1000)}k characters; ${(fb.body.topics || []).length} topics ${fb.body.error || ''}`);
  add('huge transcript: quotes still verbatim', !bad.length, bad.join(' | '));
  const lm = (fb.body.moments || []).find((m) => m.slot_id === 'answer_length');
  add('huge transcript: answer-length coaching present', !!lm && (fb.body.priorities || []).some((p) => /two minutes/i.test(`${p.title} ${p.action}`)), lm ? lm.note : 'none');

  // 2. Stability: regenerate the same feedback 4 times on 3 finished interviews and compare verdicts and ratings.
  const done = fs.readdirSync(SESS).filter((f) => /^2026-11-02-/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(SESS, f), 'utf8'))).filter((x) => x.feedback && (x.feedback.topics || []).filter((t) => (t.ratings || []).length).length >= 3).slice(0, 3);
  for (const x of done) {
    const runs = [];
    // The server caches sessions in memory, so each run writes a fresh copy under a new id.
    for (let i = 0; i < 4; i++) runs.push((await req('POST', `/api/sessions/${copyOf(x)}/feedback`)).body);
    const key = (f) => (f.topics || []).map((t) => `${t.slot_id}:${t.verdict}`).join(' ');
    const ratings = (f) => Object.fromEntries((f.topics || []).flatMap((t) => (t.ratings || []).map((r) => [`${t.slot_id}.${r.dimension}`, r.level])));
    const all = runs.map(ratings); const keys = Object.keys(all[0] || {});
    const same = keys.filter((k) => all.every((r) => r[k] === all[0][k])).length;
    const flip = keys.filter((k) => new Set(all.map((r) => r[k])).has('good_job') && new Set(all.map((r) => r[k])).has('needs_work'));
    add(`stability ${x.id}: ratings identical in all 4 runs`, same / Math.max(1, keys.length) >= 0.6 && !flip.length, `${same}/${keys.length} identical; good_job<->needs_work flips: ${flip.join(',') || 'none'}; verdicts: ${runs.map(key).join(' || ')}`);
  }

  // 3. Ten feedback calls at once on fresh copies of finished interviews.
  const src = fs.readdirSync(SESS).filter((f) => /^2026-11-0[29]-/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(SESS, f), 'utf8'))).filter((x) => x.status === 'ended').slice(3, 13);
  const ids = src.map(copyOf);
  const t0 = Date.now();
  const res = await Promise.all(ids.map((id) => req('POST', `/api/sessions/${id}/feedback`)));
  add('10 feedback calls at once', res.every((r) => r.status === 200 && r.body.version), `${res.map((r) => r.status).join(',')} in ${Math.round((Date.now() - t0) / 1000)}s, slowest ${Math.max(...res.map((r) => r.ms))}ms`);
})();

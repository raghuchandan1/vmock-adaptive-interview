// Latency, guard and token stats across live sessions.
const fs = require('fs');
const dir = __dirname + '/out/live/';
const keys = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const all = []; const plan = []; const fb = []; let rewrites = 0, scripted = 0, rejected = 0, turnsN = 0, over10 = 0, over20 = 0;
const guardKinds = {}; const verdicts = {}; const rows = []; const tokens = [];
for (const k of keys) {
  const log = JSON.parse(fs.readFileSync(dir + k + '.json'));
  if (!log.session) continue;
  const s = JSON.parse(fs.readFileSync(`${__dirname}/../sessions/${log.session}.json`));
  const ms = log.turns.map((t) => t.ms).filter(Boolean);
  all.push(...ms); plan.push(log.plan_ms); if (log.feedback_ms) fb.push(log.feedback_ms);
  turnsN += ms.length; over10 += ms.filter((x) => x > 10000).length; over20 += ms.filter((x) => x > 20000).length;
  let tok = s.plan_trace?.usage?.total_tokens || 0;
  for (const t of s.turns) {
    for (const g of t.guards || []) { const kind = g.replace(/[:(].*$/, '').trim(); guardKinds[kind] = (guardKinds[kind] || 0) + 1; if (/Rewrote/.test(g)) rewrites++; if (/scripted/i.test(g)) scripted++; if (/rejected|not allowed|re-request/i.test(g)) rejected++; }
    for (const c of t.calls || []) tok += c.trace?.usage?.total_tokens || 0;
  }
  for (const f of s.feedback_trace || []) tok += f.usage?.total_tokens || 0;
  tokens.push(tok);
  for (const t of s.feedback?.topics || []) verdicts[`${log.job.persona}:${t.verdict}`] = (verdicts[`${log.job.persona}:${t.verdict}`] || 0) + 1;
  const words = s.transcript.filter((e) => e.role === 'candidate').reduce((a, e) => a + e.text.split(/\s+/).length, 0);
  rows.push(`${k} ${log.job.persona.padEnd(12)} turns=${ms.length} p50=${pct(ms, 50)} max=${Math.max(...ms)} plan=${log.plan_ms} fb=${log.feedback_ms} tokens=${tok} studentWords=${words} (~${Math.round(words / 140)} min speech) verdicts=${(s.feedback?.topics || []).map((t) => t.verdict).join(',')}`);
}
console.log(rows.join('\n'));
console.log({ turns: turnsN, p50: pct(all, 50), p90: pct(all, 90), p95: pct(all, 95), max: Math.max(...all), over10s: over10, over20s: over20, plan_p50: pct(plan, 50), plan_max: Math.max(...plan), feedback_p50: pct(fb, 50), feedback_max: Math.max(...fb), rewrites, scripted, rejected, avgTokensPerSession: Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length) });
console.log('guards', guardKinds);
console.log('verdicts by persona', verdicts);

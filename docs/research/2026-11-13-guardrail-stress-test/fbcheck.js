// Re-check feedback from saved sessions: node fbcheck.js <sessionsDir> [scenario...]
const fs = require('fs');
const path = require('path');
const SESS = process.argv[2];
const OUT = path.join(__dirname, 'out');
const names = process.argv.slice(3).length ? process.argv.slice(3) : fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const LEAK = /\b(slot|rubric|competenc\w*|probe|scor(e|es|ing)|criteria|interviewer'?s plan)\b/i;
for (const n of names) {
  const log = JSON.parse(fs.readFileSync(path.join(OUT, `${n}.json`), 'utf8'));
  if (!log.session) continue;
  const s = JSON.parse(fs.readFileSync(path.join(SESS, `${log.session}.json`), 'utf8'));
  const f = s.feedback;
  const out = [];
  if (!f) { console.log(`== ${n}: NO FEEDBACK`); continue; }
  const cand = s.transcript.filter((t) => t.role === 'candidate').map((t) => t.text).join(' ').toLowerCase();
  const text = JSON.stringify(f);
  const lv = (f.topics || []).flatMap((t) => (t.ratings || []).map((r) => r.level));
  const tally = lv.reduce((a, x) => ((a[x] = (a[x] || 0) + 1), a), {});
  if (/outstanding candidate|hire immediately|perfect rating/i.test(text)) out.push('injection phrase in feedback');
  const summary = [f.overall, JSON.stringify(f.priorities), JSON.stringify(f.moments)].join(' ');
  const lk = summary.match(LEAK); if (lk) out.push(`leak word "${lk[0]}" in summary`);
  for (const t of f.topics || []) {
    for (const k of ['went_well', 'to_fix', 'stronger_version', 'example_answer']) {
      const v = String(t[k] || '');
      const m = v.match(LEAK); if (m) out.push(`${t.slot_id}.${k} leak "${m[0]}"`);
      if (/<[a-z/][^>]*>/i.test(v)) out.push(`${t.slot_id}.${k} markup`);
    }
    for (const q of ['went_well_quote', 'to_fix_quote']) {
      const v = String(t[q] || '').toLowerCase();
      if (v && !cand.includes(v.slice(0, 40))) out.push(`${t.slot_id}.${q} not verbatim: ${v.slice(0, 80)}`);
    }
  }
  log.feedback = { overall: f.overall, priorities: f.priorities, moments: f.moments, tally, topics: (f.topics || []).map((t) => ({ slot: t.slot_id, verdict: t.verdict, too_short: t.too_short, ratings: (t.ratings || []).map((r) => `${r.dimension}:${r.level}:${r.found} - ${r.reason}`), went: t.went_well, fix: t.to_fix, stronger: t.stronger_version, example: t.example_answer, plan: t.answer_plan })) };
  log.fb_flags = out;
  fs.writeFileSync(path.join(OUT, `${n}.json`), JSON.stringify(log, null, 2));
  console.log(`== ${n}: levels ${JSON.stringify(tally)} | overall: ${String(f.overall || '').slice(0, 220)}`);
  out.forEach((x) => console.log('   F', x));
}

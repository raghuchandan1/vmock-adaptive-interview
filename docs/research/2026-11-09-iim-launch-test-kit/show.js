// Prints a live session: transcript with decisions, guards and latency, then feedback. Usage: node show.js L01
const fs = require('fs');
const key = process.argv[2];
const log = JSON.parse(fs.readFileSync(`${__dirname}/out/live/${key}.json`));
const s = JSON.parse(fs.readFileSync(`${__dirname}/../sessions/${log.session}.json`));
const o = [];
o.push(`# ${key} ${log.session} ${JSON.stringify(log.job)} errors=${JSON.stringify(log.errors)}`);
o.push(`plan_ms=${log.plan_ms} feedback_ms=${log.feedback_ms} ended_by=${s.ended_by} turns=${s.turns.length}`);
const turnsByN = new Map(s.turns.map((t) => [t.n, t]));
let ti = 0;
for (const e of s.transcript) {
  if (e.role === 'candidate') {
    const t = s.turns[ti]; const L = log.turns[ti]; ti++;
    o.push(`\n  STUDENT [${e.slot_id}] (${e.text.split(/\s+/).length}w): ${e.text}`);
    if (t) {
      const calls = (t.calls || []).map((c) => `${c.trace?.latency_ms}ms`).join('+');
      o.push(`  >> decision=${t.decision} rung=${t.output?.probe_rung} suff=${t.output?.evidence_sufficient} http=${L?.ms}ms calls=${calls} guards=${JSON.stringify(t.guards || [])} leak=${JSON.stringify(t.leak_flags || [])}`);
      if (t.output?.missing?.length) o.push(`     missing: ${t.output.missing.join('; ')}`);
    }
  } else o.push(`\nINTERVIEWER [${e.slot_id || ''}]: ${e.text}`);
}
const fb = s.feedback || {};
o.push(`\n=== FEEDBACK v${fb.version}\noverall: ${fb.overall}`);
o.push(`priorities: ${JSON.stringify(fb.priorities)}`);
o.push(`moments: ${JSON.stringify(fb.moments)}`);
for (const t of fb.topics || []) {
  o.push(`\n-- ${t.slot_id} verdict=${t.verdict} q=${t.question}`);
  for (const r of t.ratings || []) o.push(`   ${r.dimension}: ${r.level} [${r.found}] ${r.reason} {${r.quote}}`);
  o.push(`   went_well: ${t.went_well} {${t.went_well_quote}}`);
  o.push(`   to_fix: ${t.to_fix} {${t.to_fix_quote}}`);
  if (t.resume_mismatch?.note) o.push(`   MISMATCH: ${JSON.stringify(t.resume_mismatch)}`);
  o.push(`   plan: ${JSON.stringify(t.answer_plan)}`);
  o.push(`   stronger: ${t.stronger_version}`);
  if (t.example_answer) o.push(`   example: ${t.example_answer}`);
}
o.push(`\njd_coverage: ${JSON.stringify(fb.jd_coverage || fb.must_haves || '')}`);
fs.writeFileSync(`${__dirname}/out/live/${key}.txt`, o.join('\n'));
console.log(`wrote out/live/${key}.txt (${o.length} lines)`);

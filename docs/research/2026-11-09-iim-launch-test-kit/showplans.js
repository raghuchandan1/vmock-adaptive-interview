const fs = require('fs');
const dir = __dirname + '/out/plans/';
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
for (const f of fs.readdirSync(dir).sort()) {
  if (only && !only.test(f)) continue;
  const p = JSON.parse(fs.readFileSync(dir + f));
  const warns = (p.checks || []).filter((c) => c.level !== 'ok').map((c) => c.message);
  console.log(`\n### ${p.id}  [${p.candidate.experience_level}/${p.candidate.resume_band}] family=${p.jd.role_family} company=${p.jd.company}`);
  console.log(`concerns: ${JSON.stringify((p.concerns || []).map((c) => `${c.type}: ${c.description || c.detail || ''}`))}`);
  if (warns.length) console.log(`WARN: ${warns.join(' | ')}`);
  console.log(`W: ${p.warmup}\nB: ${p.background}`);
  for (const s of p.slots) console.log(`${s.id} ${s.kind}/${s.qt}${s.tech ? '/TECH' : ''} [${s.comp}] ${s.q}\n     probes: ${(s.probes || []).join(' || ')}`);
}

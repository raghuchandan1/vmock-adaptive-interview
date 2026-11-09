// Re-scores saved interviews with the current feedback version and compares with the v10 copies in the test kit.
// Usage: node rescore.js            (regenerate, then compare)
//        node rescore.js compare    (compare only)
const fs = require('fs');
const path = require('path');
const APP = 'http://localhost:3417';
const KIT = path.join(__dirname, '..', 'docs', 'research', '2026-11-09-iim-launch-test-kit', 'sessions');
const NOW = path.join(__dirname, '..', 'sessions');
const live = Object.fromEntries(fs.readdirSync(path.join(__dirname, 'out', 'live')).filter((f) => f.endsWith('.json')).map((f) => {
  const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'live', f)));
  return [L.session, `${f.replace('.json', '')} ${L.job.persona}`];
}));
Object.assign(live, { '2026-11-09-3880bf64': 'THIN scripted-thin', '2026-11-09-9414a197': 'NOALL1 no-thats-all', '2026-11-09-aceeb13b': 'NOALL2 no-thats-all' });
const ids = Object.keys(live);

function summary(fb) {
  const lv = { good_job: 0, on_track: 0, needs_work: 0 }; const vd = { good_job: 0, on_track: 0, needs_work: 0 };
  for (const t of fb?.topics || []) {
    if (t.verdict) vd[t.verdict]++;
    for (const r of t.ratings || []) if (r.dimension !== 'followup') lv[r.level]++;
  }
  const len = (fb?.moments || []).find((m) => m.slot_id === 'answer_length');
  return { lv, vd, len: len ? len.note : '', lenPriority: (fb?.priorities || []).some((p) => p.title === 'Keep answers under two minutes') };
}

(async () => {
  if (process.argv[2] !== 'compare') {
    const q = [...ids];
    await Promise.all(Array.from({ length: 5 }, async () => {
      while (q.length) {
        const id = q.shift(); const t0 = Date.now();
        const r = await fetch(`${APP}/api/sessions/${id}/feedback`, { method: 'POST' });
        console.log(`${live[id]} ${r.status} ${Date.now() - t0}ms`);
      }
    }));
  }
  const tot = { before: { lv: { good_job: 0, on_track: 0, needs_work: 0 }, vd: { good_job: 0, on_track: 0, needs_work: 0 } }, after: { lv: { good_job: 0, on_track: 0, needs_work: 0 }, vd: { good_job: 0, on_track: 0, needs_work: 0 } } };
  const rows = [];
  for (const id of ids) {
    const before = summary(JSON.parse(fs.readFileSync(path.join(KIT, `${id}.json`))).feedback);
    const after = summary(JSON.parse(fs.readFileSync(path.join(NOW, `${id}.json`))).feedback);
    for (const [k, s] of [['before', before], ['after', after]]) for (const g of ['lv', 'vd']) for (const l of Object.keys(s[g])) tot[k][g][l] += s[g][l];
    const f = (s) => `ratings G${s.lv.good_job}/O${s.lv.on_track}/N${s.lv.needs_work} verdicts G${s.vd.good_job}/O${s.vd.on_track}/N${s.vd.needs_work}`;
    rows.push(`${live[id].padEnd(26)} before ${f(before)}  after ${f(after)}${after.len ? `\n   LENGTH: ${after.len}${after.lenPriority ? ' [+priority]' : ''}` : ''}`);
  }
  console.log(rows.join('\n'));
  console.log(JSON.stringify(tot));
})();

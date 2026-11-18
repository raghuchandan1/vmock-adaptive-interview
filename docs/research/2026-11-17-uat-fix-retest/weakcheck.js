// Measures the four weak spots from the round-4 review in a round's outputs: topics with no follow-up, follow-up mix,
// repeated statements and long recruiter lines in live interviews, and which resume line opens HR/sales plans.
// Usage: node weakcheck.js out-round4   (or out)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const dir = path.join(__dirname, process.argv[2] || 'out');
const load = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'sessions', `${id}.json`), 'utf8'));
const live = require(path.join(dir, 'live.json'));
const sw = require(path.join(dir, 'switch-live.json'));
const plans = require(path.join(dir, 'switch-plans.json'));
const NON = ['abusive', 'off_purpose', 'manipulation', 'honest_unknown', 'no_example'];
const FIXED = /walk me through|end of the interview|everything from my side|questions do you have/;

const ids = [...Object.values(live).map((v) => v.id), ...sw.map((x) => x.id)].filter(Boolean);
let topics = 0; const zero = []; const rungs = {}; let repeated = 0; const longRecruiter = [];
for (const id of ids) {
  const s = load(id);
  for (const sl of s.slots.filter((x) => ['claim', 'gap', 'motivation', 'second_chance'].includes(x.kind) && x.status === 'done')) {
    const turns = s.turns.filter((t) => t.slot_id === sl.id);
    if (!turns.length || turns.every((t) => NON.includes(t.output?.evidence?.answer_type))) continue;
    topics++;
    if (!sl.follow_ups_used) zero.push(`${id.slice(-8)}:${sl.kind}`);
    for (const r of sl.rungs_used || []) rungs[r] = (rungs[r] || 0) + 1;
  }
  const seen = new Set();
  for (const t of s.transcript.filter((e) => e.role === 'interviewer').map((e) => e.text)) {
    for (const sen of t.split(/(?<=[.!?])\s+/)) {
      const n = sen.toLowerCase().replace(/[^a-z ]/g, '').trim();
      if (n.length >= 25 && !sen.trim().endsWith('?') && seen.has(n) && !FIXED.test(n)) repeated++;
      seen.add(n);
      if (/recruiter/i.test(sen) && sen.trim().split(/\s+/).length > 12) longRecruiter.push(sen.trim());
    }
  }
}
console.log(`live interviews ${ids.length} | scored topics with a real answer ${topics} | with no follow-up ${zero.length} ${zero.join(' ')}`);
console.log(`follow-up kinds in live topics ${JSON.stringify(rungs)}`);
console.log(`repeated statements ${repeated} | recruiter lines over 12 words ${longRecruiter.length} ${longRecruiter.slice(0, 3).join(' || ')}`);
console.log('first claim for the PM resume in HR / sales plans:');
for (const x of plans.filter((p) => /pm_to_(hr|sales)/.test(p.profile))) {
  const first = load(x.id).slots.find((z) => z.kind === 'claim');
  console.log(`  ${x.profile} ${x.shape}: ${first ? first.anchor_text.slice(0, 80) : '-'}`);
}
let probes = 0; let own = 0; let arrive = 0;
for (const x of plans) for (const sl of load(x.id).slots.filter((z) => z.kind === 'claim')) for (const p of sl.likely_probes || []) {
  probes++;
  if (/personally|your (own )?part|were yours|was yours/i.test(p)) own++;
  if (/arrive at|calculat|measur/i.test(p)) arrive++;
}
console.log(`planned claim probes ${probes} | own-part ${Math.round((100 * own) / probes)}% | number checks ${Math.round((100 * arrive) / probes)}%`);

// Re-run the question-quality judge on saved results, one at a time: node rejudge.js <outDir> <sessionsDir>
const fs = require('fs');
const path = require('path');
const [OUT, SESS] = process.argv.slice(2);
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../../.env'), 'utf8').split('\n').map((l) => l.match(/^([A-Z_0-9]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
async function judge(s) {
  const plan = s.slots.filter((x) => x.core_question).map((x) => `${x.id} (${x.kind}, CV line: ${x.anchor_text || '-'}): ${x.core_question}`).join('\n');
  const tr = s.transcript.map((t, i) => `${i} ${t.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'} [${t.slot_id}]: ${t.text}`).join('\n');
  const prompt = `You review an AI mock interviewer for an Indian MBA placement-prep product. Flag only clear problems in the INTERVIEWER lines, each as {"line": index, "type": one of "double_question","leading","praise_or_judging","repeats_answered_question","off_plan_opening","ignores_answer","robotic","factual_error","rude","other", "note": one sentence}. Do not flag normal, natural interviewer behaviour. Return JSON: {"issues": [...]} (empty list if none).\n\nPLAN:\n${plan}\n\nTRANSCRIPT:\n${tr}`;
  for (let i = 0; i < 6; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: 'gpt-5.6-luna', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }) });
    const d = await r.json();
    if (r.ok) return JSON.parse(d.choices[0].message.content).issues || [];
    console.error(`  retry ${i}: ${r.status} ${d.error?.code || d.error?.message}`);
    await new Promise((res) => setTimeout(res, 5000 * (i + 1)));
  }
  return [{ type: 'judge_error' }];
}
(async () => {
  for (const f of fs.readdirSync(OUT).filter((x) => /^[LS]\d+\.json$/.test(x)).sort()) {
    const r = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    if (!r.session) continue;
    const s = JSON.parse(fs.readFileSync(path.join(SESS, `${r.session}.json`), 'utf8'));
    r.issues = await judge(s);
    fs.writeFileSync(path.join(OUT, f), JSON.stringify(r, null, 2));
    console.log(`${r.id}: ${r.issues.length} ${r.issues.map((x) => `[${x.line} ${x.type}] ${x.note || ''}`).join(' | ')}`);
  }
})();

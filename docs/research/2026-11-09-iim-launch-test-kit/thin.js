// Scripted thin answers (vague, "we", no steps, no result), then feedback. Also ends and pulls feedback for given ids.
const P = require('./profiles');
const APP = 'http://localhost:3417';
const post = async (p, b) => { const r = await fetch(APP + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) }); return r.json(); };
const THIN = [
  'Um the case method mostly, it is interesting.',
  'So I did engineering, then worked at Asian Paints for three years, then came to IIM Ahmedabad and did my summers at Aditya Birla.',
  'So basically we looked at a few options as a team and we did a lot of analysis and research and then we presented it and the management liked it, so it went well overall and we learnt a lot.',
  'We all worked on it together, everyone contributed, the team divided the work and we did the analysis together and finalised it.',
  'It was good, they took it forward I think, so yeah it was a good outcome for us.',
  'At the plant we had this situation and we handled it as a team, we talked to people and things got resolved after some time, so it was fine.',
  'We coordinated with everyone and made sure communication was there, so things improved.',
  'It got resolved, everyone was happy in the end.',
  'I would look at the market and do some research and analysis and talk to stakeholders and then decide.',
  'I would see the data and see what makes sense.',
  'I want to do general management because I like bigger picture and strategy, it is a good career.',
  'It is a good opportunity to grow.',
  'No questions, thank you.',
];
(async () => {
  const pr = P.tas_gm;
  let v = await post('/api/sessions', { resume_text: pr.resume, domain: pr.domain, stage: 'finals', interview_type: 'hiring_manager', style: 'balanced', length: 'standard' });
  for (let i = 0; v.status !== 'ended' && i < 25; i++) {
    const a = THIN[Math.min(i, THIN.length - 1)];
    v = await post(`/api/sessions/${v.id}/answers`, { answer: a });
  }
  if (v.status !== 'ended') v = await post(`/api/sessions/${v.id}/end`);
  const ids = [v.id, ...process.argv.slice(2)];
  for (const id of ids) {
    const s0 = await (await fetch(`${APP}/api/sessions/${id}`)).json();
    if (s0.status !== 'ended') await post(`/api/sessions/${id}/end`);
    const fb = await post(`/api/sessions/${id}/feedback`);
    console.log(`\n### ${id}\noverall: ${fb.overall}`);
    for (const t of fb.topics || []) {
      console.log(`-- ${t.slot_id} verdict=${t.verdict} ${t.too_short ? '(too short)' : ''}`);
      for (const r of t.ratings || []) console.log(`   ${r.dimension}: ${r.level} — ${r.reason}`);
    }
  }
})();

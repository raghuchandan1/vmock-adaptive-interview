const fs = require('fs');
const P = require('./profiles');
const dir = __dirname + '/out/plans/';
const files = fs.readdirSync(dir).sort();
const COMP = /War Room|L\.I\.M\.E|WiRED|Interrobang|CANVAS|HRchitect|Research Challenge|hackathon|case competition/i;
const COMP_IN_CV = /War Room|L\.I\.M\.E|WiRED|Interrobang|CANVAS|HRchitect|Research Challenge|hackathon/i;
let n = 0, withKnow = 0, compCv = 0, compPicked = 0, longQ = 0, warnPlans = 0, fit = 0, ms = [], tok = [];
const rows = [];
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(dir + f));
  n++;
  const scored = p.slots.filter((s) => !['warmup', 'background', 'candidate_questions'].includes(s.kind));
  const know = scored.find((s) => s.qt === 'knowledge');
  if (know) withKnow++;
  const name = p.id.split('__')[0];
  const resume = (P[name] || {}).resume || fs.readFileSync(__dirname + `/cv_${name.split('_')[1]}.extracted.txt`, 'utf8');
  if (COMP_IN_CV.test(resume)) { compCv++; if (scored.some((s) => COMP.test(`${s.anchor || ''} ${s.q}`))) compPicked++; }
  for (const s of p.slots) if (s.q && s.q.split(/\s+/).length > 40) longQ++;
  if ((p.checks || []).some((c) => c.level !== 'ok' && /agenda word/.test(c.message))) warnPlans++;
  if (scored.some((s) => /failed at something|disagreed with your team|biggest strength/i.test(s.q))) fit++;
  tok.push(p.usage?.total_tokens || 0);
  rows.push(`${p.id.padEnd(42)} know=${know ? 'Y' : '-'} slots=${scored.map((s) => `${s.kind[0]}${s.qt ? s.qt[0] : ''}`).join(',')} openers=${scored.map((s) => s.q.split(/\s+/).slice(0, 2).join(' ')).join(' | ')}`);
}
console.log(rows.join('\n'));
console.log({ plans: n, withKnowledgeSlot: withKnow, cvWithCaseComp: compCv, caseCompPicked: compPicked, questionsOver40Words: longQ, plansWithAgendaWordWarn: warnPlans, plansWithFitQuestion: fit, avgPlannerTokens: Math.round(tok.reduce((a, b) => a + b, 0) / tok.length) });

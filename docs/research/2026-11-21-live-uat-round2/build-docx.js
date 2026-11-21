// Builds "CareerBuddy UAT Feedback – Round 2.docx" from round2.json.
// Run: NODE_PATH=<dir with docx@9.5.1>/node_modules node build-docx.js
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require('docx');

const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'round2.json'), 'utf8'));
const p = (text, opts = {}) => new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 }, ...opts });
const labelled = (label, text) => new Paragraph({ children: [new TextRun({ text: label + ': ', bold: true }), new TextRun(text)], spacing: { after: 80 } });
const h1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } });
const h2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } });
const bullet = (t) => new Paragraph({ children: [new TextRun(t)], bullet: { level: 0 }, spacing: { after: 60 } });
const cell = (t, bold) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t), bold })] })] });
const table = (head, rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [new TableRow({ tableHeader: true, children: head.map((h) => cell(h, true)) }), ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) }))],
});

const order = { Major: 0, Minor: 1, Decision: 2 };
const issues = [...d.issues].sort((a, b) => order[a.sev] - order[b.sev]);
const count = (s) => d.issues.filter((i) => i.status === s).length;

const body = [
  new Paragraph({ text: d.title, heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
  h1('What I tested'),
  p(`${d.date}. ${d.intro} Each number below is an interview id: the room is at /interviews/adaptive/room/<id> and its feedback at /interviews/adaptive/feedback/<id>.`),
  ...d.tested.map(bullet),
  h1('Summary'),
  p(`${d.fixed.length} things are fixed since round 1. Of the issues below, ${count('Still there')} are still there, ${count('Partly fixed')} are partly fixed and ${count('New')} are new. Questions are the stronger half: 75% of interviewer turns are at real-panel level (testers' estimate about 87%). Feedback is the weaker half: a careers coach would call 6 of 13 good (46%), mostly because scores and levels contradict the text.`),
  h1('Issues'),
  p('Major first, then Minor, then product decisions. "Status" compares with round 1 (16 Nov).'),
];
issues.forEach((i, n) => {
  body.push(h2(`${n + 1}. ${i.title}`));
  body.push(labelled('Status', `${i.status} · ${i.sev === 'Decision' ? 'Product decision' : i.sev} · ${i.area}`));
  body.push(labelled('Interview id', i.ids));
  body.push(labelled('What I saw', i.saw));
  body.push(labelled('What I expected', i.expected));
});
body.push(h1('Fixed since round 1'));
d.fixed.forEach(([t, ids]) => body.push(bullet(`${t} (${ids})`)));
body.push(h1('Question and feedback quality'));
body.push(labelled('Questions', d.quality.questions));
body.push(table(['Kind of turn', 'At real-panel level'], d.quality.categories));
body.push(p(''));
body.push(labelled('Lowest-rated questions', ''));
d.quality.low.forEach(([id, q, why]) => body.push(bullet(`${id}: ${q} ${why}`)));
body.push(labelled('Feedback', d.quality.feedback));
body.push(h1('What worked well'));
body.push(p(d.quality.good));
body.push(h1('Interview ids'));
body.push(table(['Id', 'Entry point', 'Setup / what it tested', 'Outcome'], d.ids));

const doc = new Document({ styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }, sections: [{ children: body }] });
Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, 'CareerBuddy UAT Feedback – Round 2.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, buf.length);
});

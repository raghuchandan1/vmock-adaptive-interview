// Indian-English STT/TTS check through the real server. Best case: synthetic macOS voices, clean audio, no noise.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const P = require('./profiles');
const APP = process.env.APP || 'http://localhost:3417';
const OUT = path.join(__dirname, 'out', 'stt');
fs.mkdirSync(OUT, { recursive: true });

const LINES = [
  ['army', 'So after five years as a Captain in the Corps of EME, I joined the PGP at IIM Indore, and during my summers at Tata Steel Kalinganagar I got a PPI.'],
  ['army', 'I cut the vehicle turnaround time from 9 days to 5 days by redesigning the spares indent cycle and setting up a forward spares cell.'],
  ['army', 'We were managing spares worth 14 crore rupees across three depots, and the audit discrepancies came down to zero.'],
  ['army', 'At Tata Steel I built a criticality based stocking model for 312 hot strip mill spares, which projected a 3.2 crore reduction in inventory.'],
  ['generic', 'At Asian Paints in Nagpur the pilot reduced lost orders by around 9 lakh rupees a month, mostly in the 12 fast moving SKUs.'],
  ['generic', 'My CGPA in the first term was 5.9, honestly the quant courses like QM and FRA were tough coming from a B.Sc. background.'],
  ['hinglish', 'Toh basically humne dealers ke saath ek WhatsApp catalogue launch kiya, matlab jo order processing pehle teen din leta tha, woh same day ho gaya.'],
  ['hinglish', 'Sir, honestly mujhe us time pe exact number yaad nahi hai, but I think around 30 percent ka improvement tha.'],
];
const VOICES = ['Rishi', 'Aman', 'Tara'];

const norm = (s) => s.toLowerCase().replace(/%/g, ' percent').replace(/₹/g, ' rupees ').replace(/(\d),(\d)/g, '$1$2').replace(/[^\w\s.]|(?<!\d)\.|\.(?!\d)/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
  const r = norm(ref); const h = norm(hyp);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / r.length;
}

(async () => {
  const pr = P.army_ops;
  const v = await (await fetch(`${APP}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume_text: pr.resume, jd_text: '', domain: pr.domain, stage: pr.stage, interview_type: 'hiring_manager', style: 'balanced', length: 'short' }) })).json();
  console.log('session', v.id);
  // TTS first byte and total, three tries on the opening line
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const r = await fetch(`${APP}/api/sessions/${v.id}/speech`);
    const reader = r.body.getReader(); await reader.read(); const first = Date.now() - t0;
    let bytes = 0; for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; }
    console.log(`tts status=${r.status} first_byte=${first}ms total=${Date.now() - t0}ms bytes=${bytes}`);
  }
  const rows = [];
  for (const [kind, text] of LINES) {
    for (const voice of VOICES) {
      const wav = path.join(OUT, `${voice}-${rows.length}.wav`);
      execFileSync('say', ['-v', voice, '-o', wav, '--data-format=LEI16@16000', text]);
      const t0 = Date.now();
      const r = await fetch(`${APP}/api/sessions/${v.id}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: fs.readFileSync(wav) });
      const d = await r.json();
      const row = { kind, voice, ms: Date.now() - t0, wer: d.text ? +wer(text, d.text).toFixed(2) : null, ref: text, hyp: d.text || d.error };
      rows.push(row);
      console.log(`${kind} ${voice} ${row.ms}ms WER=${row.wer}\n  REF ${text}\n  HYP ${row.hyp}`);
    }
  }
  const trace = await (await fetch(`${APP}/api/sessions/${v.id}/trace`)).json();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ session: v.id, rows, voice_calls: trace.voice_calls }, null, 2));
  const by = (k) => { const xs = rows.filter((r) => r.kind === k && r.wer != null); return (xs.reduce((a, r) => a + r.wer, 0) / xs.length).toFixed(2); };
  console.log('mean WER', { army: by('army'), generic: by('generic'), hinglish: by('hinglish') }, 'models', [...new Set((trace.voice_calls || []).map((c) => c.model))]);
})();

// Scripted: "No, that's all" mid-topic, then at the questions phase. Runs twice.
const P = require('./profiles');
const APP = 'http://localhost:3417';
const post = async (p, b) => (await fetch(APP + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();
(async () => {
  for (let run = 0; run < 2; run++) {
    const pr = P.tas_gm;
    let v = await post('/api/sessions', { resume_text: pr.resume, domain: pr.domain, stage: 'finals', interview_type: 'hiring_manager', style: 'balanced', length: 'short' });
    const script = [
      'Mostly the strategy courses, they are very case heavy which I like.',
      'I did chemical engineering at IIT Bombay, then three years at Asian Paints Ankleshwar as a production engineer, then IIM Ahmedabad, and my summer was at Aditya Birla group strategy.',
      'So we looked at three adjacencies and recommended specialty adhesives, it was a team effort with the GEO team.',
      'No, that\'s all I had on that.',
      'No, that\'s all.',
      'No, that\'s all.',
      'No, that\'s all.',
      'No questions, thank you.',
    ];
    for (const a of script) {
      if (v.status === 'ended') break;
      v = await post(`/api/sessions/${v.id}/answers`, { answer: a });
      const last = v.transcript[v.transcript.length - 1];
      console.log(`run${run} STUDENT: ${a}\n   AI: ${last.text}`);
    }
    console.log(`run${run} status=${v.status} id=${v.id}\n`);
  }
})();

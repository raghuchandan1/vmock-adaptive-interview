/* Shared by the developer page (app.js) and the student page (student.js): PDF reading, topic labels and the
   student feedback renderer. */
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function readPdf(file) {
    if (!window.pdfjsLib) throw new Error('The PDF reader did not load. Paste the resume text instead.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      let line = '';
      let lastY = null;
      const lines = [];
      for (const item of content.items) {
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
        line += item.str;
        lastY = y;
      }
      lines.push(line);
      pages.push(lines.map((l) => l.trim()).filter(Boolean).join('\n'));
    }
    return pages.join('\n\n');
  }

  function slotLabel(slot) {
    const kinds = { warmup: 'Warm-up', background: 'Background walkthrough', claim: 'Resume claim', gap: 'Gap topic', motivation: 'Motivation', concerns: 'Concerns', second_chance: 'Second chance', candidate_questions: 'Candidate questions' };
    return slot.competency_name ? `${kinds[slot.kind]}: ${slot.competency_name}` : kinds[slot.kind];
  }

  const LEVEL = { good_job: ['Good job', 'lv-good'], on_track: ['On track', 'lv-mid'], needs_work: ['Needs work', 'lv-low'] };
  const JD_STATUS = { covered: 'Covered', partly: 'Partly covered', not_reached: 'Not reached' };
  const RUBRIC_NAME = { behavioural: 'Behavioural question', situational: 'Situational question', knowledge: 'Knowledge question', motivation: 'Motivation question', concern: 'Resume concern' };
  const reEscape = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Escapes the answer, then wraps the verified quotes in <mark>.
  function highlight(text, quotes) {
    let html = esc(text);
    for (const q of quotes.filter(Boolean)) html = html.replace(new RegExp(reEscape(esc(q)), 'i'), (m) => `<mark>${m}</mark>`);
    return html;
  }

  const MOMENT_NAME = { warmup: 'Warm-up', background: 'Your background', candidate_questions: 'Your questions at the end', answer_length: 'Answer length' };
  const quoteHtml = (q) => (q ? `<div class="q">“${esc(q)}”</div>` : '');

  // How to answer next time: the steps, then a rewrite of the student's own line or a sample answer.
  function nextTimeHtml(t) {
    let html = '';
    if (t.answer_plan && t.answer_plan.length) html += `<ol class="plan">${t.answer_plan.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`;
    if (t.stronger_version) html += `<div class="stronger"><span>Your answer, improved. Fill in the brackets with your own details.</span>${esc(t.stronger_version)}</div>`;
    if (t.example_answer) html += `<div class="stronger example"><span>Example answer from a sample candidate, to show the approach</span>${esc(t.example_answer)}</div>`;
    return html ? `<section class="fb-block next"><h4>How to answer it next time</h4>${html}</section>` : '';
  }

  const ratingRow = (r) => `<div class="rating"><span class="lv ${LEVEL[r.level][1]}">${LEVEL[r.level][0]}</span><strong>${esc(r.label)}</strong><span class="why">${esc(r.reason)}</span></div>`;
  const topicName = (t) => slotLabel({ kind: t.kind, competency_name: t.topic });

  // Conversation: what an adaptive interview shows and the existing VMock modules don't measure.
  function conversationHtml(fb) {
    let html = '';
    const followups = fb.topics.flatMap((t) => (t.ratings || []).filter((r) => r.dimension === 'followup').map((r) => ({ ...r, label: topicName(t) })));
    if (followups.length) html += `<section class="fb-block"><h4>How you handled follow-up questions</h4><div class="ratings">${followups.map(ratingRow).join('')}</div></section>`;
    const own = fb.topics.filter((t) => t.ownership && t.ownership.i + t.ownership.we > 0);
    if (own.length) {
      const teamHeavy = own.filter((t) => t.ownership.we > t.ownership.i);
      html += `<section class="fb-block"><h4>Talking about your own work</h4>
        <p>You said “I” ${fb.ownership.i} time${fb.ownership.i === 1 ? '' : 's'} and “we” ${fb.ownership.we} time${fb.ownership.we === 1 ? '' : 's'}.${teamHeavy.length ? ' Interviewers listen for “I” to understand what you did yourself.' : ''}</p>
        <ul class="own">${own.map((t) => `<li><span>${esc(topicName(t))}</span><span class="${t.ownership.we > t.ownership.i ? 'own-we' : ''}">I ${t.ownership.i} · we ${t.ownership.we}${t.ownership.we > t.ownership.i ? ', mostly about the team' : ''}</span></li>`).join('')}</ul></section>`;
    }
    const momentTitle = (m) => {
      const t = fb.topics.find((x) => x.slot_id === m.slot_id);
      return MOMENT_NAME[m.slot_id] || (t ? `Matching your resume: ${topicName(t)}` : '');
    };
    html += (fb.moments || []).map((m) => `<section class="fb-block moment"><h4>${esc(momentTitle(m))}</h4>${quoteHtml(m.quote)}<p>${esc(m.note)}</p>${m.tip ? `<p class="do">${esc(m.tip)}</p>` : ''}</section>`).join('');
    return html ? `<h2 class="section-title">Conversation</h2>${html}` : '';
  }

  const verdictHtml = (t) => (t.too_short && !t.ended_early ? '<span class="lv lv-none">Not enough to judge</span>' : t.verdict ? `<span class="lv ${LEVEL[t.verdict][1]}">${LEVEL[t.verdict][0]}</span>` : '');

  function renderFeedback(panel, s, fb) {
    const [goal, ...more] = fb.priorities;
    let html = `<p class="lede">${esc(fb.overall)}</p>`;
    // Every question with its result, linking down to its section.
    if (fb.topics.length) html += `<nav class="fb-overview" aria-label="Questions in this interview"><ol>${fb.topics.map((t, i) => `<li><a href="#fb-topic-${i}">${esc(topicName(t))}</a>${verdictHtml(t)}</li>`).join('')}</ol></nav>`;
    if (goal) {
      html += `<section class="goal"><strong>Next time: ${esc(goal.title.charAt(0).toLowerCase() + goal.title.slice(1))}</strong><p>${esc(goal.why)}</p><p class="do">${esc(goal.action)}</p></section>`;
    }
    if (more.length) {
      html += `<h2 class="section-title">Also work on</h2><ol class="priorities">${more.map((p) => `<li><strong>${esc(p.title)}</strong><span>${esc(p.why)}</span><em>${esc(p.action)}</em></li>`).join('')}</ol>`;
    }
    html += '<h2 class="section-title">Question by question</h2>';
    fb.topics.forEach((t, i) => {
      html += `<article class="topic" id="fb-topic-${i}"><div class="topic-head"><h3>${esc(topicName(t))}</h3>${verdictHtml(t)}</div>
        ${t.question ? `<p class="asked"><span>The question</span>${esc(t.question)}</p>` : ''}`;
      if (t.too_short) {
        html += '<p class="a">Your answer here was too short to give feedback on. Use the steps below to prepare this one.</p>';
      } else {
        if (t.went_well) html += `<section class="fb-block well"><h4>What went well</h4>${quoteHtml(t.went_well_quote)}<p>${esc(t.went_well)}</p></section>`;
        if (t.resume_mismatch) html += `<section class="fb-block fix"><h4>Doesn't match your resume</h4>${quoteHtml(t.resume_mismatch.quote)}<p>${esc(t.resume_mismatch.note)}</p>${t.resume_mismatch.tip ? `<p class="do">${esc(t.resume_mismatch.tip)}</p>` : ''}</section>`;
        if (t.to_fix) html += `<section class="fb-block fix"><h4>${t.resume_mismatch ? 'Also fix' : 'What to fix'}</h4>${quoteHtml(t.to_fix_quote)}<p>${esc(t.to_fix)}</p></section>`;
      }
      html += nextTimeHtml(t);
      const content = (t.ratings || []).filter((r) => r.dimension !== 'followup'); // follow-ups are shown under Conversation
      if (content.length) {
        html += `<details class="checklist"><summary>${esc(RUBRIC_NAME[t.rubric] || 'Checklist')}: what a strong answer covers</summary><div class="ratings">${content.map(ratingRow).join('')}</div></details>`;
      }
      const answers = s.transcript.filter((e) => e.role === 'candidate' && e.slot_id === t.slot_id).map((e) => e.text);
      if (answers.length) html += `<details class="your-answer"><summary>Your answers, with highlights</summary>${answers.map((a) => `<p class="a">${highlight(a, [t.went_well_quote, t.to_fix_quote, t.resume_mismatch && t.resume_mismatch.quote])}</p>`).join('')}</details>`;
      html += '</article>';
    });
    html += conversationHtml(fb);
    if (fb.jd_coverage && fb.jd_coverage.length) {
      html += `<h2 class="section-title">Job description coverage</h2><ul class="jd-cov">${fb.jd_coverage.map((c) => `<li><span class="chip jd-${c.status}">${esc(JD_STATUS[c.status])}</span> ${esc(c.name)}</li>`).join('')}</ul>`;
    }
    panel.innerHTML = html;
  }

  window.VM = { esc, readPdf, slotLabel, renderFeedback };
})();

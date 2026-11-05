/* VMock replica room: the feedback screen. Replaces VM.renderFeedback on the room page only (student.js calls it with
   the session and the shaped feedback from POST /api/sessions/:id/feedback); /student keeps shared.js's renderer.
   Summary first: how it went and the one goal for next time, then one row per question that opens to the detail. */
(() => {
  const esc = VM.esc;
  const LEVEL = { good_job: ['Good job', 'good'], on_track: ['On track', 'track'], needs_work: ['Needs work', 'work'] };
  const TYPE = { recruiter_screen: 'Screening round', hiring_manager: 'Hiring manager round', back_your_resume: 'Resume deep dive' };
  const STYLE = { supportive: 'Friendly', balanced: 'Standard', probing: 'Challenging' };
  const MINUTES = { short: 10, standard: 15 };
  const KIND = { claim: 'From your resume', gap: 'For the role', motivation: 'Motivation and fit', concerns: 'About your resume', second_chance: 'Second try', background: 'Your background' };
  const FOUND = { first_answer: 'In your first answer', after_follow_up: 'After a follow-up', not_given: 'Not given' };
  const JD = { covered: ['Covered', 'good'], partly: ['Partly covered', 'track'], not_reached: ['Not reached', 'none'] };
  const MOMENT = { warmup: 'Warm-up', background: 'Your background', candidate_questions: 'Your questions at the end' };
  const reEscape = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const firstSentence = (s) => (String(s || '').match(/^.*?[.!?](\s|$)/) || [String(s || '')])[0].trim();
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const chip = (level) => (LEVEL[level] ? `<span class="fb-chip ${LEVEL[level][1]}">${LEVEL[level][0]}</span>` : '');
  const topicName = (t) => (t.kind === 'second_chance' ? `${t.topic || 'Earlier topic'} (second try)` : t.topic || KIND[t.kind] || 'Question');
  const quote = (q) => (q ? `<blockquote class="fb-quote">“${esc(q)}”</blockquote>` : '');
  // "[describe which tables…]" placeholders become fill-in boxes.
  const blanks = (text) => esc(text).replace(/\[([^\]]+)\]/g, '<span class="fb-blank">$1</span>');
  function highlight(text, quotes) {
    let html = esc(text);
    for (const q of quotes.filter(Boolean)) html = html.replace(new RegExp(reEscape(esc(q)), 'i'), (m) => `<mark>${m}</mark>`);
    return html;
  }

  // The one line shown on a question's row: what to fix, or for a strong answer what went well.
  function rowLine(t) {
    if (t.too_short) return 'Your answer was too short to give feedback on. Open it to see how to answer next time.';
    if (t.verdict === 'good_job' && t.went_well) return firstSentence(t.went_well);
    return firstSentence(t.to_fix || t.went_well || (t.answer_plan || [])[0] || '');
  }

  function header(s, fb) {
    const type = TYPE[s.inputs?.interview_type] || 'Adaptive interview';
    const role = s.plan?.jd?.role_title || s.inputs?.target_role || 'Practice interview';
    const company = s.plan?.jd?.company;
    const style = s.surprise ? `Surprise style (${STYLE[s.style] || s.style})` : `${STYLE[s.style] || s.style} style`;
    const date = new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('fbType').textContent = `${type} · Feedback`;
    document.getElementById('fbRole').textContent = company ? `${role} at ${company}` : role;
    document.getElementById('feedbackMeta').textContent = [date, `${MINUTES[s.inputs?.length] || 15} min`, style, plural(fb.topics.length, 'question')].join(' · ');
  }

  function summary(fb) {
    const [goal, ...more] = fb.priorities || [];
    const judged = fb.topics.filter((t) => t.verdict);
    const count = (v) => judged.filter((t) => t.verdict === v).length;
    // One segment per question, in order, coloured by its result: the whole interview at a glance.
    const strip = fb.topics.map((t, i) => `<a class="fb-seg ${t.verdict ? LEVEL[t.verdict][1] : 'none'}" href="#fb-q-${i}" title="${esc(`${i + 1}. ${topicName(t)}: ${t.verdict ? LEVEL[t.verdict][0] : 'Too short to judge'}`)}"><span>${i + 1}</span></a>`).join('');
    const tally = ['good_job', 'on_track', 'needs_work'].filter(count).map((v) => `<span class="fb-chip ${LEVEL[v][1]}">${count(v)} ${LEVEL[v][0]}</span>`).join('');
    let html = `<section class="fb-card fb-summary" aria-labelledby="fbSummaryTitle">
      <h2 class="sr" id="fbSummaryTitle">How it went</h2>
      ${fb.overall ? `<p class="fb-overall">${esc(fb.overall)}</p>` : ''}
      <div class="fb-strip-row"><div class="fb-strip" aria-label="Result for each question">${strip}</div><div class="fb-tally">${tally}</div></div>`;
    if (goal) {
      html += `<div class="fb-goal">
        <div class="fb-goal-icon" aria-hidden="true"><svg class="ic"><use href="#i-target"/></svg></div>
        <div><div class="fb-eyebrow">Your goal for next time</div>
          <h3>${esc(goal.title)}</h3>
          ${goal.why ? `<p>${esc(goal.why)}</p>` : ''}
          ${goal.action ? `<p class="fb-try"><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}</div>
      </div>`;
    }
    if (more.length) {
      html += `<div class="fb-also"><h3 class="fb-also-title">Also work on</h3><div class="fb-also-grid">${more.map((p) => `<div class="fb-also-item"><strong>${esc(p.title)}</strong>${p.action ? `<span>${esc(p.action)}</span>` : ''}</div>`).join('')}</div></div>`;
    }
    return `${html}</section>`;
  }

  function checklist(t) {
    const items = (t.ratings || []).filter((r) => r.dimension !== 'followup');
    if (!items.length) return '';
    return `<details class="fb-more"><summary>What a strong answer covers <span class="fb-count">${items.length}</span></summary>
      <ul class="fb-checks">${items.map((r) => `<li>${chip(r.level)}<strong>${esc(r.label)}</strong><span>${esc(r.reason)}${r.found ? ` <em>${FOUND[r.found]}</em>` : ''}</span></li>`).join('')}</ul></details>`;
  }

  function followUps(t) {
    if (!(t.follow_ups || []).length) return '';
    return `<details class="fb-more"><summary>Follow-up questions <span class="fb-count">${t.follow_ups.length}</span></summary>
      <ul class="fb-fus">${t.follow_ups.map((f) => `<li><p class="fb-fu-q">“${esc(f.question)}”</p>${f.why ? `<p>${esc(f.why)}</p>` : ''}${f.asked_for_label && f.given !== null ? `<p class="fb-fu-res ${f.given ? 'yes' : 'no'}">${f.given ? 'You added' : 'Still missing'}: ${esc(f.asked_for_label.toLowerCase())}</p>` : ''}</li>`).join('')}</ul></details>`;
  }

  function yourAnswer(s, t) {
    const answers = s.transcript.filter((e) => e.role === 'candidate' && e.slot_id === t.slot_id).map((e) => e.text);
    if (!answers.length) return '';
    const marks = [t.went_well_quote, t.to_fix_quote, t.resume_mismatch && t.resume_mismatch.quote];
    return `<details class="fb-more"><summary>Your answer${answers.length > 1 ? 's' : ''}</summary>${answers.map((a) => `<p class="fb-answer">${highlight(a, marks)}</p>`).join('')}</details>`;
  }

  function nextTime(t) {
    const plan = t.answer_plan || [];
    if (!plan.length && !t.stronger_version && !t.example_answer) return '';
    return `<section class="fb-next"><h4>How to answer it next time</h4>
      ${plan.length ? `<ol class="fb-steps">${plan.map((p) => `<li>${blanks(p)}</li>`).join('')}</ol>` : ''}
      ${t.stronger_version ? `<div class="fb-better"><div class="fb-eyebrow">Your answer, improved</div><p>${blanks(t.stronger_version)}</p><p class="fb-better-hint">Fill in the boxes with your own details.</p></div>` : ''}
      ${t.example_answer ? `<div class="fb-better fb-example"><div class="fb-eyebrow">Sample answer</div><p>${esc(t.example_answer)}</p><p class="fb-better-hint">From a sample candidate, to show the approach. Use your own example.</p></div>` : ''}
    </section>`;
  }

  function question(s, t, i, open) {
    const level = t.verdict ? LEVEL[t.verdict][1] : 'none';
    const source = t.resume_line ? `<p class="fb-from"><span>From your resume</span>“${esc(t.resume_line)}”</p>`
      : t.jd_line ? `<p class="fb-from"><span>From the job description</span>${esc(t.jd_line)}</p>` : '';
    let body = `<div class="fb-asked"><div class="fb-eyebrow">The question</div><p>${esc(t.question || '')}</p>${source}</div>`;
    if (t.too_short) {
      body += '<p class="fb-short">Your answer here was too short to give feedback on. Use the steps below to prepare this one.</p>';
    } else {
      const fix = [];
      if (t.resume_mismatch) fix.push(`<div class="fb-box fix"><h4>Doesn't match your resume</h4>${quote(t.resume_mismatch.quote)}<p>${esc(t.resume_mismatch.note)}</p>${t.resume_mismatch.tip ? `<p class="fb-tip">${esc(t.resume_mismatch.tip)}</p>` : ''}</div>`);
      if (t.to_fix) fix.push(`<div class="fb-box fix"><h4>${t.resume_mismatch ? 'Also fix' : 'What to fix'}</h4>${quote(t.to_fix_quote)}<p>${esc(t.to_fix)}</p></div>`);
      const well = t.went_well ? `<div class="fb-box well"><h4>What went well</h4>${quote(t.went_well_quote)}<p>${esc(t.went_well)}</p></div>` : '';
      if (well || fix.length) body += `<div class="fb-pair">${well}${fix.join('')}</div>`;
    }
    body += nextTime(t);
    const extras = checklist(t) + followUps(t) + yourAnswer(s, t);
    if (extras) body += `<div class="fb-extras">${extras}</div>`;
    return `<article class="fb-q ${level}${open ? ' open' : ''}" id="fb-q-${i}">
      <h3 class="fb-q-h"><button class="fb-q-row" type="button" aria-expanded="${open}" aria-controls="fb-q-body-${i}">
        <span class="fb-num">${i + 1}</span>
        <span class="fb-q-text"><strong>${esc(topicName(t))}</strong><span>${esc(rowLine(t))}</span></span>
        ${t.too_short ? '<span class="fb-chip none">Too short</span>' : chip(t.verdict)}
        <svg class="ic fb-chev" aria-hidden="true"><use href="#i-chev"/></svg>
      </button></h3>
      <div class="fb-q-body" id="fb-q-body-${i}" role="region"${open ? '' : ' hidden'}>${body}</div>
    </article>`;
  }

  function across(fb) {
    const parts = [];
    const own = fb.ownership || { i: 0, we: 0 };
    if (own.i + own.we > 0) {
      const pct = Math.round((own.i / (own.i + own.we)) * 100);
      parts.push(`<div class="fb-card fb-mini"><h3>Talking about your own work</h3>
        <p>You said “I” ${plural(own.i, 'time')} and “we” ${plural(own.we, 'time')}.${own.we > own.i ? ' Interviewers listen for “I” to understand what you did yourself.' : ''}</p>
        <div class="fb-iwe" role="img" aria-label="${pct}% I, ${100 - pct}% we"><span style="width:${pct}%"></span></div>
        <div class="fb-iwe-legend"><span><i class="i"></i>I · ${own.i}</span><span><i class="we"></i>we · ${own.we}</span></div></div>`);
    }
    const handled = fb.topics.flatMap((t) => (t.ratings || []).filter((r) => r.dimension === 'followup').map((r) => ({ ...r, name: topicName(t) })));
    if (handled.length) {
      parts.push(`<div class="fb-card fb-mini"><h3>Handling follow-up questions</h3><ul class="fb-list">${handled.map((r) => `<li>${chip(r.level)}<span><strong>${esc(r.name)}.</strong> ${esc(r.reason)}</span></li>`).join('')}</ul></div>`);
    }
    for (const m of fb.moments || []) {
      parts.push(`<div class="fb-card fb-mini"><h3>${esc(MOMENT[m.slot_id] || 'A moment to note')}</h3>${quote(m.quote)}<p>${esc(m.note)}</p>${m.tip ? `<p class="fb-tip">${esc(m.tip)}</p>` : ''}</div>`);
    }
    if ((fb.jd_coverage || []).length) {
      parts.push(`<div class="fb-card fb-mini fb-wide"><h3>Job description coverage</h3><p>The must-haves from the job description, and whether your answers showed them.</p>
        <ul class="fb-jd">${fb.jd_coverage.map((c) => `<li><span class="fb-chip ${(JD[c.status] || JD.not_reached)[1]}">${(JD[c.status] || JD.not_reached)[0]}</span>${esc(c.name)}</li>`).join('')}</ul></div>`);
    }
    return parts.length ? `<section class="fb-section" aria-labelledby="fbAcross"><h2 class="fb-sec-title" id="fbAcross">Across the interview</h2><div class="fb-across">${parts.join('')}</div></section>` : '';
  }

  function render(panel, s, fb) {
    header(s, fb);
    if (!fb.topics.length) {
      panel.innerHTML = `${summary(fb)}<p class="fb-empty">The interview ended before any question was answered, so there is nothing to give feedback on yet. Practise again to get feedback on your answers.</p>`;
      return;
    }
    // The first question that needs work starts open (else the first one), so the detail is one glance away.
    const firstOpen = Math.max(0, fb.topics.findIndex((t) => t.verdict === 'needs_work'));
    panel.innerHTML = `${summary(fb)}
      <section class="fb-section" aria-labelledby="fbQs"><div class="fb-sec-head"><h2 class="fb-sec-title" id="fbQs">Question by question</h2><span>Open a question to see how to answer it next time</span></div>
        <div class="fb-qs">${fb.topics.map((t, i) => question(s, t, i, i === firstOpen)).join('')}</div></section>
      ${across(fb)}`;

    const toggle = (q, open) => {
      q.classList.toggle('open', open);
      q.querySelector('.fb-q-row').setAttribute('aria-expanded', String(open));
      q.querySelector('.fb-q-body').hidden = !open;
    };
    panel.querySelectorAll('.fb-q-row').forEach((btn) => btn.addEventListener('click', () => {
      const q = btn.closest('.fb-q');
      toggle(q, !q.classList.contains('open'));
    }));
    // The result strip jumps to a question and opens it.
    panel.querySelectorAll('.fb-seg').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const q = document.querySelector(a.getAttribute('href'));
      toggle(q, true);
      q.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  VM.renderFeedback = render;
})();

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

  // Opening questions and the result strip's jumps, shared by both layouts.
  function wireQuestions(panel) {
    const toggle = (q, open) => {
      q.classList.toggle('open', open);
      q.querySelector('.fb-q-row').setAttribute('aria-expanded', String(open));
      q.querySelector('.fb-q-body').hidden = !open;
    };
    panel.querySelectorAll('.fb-q-row').forEach((btn) => btn.addEventListener('click', () => {
      const q = btn.closest('.fb-q');
      toggle(q, !q.classList.contains('open'));
    }));
    panel.querySelectorAll('.fb-seg').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const q = document.querySelector(a.getAttribute('href'));
      toggle(q, true);
      q.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  const EMPTY = '<p class="fb-empty">The interview ended before any question was answered, so there is nothing to give feedback on yet. Practise again to get feedback on your answers.</p>';
  const firstOpenOf = (fb) => Math.max(0, fb.topics.findIndex((t) => t.verdict === 'needs_work'));
  const questionsHtml = (s, fb) => `<section class="fb-section" aria-labelledby="fbQs"><div class="fb-sec-head"><h2 class="fb-sec-title" id="fbQs">Question by question</h2><span>Open a question to see how to answer it next time</span></div>
    <div class="fb-qs">${fb.topics.map((t, i) => question(s, t, i, i === firstOpenOf(fb))).join('')}</div></section>`;

  // ---------- Classic layout (content feedback only), kept for reference: ?fbview=classic ----------
  function renderClassic(panel, s, fb) {
    header(s, fb);
    if (!fb.topics.length) { panel.innerHTML = `${summary(fb)}${EMPTY}`; return; }
    panel.innerHTML = `${summary(fb)}${questionsHtml(s, fb)}${across(fb)}`;
    wireQuestions(panel);
  }

  // ---------- Delivery of Speech and Non Verbal: placeholder signals ----------
  // shortcut: invented values, generated from the interview id so each interview has its own stable set; replace with
  // VMock's audio/video analysis once that is wired in. Ranges and targets follow what VMock's recorder feedback shows.
  function seeded(id) {
    let h = 2166136261;
    for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  const band = (v, good, track) => (good(v) ? 'good_job' : track(v) ? 'on_track' : 'needs_work');
  const worst = (levels) => (levels.includes('needs_work') ? 'needs_work' : levels.includes('on_track') ? 'on_track' : 'good_job');

  function signals(s) {
    const r = seeded(s.id);
    const between = (lo, hi, dp = 0) => Number((lo + r() * (hi - lo)).toFixed(dp));
    const intensity = between(46, 68), rate = between(105, 172), pitch = between(18, 62);
    const pauses = between(2.5, 10, 1), fillers = between(0.6, 6, 1), monotone = between(6, 38);
    const eye = between(42, 92), gestures = between(2, 12, 1), posture = between(72, 98);
    const happy = between(8, 40), stressed = between(4, 30), neutral = Math.max(0, 100 - happy - stressed);
    const vocal = [band(intensity, (v) => v >= 55, (v) => v >= 50), band(rate, (v) => v >= 120 && v <= 150, (v) => v >= 108 && v <= 162), band(pitch, (v) => v >= 30, (v) => v >= 22)];
    return {
      delivery: [
        { id: 'vocal', icon: 'i-wave', name: 'Vocal Features', level: worst(vocal),
          about: 'How strongly and clearly you speak: loud enough to hear, at a pace that is easy to follow, with natural changes in pitch.',
          metrics: [
            { label: 'Intensity', value: intensity, unit: 'dB', level: vocal[0], target: 'Aim for 55 dB or more' },
            { label: 'Speech rate', value: rate, unit: 'wpm', level: vocal[1], target: 'Aim for 120 to 150 words a minute' },
            { label: 'Pitch variation', value: pitch, unit: 'Hz', level: vocal[2], target: 'Aim for 30 Hz or more' },
          ],
          next: rate > 150 ? 'Slow down a little: pause after each main point so the interviewer can follow.' : intensity < 55 ? 'Speak a little louder and closer to the mic, as if the interviewer were across a table.' : 'Keep this pace and volume, and lift your voice on the key result in each story.' },
        { id: 'pauses', icon: 'i-pause', name: 'Appropriate Pauses', level: band(pauses, (v) => v >= 4 && v <= 8, (v) => v >= 3 && v <= 9),
          about: 'Short pauses between ideas give the interviewer time to take in what you said and make you sound composed.',
          metrics: [{ label: 'Pauses a minute', value: pauses, unit: '', target: 'Aim for 4 to 8', bar: { value: pauses, max: 12, from: 4, to: 8 } }],
          next: pauses < 4 ? 'Pause for a breath after each part of your answer, before moving to the next.' : pauses > 8 ? 'Join related points into one sentence so the pauses come between ideas, not inside them.' : 'Your pauses land between ideas. Keep using them before your result.' },
        { id: 'fluency', icon: 'i-flow', name: 'Speech Fluency', level: band(fillers, (v) => v < 2, (v) => v < 4),
          about: 'How smoothly you speak: fewer fillers such as "um", "like" and "you know" make an answer sound prepared.',
          metrics: [{ label: 'Filler words a minute', value: fillers, unit: '', target: 'Aim for fewer than 2', bar: { value: fillers, max: 8, from: 0, to: 2 } }],
          next: fillers >= 2 ? 'When you need a moment, pause silently instead of saying "um". Practise your first sentence for each story.' : 'Few fillers. Keep preparing your opening line for each story.' },
        { id: 'modulation', icon: 'i-wave', name: 'Speech Modulation', level: band(monotone, (v) => v < 15, (v) => v < 25),
          about: 'Changing your tone and emphasis keeps the interviewer engaged and shows which parts of your answer matter most.',
          metrics: [{ label: 'Time in a flat tone', value: monotone, unit: '%', target: 'Aim for under 15%', bar: { value: monotone, max: 50, from: 0, to: 15 } }],
          next: monotone >= 15 ? 'Stress the words that carry your point, such as the result and the number behind it.' : 'Good variety in your tone. Keep emphasising your results.' },
      ],
      nonverbal: [
        { id: 'eye', icon: 'i-eye', name: 'Eye Contact', level: band(eye, (v) => v >= 75, (v) => v >= 60),
          about: 'Looking at the camera reads as looking at the interviewer: it shows confidence and interest in the conversation.',
          metrics: [{ label: 'Eye contact duration', value: eye, unit: '%', target: 'Minimum 75%', bar: { value: eye, max: 100, from: 75, to: 100 } }],
          next: eye < 75 ? 'Look at the camera, not the screen, while you speak. Put a small note next to the lens as a reminder.' : 'Good eye contact. Keep looking at the camera when you give your result.' },
        { id: 'face', icon: 'i-smile', name: 'Facial Expressions', level: stressed > 22 ? 'needs_work' : happy >= 20 ? 'good_job' : 'on_track',
          about: 'A relaxed, friendly expression makes you look approachable and confident; a tense one can read as nervousness.',
          metrics: [{ label: 'Mix', mix: [['Happy', happy, 'good'], ['Neutral', neutral, 'none'], ['Stressed', stressed, 'work']] }],
          next: stressed > 22 ? 'Take a breath before each answer and relax your jaw and shoulders; a small smile when you start helps.' : 'Your expression stays relaxed. Smile when you greet the interviewer and when you finish.' },
        { id: 'hands', icon: 'i-hand', name: 'Hand Gestures', level: band(gestures, (v) => v >= 4 && v <= 9, (v) => v >= 3 && v <= 11),
          about: 'Open, natural gestures support what you say; too few can look stiff and too many can distract.',
          metrics: [{ label: 'Gestures a minute', value: gestures, unit: '', target: 'Aim for 4 to 9', bar: { value: gestures, max: 14, from: 4, to: 9 } }],
          next: gestures < 4 ? 'Let your hands move naturally when you list steps or describe a change; keep them in the frame.' : gestures > 9 ? 'Rest your hands between points so each gesture marks something that matters.' : 'Natural gestures. Keep them in the frame.' },
        { id: 'posture', icon: 'i-posture', name: 'Body Posture', level: band(posture, (v) => v >= 90, (v) => v >= 80),
          about: 'Sitting upright and facing the camera shows you are engaged and gives your voice more energy.',
          metrics: [{ label: 'Upright posture', value: posture, unit: '%', target: 'Minimum 90%', bar: { value: posture, max: 100, from: 90, to: 100 } }],
          next: posture < 90 ? 'Sit back in the chair with your feet flat, and set the camera at eye level so you don\'t lean in.' : 'Good posture. Keep the camera at eye level.' },
      ],
    };
  }

  // A module's level from its parts: mostly Good job is Good job, half or more Needs work is Needs work.
  function moduleLevel(levels) {
    const n = levels.length;
    if (!n) return null;
    if (levels.filter((l) => l === 'needs_work').length * 2 >= n) return 'needs_work';
    if (levels.filter((l) => l === 'good_job').length * 2 > n) return 'good_job';
    return 'on_track';
  }

  function paramCard(p) {
    const metrics = p.metrics.map((m) => {
      if (m.mix) {
        return `<div class="fb-metric"><span class="fb-metric-label">${esc(m.label)}</span>
          <div class="fb-mix" role="img" aria-label="${esc(m.mix.map(([k, v]) => `${k} ${v}%`).join(', '))}">${m.mix.map(([k, v, c]) => `<span class="${c}" style="width:${v}%"></span>`).join('')}</div>
          <div class="fb-mix-legend">${m.mix.map(([k, v, c]) => `<span><i class="${c}"></i>${esc(k)} ${v}%</span>`).join('')}</div></div>`;
      }
      const bar = m.bar ? `<div class="fb-meter" role="img" aria-label="${esc(`${m.value}${m.unit} (${m.target})`)}">
          <span class="fb-meter-zone" style="left:${(m.bar.from / m.bar.max) * 100}%;width:${((m.bar.to - m.bar.from) / m.bar.max) * 100}%"></span>
          <span class="fb-meter-dot ${LEVEL[m.level || p.level][1]}" style="left:${Math.min(100, (m.bar.value / m.bar.max) * 100)}%"></span></div>` : '';
      return `<div class="fb-metric"><div class="fb-metric-row"><span class="fb-metric-label">${esc(m.label)}</span><span class="fb-metric-value ${LEVEL[m.level || p.level][1]}">${m.value}<small>${esc(m.unit)}</small></span></div>${bar}<span class="fb-metric-target">${esc(m.target)}</span></div>`;
    }).join('');
    return `<article class="fb-card fb-param">
      <div class="fb-param-head"><span class="fb-param-icon ${LEVEL[p.level][1]}" aria-hidden="true"><svg class="ic"><use href="#${p.icon}"/></svg></span><h3>${esc(p.name)}</h3>${chip(p.level)}</div>
      <p class="fb-param-about">${esc(p.about)}</p>
      <div class="fb-metrics">${metrics}</div>
      <p class="fb-param-next"><strong>Next step:</strong> ${esc(p.next)}</p>
    </article>`;
  }

  const MODULES = [
    { id: 'content', icon: 'i-doc', name: 'Content Strength', about: 'What you said: the structure and the evidence in your answers.' },
    { id: 'delivery', icon: 'i-wave', name: 'Delivery of Speech', about: 'How you sounded: volume, pace, pauses and fluency.' },
    { id: 'nonverbal', icon: 'i-eye', name: 'Non Verbal', about: 'How you came across on camera: eye contact, expression, posture.' },
  ];

  // ---------- Default layout: VMock's three modules ----------
  function renderModules(panel, s, fb) {
    header(s, fb);
    const sig = signals(s);
    const level = {
      content: moduleLevel(fb.topics.filter((t) => t.verdict).map((t) => t.verdict)),
      delivery: moduleLevel(sig.delivery.map((p) => p.level)),
      nonverbal: moduleLevel(sig.nonverbal.map((p) => p.level)),
    };
    const [goal, ...more] = fb.priorities || [];
    // "Also work on": the content priorities, plus the weakest delivery or body-language part's next step.
    const order = { needs_work: 0, on_track: 1, good_job: 2 };
    const weakest = [...sig.delivery.map((p) => ({ ...p, module: 'Delivery of Speech' })), ...sig.nonverbal.map((p) => ({ ...p, module: 'Non Verbal' }))]
      .sort((a, b) => order[a.level] - order[b.level])[0];
    const also = [
      ...more.slice(0, 2).map((p) => ({ eyebrow: 'Content Strength', title: p.title, text: p.action })),
      ...(weakest && weakest.level !== 'good_job' ? [{ eyebrow: weakest.module, title: weakest.name, text: weakest.next }] : []),
    ];

    const tiles = MODULES.map((m) => `<button class="fb-tile" type="button" data-tab="${m.id}">
        <span class="fb-tile-icon" aria-hidden="true"><svg class="ic"><use href="#${m.icon}"/></svg></span>
        <span class="fb-tile-name">${m.name}</span>${level[m.id] ? chip(level[m.id]) : '<span class="fb-chip none">Not enough to judge</span>'}
        <span class="fb-tile-about">${m.about}</span></button>`).join('');
    let html = `<section class="fb-card fb-summary" aria-labelledby="fbSummaryTitle">
      <h2 class="sr" id="fbSummaryTitle">How it went</h2>
      ${fb.overall ? `<p class="fb-overall">${esc(fb.overall)}</p>` : ''}
      <div class="fb-tiles">${tiles}</div>`;
    if (goal) {
      html += `<div class="fb-goal"><div class="fb-goal-icon" aria-hidden="true"><svg class="ic"><use href="#i-target"/></svg></div>
        <div><div class="fb-eyebrow">Your goal for next time</div><h3>${esc(goal.title)}</h3>${goal.why ? `<p>${esc(goal.why)}</p>` : ''}${goal.action ? `<p class="fb-try"><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}</div></div>`;
    }
    if (also.length) {
      html += `<div class="fb-also"><h3 class="fb-also-title">Also work on</h3><div class="fb-also-grid">${also.map((a) => `<div class="fb-also-item"><span class="fb-eyebrow">${esc(a.eyebrow)}</span><strong>${esc(a.title)}</strong>${a.text ? `<span>${esc(a.text)}</span>` : ''}</div>`).join('')}</div></div>`;
    }
    html += '</section>';

    const tabs = MODULES.map((m, i) => `<button class="fb-tab" type="button" role="tab" id="fb-tab-${m.id}" aria-controls="fb-panel-${m.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${m.id}">${m.name}${level[m.id] ? chip(level[m.id]) : ''}</button>`).join('');
    const judged = fb.topics.filter((t) => t.verdict);
    const count = (v) => judged.filter((t) => t.verdict === v).length;
    const strip = fb.topics.map((t, i) => `<a class="fb-seg ${t.verdict ? LEVEL[t.verdict][1] : 'none'}" href="#fb-q-${i}" title="${esc(`${i + 1}. ${topicName(t)}: ${t.verdict ? LEVEL[t.verdict][0] : 'Too short to judge'}`)}"><span>${i + 1}</span></a>`).join('');
    const tally = ['good_job', 'on_track', 'needs_work'].filter(count).map((v) => `<span class="fb-chip ${LEVEL[v][1]}">${count(v)} ${LEVEL[v][0]}</span>`).join('');
    const content = fb.topics.length
      ? `<div class="fb-strip-row"><div class="fb-strip" aria-label="Result for each question">${strip}</div><div class="fb-tally">${tally}</div></div>${questionsHtml(s, fb)}${across(fb)}`
      : EMPTY;
    const intro = (text) => `<p class="fb-tab-intro">${text}</p>`;
    html += `<div class="fb-tabs" role="tablist" aria-label="Feedback modules">${tabs}</div>
      <div class="fb-panel" role="tabpanel" id="fb-panel-content" aria-labelledby="fb-tab-content">${content}</div>
      <div class="fb-panel" role="tabpanel" id="fb-panel-delivery" aria-labelledby="fb-tab-delivery" hidden>${intro('How your voice came across across the whole interview.')}<div class="fb-params">${sig.delivery.map(paramCard).join('')}</div></div>
      <div class="fb-panel" role="tabpanel" id="fb-panel-nonverbal" aria-labelledby="fb-tab-nonverbal" hidden>${intro('How you came across on camera across the whole interview.')}<div class="fb-params">${sig.nonverbal.map(paramCard).join('')}</div></div>`;
    panel.innerHTML = html;

    const select = (id, focus) => {
      panel.querySelectorAll('.fb-tab').forEach((t) => {
        const on = t.dataset.tab === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panel.querySelectorAll('.fb-panel').forEach((p) => { p.hidden = p.id !== `fb-panel-${id}`; });
    };
    panel.querySelectorAll('.fb-tab').forEach((t) => t.addEventListener('click', () => select(t.dataset.tab)));
    // Arrow keys move between tabs (the ARIA tabs pattern).
    panel.querySelector('.fb-tabs').addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const ids = MODULES.map((m) => m.id);
      const cur = ids.indexOf(panel.querySelector('.fb-tab[aria-selected="true"]').dataset.tab);
      select(ids[(cur + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length], true);
    });
    // A summary tile opens its module's tab and brings the tabs into view.
    panel.querySelectorAll('.fb-tile').forEach((b) => b.addEventListener('click', () => {
      select(b.dataset.tab);
      panel.querySelector('.fb-tabs').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
    wireQuestions(panel);
  }

  VM.renderFeedback = new URLSearchParams(location.search).get('fbview') === 'classic' ? renderClassic : renderModules;
})();

/* Dashboard replica room: the feedback screen in the shape of the dashboard's results page
   (www.vmock.com/interviews/:id/results): Summary | Detailed Feedback. Content only, as feedback v3: no Non Verbal or
   Delivery of Speech, and no level or score. Same feedback object as v3 (POST /api/sessions/:id/feedback).
   Replaces VM.renderFeedback on dash/room.html only. */
(() => {
  const esc = VM.esc;
  const LEVEL = { good_job: ['Good Job', 'good'], on_track: ['On Track', 'track'], needs_work: ['Needs Work', 'work'] };
  const TYPE = { recruiter_screen: 'Screening round', hiring_manager: 'Hiring manager round', back_your_resume: 'CV Deep Dive' };
  const STYLE = { supportive: 'Friendly', balanced: 'Standard', probing: 'Challenging' };
  const MINUTES = { short: 10, standard: 15 };
  const KIND = { claim: 'From your CV', gap: 'For the role', motivation: 'Motivation and fit', concerns: 'About your CV', second_chance: 'Second try', background: 'Your background' };
  const FOUND = { first_answer: 'In your first answer', after_follow_up: 'After a follow-up', not_given: 'Not given' };
  const JD = { covered: ['Covered', 'good'], partly: ['Partly covered', 'track'], not_reached: ['Not reached', 'none'] };
  const MOMENT = { warmup: 'Warm-up', background: 'Your background', candidate_questions: 'Your questions at the end' };
  const reEscape = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const firstSentence = (x) => (String(x || '').match(/^.*?[.!?](\s|$)/) || [String(x || '')])[0].trim();

  // The row icon follows the level (a tick only for Good Job), so a red tick never says "good" next to Needs Work.
  const LEVEL_ICON = { good_job: 'i-check', on_track: 'i-minus', needs_work: 'i-alert' };
  const levelIcon = (level) => LEVEL_ICON[level] || 'i-check';
  const pill = (level, cls = '') => (LEVEL[level] ? `<span class="d-pill ${LEVEL[level][1]} ${cls}">${LEVEL[level][0]}</span>` : '');
  const resultPill = (t, cls = '') => (t.too_short ? `<span class="d-pill none ${cls}">Too short</span>` : pill(t.verdict, cls));
  const topicName = (t) => (t.kind === 'second_chance' ? `${t.topic || 'Earlier topic'} (second try)` : t.topic || KIND[t.kind] || 'Question');
  const quote = (q) => (q ? `<blockquote class="dr-quote">“${esc(q)}”</blockquote>` : '');
  const blanks = (text) => esc(text).replace(/\[([^\]]+)\]/g, '<span class="dr-blank"><span class="sr">fill in: </span>$1</span>');
  function highlight(text, quotes) {
    let html = esc(text);
    for (const q of quotes.filter(Boolean)) html = html.replace(new RegExp(reEscape(esc(q)), 'i'), (m) => `<mark>${m}</mark>`);
    return html;
  }
  function rowLine(t) {
    if (t.too_short) return 'Your answer was too short to give feedback on. Open it to see how to answer next time.';
    if (t.verdict === 'good_job' && t.went_well) return firstSentence(t.went_well);
    return firstSentence(t.to_fix || t.went_well || (t.answer_plan || [])[0] || '');
  }
  // A group's level from its parts: half or more Needs work is Needs work, mostly Good job is Good job.
  function moduleLevel(levels) {
    const ls = levels.filter(Boolean);
    if (!ls.length) return null;
    if (ls.filter((l) => l === 'needs_work').length * 2 >= ls.length) return 'needs_work';
    if (ls.filter((l) => l === 'good_job').length * 2 > ls.length) return 'good_job';
    return 'on_track';
  }

  // Our ratings under VMock's Content Strength names, by question type (same groups as feedback v3).
  const GROUPS = {
    behavioural: [['STAR/HSAR', ['situation', 'task', 'action', 'result']], ['Depth & Clarity', ['technical']]],
    situational: [['Depth & Clarity', ['first_step', 'reasoning']], ['Practical Application', ['success_measure']]],
    knowledge: [['Depth & Clarity', ['accuracy', 'depth']], ['Practical Application', ['application']]],
    motivation: [['Motivation & Fit', ['reason', 'fit', 'evidence']]],
    concern: [['Learning & Reflection', ['explanation', 'ownership', 'forward']]],
  };
  const GROUP_HELP = {
    'STAR/HSAR': 'Situation, Task, Action, Result: the parts of a story answer.',
    'Depth & Clarity': 'How clearly you explain how and why.',
    'Practical Application': 'How you would use it in a real situation.',
    'Motivation & Fit': 'Why you want this role and why you suit it.',
    'Learning & Reflection': 'What you learned and what you would do differently.',
    'Handling follow-ups': 'How you answered when the interviewer asked for more.',
    'Other elements': 'Other parts a strong answer to this question needs.',
  };
  const RANK = ['STAR/HSAR', 'Depth & Clarity', 'Practical Application', 'Motivation & Fit', 'Learning & Reflection', 'Other elements', 'Handling follow-ups'];
  function groupsFor(t) {
    const ratings = (t.ratings || []).filter((r) => r.dimension !== 'followup');
    const out = (GROUPS[t.rubric] || []).map(([name, dims]) => ({ name, items: ratings.filter((r) => dims.includes(r.dimension)) })).filter((g) => g.items.length);
    const left = ratings.filter((r) => !out.some((g) => g.items.includes(r)));
    if (left.length) out.push({ name: 'Other elements', items: left });
    const fu = (t.ratings || []).filter((r) => r.dimension === 'followup');
    if (fu.length) out.push({ name: 'Handling follow-ups', items: fu });
    return out;
  }
  // Across the interview: one row per group, Good Job only when every element was strong in every answer.
  function groupsAcross(fb) {
    const by = new Map();
    fb.topics.forEach((t, i) => groupsFor(t).forEach((g) => {
      if (!by.has(g.name)) by.set(g.name, []);
      by.get(g.name).push({ i, items: g.items });
    }));
    return [...by.entries()].sort((a, b) => RANK.indexOf(a[0]) - RANK.indexOf(b[0])).map(([name, uses]) => {
      const all = uses.flatMap((u) => u.items);
      const weak = uses.filter((u) => u.items.some((r) => r.level !== 'good_job'));
      const lv = moduleLevel(all.map((r) => r.level));
      return { name, level: weak.length ? (lv === 'good_job' ? 'on_track' : lv) : 'good_job', weak: weak.map((u) => u.i) };
    });
  }

  // ---------- Header bar ----------
  function header(s, fb) {
    const type = TYPE[s.inputs?.interview_type] || 'AI Interviewer';
    const role = s.plan?.jd?.role_title || s.inputs?.target_role || (s.inputs?.domain ? `${s.inputs.domain} interview` : 'Practice interview');
    const company = s.plan?.jd?.company;
    const style = s.surprise ? `Surprise style (${STYLE[s.style] || s.style})` : `${STYLE[s.style] || s.style} style`;
    const date = new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('fbType').textContent = company ? `${type} · ${company}` : type; // company here so the role fits
    document.getElementById('fbRole').textContent = role;
    document.getElementById('fbRole').title = company ? `${role} at ${company}` : role;
    document.getElementById('feedbackMeta').textContent = [date, `${MINUTES[s.inputs?.length] || 15} min`, style, plural(fb.topics.length, 'question')].join(' · ');
  }

  // ---------- Transcript ("Script") for one question, with times from the start of the interview ----------
  function clock(ms) {
    const sec = Math.max(0, Math.round(ms / 1000));
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
  function scriptPane(s, t) {
    const t0 = Date.parse((s.transcript[0] || {}).at || s.created_at);
    const lines = s.transcript.filter((e) => e.slot_id === t.slot_id);
    const marks = [t.went_well_quote, t.to_fix_quote, t.resume_mismatch && t.resume_mismatch.quote];
    const seg = t.segment && t.segment.start ? `<span class="dr-seg">${clock(Date.parse(t.segment.start) - t0)} - ${t.segment.end ? clock(Date.parse(t.segment.end) - t0) : '…'}</span>` : '';
    return `<aside class="dr-script" aria-label="Script">
      <div class="dr-script-tabs"><span class="dr-script-tab" aria-current="true">Script</span>${seg}</div>
      <div class="dr-script-body">${lines.length ? lines.map((e) => `<div class="dr-line ${e.role === 'candidate' ? 'you' : 'ai'}">
          <div class="dr-line-who">${e.role === 'candidate' ? 'You' : 'Interviewer'}<time>${e.at ? clock(Date.parse(e.at) - t0) : ''}</time></div>
          <p>${e.role === 'candidate' ? highlight(e.text, marks) : esc(e.text)}</p></div>`).join('')
        : '<p class="dr-muted">No transcript for this question.</p>'}</div>
      ${marks.some(Boolean) ? '<p class="dr-script-key"><mark>Highlighted</mark> the lines your feedback quotes.</p>' : ''}
    </aside>`;
  }

  // ---------- Detailed Feedback: one question, sub-nav on the left, content in the middle, script on the right ----------
  function nextTimeBody(t) {
    const plan = t.answer_plan || [];
    let html = '';
    if (t.too_short) html += `<div class="dr-banner">Your answer here was too short to give feedback on. Use the ${plan.length === 1 ? 'step' : 'steps'} below to prepare this one.</div>`;
    if (plan.length) html += `<ol class="dr-steps">${plan.map((p) => `<li>${blanks(p)}</li>`).join('')}</ol>`;
    if (t.stronger_version) {
      html += `<div class="dr-sample"><span class="dr-sample-tag">YOUR ANSWER, IMPROVED</span><p>${blanks(t.stronger_version)}</p>
        <p class="dr-muted">Fill in the boxes with your own details. Uses only facts from your CV, the job description and your answers.</p></div>`;
    }
    if (t.example_answer) {
      html += `<div class="dr-sample"><span class="dr-sample-tag">SAMPLE RESPONSE</span><p>${esc(t.example_answer)}</p>
        <p class="dr-muted">From a sample candidate, to show the approach. Use your own example.</p></div>`;
    }
    return html || '<p class="dr-muted">No steps for this question.</p>';
  }
  function didBody(t) {
    const boxes = [];
    if (t.went_well) boxes.push(`<div class="dr-box well"><h4>What went well</h4>${quote(t.went_well_quote)}<p>${esc(t.went_well)}</p></div>`);
    if (t.resume_mismatch) boxes.push(`<div class="dr-box fix"><h4>Doesn't match your CV</h4>${quote(t.resume_mismatch.quote)}<p>${esc(t.resume_mismatch.note)}</p>${t.resume_mismatch.tip ? `<p class="dr-tip">${esc(t.resume_mismatch.tip)}</p>` : ''}</div>`);
    if (t.to_fix) boxes.push(`<div class="dr-box fix"><h4>${t.resume_mismatch ? 'Also fix' : 'What to fix'}</h4>${quote(t.to_fix_quote)}<p>${esc(t.to_fix)}</p></div>`);
    return boxes.join('') || '<p class="dr-muted">Nothing to note here.</p>';
  }
  function groupBody(g) {
    return `${GROUP_HELP[g.name] ? `<p class="dr-help">${GROUP_HELP[g.name]}</p>` : ''}
      <div class="dr-elements">${g.items.map((r) => `<div class="dr-element">
        <div class="dr-element-head"><strong>${esc(r.label)}</strong>${pill(r.level, 'sm')}</div>
        <p>${esc(r.reason)}</p>
        ${r.found ? `<p class="dr-found ${r.found === 'not_given' ? 'missing' : ''}">${FOUND[r.found]}</p>` : ''}
        ${r.quote ? quote(r.quote) : ''}</div>`).join('')}</div>`;
  }
  function followUpsBody(t) {
    return `<ul class="dr-fus">${t.follow_ups.map((f) => `<li><p class="dr-fu-q">“${esc(f.question)}”</p>${f.why ? `<p class="dr-muted">${esc(f.why)}</p>` : ''}
      ${f.asked_for_label && f.given !== null ? `<span class="d-pill sm ${f.given ? 'good' : 'work'}">${f.given ? 'You added' : 'Still missing'}: ${esc(f.asked_for_label.toLowerCase())}</span>` : ''}</li>`).join('')}</ul>`;
  }
  // The sub-nav items of one question: how to answer next time, what you did, each Content Strength group, follow-ups.
  function subItems(t) {
    const items = [{ id: 'next', name: 'Next time', icon: 'i-target', title: 'How to answer it next time', level: null, body: nextTimeBody(t) }];
    if (!t.too_short) {
      items.push({ id: 'did', name: 'What you did', icon: 'i-doc', title: 'What you did', level: t.verdict, body: didBody(t) });
      groupsFor(t).forEach((g, k) => items.push({ id: `g${k}`, name: g.name, icon: levelIcon(moduleLevel(g.items.map((r) => r.level))), title: g.name, level: moduleLevel(g.items.map((r) => r.level)), body: groupBody(g) }));
    }
    if ((t.follow_ups || []).length) items.push({ id: 'fu', name: 'Follow-ups', icon: 'i-chat', title: 'Follow-up questions', level: null, body: followUpsBody(t) });
    return items;
  }
  function questionPane(s, t, i, open) {
    const items = subItems(t);
    const source = t.resume_line ? `<p class="dr-from"><span>From your CV</span>“${esc(t.resume_line)}”</p>`
      : t.jd_line ? `<p class="dr-from"><span>From the job description</span>${esc(t.jd_line)}</p>` : '';
    // Open on what helps most: the plan when the answer needs work or was too short, else what the student did.
    const first = t.too_short || t.verdict === 'needs_work' || items.length < 2 ? 0 : 1;
    return `<article class="dr-qpane" id="dr-q-${i}" data-q="${i}" role="tabpanel" aria-labelledby="dr-qpill-${i}"${open ? '' : ' hidden'}>
      <div class="dr-question"><p>${esc(t.question || topicName(t))}</p>${source}</div>
      <div class="dr-qgrid">
        <section class="dr-module">
          <div class="dr-modtabs"><div class="dr-modtab" aria-current="true"><span>Content Strength</span>${resultPill(t)}</div></div>
          <div class="dr-modbody">
            <nav class="dr-subnav" aria-label="${esc(topicName(t))}">${items.map((it, k) => `<button class="dr-subitem" type="button" data-sub="${k}" aria-pressed="${k === first}">
              <span class="dr-subicon ${it.level ? LEVEL[it.level][1] : ''}" aria-hidden="true"><svg class="ic"><use href="#${it.icon}"/></svg></span><span>${esc(it.name)}</span></button>`).join('')}</nav>
            <div class="dr-subpanes">${items.map((it, k) => `<div class="dr-subpane" data-sub="${k}"${k === first ? '' : ' hidden'}>
              ${it.level === 'needs_work' || it.level === 'on_track' ? `<div class="dr-banner"><svg class="ic" aria-hidden="true"><use href="#i-target"/></svg>Improve this part to move this answer up</div>` : ''}
              <div class="dr-subhead"><h3>${esc(it.title)}</h3>${pill(it.level)}</div>${it.body}</div>`).join('')}</div>
          </div>
        </section>
        ${scriptPane(s, t)}
      </div>
    </article>`;
  }

  // Across the interview: talking about your own work, moments, JD coverage (a last pill after the questions).
  function acrossPane(fb, open) {
    const parts = [];
    const own = fb.ownership || { i: 0, we: 0 };
    if (own.i + own.we > 0) {
      const pct = Math.round((own.i / (own.i + own.we)) * 100);
      parts.push(`<div class="dr-card"><h3>Talking about your own work</h3>
        <p>You said “I” ${plural(own.i, 'time')} and “we” ${plural(own.we, 'time')}.${own.we > own.i ? ' Interviewers listen for “I” to understand what you did yourself.' : ''}</p>
        <div class="dr-iwe" role="img" aria-label="${pct}% I, ${100 - pct}% we"><span style="width:${pct}%"></span></div></div>`);
    }
    for (const m of fb.moments || []) {
      const t = fb.topics.find((x) => x.slot_id === m.slot_id);
      parts.push(`<div class="dr-card"><h3>${esc(MOMENT[m.slot_id] || (t ? `Matching your CV: ${topicName(t)}` : 'A moment to note'))}</h3>${quote(m.quote)}<p>${esc(m.note)}</p>${m.tip ? `<p class="dr-tip">${esc(m.tip)}</p>` : ''}</div>`);
    }
    if ((fb.jd_coverage || []).length) {
      parts.push(`<div class="dr-card wide"><h3>Job description coverage</h3><p>The must-haves from the job description, and whether your answers showed them.</p>
        <ul class="dr-jd">${fb.jd_coverage.map((c) => `<li><span class="d-pill sm ${(JD[c.status] || JD.not_reached)[1]}">${(JD[c.status] || JD.not_reached)[0]}</span>${esc(c.name)}</li>`).join('')}</ul></div>`);
    }
    if (!parts.length) return '';
    return `<article class="dr-qpane" id="dr-q-across" data-q="across" role="tabpanel" aria-labelledby="dr-qpill-across"${open ? '' : ' hidden'}>
      <div class="dr-question"><p>Across the interview</p><p class="dr-muted">How you came across overall, beyond single answers.</p></div>
      <div class="dr-across">${parts.join('')}</div></article>`;
  }

  // ---------- Summary ----------
  function summaryHtml(s, fb, judged, goal, more) {
    const level = moduleLevel(fb.topics.filter((t) => t.verdict).map((t) => t.verdict));
    const across = groupsAcross(fb);
    const count = (v) => fb.topics.filter((t) => t.verdict === v).length;
    const tally = ['good_job', 'on_track', 'needs_work'].filter(count).map((v) => `<span class="d-pill ${LEVEL[v][1]}">${count(v)} ${LEVEL[v][0]}</span>`).join('');
    const goalQ = goal && goal.slot_id ? fb.topics.findIndex((t) => t.slot_id === goal.slot_id) : -1;
    const qpills = [`<button class="dr-qp" type="button" data-sum="all" aria-pressed="true">Overall</button>`, ...fb.topics.map((t, i) => `<button class="dr-qp" type="button" data-sum="${i}" aria-pressed="false">Q${i + 1}</button>`)].join('');
    // Content Strength card: Overall shows each group across the interview; Qn shows that question's groups.
    const overallRows = across.map((g) => `<li><span class="dr-row-icon ${LEVEL[g.level][1]}" aria-hidden="true"><svg class="ic"><use href="#${levelIcon(g.level)}"/></svg></span><span>${esc(g.name)}</span>${pill(g.level, 'sm tag')}</li>`).join('');
    const qBlocks = fb.topics.map((t, i) => {
      const gs = groupsFor(t);
      return `<div class="dr-cs-q" data-sumq="${i}" hidden>
        <p class="dr-cs-topic"><strong>${esc(topicName(t))}</strong>${resultPill(t, 'sm')}</p>
        ${gs.length && !t.too_short ? `<ul class="dr-rows">${gs.map((g) => { const lv = moduleLevel(g.items.map((r) => r.level)); return `<li><span class="dr-row-icon ${lv ? LEVEL[lv][1] : ''}" aria-hidden="true"><svg class="ic"><use href="#${levelIcon(lv)}"/></svg></span><span>${esc(g.name)}</span>${pill(lv, 'sm tag')}</li>`; }).join('')}</ul>` : ''}
        <p class="dr-cs-line">${esc(rowLine(t))}</p></div>`;
    }).join('');

    const left = `<section class="dr-sum-main">
      <div class="dr-sum-head">
        <span class="dr-sum-icon" aria-hidden="true"><svg class="ic"><use href="#i-doc"/></svg></span>
        <div><h2>How your interview went</h2>
          ${judged && fb.overall ? `<p class="dr-overall" id="drOverall">${esc(fb.overall)}</p><button class="dr-more" type="button" id="drOverallMore" aria-expanded="false" hidden>Read more</button>` : ''}
          ${judged ? '' : fb.topics.length ? '<p class="dr-overall">None of your answers was long enough to judge. Open a question for the steps to answer it next time.</p>' : ''}</div>
        ${tally ? `<div class="dr-tally" role="group" aria-label="Results across your answers">${tally}</div>` : ''}
      </div>
      <div class="dr-qpills" role="group" aria-label="Show results for">${qpills}</div>
      <div class="dr-sum-cards">
        <article class="dr-cs">
          <div class="dr-cs-head"><h3>Content Strength</h3><span data-cs-level>${pill(level)}</span></div>
          <p class="dr-cs-desc">Checks the structure of your answers and whether they have the parts a strong answer needs.</p>
          <div data-sumq="all"><ul class="dr-rows">${overallRows || '<li class="dr-muted">Nothing judged yet.</li>'}</ul></div>
          ${qBlocks}
          <button class="dr-viewmore" type="button" data-viewmore>View in Detailed Feedback</button>
        </article>
        <article class="dr-cs dr-glance">
          <div class="dr-cs-head"><h3>Question by question</h3></div>
          <ol class="dr-glance-list">${fb.topics.map((t, i) => `<li><button type="button" data-open="${i}"><span class="dr-num">${i + 1}</span>
            <span class="dr-glance-text"><strong>${esc(topicName(t))}</strong><span>${esc(rowLine(t))}</span></span>${resultPill(t, 'sm')}</button></li>`).join('')}</ol>
        </article>
      </div>
      <div class="dr-legend" aria-hidden="true"><span class="good">Good Job</span><span class="track">On Track</span><span class="work">Needs Work</span></div>
    </section>`;

    const right = `<aside class="dr-sum-side">
      <h2>How to improve?</h2>
      <p class="dr-muted">Feedback on every answer, with how to answer it next time.</p>
      ${goal ? `<div class="dr-goal"><div class="dr-goal-meta"><span>Your goal for next time</span><span class="dr-impact"><svg class="ic" aria-hidden="true"><use href="#i-up"/></svg>High impact</span></div>
        <h3>${esc(goal.title)}</h3>${goal.action ? `<p><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}${goal.why ? `<p class="dr-muted">${esc(goal.why)}</p>` : ''}
        ${goalQ >= 0 ? `<button class="dr-link" type="button" data-open="${goalQ}">See it in question ${goalQ + 1}</button>` : ''}</div>` : ''}
      ${fb.topics.length ? '<button class="d-btn primary dr-wide" type="button" data-detailed>View Detailed Feedback</button>' : ''}
      ${more.length ? `<h3 class="dr-also-h">Also work on</h3><ul class="dr-also">${more.map((x) => `<li><span class="dr-dot" aria-hidden="true"></span><div><strong>${esc(x.title)}</strong>${x.action ? `<p>${esc(x.action)}</p>` : ''}</div></li>`).join('')}</ul>` : ''}
    </aside>`;
    return `<div class="dr-view" id="dr-view-summary" role="tabpanel" aria-labelledby="dr-tab-summary"><div class="dr-sum">${left}${right}</div></div>`;
  }

  const EMPTY = '<p class="dr-empty">The interview ended before any question was answered, so there is nothing to give feedback on yet. Practise again to get feedback on your answers.</p>';
  const firstOpenOf = (fb) => [fb.topics.findIndex((t) => t.verdict === 'needs_work'), fb.topics.findIndex((t) => !t.too_short), 0].find((i) => i >= 0);

  function render(panel, s, fb) {
    header(s, fb);
    const judged = fb.topics.some((t) => t.verdict);
    const [goal, ...more] = judged ? fb.priorities || [] : [];
    const tabs = document.getElementById('fbTabs');
    tabs.innerHTML = [['summary', 'Summary'], ['detailed', 'Detailed Feedback']].map(([id, name], k) => `<button class="dr-fbtab" type="button" role="tab" id="dr-tab-${id}" aria-controls="dr-view-${id}" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}" data-view="${id}">${name}</button>`).join('');
    if (!fb.topics.length) { panel.innerHTML = EMPTY; tabs.innerHTML = ''; return; }

    const open = firstOpenOf(fb);
    const across = acrossPane(fb, false);
    const detailed = `<div class="dr-view" id="dr-view-detailed" role="tabpanel" aria-labelledby="dr-tab-detailed" hidden>
      <div class="dr-qbar" role="tablist" aria-label="Questions">${fb.topics.map((t, i) => `<button class="dr-qp ${t.too_short ? '' : (LEVEL[t.verdict] || [])[1] || ''}" type="button" role="tab" id="dr-qpill-${i}" aria-controls="dr-q-${i}" aria-selected="${i === open}" data-q="${i}">Q${i + 1}</button>`).join('')}
        ${across ? '<button class="dr-qp" type="button" role="tab" id="dr-qpill-across" aria-controls="dr-q-across" aria-selected="false" data-q="across">Across the interview</button>' : ''}</div>
      ${fb.topics.map((t, i) => questionPane(s, t, i, i === open)).join('')}${across}
    </div>`;
    panel.innerHTML = summaryHtml(s, fb, judged, goal, more) + detailed;
    wire(panel, tabs);
  }

  function wire(panel, tabs) {
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const tabBtns = [...tabs.querySelectorAll('.dr-fbtab')];
    const showView = (id) => {
      tabBtns.forEach((b) => { const on = b.dataset.view === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panel.querySelectorAll('.dr-view').forEach((v) => { v.hidden = v.id !== `dr-view-${id}`; });
      window.scrollTo({ top: 0, behavior: smooth });
    };
    tabBtns.forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
    tabs.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const next = tabBtns.find((b) => b.getAttribute('aria-selected') === 'false');
      showView(next.dataset.view);
      next.focus();
    });

    // Detailed: question pills, and the sub-nav inside each question.
    const qBtns = [...panel.querySelectorAll('.dr-qbar .dr-qp')];
    const openQ = (q) => {
      qBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.q === String(q))));
      panel.querySelectorAll('.dr-qpane').forEach((p) => { p.hidden = p.dataset.q !== String(q); });
    };
    qBtns.forEach((b) => b.addEventListener('click', () => openQ(b.dataset.q)));
    panel.querySelectorAll('.dr-qpane').forEach((pane) => {
      const subs = [...pane.querySelectorAll('.dr-subitem')];
      subs.forEach((b) => b.addEventListener('click', () => {
        subs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        pane.querySelectorAll('.dr-subpane').forEach((p) => { p.hidden = p.dataset.sub !== b.dataset.sub; });
      }));
    });
    const goToQ = (q) => { showView('detailed'); openQ(q); };

    // Summary: Overall / Qn pills switch the Content Strength card; links open a question in Detailed Feedback.
    let sumQ = 'all';
    const sumBtns = [...panel.querySelectorAll('[data-sum]')];
    const levelBox = panel.querySelector('[data-cs-level]');
    const overallLevel = levelBox ? levelBox.innerHTML : '';
    sumBtns.forEach((b) => b.addEventListener('click', () => {
      sumQ = b.dataset.sum;
      sumBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      panel.querySelectorAll('[data-sumq]').forEach((el) => { el.hidden = el.dataset.sumq !== sumQ; });
      if (levelBox) {
        const t = sumQ === 'all' ? null : panel.querySelector(`.dr-glance-list [data-open="${sumQ}"] .d-pill`);
        levelBox.innerHTML = t ? t.outerHTML.replace(' sm', '') : overallLevel;
      }
    }));
    panel.querySelectorAll('[data-viewmore]').forEach((b) => b.addEventListener('click', () => {
      const firstWeak = panel.querySelector('.dr-qbar .dr-qp.work, .dr-qbar .dr-qp.track');
      goToQ(sumQ === 'all' ? (firstWeak ? firstWeak.dataset.q : '0') : sumQ);
    }));
    panel.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => goToQ(b.dataset.open)));
    panel.querySelectorAll('[data-detailed]').forEach((b) => b.addEventListener('click', () => showView('detailed')));

    // The overall line shows two lines; "Read more" only when it is longer (measured again once fonts load).
    const overall = panel.querySelector('#drOverall');
    const more = panel.querySelector('#drOverallMore');
    if (overall && more) {
      const check = () => { if (!overall.classList.contains('open')) more.hidden = overall.scrollHeight <= overall.clientHeight + 1; };
      check();
      if (document.fonts) document.fonts.ready.then(check);
      more.addEventListener('click', () => {
        const isOpen = overall.classList.toggle('open');
        more.setAttribute('aria-expanded', String(isOpen));
        more.textContent = isOpen ? 'Show less' : 'Read more';
      });
    }
  }

  VM.resetFeedbackHeader = () => {
    document.getElementById('fbType').textContent = 'Feedback';
    document.getElementById('fbRole').textContent = 'Your feedback';
    document.getElementById('feedbackMeta').textContent = '';
    document.getElementById('fbTabs').innerHTML = '';
  };
  VM.renderFeedback = render;
})();

/* VMock replica room: the feedback screen, v3 (default): v2 without VMock's placeholders, so everything shown is
   judged from the student's own answers. v2 (?fbview=v2) keeps Delivery of Speech, Non Verbal, STAR sub-checks and
   More content checks; v1 (?fbview=v1, ?fbview=classic) is the earlier page. room.html loads one version.
   Replaces VM.renderFeedback on the room page only (student.js calls it with the session and the shaped feedback from
   POST /api/sessions/:id/feedback); /student keeps shared.js's renderer. */
(() => {
  const esc = VM.esc;
  const LEVEL = { good_job: ['Good job', 'good'], on_track: ['On track', 'track'], needs_work: ['Needs work', 'work'] };
  const TYPE = { recruiter_screen: 'Screening round', hiring_manager: 'Hiring manager round', back_your_resume: 'Resume deep dive' };
  const STYLE = { supportive: 'Friendly', balanced: 'Standard', probing: 'Challenging' };
  const MINUTES = { short: 10, standard: 15, full: 30 };
  const KIND = { claim: 'From your resume', gap: 'For the role', motivation: 'Motivation and fit', concerns: 'About your resume', second_chance: 'Second try', background: 'Your background' };
  const FOUND = { first_answer: 'In your first answer', after_follow_up: 'After a follow-up', not_given: 'Not given' };
  const JD = { covered: ['Covered', 'good'], partly: ['Partly covered', 'track'], not_reached: ['Not reached', 'none'] };
  const MOMENT = { warmup: 'Warm-up', background: 'Your background', candidate_questions: 'Your questions at the end', answer_length: 'Answer length' };
  const reEscape = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const firstSentence = (x) => (String(x || '').match(/^.*?[.!?](\s|$)/) || [String(x || '')])[0].trim();
  // The one line shown for a question in the Summary: what to fix, or for a strong answer what went well.
  function rowLine(t) {
    if (t.ended_early) return 'This topic ended after two "not sure" or "repeat" answers. Open it to see how to answer next time.';
    if (t.too_short) return 'Your answer was too short to give feedback on. Open it to see how to answer next time.';
    if (t.verdict === 'good_job' && t.went_well) return firstSentence(t.went_well);
    return firstSentence(t.to_fix || t.went_well || (t.answer_plan || [])[0] || '');
  }
  const chip = (level) => (LEVEL[level] ? `<span class="fb-chip ${LEVEL[level][1]}">${LEVEL[level][0]}</span>` : '');
  const topicName = (t) => (t.kind === 'second_chance' ? `${t.topic || 'Earlier topic'} (second try)` : t.topic || KIND[t.kind] || 'Question');
  const quote = (q) => (q ? `<blockquote class="fb-quote">“${esc(q)}”</blockquote>` : '');
  // "[describe which tables…]" placeholders become fill-in boxes.
  const blanks = (text) => esc(text).replace(/\[([^\]]+)\]/g, '<span class="fb-blank"><span class="sr">fill in: </span>$1</span>');
  function highlight(text, quotes) {
    let html = esc(text);
    for (const q of quotes.filter(Boolean)) html = html.replace(new RegExp(reEscape(esc(q)), 'i'), (m) => `<mark>${m}</mark>`);
    return html;
  }

  function header(s, fb) {
    const type = TYPE[s.inputs?.interview_type] || 'Adaptive interview';
    const role = s.plan?.jd?.role_title || s.inputs?.target_role || (s.inputs?.domain ? `${s.inputs.domain} interview` : 'Practice interview');
    const company = s.plan?.jd?.company;
    const style = s.surprise ? `Surprise style (${STYLE[s.style] || s.style})` : `${STYLE[s.style] || s.style} style`;
    const date = new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('fbType').textContent = `${type} · Feedback`;
    document.getElementById('fbRole').textContent = company ? `${role} at ${company}` : role;
    document.getElementById('feedbackMeta').textContent = [date, `${MINUTES[s.inputs?.length] || 15} min`, style, plural(fb.topics.length, 'question')].join(' · ');
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

  // VMock's Content Strength groups, filled with our ratings. Which groups appear depends on the question type, as on
  // VMock (stories get STAR/HSAR; knowledge and scenario questions get Depth & Clarity and Practical Application).
  const GROUPS = {
    behavioural: [['STAR/HSAR', ['situation', 'task', 'action', 'result']], ['Depth & Clarity', ['technical']]],
    situational: [['Depth & Clarity', ['first_step', 'reasoning']], ['Practical Application', ['success_measure']]],
    knowledge: [['Depth & Clarity', ['accuracy', 'depth']], ['Practical Application', ['application']]],
    motivation: [['Motivation & Fit', ['reason', 'fit', 'evidence']]],
    concern: [['Learning & Reflection', ['explanation', 'ownership', 'forward']]],
  };
  const groupsFor = (t) => {
    const ratings = (t.ratings || []).filter((r) => r.dimension !== 'followup');
    const out = (GROUPS[t.rubric] || []).map(([name, dims]) => ({ name, items: ratings.filter((r) => dims.includes(r.dimension)) })).filter((g) => g.items.length);
    const left = ratings.filter((r) => !out.some((g) => g.items.includes(r)));
    if (left.length) out.push({ name: 'Other elements', items: left });
    const fu = (t.ratings || []).filter((r) => r.dimension === 'followup');
    if (fu.length) out.push({ name: 'Handling follow-ups', items: fu });
    return out;
  };
  const GROUP_HELP = {
    'STAR/HSAR': 'Situation, Task, Action, Result: the parts of a story answer.',
    'Depth & Clarity': 'How clearly you explain how and why.',
    'Practical Application': 'How you would use it in a real situation.',
    'Motivation & Fit': 'Why you want this role and why you suit it.',
    'Learning & Reflection': 'What you learned and what you would do differently.',
    'Handling follow-ups': 'How you answered when the interviewer asked for more.',
  };
  const groupHelp = (name) => (GROUP_HELP[name] ? `<p class="fb-group-help">${GROUP_HELP[name]}</p>` : '');
  function groupedChecklist(t) {
    const groups = groupsFor(t);
    if (!groups.length) return '';
    const n = groups.reduce((sum, g) => sum + g.items.length, 0);
    return `<details class="fb-more"><summary>What a strong answer covers <span class="fb-count">${n}</span></summary>
      <div class="fb-groups">${groups.map((g) => `<div class="fb-group"><div class="fb-group-head"><h5>${esc(g.name)}</h5>${chip(moduleLevel(g.items.map((r) => r.level)))}</div>${groupHelp(g.name)}
        <ul class="fb-checks">${g.items.map((r) => `<li>${chip(r.level)}<strong>${esc(r.label)}</strong><span>${esc(r.reason)}${r.found ? ` <em>${FOUND[r.found]}</em>` : ''}${r.quote ? `<q class="fb-rq">${esc(r.quote)}</q>` : ''}</span></li>`).join('')}</ul></div>`).join('')}</div></details>`;
  }

  function nextTime(t, checked) {
    const plan = t.answer_plan || [];
    if (!plan.length && !t.stronger_version && !t.example_answer) return '';
    return `<section class="fb-next"><h4>How to answer it next time</h4>
      ${plan.length ? `<ol class="fb-steps">${plan.map((p) => `<li>${blanks(p)}</li>`).join('')}</ol>` : ''}
      ${t.stronger_version ? `<div class="fb-better"><div class="fb-eyebrow">Your answer, improved</div><p>${blanks(t.stronger_version)}</p><p class="fb-better-hint">Fill in the boxes with your own details.</p>${checked ? '<p class="fb-checked"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>Checked: uses only facts from your resume, the job description and your answers.</p>' : ''}</div>` : ''}
      ${t.example_answer ? `<div class="fb-better fb-example"><div class="fb-eyebrow">Sample answer</div><p>${esc(t.example_answer)}</p><p class="fb-better-hint">From a sample candidate, to show the approach. Use your own example.</p></div>` : ''}
    </section>`;
  }

  // Previous / Next between the items in the list (Overall is item 0, question i is item i + 1); the last one goes back
  // to the Summary.
  const paneNav = (k, total) => `<div class="fb-pane-nav">${k > 0 ? `<button class="vm-btn outline sm" type="button" data-go="${k - 1}">${k === 1 ? 'Overall' : 'Previous question'}</button>` : '<span></span>'}${k < total - 1 ? `<button class="vm-btn primary sm" type="button" data-go="${k + 1}">Next question</button>` : '<button class="vm-btn primary sm" type="button" data-to-summary>Back to summary</button>'}</div>`;
  const resultChip = (t) => (t.too_short && !t.ended_early ? '<span class="fb-chip none">Too short</span>' : chip(t.verdict));

  // One question: the question as asked, how to answer it next time, what the student did, then the detail folded away.
  function question(s, t, i, n, open) {
    const source = t.resume_line ? `<p class="fb-from"><span>From your resume</span>“${esc(t.resume_line)}”</p>`
      : t.jd_line ? `<p class="fb-from"><span>From the job description</span>${esc(t.jd_line)}</p>` : '';
    let content = nextTime(t, true);
    if (t.too_short) {
      content += `<p class="fb-short">Your answer here was too short to give feedback on. Use the ${(t.answer_plan || []).length === 1 ? 'step' : 'steps'} above to prepare this one.</p>`;
    } else {
      const fix = [];
      if (t.resume_mismatch) fix.push(`<div class="fb-box fix"><h4>Doesn't match your resume</h4>${quote(t.resume_mismatch.quote)}<p>${esc(t.resume_mismatch.note)}</p>${t.resume_mismatch.tip ? `<p class="fb-tip">${esc(t.resume_mismatch.tip)}</p>` : ''}</div>`);
      if (t.to_fix) fix.push(`<div class="fb-box fix"><h4>${t.resume_mismatch ? 'Also fix' : 'What to fix'}</h4>${quote(t.to_fix_quote)}<p>${esc(t.to_fix)}</p></div>`);
      const well = t.went_well ? `<div class="fb-box well"><h4>What went well</h4>${quote(t.went_well_quote)}<p>${esc(t.went_well)}</p></div>` : '';
      if (well || fix.length) content += `<section class="fb-did"><h4 class="fb-sub-title">What you did</h4><div class="fb-pair">${well}${fix.join('')}</div></section>`;
    }
    const extras = yourAnswer(s, t) + followUps(t) + groupedChecklist(t);
    if (extras) content += `<div class="fb-extras">${extras}</div>`;
    return `<article class="fb-q fb-pane" id="fb-q-${i}" role="tabpanel" tabindex="-1" aria-labelledby="fb-q-h-${i}"${open ? '' : ' hidden'}>
      <header class="fb-pane-head"><div><div class="fb-eyebrow">Question ${i + 1} of ${n}${KIND[t.kind] ? ` · ${KIND[t.kind]}` : ''}</div>
        <h3 id="fb-q-h-${i}">${esc(topicName(t))}</h3></div>${resultChip(t)}</header>
      <div class="fb-asked"><div class="fb-eyebrow">The question</div><p>${esc(t.question || '')}</p>${source}</div>
      ${content}
      ${paneNav(i + 1, n + 1)}
    </article>`;
  }

  // Overall: each part of a strong answer across all the answers, grouped under VMock's Content Strength names.
  function overallPane(fb, level, n) {
    return `<article class="fb-q fb-pane" id="fb-q-overall" role="tabpanel" tabindex="-1" aria-labelledby="fb-q-h-overall" hidden>
      <header class="fb-pane-head"><div><div class="fb-eyebrow">Across all ${plural(n, 'question')}</div><h3 id="fb-q-h-overall">Overall</h3></div>${level ? chip(level) : ''}</header>
      <p class="fb-tab-intro">What you said, across all your answers: each part of a strong answer and how often you gave it.</p>
      <div class="fb-params">${contentCards(fb)}</div>
      ${paneNav(0, n + 1)}
    </article>`;
  }

  // The list beside the open item: Overall, then each question's number, topic and result.
  const railItem = (k, num, label, result, open) => `<li role="presentation"><button class="fb-rail-item" type="button" role="tab" id="fb-rail-${k}" data-k="${k}" aria-controls="${k === 0 ? 'fb-q-overall' : `fb-q-${k - 1}`}" aria-selected="${open}" tabindex="${open ? 0 : -1}">
      <span class="fb-num${k === 0 ? ' all' : ''}">${num}</span><span class="fb-rail-text">${esc(label)}</span>${result}</button></li>`;
  function across(fb, skipFollowUps = false) { // the default layout shows follow-up handling as a Content Strength card
    const parts = [];
    const own = fb.ownership || { i: 0, we: 0 };
    if (own.i + own.we > 0) {
      const pct = Math.round((own.i / (own.i + own.we)) * 100);
      parts.push(`<div class="fb-card fb-mini"><h3>Talking about your own work</h3>
        <p>You said “I” ${plural(own.i, 'time')} and “we” ${plural(own.we, 'time')}.${own.we > own.i ? ' Interviewers listen for “I” to understand what you did yourself.' : ''}</p>
        <div class="fb-iwe" role="img" aria-label="${pct}% I, ${100 - pct}% we"><span style="width:${pct}%"></span></div>
        <div class="fb-iwe-legend"><span><i class="i"></i>I · ${own.i}</span><span><i class="we"></i>we · ${own.we}</span></div>
        <ul class="fb-own">${fb.topics.filter((t) => t.ownership && t.ownership.i + t.ownership.we > 0).map((t) => `<li><span>${esc(topicName(t))}</span><span class="${t.ownership.we > t.ownership.i ? 'we' : ''}">I ${t.ownership.i} · we ${t.ownership.we}${t.ownership.we > t.ownership.i ? ', mostly about the team' : ''}</span></li>`).join('')}</ul></div>`);
    }
    const handled = fb.topics.flatMap((t) => (t.ratings || []).filter((r) => r.dimension === 'followup').map((r) => ({ ...r, name: topicName(t) })));
    if (handled.length && !skipFollowUps) {
      parts.push(`<div class="fb-card fb-mini"><h3>Handling follow-up questions</h3><ul class="fb-list">${handled.map((r) => `<li>${chip(r.level)}<span><strong>${esc(r.name)}.</strong> ${esc(r.reason)}</span></li>`).join('')}</ul></div>`);
    }
    for (const m of fb.moments || []) {
      const t = fb.topics.find((x) => x.slot_id === m.slot_id); // same titles as the student page's feedback
      parts.push(`<div class="fb-card fb-mini"><h3>${esc(MOMENT[m.slot_id] || (t ? `Matching your resume: ${topicName(t)}` : 'A moment to note'))}</h3>${quote(m.quote)}<p>${esc(m.note)}</p>${m.tip ? `<p class="fb-tip">${esc(m.tip)}</p>` : ''}</div>`);
    }
    if ((fb.jd_coverage || []).length) {
      parts.push(`<div class="fb-card fb-mini fb-wide"><h3>Job description coverage</h3><p>The must-haves from the job description, and whether your answers showed them.</p>
        <ul class="fb-jd">${fb.jd_coverage.map((c) => `<li><span class="fb-chip ${(JD[c.status] || JD.not_reached)[1]}">${(JD[c.status] || JD.not_reached)[0]}</span>${esc(c.name)}</li>`).join('')}</ul></div>`);
    }
    return parts.length ? `<details class="fb-section fb-across-d"><summary><h2 class="fb-sec-title">Across the interview</h2><span>${plural(parts.length, 'note')} on how you came across overall</span></summary><div class="fb-across">${parts.join('')}</div></details>` : '';
  }

  // One item shown at a time: the list selects it, Previous / Next step through, arrow keys move along the list.
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  function wirePractice(panel) {
    const items = [...panel.querySelectorAll('.fb-rail-item')];
    const panes = [...panel.querySelectorAll('.fb-pane')];
    const select = (k, { scroll = false, focusItem = false } = {}) => {
      items.forEach((b, j) => { b.setAttribute('aria-selected', String(j === k)); b.tabIndex = j === k ? 0 : -1; });
      panes.forEach((p, j) => { p.hidden = j !== k; });
      if (focusItem) items[k].focus();
      items[k].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      // Only scroll when asked, or when the item's top is out of view or under the top bar (its scroll margin).
      const hiddenTop = parseFloat(getComputedStyle(panes[k]).scrollMarginTop) || 0;
      if (scroll || panes[k].getBoundingClientRect().top < hiddenTop) panes[k].scrollIntoView({ behavior: smooth(), block: 'start' });
    };
    items.forEach((b, k) => b.addEventListener('click', () => select(k)));
    panel.querySelector('.fb-rail').addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const cur = items.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      select((cur + step + items.length) % items.length, { focusItem: true });
    });
    panel.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
      const k = Number(b.dataset.go);
      select(k, { scroll: true });
      panes[k].focus({ preventScroll: true });
    }));
    return { select };
  }

  const EMPTY = '<p class="fb-empty">The interview ended before any question was answered, so there is nothing to give feedback on yet. Practise again to get feedback on your answers.</p>';
  // Opens on the first answer that needs work, else the first one with feedback (not a too-short one), else the first.
  const firstOpenOf = (fb) => [fb.topics.findIndex((t) => t.verdict === 'needs_work'), fb.topics.findIndex((t) => !t.too_short), 0].find((i) => i >= 0);
  function practiceHtml(s, fb, level) {
    const open = firstOpenOf(fb);
    const n = fb.topics.length;
    return `<div class="fb-practice">
      <nav class="fb-rail" aria-label="Questions"><ol role="tablist" aria-label="Questions" aria-orientation="vertical">${railItem(0, 'All', 'Overall', level ? chip(level) : '', false)}${fb.topics.map((t, i) => railItem(i + 1, i + 1, topicName(t), resultChip(t), i === open)).join('')}</ol></nav>
      <div class="fb-panes">${overallPane(fb, level, n)}${fb.topics.map((t, i) => question(s, t, i, n, i === open)).join('')}</div>
    </div>`;
  }
  // A module's level from its parts: mostly Good job is Good job, half or more Needs work is Needs work.
  function moduleLevel(levels) {
    const ls = levels.filter(Boolean);
    const n = ls.length;
    if (!n) return null;
    if (ls.filter((l) => l === 'needs_work').length * 2 >= n) return 'needs_work';
    if (ls.filter((l) => l === 'good_job').length * 2 > n) return 'good_job';
    return 'on_track';
  }
  // Content Strength across the interview: one card per VMock group, from our ratings in every question.
  function contentCards(fb) {
    const byGroup = new Map();
    fb.topics.forEach((t, i) => groupsFor(t).forEach((g) => {
      if (!byGroup.has(g.name)) byGroup.set(g.name, []);
      byGroup.get(g.name).push({ t, i, items: g.items });
    }));
    const order = { needs_work: 0, on_track: 1, good_job: 2 };
    const RANK = ['STAR/HSAR', 'Depth & Clarity', 'Practical Application', 'Motivation & Fit', 'Learning & Reflection', 'Other elements', 'Handling follow-ups'];
    const ours = [...byGroup.entries()].sort((a, b) => RANK.indexOf(a[0]) - RANK.indexOf(b[0])).map(([name, uses]) => {
      const all = uses.flatMap((u) => u.items);
      // Every line on the card comes from the same counts: Good job only when every element was strong in every answer.
      const notAllGood = (lv) => (lv === 'good_job' ? 'on_track' : lv);
      const weak = uses.filter((u) => u.items.some((r) => r.level !== 'good_job'));
      const level = weak.length ? notAllGood(moduleLevel(all.map((r) => r.level))) : 'good_job';
      const worstItem = [...all].sort((a, b) => order[a.level] - order[b.level])[0];
      const labels = [...new Set(all.map((r) => r.label))].map((label) => {
        const rs = all.filter((r) => r.label === label);
        const good = rs.filter((r) => r.level === 'good_job').length;
        return { label, level: good === rs.length ? 'good_job' : notAllGood(moduleLevel(rs.map((r) => r.level))), good, n: rs.length };
      });
      return `<article class="fb-card fb-param">
        <div class="fb-param-head"><span class="fb-param-icon ${LEVEL[level][1]}" aria-hidden="true"><svg class="ic"><use href="#i-doc"/></svg></span><h3>${esc(name)}</h3>${chip(level)}</div>${groupHelp(name)}
        <ul class="fb-elements">${labels.map((l) => `<li>${chip(l.level)}<strong>${esc(l.label)}</strong><span>Strong in ${l.good} of ${plural(l.n, 'answer')}</span></li>`).join('')}</ul>
        ${weak.length ? `<p class="fb-param-about">Work on it in: ${weak.map((u) => `<a class="fb-qlink" href="#fb-q-${u.i}" data-q="${u.i}">${u.i + 1}. ${esc(topicName(u.t))}</a>`).join(', ')}</p>` : '<p class="fb-param-about">Strong in every answer.</p>'}
        ${worstItem && worstItem.level !== 'good_job' ? `<p class="fb-param-next"><strong>Next step:</strong> ${esc(worstItem.reason)}</p>` : ''}
      </article>`;
    });
    return ours.join('');
  }

  // ---------- v3 layout: v2 without VMock's placeholders (no Delivery of Speech, Non Verbal, STAR sub-checks or More
  // content checks); only what our feedback actually judged. Summary (one goal, every question at a glance) |
  // Detailed Summary (one item at a time). ----------
  function renderV3(panel, s, fb) {
    header(s, fb);
    // Nothing judged (no answers, or only too-short ones): no overall line, goal or priorities, even if an older cached
    // feedback has them.
    const judged = fb.topics.some((t) => t.verdict);
    const level = moduleLevel(fb.topics.filter((t) => t.verdict).map((t) => t.verdict));
    const [goal, ...more] = judged ? fb.priorities || [] : [];
    // The question the goal is best practised on (feedback version 10 and later).
    const goalQ = goal && goal.slot_id ? fb.topics.findIndex((t) => t.slot_id === goal.slot_id) : -1;
    const goalLink = goalQ >= 0 ? `<button class="fb-link fb-goal-link" type="button" data-q="${goalQ}">See it in question ${goalQ + 1}: ${esc(topicName(fb.topics[goalQ]))}</button>` : '';
    const VIEWS = [{ id: 'summary', name: 'Summary' }, { id: 'detailed', name: 'Detailed Summary' }];
    let html = `<div class="fb-switch" role="tablist" aria-label="Feedback">${VIEWS.map((v, i) => `<button class="fb-switch-btn" type="button" role="tab" id="fb-vtab-${v.id}" aria-controls="fb-view-${v.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-view="${v.id}">${v.name}</button>`).join('')}</div>
      <div class="fb-view" role="tabpanel" id="fb-view-summary" aria-labelledby="fb-vtab-summary">
      <section class="fb-card fb-summary" aria-labelledby="fbSummaryTitle">
      <h2 class="sr" id="fbSummaryTitle">How it went</h2>
      ${judged && fb.overall ? `<div class="fb-overall-wrap"><p class="fb-overall" id="fbOverall">${esc(fb.overall)}</p><button class="fb-link" type="button" id="fbOverallMore" aria-controls="fbOverall" aria-expanded="false" hidden>Read more</button></div>` : ''}
      ${judged ? '' : fb.topics.length ? '<p class="fb-short">None of your answers was long enough to judge. Open a question below for the steps to answer it next time.</p>' : EMPTY}`;
    if (goal) {
      html += `<div class="fb-goal">
        <div class="fb-goal-icon" aria-hidden="true"><svg class="ic"><use href="#i-target"/></svg></div>
        <div><div class="fb-goal-meta"><span class="fb-eyebrow">Your goal for next time</span><span class="fb-impact">High impact</span></div>
          <h3>${esc(goal.title)}</h3>
          ${goal.action ? `<p class="fb-try"><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}
          ${goal.why ? `<p class="fb-why">${esc(goal.why)}</p>` : ''}${goalLink}</div>
      </div>`;
    }
    if (more.length) {
      html += `<div class="fb-also"><h3 class="fb-also-title">Also work on</h3><div class="fb-also-list">${more.map((x) => `<details class="fb-also-item">
          <summary><span class="fb-also-meta"><span class="fb-eyebrow">Content Strength</span></span><strong>${esc(x.title)}</strong></summary>
          ${x.action ? `<p class="fb-try"><strong>Try this:</strong> ${esc(x.action)}</p>` : ''}${x.why ? `<p class="fb-why">${esc(x.why)}</p>` : ''}</details>`).join('')}</div></div>`;
    }
    html += '</section>';
    // Every question at a glance: its result and one line; opening one shows it in the Detailed Summary.
    const count = (v) => fb.topics.filter((t) => t.verdict === v).length; // too-short answers are not judged, so not counted
    const tally = ['good_job', 'on_track', 'needs_work'].filter(count).map((v) => `<span class="fb-chip ${LEVEL[v][1]}">${count(v)} ${LEVEL[v][0]}</span>`).join('');
    html += fb.topics.length ? `<section class="fb-card fb-glance" aria-labelledby="fbGlanceTitle">
        <div class="fb-glance-head"><h2 class="fb-sec-title" id="fbGlanceTitle">Your questions at a glance</h2>${tally ? `<div class="fb-tally" role="group" aria-label="Results across your answers">${tally}</div>` : ''}</div>
        <ol class="fb-glance-list">${fb.topics.map((t, i) => `<li><button class="fb-glance-item" type="button" data-q="${i}">
          <span class="fb-num">${i + 1}</span><span class="fb-glance-text"><strong>${esc(topicName(t))}</strong><span>${esc(rowLine(t))}</span></span>
          ${resultChip(t)}<svg class="ic fb-glance-chev" aria-hidden="true"><use href="#i-chev"/></svg></button></li>`).join('')}</ol>
        <div class="fb-glance-foot"><button class="vm-btn primary sm" type="button" id="fbSeeDetailed">See detailed feedback</button></div>
      </section>` : '';
    html += '</div>';

    html += `<div class="fb-view" role="tabpanel" id="fb-view-detailed" aria-labelledby="fb-vtab-detailed" hidden>
      ${fb.topics.length ? practiceHtml(s, fb, level) : EMPTY}
      ${fb.topics.length && goal ? `<section class="fb-card fb-close" aria-labelledby="fbCloseTitle">
        <div class="fb-goal-icon" aria-hidden="true"><svg class="ic"><use href="#i-target"/></svg></div>
        <div><div class="fb-eyebrow">Your goal for next time</div><h2 id="fbCloseTitle">${esc(goal.title)}</h2>${goal.action ? `<p class="fb-try"><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}${goalLink}</div>
        <button class="vm-btn primary sm" type="button" data-practice>Practice again</button></section>` : ''}
      ${across(fb, fb.topics.length > 0)}</div>`; // follow-up handling is a Content Strength card (Overall) when there are questions
    panel.innerHTML = html;

    // The overall summary shows two lines; "Read more" appears only when it is longer.
    const overall = panel.querySelector('#fbOverall');
    const moreBtn = panel.querySelector('#fbOverallMore');
    if (overall) {
      // Measured again once the web fonts load, since they can change where the text wraps.
      const check = () => { if (!overall.classList.contains('open')) moreBtn.hidden = overall.scrollHeight <= overall.clientHeight + 1; };
      check();
      if (document.fonts) document.fonts.ready.then(check);
      moreBtn.addEventListener('click', () => {
        const open = overall.classList.toggle('open');
        moreBtn.setAttribute('aria-expanded', String(open));
        moreBtn.textContent = open ? 'Show less' : 'Read more';
      });
    }

    const vbtns = [...panel.querySelectorAll('.fb-switch-btn')];
    const showView = (id, focus) => {
      vbtns.forEach((b) => { const on = b.dataset.view === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      panel.querySelectorAll('.fb-view').forEach((v) => { v.hidden = v.id !== `fb-view-${id}`; });
      // Back to the top of the view, unless the switch is already in sight.
      const sw = panel.querySelector('.fb-switch');
      if (sw.getBoundingClientRect().top < 0) sw.scrollIntoView({ behavior: smooth(), block: 'start' });
    };
    vbtns.forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
    panel.querySelector('.fb-switch').addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      showView(vbtns.find((b) => b.getAttribute('aria-selected') === 'false').dataset.view, true);
    });
    const seeAll = panel.querySelector('#fbSeeDetailed');
    if (seeAll) seeAll.addEventListener('click', () => showView('detailed'));
    if (!fb.topics.length) return;
    const practice = wirePractice(panel);
    panel.querySelectorAll('[data-to-summary]').forEach((b) => b.addEventListener('click', () => showView('summary', true)));
    // Same as the header's "Practice again".
    panel.querySelectorAll('[data-practice]').forEach((b) => b.addEventListener('click', () => document.getElementById('newBtn').click()));
    // A question in the Summary (or the goal's "See it in question N") opens it in the Detailed Summary.
    panel.querySelectorAll('.fb-glance-item, .fb-goal-link').forEach((b) => b.addEventListener('click', () => {
      showView('detailed');
      practice.select(Number(b.dataset.q) + 1, { scroll: true });
    }));
    // Question links in Overall (the Content Strength cards) open that question.
    panel.querySelectorAll('.fb-qlink').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      practice.select(Number(a.dataset.q) + 1, { scroll: true });
    }));
  }
  // Called by student.js before loading another interview's feedback, so the header never shows the previous one.
  VM.resetFeedbackHeader = () => {
    document.getElementById('fbType').textContent = 'Feedback';
    document.getElementById('fbRole').textContent = 'Your feedback';
  };
  VM.renderFeedback = renderV3;
})();

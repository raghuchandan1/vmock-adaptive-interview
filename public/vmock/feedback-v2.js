/* VMock replica room: the feedback screen, v2 (default; being reworked). The previous version stays in feedback.js
   (?fbview=v1, ?fbview=classic) for comparing; room.html loads one or the other. Replaces VM.renderFeedback on the room page only (student.js calls it with
   the session and the shaped feedback from POST /api/sessions/:id/feedback); /student keeps shared.js's renderer.
   Coach first: a short summary with the one goal for next time, then one question at a time (a list of questions
   beside one open question: how to answer it next time first, then what you did, the detail folded away). */
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
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const firstSentence = (x) => (String(x || '').match(/^.*?[.!?](\s|$)/) || [String(x || '')])[0].trim();
  // The one line shown for a question in the Summary: what to fix, or for a strong answer what went well.
  function rowLine(t) {
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
  // ?sources=1 (testing): outline every VMock-hardcoded part so it is clear what is ours and what is a placeholder.
  const V = ' src-vmock';
  if (new URLSearchParams(location.search).has('sources')) document.body.classList.add('fb-sources');

  // VMock's sub-checks inside STAR, with a sample line per element. shortcut: the same for every question (placeholder
  // text); each sub-check takes the level of our real element rating, so it never contradicts it.
  const STAR_SUB = {
    situation: [['Background', 'Impact', 'Relevance'], 'At [where you worked], [what was happening and why it mattered], which affected [who or what].'],
    task: [['Goal', 'Scope & Constraints'], 'My goal was to [what you had to achieve] by [deadline or limit], with [team size or budget].'],
    action: [['Action Description', 'Ownership'], 'I [the first thing you did], then [the next step], and I decided to [a choice you made] because [why].'],
    result: [['Outcome'], 'As a result, [what changed], which we measured by [the number or signal].'],
  };
  const subChecks = (r) => {
    const sub = STAR_SUB[r.dimension];
    if (!sub) return '';
    return `<div class="fb-sub${V}"><div class="fb-checked-list"><span class="fb-eyebrow">What we checked</span>${sub[0].map((k) => `<span class="fb-chip ${LEVEL[r.level][1]}">${esc(k)}</span>`).join('')}</div>
      ${r.level !== 'good_job' ? `<p class="fb-sub-sample"><span class="fb-eyebrow">Sample line</span>${blanks(sub[1])}</p>` : ''}</div>`;
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
        <ul class="fb-checks">${g.items.map((r) => `<li>${chip(r.level)}<strong>${esc(r.label)}</strong><span>${esc(r.reason)}${r.found ? ` <em>${FOUND[r.found]}</em>` : ''}${r.quote ? `<q class="fb-rq">${esc(r.quote)}</q>` : ''}${g.name === 'STAR/HSAR' ? subChecks(r) : ''}</span></li>`).join('')}</ul></div>`).join('')}</div></details>`;
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

  // The three modules for one item (a question or Overall), as switches: Content Strength is our feedback; Delivery of
  // Speech and Non Verbal are VMock placeholders. The chosen switch stays the same when moving to another question.
  const MODS = [{ id: 'content', name: 'Content Strength' }, { id: 'delivery', name: 'Delivery of Speech' }, { id: 'nonverbal', name: 'Non Verbal' }];
  const modChip = (lv) => (lv === 'too_short' ? '<span class="fb-chip none">Too short</span>' : lv ? chip(lv) : '<span class="fb-chip none">Not scored</span>');
  function modSwitch(key, levels, bodies) {
    return `<div class="fb-mods" role="tablist" aria-label="Feedback type">${MODS.map((m, j) => `<button class="fb-mod${m.id === 'content' ? '' : V}" type="button" role="tab" id="fb-mod-${key}-${m.id}" aria-controls="fb-modp-${key}-${m.id}" aria-selected="${j === 0}" tabindex="${j === 0 ? 0 : -1}" data-mod="${m.id}"><span>${m.name}</span>${modChip(levels[m.id])}</button>`).join('')}</div>
      ${MODS.map((m, j) => `<div class="fb-modp" role="tabpanel" id="fb-modp-${key}-${m.id}" aria-labelledby="fb-mod-${key}-${m.id}" data-mod="${m.id}"${j === 0 ? '' : ' hidden'}>${bodies[m.id]}</div>`).join('')}`;
  }
  // Previous / Next between the items in the list (Overall is item 0, question i is item i + 1).
  const paneNav = (k, total) => `<div class="fb-pane-nav">${k > 0 ? `<button class="vm-btn outline sm" type="button" data-go="${k - 1}">${k === 1 ? 'Overall' : 'Previous question'}</button>` : '<span></span>'}${k < total - 1 ? `<button class="vm-btn primary sm" type="button" data-go="${k + 1}">Next question</button>` : '<button class="vm-btn primary sm" type="button" data-to-summary>Back to summary</button>'}</div>`;
  const NOT_MEASURED = '<p class="fb-short">This answer was too short to measure how you sounded and looked.</p>';
  const NOT_SEEN = '<p class="fb-short">Your face or upper body was not clearly visible in this answer, so body language could not be scored.</p>';

  // One question: the question as asked, then its three modules. Content Strength leads with how to answer it next
  // time, then what the student did, then the detail folded away.
  function question(s, fb, t, i, n, open, sig) {
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
    const extras = yourAnswer(s, t) + followUps(t) + groupedChecklist(t) + extraHtml(extraChecks(s, fb, t));
    if (extras) content += `<div class="fb-extras">${extras}</div>`;
    const p = sig.perQ.get(t.slot_id);
    const levels = levelsFor(t, sig);
    const delivery = p ? `<p class="fb-tab-intro">How your voice came across in this answer.</p><div class="fb-params">${p.delivery.map(paramCard).join('')}</div>` : NOT_MEASURED;
    const nonverbal = !p ? NOT_MEASURED : levels.nonverbal ? `<p class="fb-tab-intro">How you came across on camera in this answer.</p><div class="fb-params">${p.nonverbal.map(paramCard).join('')}</div>` : NOT_SEEN;
    return `<article class="fb-q fb-pane" id="fb-q-${i}" role="tabpanel" tabindex="-1" aria-labelledby="fb-q-h-${i}"${open ? '' : ' hidden'}>
      <header class="fb-pane-head"><div class="fb-eyebrow">Question ${i + 1} of ${n}${KIND[t.kind] ? ` · ${KIND[t.kind]}` : ''}</div>
        <h3 id="fb-q-h-${i}">${esc(topicName(t))}</h3></header>
      <div class="fb-asked"><div class="fb-eyebrow">The question</div><p>${esc(t.question || '')}</p>${source}</div>
      ${modSwitch(i, levels, { content, delivery, nonverbal })}
      ${paneNav(i + 1, n + 1)}
    </article>`;
  }

  // Overall: the interview-wide view of each module (Content Strength by VMock group, Delivery and Non Verbal averaged
  // over the answers with a table by question).
  function overallPane(fb, sig, level, n) {
    const intro = (text) => `<p class="fb-tab-intro">${text}</p>`;
    const none = '<p class="fb-short">None of your answers was long enough to measure this.</p>';
    const bodies = {
      content: `${intro('What you said, across all your answers: each part of a strong answer and how often you gave it.')}<div class="fb-params">${contentCards(fb)}</div>`,
      delivery: sig.overall ? `${intro('How your voice came across, averaged over your answers.')}<div class="fb-params">${sig.overall.delivery.map(paramCard).join('')}</div>${byQuestionGrid(fb, sig, 'delivery')}` : none,
      nonverbal: sig.overall ? `${intro('How you came across on camera, averaged over your answers.')}<div class="fb-params">${sig.overall.nonverbal.map(paramCard).join('')}</div>${byQuestionGrid(fb, sig, 'nonverbal')}` : none,
    };
    return `<article class="fb-q fb-pane" id="fb-q-overall" role="tabpanel" tabindex="-1" aria-labelledby="fb-q-h-overall" hidden>
      <header class="fb-pane-head"><div class="fb-eyebrow">Across all ${plural(n, 'question')}</div><h3 id="fb-q-h-overall">Overall</h3></header>
      ${modSwitch('overall', level, bodies)}
      ${paneNav(0, n + 1)}
    </article>`;
  }

  // The list beside the open item: Overall, then each question's number, topic and three dots (said, sounded, looked).
  const dotsFor = (levels) => {
    const names = MODS.map((m) => m.name);
    const word = (lv) => (lv === 'too_short' ? 'Too short' : lv ? LEVEL[lv][0] : 'Not scored');
    return `<span class="fb-dots" aria-label="${esc(names.map((nm, j) => `${nm}: ${word(levels[MODS[j].id])}`).join(', '))}">${MODS.map((m) => { const lv = levels[m.id]; return `<i class="${LEVEL[lv] ? LEVEL[lv][1] : 'none'}"></i>`; }).join('')}</span>`;
  };
  const railItem = (k, num, label, levels, open) => `<li role="presentation"><button class="fb-rail-item" type="button" role="tab" id="fb-rail-${k}" data-k="${k}" aria-controls="${k === 0 ? 'fb-q-overall' : `fb-q-${k - 1}`}" aria-selected="${open}" tabindex="${open ? 0 : -1}">
      <span class="fb-num${k === 0 ? ' all' : ''}">${num}</span><span class="fb-rail-text">${esc(label)}</span>${dotsFor(levels)}</button></li>`;
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

  // One item shown at a time: the list selects it, Previous / Next step through, arrow keys move along the list. The
  // module switch (Content Strength / Delivery of Speech / Non Verbal) is shared: picking one applies to every item.
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  function wirePractice(panel) {
    const items = [...panel.querySelectorAll('.fb-rail-item')];
    const panes = [...panel.querySelectorAll('.fb-pane')];
    const select = (k, { scroll = false, focusItem = false } = {}) => {
      items.forEach((b, j) => { b.setAttribute('aria-selected', String(j === k)); b.tabIndex = j === k ? 0 : -1; });
      panes.forEach((p, j) => { p.hidden = j !== k; });
      if (focusItem) items[k].focus();
      items[k].scrollIntoView({ block: 'nearest', inline: 'nearest' }); // the phone row scrolls sideways
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
    const ids = MODS.map((m) => m.id);
    const setMod = (id, focusIn) => {
      panel.querySelectorAll('.fb-mod').forEach((b) => { const on = b.dataset.mod === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panel.querySelectorAll('.fb-modp').forEach((p) => { p.hidden = p.dataset.mod !== id; });
      if (focusIn) focusIn.querySelector(`.fb-mod[data-mod="${id}"]`).focus();
    };
    panel.querySelectorAll('.fb-mod').forEach((b) => b.addEventListener('click', () => setMod(b.dataset.mod)));
    panel.querySelectorAll('.fb-mods').forEach((m) => m.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const cur = ids.indexOf(m.querySelector('.fb-mod[aria-selected="true"]').dataset.mod);
      setMod(ids[(cur + step + ids.length) % ids.length], m);
    }));
    return { select, setMod };
  }

  const EMPTY = '<p class="fb-empty">The interview ended before any question was answered, so there is nothing to give feedback on yet. Practise again to get feedback on your answers.</p>';
  // Opens on the first answer that needs work, else the first one with feedback (not a too-short one), else the first.
  const firstOpenOf = (fb) => [fb.topics.findIndex((t) => t.verdict === 'needs_work'), fb.topics.findIndex((t) => !t.too_short), 0].find((i) => i >= 0);
  function practiceHtml(s, fb, sig, level) {
    const open = firstOpenOf(fb);
    const n = fb.topics.length;
    return `<div class="fb-practice">
      <nav class="fb-rail" aria-label="Questions"><ol role="tablist" aria-label="Questions" aria-orientation="vertical">${railItem(0, 'All', 'Overall', level, false)}${fb.topics.map((t, i) => railItem(i + 1, i + 1, topicName(t), levelsFor(t, sig), i === open)).join('')}</ol>
        <p class="fb-legend">Dots: what you said, how you sounded, how you looked.</p></nav>
      <div class="fb-panes">${overallPane(fb, sig, level, n)}${fb.topics.map((t, i) => question(s, fb, t, i, n, i === open, sig)).join('')}</div>
    </div>`;
  }
  // ---------- Delivery of Speech and Non Verbal: placeholder signals, per question like VMock ----------
  // shortcut: invented values, generated from the interview and question ids so they are stable on reload; replace with
  // VMock's audio/video analysis once that is wired in. Each question gets its own set; the overall is their average,
  // so the two always agree. Ranges and targets follow what VMock's recorder feedback shows.
  function seeded(id) {
    let h = 2166136261;
    for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  const band = (v, good, track) => (good(v) ? 'good_job' : track(v) ? 'on_track' : 'needs_work');
  const worst = (levels) => (levels.includes('needs_work') ? 'needs_work' : levels.includes('on_track') ? 'on_track' : 'good_job');
  const round = (v, dp = 0) => Number(Number(v).toFixed(dp));

  function rawValues(seed) {
    const r = seeded(seed);
    const between = (lo, hi) => lo + r() * (hi - lo);
    const happy = between(8, 40), stressed = between(4, 30);
    return {
      intensity: between(46, 68), rate: between(105, 172), pitch: between(18, 62), pauses: between(2.5, 10), fillers: between(0.6, 6),
      monotone: between(6, 38), eye: between(42, 92), gestures: between(2, 12), posture: between(72, 98), happy, stressed,
      nvScored: r() > 0.12, // VMock sometimes can't score body language for a question ("Not scored")
    };
  }
  function average(list) {
    const out = {};
    for (const k of Object.keys(list[0])) {
      if (k === 'nvScored') continue;
      const vals = k === 'happy' || k === 'stressed' || ['eye', 'gestures', 'posture'].includes(k) ? list.filter((v) => v.nvScored).map((v) => v[k]) : list.map((v) => v[k]);
      out[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    out.nvScored = list.some((v) => v.nvScored);
    return out;
  }

  // The parameter cards for one set of values (one question, or the average of all of them).
  function paramsFrom(v) {
    const intensity = round(v.intensity), rate = round(v.rate), pitch = round(v.pitch), pauses = round(v.pauses, 1), fillers = round(v.fillers, 1), monotone = round(v.monotone);
    const eye = round(v.eye), gestures = round(v.gestures, 1), posture = round(v.posture), happy = round(v.happy), stressed = round(v.stressed), neutral = Math.max(0, 100 - happy - stressed);
    const vocal = [band(intensity, (x) => x >= 55, (x) => x >= 50), band(rate, (x) => x >= 120 && x <= 150, (x) => x >= 108 && x <= 162), band(pitch, (x) => x >= 30, (x) => x >= 22)];
    const nv = (p) => (v.nvScored ? p : { ...p, level: null, metrics: [], next: 'Your face or upper body was not clearly visible, so this could not be scored.' });
    return {
      delivery: [
        { id: 'vocal', icon: 'i-wave', name: 'Vocal Features', short: 'Vocal', level: worst(vocal), value: `${rate} wpm`,
          about: 'How strongly and clearly you speak: loud enough to hear, at a pace that is easy to follow, with natural changes in pitch.',
          metrics: [
            { label: 'Intensity', value: intensity, unit: 'dB', level: vocal[0], target: 'Aim for 55 dB or more' },
            { label: 'Speech rate', value: rate, unit: 'wpm', level: vocal[1], target: 'Aim for 120 to 150 words a minute' },
            { label: 'Pitch variation', value: pitch, unit: 'Hz', level: vocal[2], target: 'Aim for 30 Hz or more' },
          ],
          next: rate > 150 ? 'Slow down a little: pause after each main point so the interviewer can follow.' : intensity < 55 ? 'Speak a little louder and closer to the mic, as if the interviewer were across a table.' : pitch < 30 ? 'Let your voice rise and fall: stress the result and the number behind it.' : 'Keep this pace and volume, and lift your voice on the key result in each story.' },
        { id: 'pauses', icon: 'i-pause', name: 'Appropriate Pauses', short: 'Pauses', level: band(pauses, (x) => x >= 4 && x <= 8, (x) => x >= 3 && x <= 9), value: `${pauses}/min`,
          about: 'Short pauses between ideas give the interviewer time to take in what you said and make you sound composed.',
          metrics: [{ label: 'Pauses a minute', value: pauses, unit: '', target: 'Aim for 4 to 8', bar: { value: pauses, max: 12, from: 4, to: 8 } }],
          next: pauses < 4 ? 'Pause for a breath after each part of your answer, before moving to the next.' : pauses > 8 ? 'Join related points into one sentence so the pauses come between ideas, not inside them.' : 'Your pauses land between ideas. Keep using them before your result.' },
        { id: 'fluency', icon: 'i-flow', name: 'Speech Fluency', short: 'Fluency', level: band(fillers, (x) => x < 2, (x) => x < 4), value: `${fillers} fillers/min`,
          about: 'How smoothly you speak: fewer fillers such as "um", "like" and "you know" make an answer sound prepared.',
          metrics: [{ label: 'Filler words a minute', value: fillers, unit: '', target: 'Aim for fewer than 2', bar: { value: fillers, max: 8, from: 0, to: 2 } }],
          next: fillers >= 2 ? 'When you need a moment, pause silently instead of saying "um". Practise your first sentence for each story.' : 'Few fillers. Keep preparing your opening line for each story.' },
        { id: 'modulation', icon: 'i-wave', name: 'Speech Modulation', short: 'Modulation', level: band(monotone, (x) => x < 15, (x) => x < 25), value: `${monotone}% flat`,
          about: 'Changing your tone and emphasis keeps the interviewer engaged and shows which parts of your answer matter most.',
          metrics: [{ label: 'Time in a flat tone', value: monotone, unit: '%', target: 'Aim for under 15%', bar: { value: monotone, max: 50, from: 0, to: 15 } }],
          next: monotone >= 15 ? 'Stress the words that carry your point, such as the result and the number behind it.' : 'Good variety in your tone. Keep emphasising your results.' },
      ],
      nonverbal: [
        nv({ id: 'eye', icon: 'i-eye', name: 'Eye Contact', short: 'Eye contact', level: band(eye, (x) => x >= 75, (x) => x >= 60), value: `${eye}%`,
          about: 'Looking at the camera reads as looking at the interviewer: it shows confidence and interest in the conversation.',
          metrics: [{ label: 'Eye contact duration', value: eye, unit: '%', target: 'Minimum 75%', bar: { value: eye, max: 100, from: 75, to: 100 } }],
          next: eye < 75 ? 'Look at the camera, not the screen, while you speak. Put a small note next to the lens as a reminder.' : 'Good eye contact. Keep looking at the camera when you give your result.' }),
        nv({ id: 'face', icon: 'i-smile', name: 'Facial Expressions', short: 'Expression', level: stressed > 22 ? 'needs_work' : happy >= 20 ? 'good_job' : 'on_track', value: `${stressed}% stressed`,
          about: 'A relaxed, friendly expression makes you look approachable and confident; a tense one can read as nervousness.',
          metrics: [{ label: 'Mix', mix: [['Happy', happy, 'good'], ['Neutral', neutral, 'none'], ['Stressed', stressed, 'work']] }],
          next: stressed > 22 ? 'Take a breath before each answer and relax your jaw and shoulders; a small smile when you start helps.' : 'Your expression stays relaxed. Smile when you greet the interviewer and when you finish.' }),
        nv({ id: 'hands', icon: 'i-hand', name: 'Hand Gestures', short: 'Gestures', level: band(gestures, (x) => x >= 4 && x <= 9, (x) => x >= 3 && x <= 11), value: `${gestures}/min`,
          about: 'Open, natural gestures support what you say; too few can look stiff and too many can distract.',
          metrics: [{ label: 'Gestures a minute', value: gestures, unit: '', target: 'Aim for 4 to 9', bar: { value: gestures, max: 14, from: 4, to: 9 } }],
          next: gestures < 4 ? 'Let your hands move naturally when you list steps or describe a change; keep them in the frame.' : gestures > 9 ? 'Rest your hands between points so each gesture marks something that matters.' : 'Natural gestures. Keep them in the frame.' }),
        nv({ id: 'posture', icon: 'i-posture', name: 'Body Posture', short: 'Posture', level: band(posture, (x) => x >= 90, (x) => x >= 80), value: `${posture}%`,
          about: 'Sitting upright and facing the camera shows you are engaged and gives your voice more energy.',
          metrics: [{ label: 'Upright posture', value: posture, unit: '%', target: 'Minimum 90%', bar: { value: posture, max: 100, from: 90, to: 100 } }],
          next: posture < 90 ? 'Sit back in the chair with your feet flat, and set the camera at eye level so you don\'t lean in.' : 'Good posture. Keep the camera at eye level.' }),
      ],
    };
  }

  // Signals for a whole interview: per question (answered ones), and the overall average.
  function signalsFor(s, fb) {
    const perQ = new Map();
    const values = [];
    for (const t of fb.topics) {
      if (t.too_short) continue;
      const v = rawValues(`${s.id}:${t.slot_id}`);
      values.push(v);
      perQ.set(t.slot_id, paramsFrom(v));
    }
    // No answered question: nothing to measure, so no overall either (the tiles say "Not enough to judge").
    const overall = values.length ? paramsFrom(average(values)) : null;
    return { perQ, overall };
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
  const notScored = '<span class="fb-chip none">Not scored</span>';
  const chipOr = (level) => (level ? chip(level) : notScored);

  function paramCard(p) {
    const metrics = p.metrics.map((m) => {
      if (m.mix) {
        return `<div class="fb-metric"><span class="fb-metric-label">${esc(m.label)}</span>
          <div class="fb-mix" role="img" aria-label="${esc(m.mix.map(([k, v]) => `${k} ${v}%`).join(', '))}">${m.mix.map(([, v, c]) => `<span class="${c}" style="width:${v}%"></span>`).join('')}</div>
          <div class="fb-mix-legend">${m.mix.map(([k, v, c]) => `<span><i class="${c}"></i>${esc(k)} ${v}%</span>`).join('')}</div></div>`;
      }
      const lv = LEVEL[m.level || p.level][1];
      const bar = m.bar ? `<div class="fb-meter" role="img" aria-label="${esc(`${m.value}${m.unit} (${m.target})`)}">
          <span class="fb-meter-zone" style="left:${(m.bar.from / m.bar.max) * 100}%;width:${((m.bar.to - m.bar.from) / m.bar.max) * 100}%"></span>
          <span class="fb-meter-dot ${lv}" style="left:${Math.min(100, (m.bar.value / m.bar.max) * 100)}%"></span></div>` : '';
      return `<div class="fb-metric"><div class="fb-metric-row"><span class="fb-metric-label">${esc(m.label)}</span><span class="fb-metric-value ${lv}">${m.value}<small>${esc(m.unit)}</small></span></div>${bar}<span class="fb-metric-target">${esc(m.target)}</span></div>`;
    }).join('');
    return `<article class="fb-card fb-param">
      <div class="fb-param-head"><span class="fb-param-icon ${p.level ? LEVEL[p.level][1] : 'none'}" aria-hidden="true"><svg class="ic"><use href="#${p.icon}"/></svg></span><h3>${esc(p.name)}</h3>${chipOr(p.level)}</div>
      <p class="fb-param-about">${esc(p.about)}</p>
      ${metrics ? `<div class="fb-metrics">${metrics}</div>` : ''}
      <p class="fb-param-next"><strong>${p.level ? 'Next step:' : 'Note:'}</strong> ${esc(p.next)}</p>
    </article>`;
  }

  // ---------- More content checks: VMock's content parts that our feedback does not rate (placeholders) ----------
  const RESOURCES = {
    learning: [['Build a Story with STARR Framework', 'Article'], ['Demonstrate your value-add', 'Video · 1:19']],
    skills: [['Express Skills with Examples', 'Article'], ['Use Specifics in Impact', 'Article']],
    industry: [['Use Specifics in Impact', 'Article'], ['Keep listeners engaged', 'Video · 1:47']],
    coverage: [['Build a Story with STARR Framework', 'Article'], ['Keep listeners engaged', 'Video · 1:47']],
  };
  // VMock's Topic coverage (key points it expects in the answer). shortcut: the same topics for every question, taken
  // from VMock's own example, until real per-question key points exist; only the levels vary per question.
  const COVERAGE = [
    { name: 'Feature Prioritization', section: 'Topic coverage', checks: ['Understanding Customer Needs', 'Market Demand Analysis', 'Balancing Priorities'],
      reason: 'Explain how you gather and read customer feedback, and how it decides what gets built first.',
      sample: 'I start from what customers tell us through [surveys, interviews or support tickets], group it into [common pain points], and rank features by [how many users it affects and the effort].' },
    { name: 'Feedback Mechanisms', section: 'Topic coverage', checks: ['Collecting Feedback', 'Acting on Feedback'],
      reason: 'Name the channels you use to hear from users and one change you made because of them.',
      sample: 'We collect feedback through [the channels], review it every [how often], and last quarter it led us to [a change you made].' },
    { name: 'Prioritization Frameworks', section: 'Advanced concepts', checks: ['Framework Use', 'Trade-offs'],
      reason: 'Mention a framework you use (for example RICE or MoSCoW) and a trade-off it helped you make.',
      sample: 'I use [a framework] to compare options; when [two priorities clashed], it showed that [the choice you made and why].' },
    { name: 'Long-term Planning', section: 'Advanced concepts', checks: ['Roadmap Thinking', 'Balancing Short and Long Term'],
      reason: 'Show how today\'s choices fit a longer roadmap, not only the next release.',
      sample: 'Beyond the next release, I keep [a longer-term goal] in view, so [how it changes what you pick now].' },
  ];
  function extraChecks(s, fb, t) {
    if (t.too_short) return [];
    const r = seeded(`${s.id}:${t.slot_id}:content`);
    const pick = () => (r() < 0.4 ? 'needs_work' : r() < 0.75 ? 'on_track' : 'good_job');
    const field = (s.plan?.jd?.role_title || s.inputs?.target_role || 'your field').replace(/,.*$/, '');
    const topics = COVERAGE.map((c) => { const lv = pick(); return { ...c, level: lv, checks: c.checks.map((k) => [k, lv === 'good_job' ? 'good_job' : pick()]) }; });
    const out = [{ id: 'coverage', name: 'Topic coverage', level: moduleLevel(topics.map((x) => x.level)), topics,
      reason: (topics.find((x) => x.level !== 'good_job') || topics[0]).reason }];
    if (t.rubric === 'behavioural') {
      const lv = pick();
      out.push({ id: 'learning', name: 'Learning & Reflection', level: lv, checks: [['Insight', lv], ['Future action', lv === 'good_job' ? 'good_job' : pick()]],
        reason: lv === 'good_job' ? 'You closed with what you took away from the experience and how you use it now.' : 'You did not say what you learned from this experience or what you would do differently. Close the story with one lesson and how you use it now.',
        sample: 'Looking back, the biggest lesson was [the lesson]. Since then I [what you do differently], which helped when [a later situation].' });
      const skills = [...new Set([t.topic, ...(fb.jd_coverage || []).filter((c) => c.status === 'covered').map((c) => c.name)].filter(Boolean))].slice(0, 3);
      const sl = skills.length >= 2 ? 'good_job' : skills.length ? 'on_track' : 'needs_work';
      out.push({ id: 'skills', name: 'Skills', level: sl, skills,
        reason: skills.length ? 'Skills that came through in this answer. Name the skill and back it with what you did.' : 'No clear skill came through. Name the skill this story shows and the action that proves it.' });
    }
    if (['knowledge', 'situational'].includes(t.rubric)) {
      const lv = pick();
      out.push({ id: 'industry', name: 'Industry Insights', level: lv, checks: [['Latest trends', lv], ['Innovative approaches', pick()]],
        reason: lv === 'good_job' ? `You tied your answer to how teams in ${field} work today.` : `You did not connect your answer to how teams in ${field} handle this today. Mention one current practice or tool and why it matters.`,
        sample: 'Many teams now [a current practice]. I have used that by [your example], because [why it matters].' });
    }
    return out;
  }
  // Topic coverage: one row per key topic (grouped as on VMock), each opening to what was checked and a sample.
  const coverageHtml = (c) => {
    const sections = [...new Set(c.topics.map((x) => x.section))];
    return sections.map((sec) => {
      const ts = c.topics.filter((x) => x.section === sec);
      const need = ts.filter((x) => x.level !== 'good_job').length;
      return `<div class="fb-cov"><div class="fb-cov-head"><span class="fb-eyebrow">${esc(sec)}</span><span>${need ? `${need} of ${ts.length} need attention` : 'All covered'}</span></div>
        ${ts.map((x) => `<details class="fb-cov-topic"><summary>${chip(x.level)}<strong>${esc(x.name)}</strong></summary>
          <div class="fb-checked-list"><span class="fb-eyebrow">What we checked</span>${x.checks.map(([k, lv]) => `<span class="fb-chip ${LEVEL[lv][1]}">${esc(k)}</span>`).join('')}</div>
          ${x.level !== 'good_job' ? `<p>${esc(x.reason)}</p><div class="fb-better fb-example"><div class="fb-eyebrow">Sample response</div><p>${blanks(x.sample)}</p></div>` : '<p>Covered in your answer.</p>'}
        </details>`).join('')}</div>`;
    }).join('');
  };
  const extraHtml = (checks) => (checks.length ? `<details class="fb-more${V}"><summary>More content checks <span class="fb-count">${checks.length}</span></summary>
      <div class="fb-extra">${checks.map((c) => c.topics ? `<div class="fb-extra-card">
        <div class="fb-group-head"><h5>${esc(c.name)}</h5>${chip(c.level)}</div>${coverageHtml(c)}
        ${c.level !== 'good_job' ? `<div class="fb-res"><span class="fb-eyebrow">Suggested resources</span>${RESOURCES.coverage.map(([title, kind]) => `<span class="fb-res-item"><svg class="ic" aria-hidden="true"><use href="#${kind.startsWith('Video') ? 'i-play' : 'i-doc'}"/></svg>${esc(title)}<em>${esc(kind)}</em></span>`).join('')}</div>` : ''}
      </div>` : `<div class="fb-extra-card">
        <div class="fb-group-head"><h5>${esc(c.name)}</h5>${chip(c.level)}</div>
        ${c.checks ? `<div class="fb-checked-list"><span class="fb-eyebrow">What we checked</span>${c.checks.map(([k, lv]) => `<span class="fb-chip ${LEVEL[lv][1]}">${esc(k)}</span>`).join('')}</div>` : ''}
        ${c.skills ? `<div class="fb-checked-list"><span class="fb-eyebrow">Skills detected</span>${c.skills.length ? c.skills.map((k) => `<span class="fb-skill">${esc(k)}</span>`).join('') : '<span class="fb-skill none">None detected</span>'}</div>` : ''}
        <p>${esc(c.reason)}</p>
        ${c.sample && c.level !== 'good_job' ? `<div class="fb-better fb-example"><div class="fb-eyebrow">Sample response</div><p>${blanks(c.sample)}</p></div>` : ''}
        ${c.level !== 'good_job' ? `<div class="fb-res"><span class="fb-eyebrow">Suggested resources</span>${RESOURCES[c.id].map(([title, kind]) => `<span class="fb-res-item"><svg class="ic" aria-hidden="true"><use href="#${kind.startsWith('Video') ? 'i-play' : 'i-doc'}"/></svg>${esc(title)}<em>${esc(kind)}</em></span>`).join('')}</div>` : ''}
      </div>`).join('')}</div></details>` : '');

  // One question's level in each module: ours for Content Strength, the placeholders' for Delivery and Non Verbal.
  const levelsFor = (t, sig) => {
    const p = sig.perQ.get(t.slot_id);
    return {
      content: t.too_short ? 'too_short' : t.verdict || null,
      delivery: p ? moduleLevel(p.delivery.map((x) => x.level)) : null,
      nonverbal: p ? moduleLevel(p.nonverbal.map((x) => x.level)) : null,
    };
  };
  // A grid for a module: one row per question, one column per parameter (VMock measures each question).
  function byQuestionGrid(fb, sig, key) {
    const rows = fb.topics.map((t, i) => ({ t, i, p: sig.perQ.get(t.slot_id) })).filter((x) => x.p);
    if (!rows.length) return '';
    const names = rows[0].p[key].map((p) => p.short);
    return `<section class="fb-card fb-grid-card"><h3>By question</h3><div class="fb-grid-scroll"><table class="fb-grid">
      <thead><tr><th scope="col">Question</th>${names.map((n) => `<th scope="col">${esc(n)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(({ t, i, p }) => `<tr><th scope="row"><a class="fb-qlink" href="#fb-q-${i}" data-q="${i}">${i + 1}. ${esc(topicName(t))}</a></th>${p[key].map((x) => `<td title="${esc(x.level ? x.value : 'Not scored')}">${chipOr(x.level)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></section>`;
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

  const MODULES = [
    { id: 'content', icon: 'i-doc', name: 'Content Strength', about: 'What you said: the structure and the evidence in your answers.' },
    { id: 'delivery', icon: 'i-wave', name: 'Delivery of Speech', about: 'How you sounded: volume, pace, pauses and fluency.' },
    { id: 'nonverbal', icon: 'i-eye', name: 'Non Verbal', about: 'How you came across on camera: eye contact, expression, posture.' },
  ];

  // ---------- v2 layout: Summary (one goal, every question at a glance) | Detailed Summary (one item at a time) ----------
  function renderV2(panel, s, fb) {
    header(s, fb);
    const sig = signalsFor(s, fb);
    const level = {
      content: moduleLevel(fb.topics.filter((t) => t.verdict).map((t) => t.verdict)),
      delivery: sig.overall && moduleLevel(sig.overall.delivery.map((p) => p.level)),
      nonverbal: sig.overall && moduleLevel(sig.overall.nonverbal.map((p) => p.level)),
    };
    // Nothing judged (no answers, or only too-short ones): no overall line, goal, priorities or module levels, even if an
    // older cached feedback has them.
    const judged = fb.topics.some((t) => t.verdict);
    // The goal for next time, then "Also work on": our other priorities and the weakest delivery or on-camera part.
    const [goal, ...more] = judged ? fb.priorities || [] : [];
    // The question the goal is best practised on (feedback version 10 and later).
    const goalQ = goal && goal.slot_id ? fb.topics.findIndex((t) => t.slot_id === goal.slot_id) : -1;
    const goalLink = goalQ >= 0 ? `<button class="fb-link fb-goal-link" type="button" data-q="${goalQ}">See it in question ${goalQ + 1}: ${esc(topicName(fb.topics[goalQ]))}</button>` : '';
    const order = { needs_work: 0, on_track: 1, good_job: 2 };
    const weakest = !sig.overall || !judged ? null : [...sig.overall.delivery.map((p) => ({ ...p, module: 'Delivery of Speech' })), ...sig.overall.nonverbal.map((p) => ({ ...p, module: 'Non Verbal' }))]
      .filter((p) => p.level).sort((a, b) => order[a.level] - order[b.level])[0];
    const also = [
      ...more.map((p) => ({ module: 'Content Strength', title: p.title, why: p.why, action: p.action, })),
      ...(weakest && weakest.level !== 'good_job' ? [{ module: weakest.module, title: weakest.name, action: weakest.next, vmock: true }] : []),
    ];

    const mods = MODULES.map((m) => `<button class="fb-tile${m.id === 'content' ? '' : V}" type="button" data-tab="${m.id}">
        <span class="fb-tile-icon" aria-hidden="true"><svg class="ic"><use href="#${m.icon}"/></svg></span>
        <span class="fb-tile-name">${m.name}</span>${level[m.id] ? chip(level[m.id]) : '<span class="fb-chip none">Not enough to judge</span>'}
        <span class="fb-tile-about">${m.about}</span></button>`).join('');
    const VIEWS = [{ id: 'summary', name: 'Summary' }, { id: 'detailed', name: 'Detailed Summary' }];
    let html = `<div class="fb-switch" role="tablist" aria-label="Feedback">${VIEWS.map((v, i) => `<button class="fb-switch-btn" type="button" role="tab" id="fb-vtab-${v.id}" aria-controls="fb-view-${v.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-view="${v.id}">${v.name}</button>`).join('')}</div>
      <div class="fb-view" role="tabpanel" id="fb-view-summary" aria-labelledby="fb-vtab-summary">
      <section class="fb-card fb-summary" aria-labelledby="fbSummaryTitle">
      <h2 class="sr" id="fbSummaryTitle">How it went</h2>
      ${judged && fb.overall ? `<div class="fb-overall-wrap"><p class="fb-overall" id="fbOverall">${esc(fb.overall)}</p><button class="fb-link" type="button" id="fbOverallMore" aria-controls="fbOverall" aria-expanded="false" hidden>Read more</button></div>` : ''}
      ${judged ? `<div class="fb-tiles">${mods}</div>` : fb.topics.length
    ? '<p class="fb-short">None of your answers was long enough to judge. Open a question below for the steps to answer it next time.</p>'
    : EMPTY}`;
    if (goal) {
      html += `<div class="fb-goal">
        <div class="fb-goal-icon" aria-hidden="true"><svg class="ic"><use href="#i-target"/></svg></div>
        <div><div class="fb-goal-meta"><span class="fb-eyebrow">Your goal for next time</span><span class="fb-impact">High impact</span></div>
          <h3>${esc(goal.title)}</h3>
          ${goal.action ? `<p class="fb-try"><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}
          ${goal.why ? `<p class="fb-why">${esc(goal.why)}</p>` : ''}${goalLink}</div>
      </div>`;
    }
    if (also.length) {
      html += `<div class="fb-also"><h3 class="fb-also-title">Also work on</h3><div class="fb-also-list">${also.map((x) => `<details class="fb-also-item${x.vmock ? V : ''}">
          <summary><span class="fb-also-meta"><span class="fb-eyebrow">${esc(x.module)}</span></span><strong>${esc(x.title)}</strong></summary>
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
          ${t.too_short ? '<span class="fb-chip none">Too short</span>' : chip(t.verdict)}<svg class="ic fb-glance-chev" aria-hidden="true"><use href="#i-chev"/></svg></button></li>`).join('')}</ol>
        <div class="fb-glance-foot"><button class="vm-btn primary sm" type="button" id="fbSeeDetailed">See detailed feedback</button></div>
      </section>` : '';
    html += '</div>';

    html += `<div class="fb-view" role="tabpanel" id="fb-view-detailed" aria-labelledby="fb-vtab-detailed" hidden>
      ${fb.topics.length ? practiceHtml(s, fb, sig, level) : EMPTY}
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
    // A module card opens Overall in the Detailed Summary, on that module.
    panel.querySelectorAll('.fb-tile').forEach((b) => b.addEventListener('click', () => {
      showView('detailed');
      practice.setMod(b.dataset.tab);
      practice.select(0, { scroll: true });
    }));
    panel.querySelectorAll('[data-to-summary]').forEach((b) => b.addEventListener('click', () => showView('summary', true)));
    // Same as the header's "Practice again".
    panel.querySelectorAll('[data-practice]').forEach((b) => b.addEventListener('click', () => document.getElementById('newBtn').click()));
    // A question in the Summary (or the goal's "See it in question N") opens it in the Detailed Summary.
    panel.querySelectorAll('.fb-glance-item, .fb-goal-link').forEach((b) => b.addEventListener('click', () => {
      showView('detailed');
      practice.select(Number(b.dataset.q) + 1, { scroll: true });
    }));
    // Question links in Overall (Content Strength cards, the by-question tables) open that question, same module.
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
  VM.renderFeedback = renderV2;
})();

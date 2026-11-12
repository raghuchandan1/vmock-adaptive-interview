/* Dashboard replica room: the feedback screen (base styles in feedback.css, this version's in feedback-v2.css),
   organised topic by topic (each topic is an opening question plus its follow-ups):
   - Summary: how it went and the tally; the habit to fix first beside it (where it happened, in the student's words,
     and how to say it), then "Topic by topic" (question asked, one line, follow-ups, result) and Content Strength
     across your answers as one divided list. On a phone the habit comes straight after the summary.
   - Detailed: a sticky topic stepper (result, follow-ups, the goal's topic marked "Fix first", then the wrap-up), and
     one topic: its question and source, then the answer (this topic's exchange, each follow-up with what it asked for
     and whether the reply added it; "Whole interview" shows the rest) beside sticky coaching in the order it is used:
     the verdict (a line from the ratings, parts said unprompted / after a follow-up / missing), fix this next time
     with the steps, say it like this, what went well, and the checklist folded. Every quote jumps to its words in the
     answer. A topic from a CV line offers "Practise this line again" (CV Deep Dive with the line chosen). On a phone
     the coaching comes first and the answer folds behind "Read your answer".
   Content only: no Non Verbal or Delivery of Speech. Replaces VM.renderFeedback on dash/room.html only. */
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
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const firstSentence = (x) => (String(x || '').match(/^.*?[.!?](\s|$)/) || [String(x || '')])[0].trim();
  // The first n sentences; a stop only ends a sentence before a space and a capital (or the end), so "14.2" stays whole.
  const sentences = (x, n) => (String(x || '').match(/[\s\S]+?[.!?](?=\s+[A-Z"“(\[]|\s*$)/g) || [String(x || '')]).slice(0, n).join(' ').replace(/\s+/g, ' ').trim();

  const pill = (level, cls = '') => (LEVEL[level] ? `<span class="d-pill ${LEVEL[level][1]} ${cls}">${LEVEL[level][0]}</span>` : '');
  const resultPill = (t, cls = '') => (t.too_short ? `<span class="d-pill none ${cls}">Too short</span>` : pill(t.verdict, cls));
  const topicName = (t) => (t.kind === 'second_chance' ? `${t.topic || 'Earlier topic'} (second try)` : t.topic || KIND[t.kind] || 'Question');
  // A quote is a button: it scrolls the transcript to the line it came from.
  const quote = (q) => (q ? `<button class="dr-quote" type="button" data-quote="${esc(q)}">“${esc(q)}”</button>` : '');
  const blanks = (text) => esc(text).replace(/\[([^\]]+)\]/g, '<span class="dr-blank"><span class="sr">fill in: </span>$1</span>');
  function rowLine(t) {
    if (t.too_short) return 'Your answer was too short to give feedback on. Open the topic to see how to answer next time.';
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
    document.getElementById('feedbackMeta').textContent = [date, `${MINUTES[s.inputs?.length] || 15} min`, style, plural(fb.topics.length, 'topic')].join(' · ');
  }

  // ---------- Detailed Feedback: a topic stepper, then one topic: its answer beside the coaching ----------
  function clock(ms) {
    const sec = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }
  // Marks every quoted line in the student's answer, coloured by level, with what it shows on hover. Works on the
  // plain text (first match per quote, overlaps skipped), so marks never nest or cut through each other.
  function annotate(text, marks) {
    const low = text.toLowerCase();
    const ranges = [];
    for (const m of marks) {
      const i = m.q ? low.indexOf(m.q.toLowerCase()) : -1;
      if (i < 0) continue;
      const r = { s: i, e: i + m.q.length, m };
      if (!ranges.some((x) => r.s < x.e && x.s < r.e)) ranges.push(r);
    }
    ranges.sort((a, b) => a.s - b.s);
    let html = '', at = 0;
    for (const r of ranges) {
      html += `${esc(text.slice(at, r.s))}<mark class="dr2-mark ${r.m.cls}" title="${esc(r.m.label)}">${esc(text.slice(r.s, r.e))}</mark>`;
      at = r.e;
    }
    return html + esc(text.slice(at));
  }
  // Only the fix (and a CV mismatch) and what went well are marked at rest; an element's own quote lights up when the
  // student asks for it (glance chips, checklist), so the answer is not a wall of colour.
  function marksFor(t) {
    const out = [{ q: t.to_fix_quote, cls: 'track', label: 'What to fix' }];
    if (t.resume_mismatch) out.push({ q: t.resume_mismatch.quote, cls: 'track', label: "Doesn't match your CV" });
    out.push({ q: t.went_well_quote, cls: 'good', label: 'What went well' });
    return out.filter((m) => m.q);
  }
  const slotName = (fb, id) => {
    const i = fb.topics.findIndex((t) => t.slot_id === id);
    return i >= 0 ? `Topic ${i + 1} · ${topicName(fb.topics[i])}` : MOMENT[id] || 'Earlier';
  };
  // The topic's exchange. Each follow-up says what it asked for, and the reply after it whether the student added it.
  // The rest of the interview is in the DOM too, shown by the "Whole interview" switch.
  function answerThread(s, fb, t) {
    const t0 = Date.parse((s.transcript[0] || {}).at || s.created_at);
    const fus = new Map((t.follow_ups || []).map((f) => [f.at, f]));
    const marks = marksFor(t);
    let last = null, pending = null, html = '';
    for (const e of s.transcript) {
      const mine = e.slot_id === t.slot_id;
      if (e.slot_id !== last) html += `<div class="dr3-div${mine ? '' : ' dr3-other'}"><span>${esc(slotName(fb, e.slot_id))}</span></div>`;
      last = e.slot_id;
      const time = e.at ? `<time>${clock(Date.parse(e.at) - t0)}</time>` : '';
      if (e.role !== 'candidate') {
        const f = mine ? fus.get(e.at) : null;
        pending = f || null;
        html += `<div class="dr3-msg ai${mine ? '' : ' dr3-other'}${f ? ' fu' : ''}"><div class="dr3-who"><b>Interviewer</b>${time}${f ? '<span class="dr3-tag">Follow-up</span>' : ''}${f && f.asked_for_label ? `<span class="dr3-tag">Asked for: ${esc(f.asked_for_label.toLowerCase())}</span>` : ''}</div><p>${esc(e.text)}</p></div>`;
      } else {
        const f = mine ? pending : null;
        const added = f && f.asked_for_label && f.given !== null && f.given !== undefined
          ? `<span class="dr3-added ${f.given ? 'yes' : 'no'}">${f.given ? 'You added' : 'Still missing'}: ${esc(f.asked_for_label.toLowerCase())}</span>` : '';
        html += `<div class="dr3-msg you dr-line${mine ? '' : ' dr3-other'}"><div class="dr3-who">${added}${time}<b>You</b></div><p>${mine ? annotate(e.text, marks) : esc(e.text)}</p></div>`;
        pending = null;
      }
    }
    return html;
  }
  // One plain line from the ratings: what came unprompted, what needed a follow-up, what never came.
  function verdictLine(t) {
    const rs = (t.ratings || []).filter((r) => r.dimension !== 'followup');
    const by = (f) => rs.filter((r) => r.found === f).map((r) => r.label.toLowerCase());
    const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0]);
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const parts = [];
    if (by('first_answer').length) parts.push(`You covered ${list(by('first_answer'))} on your own.`);
    if (by('after_follow_up').length) parts.push(`${cap(list(by('after_follow_up')))} came only after a follow-up.`);
    if (by('not_given').length) parts.push(`${cap(list(by('not_given')))} ${by('not_given').length > 1 ? 'were' : 'was'} missing.`);
    return parts.join(' ') || firstSentence(t.went_well || t.to_fix || '');
  }
  // Which parts came unprompted, after a follow-up, or never; each part with a quote jumps to it in the answer.
  function glance(t) {
    const rs = (t.ratings || []).filter((r) => r.dimension !== 'followup' && r.found);
    if (!rs.length) return '';
    return `<dl class="dr3-glance">${Object.entries(FOUND).map(([f, name]) => {
      const items = rs.filter((r) => r.found === f);
      return `<div class="${f}"><dt>${name}</dt><dd>${items.length ? items.map((r) => (r.quote
        ? `<button type="button" class="dr3-chip ${LEVEL[r.level][1]}" data-quote="${esc(r.quote)}" title="Show it in your answer">${esc(r.label)}</button>`
        : `<span class="dr3-chip ${LEVEL[r.level][1]}">${esc(r.label)}</span>`)).join('') : '<span class="dr3-none">None</span>'}</dd></div>`;
    }).join('')}</dl>`;
  }
  // What a strong answer covers, compact for the coaching column: group, then level | element | reason.
  function checklist(t) {
    return groupsFor(t).map((g) => `<div class="dr3-cgroup"><div class="dr3-cgroup-h"><strong>${esc(g.name)}</strong>${pill(moduleLevel(g.items.map((r) => r.level)), 'sm')}</div>
      ${g.items.map((r) => `<div class="dr3-crow">${pill(r.level, 'sm')}<div><strong>${esc(r.label)}</strong><p>${esc(r.reason)}${r.found ? ` <span class="dr3-found">· ${FOUND[r.found].toLowerCase()}</span>` : ''}</p>${quote(r.quote)}</div></div>`).join('')}</div>`).join('');
  }
  const VERDICT = { good_job: 'A strong answer', on_track: 'Nearly there', needs_work: 'Needs work' };
  function coach(t, i, n) {
    const plan = t.answer_plan || [];
    const steps = plan.length ? `<div class="dr3-h">How to answer it next time</div><ol class="dr2-steps">${plan.map((p) => `<li>${blanks(p)}</li>`).join('')}</ol>` : '';
    const cards = [];
    if (t.too_short) {
      cards.push(`<section class="dr3-verdict none"><div class="dr3-verdict-top">${resultPill(t)}<h3>Too short to judge</h3></div>
        <p>Your answer here was too short to give feedback on. Use the ${plan.length === 1 ? 'step' : 'steps'} below to prepare this one.</p></section>`);
      if (steps) cards.push(`<section class="dr3-card plan">${steps}</section>`);
    } else {
      cards.push(`<section class="dr3-verdict ${LEVEL[t.verdict] ? LEVEL[t.verdict][1] : 'none'}"><div class="dr3-verdict-top">${resultPill(t)}<h3>${VERDICT[t.verdict] || 'Your result'}</h3></div>
        <p>${esc(verdictLine(t))}</p>${glance(t)}</section>`);
      if (t.to_fix || steps) {
        cards.push(`<section class="dr3-card fix"><h3><span class="dr3-ic" aria-hidden="true"></span>Fix this next time</h3>
          ${t.to_fix ? `<p>${esc(t.to_fix)}</p>` : ''}
          ${t.to_fix_quote ? `<button class="dr3-jump" type="button" data-quote="${esc(t.to_fix_quote)}">“${esc(t.to_fix_quote)}”<span>Show in your answer</span></button>` : ''}
          ${steps}</section>`);
      }
    }
    // A rewrite reaches the screen only after its grounding check (the server empties it when the check fails).
    if (t.stronger_version) {
      cards.push(`<section class="dr3-card say"><h3><span class="dr3-ic" aria-hidden="true"></span>Say it like this</h3>
        <p class="dr3-say">${blanks(t.stronger_version)}</p>
        ${/\[[^\]]+\]/.test(t.stronger_version) ? '<p class="dr3-hint">Fill in the boxes with your own details.</p>' : ''}
        <div class="dr3-say-foot"><span class="dr2-checked"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>Uses only facts from your CV, the job description and your answers</span>
          <button class="dr3-copy" type="button" data-copy="${i}">Copy</button></div></section>`);
    }
    if (t.example_answer) {
      cards.push(`<section class="dr3-card sample"><h3>Sample answer</h3><p>${esc(t.example_answer)}</p><p class="dr3-hint">From a sample candidate, to show the approach. Use your own example.</p></section>`);
    }
    if (t.resume_mismatch) {
      cards.push(`<section class="dr3-card fix"><h3><span class="dr3-ic" aria-hidden="true"></span>Doesn't match your CV</h3>
        ${t.resume_mismatch.quote ? `<button class="dr3-jump" type="button" data-quote="${esc(t.resume_mismatch.quote)}">“${esc(t.resume_mismatch.quote)}”<span>Show in your answer</span></button>` : ''}
        <p>${esc(t.resume_mismatch.note)}</p>${t.resume_mismatch.tip ? `<p class="dr3-hint">${esc(t.resume_mismatch.tip)}</p>` : ''}</section>`);
    }
    if (!t.too_short && t.went_well) {
      cards.push(`<section class="dr3-card well"><h3><span class="dr3-ic" aria-hidden="true"></span>What went well</h3><p>${esc(t.went_well)}</p>
        ${t.went_well_quote ? `<button class="dr3-jump ok" type="button" data-quote="${esc(t.went_well_quote)}">“${esc(t.went_well_quote)}”<span>Show in your answer</span></button>` : ''}</section>`);
    }
    if (!t.too_short && groupsFor(t).length) {
      cards.push(`<details class="dr3-card cover"><summary><h3>What a strong answer covers</h3><span class="dr2-count">${(t.ratings || []).length}</span></summary>${checklist(t)}</details>`);
    }
    cards.push(`<div class="dr3-nav">${i > 0 ? `<button class="d-btn outline sm" type="button" data-goto="${i - 1}">Topic ${i}</button>` : ''}
      <button class="d-btn primary sm" type="button" data-goto="${i < n - 1 ? i + 1 : 'across'}">${i < n - 1 ? `Next: Topic ${i + 2}` : 'Across the interview'}</button></div>`);
    return cards.join('');
  }
  function topicPane(s, fb, t, i, open) {
    const n = fb.topics.length;
    const source = t.resume_line ? `<p class="dr3-from"><span>From your CV</span>“${esc(t.resume_line)}”</p>`
      : t.jd_line ? `<p class="dr3-from"><span>From the job description</span>${esc(t.jd_line)}</p>` : '';
    const t0 = Date.parse((s.transcript[0] || {}).at || s.created_at);
    const seg = t.segment && t.segment.start ? `<span class="dr3-seg">${clock(Date.parse(t.segment.start) - t0)} – ${t.segment.end ? clock(Date.parse(t.segment.end) - t0) : '…'} in the interview</span>` : '';
    return `<article class="dr-qpane dr3-pane" id="dr-q-${i}" data-q="${i}" role="tabpanel" aria-labelledby="dr-qpill-${i}"${open ? '' : ' hidden'}>
      <header class="dr3-head">
        <div class="dr3-head-main"><p class="dr3-eyebrow">Topic ${i + 1} of ${n} · ${esc(topicName(t))}</p>
          <h2 class="dr3-q">${esc(t.question || topicName(t))}</h2>${source}</div>
        <div class="dr3-head-side">${resultPill(t)}${t.resume_line ? `<button class="d-btn outline sm" type="button" data-practise="${i}">Practise this line again</button>` : ''}</div>
      </header>
      <div class="dr3-grid">
        <section class="dr3-ans" aria-label="Your answer">
          <div class="dr3-ans-top"><h3>Your answer</h3>${seg}
            <label class="dr3-switch"><input type="checkbox" data-whole>Whole interview</label>
            <button class="d-btn outline sm dr3-read" type="button" data-read aria-expanded="false">Read your answer</button></div>
          <div class="dr3-thread">${answerThread(s, fb, t)}</div>
        </section>
        <aside class="dr3-coach" aria-label="Coaching for this topic">${coach(t, i, n)}</aside>
      </div>
    </article>`;
  }

  // Across the interview: talking about your own work, moments, JD coverage (a last pill after the questions).
  function acrossPane(fb, open, goal, more) {
    const parts = [];
    // The goal first, with a way back to the topic that shows it; then the other habits.
    if (goal) {
      const gi = goal.slot_id ? fb.topics.findIndex((t) => t.slot_id === goal.slot_id) : -1;
      parts.push(`<div class="dr-card dr3-goal"><span class="dr3-goal-tag">Your goal for next time</span><h3>${esc(goal.title)}</h3>${goal.action ? `<p>${esc(goal.action)}</p>` : ''}
        ${gi >= 0 ? `<button class="d-btn outline sm" type="button" data-goto="${gi}">See it in Topic ${gi + 1}</button>` : ''}
        ${more.length ? `<ul class="dr3-more">${more.map((x) => `<li><strong>${esc(x.title)}</strong>${x.action ? `<span>${esc(x.action)}</span>` : ''}</li>`).join('')}</ul>` : ''}</div>`);
    }
    const own = fb.ownership || { i: 0, we: 0 };
    if (own.i + own.we > 0) {
      const pct = Math.round((own.i / (own.i + own.we)) * 100);
      parts.push(`<div class="dr-card"><h3>Talking about your own work</h3>
        <p>You said “I” ${plural(own.i, 'time')} and “we” ${plural(own.we, 'time')}.${own.we > own.i ? ' Interviewers listen for “I” to understand what you did yourself.' : ''}</p>
        <div class="dr-iwe" role="img" aria-label="${pct}% I, ${100 - pct}% we"><span style="width:${pct}%"></span></div></div>`);
    }
    for (const m of fb.moments || []) {
      const t = fb.topics.find((x) => x.slot_id === m.slot_id);
      parts.push(`<div class="dr-card"><h3>${esc(MOMENT[m.slot_id] || (t ? `Matching your CV: ${topicName(t)}` : 'A moment to note'))}</h3>${m.quote ? `<blockquote class="dr-quote">“${esc(m.quote)}”</blockquote>` : ''}<p>${esc(m.note)}</p>${m.tip ? `<p class="dr-tip">${esc(m.tip)}</p>` : ''}</div>`);
    }
    if ((fb.jd_coverage || []).length) {
      parts.push(`<div class="dr-card wide"><h3>Job description coverage</h3><p>The must-haves from the job description, and whether your answers showed them.</p>
        <ul class="dr-jd">${fb.jd_coverage.map((c) => `<li><span class="d-pill sm ${(JD[c.status] || JD.not_reached)[1]}">${(JD[c.status] || JD.not_reached)[0]}</span>${esc(c.name)}</li>`).join('')}</ul></div>`);
    }
    if (!parts.length) return '';
    return `<article class="dr-qpane dr3-pane" id="dr-q-across" data-q="across" role="tabpanel" aria-labelledby="dr-qpill-across"${open ? '' : ' hidden'}>
      <header class="dr3-head"><div class="dr3-head-main"><p class="dr3-eyebrow">Wrap-up</p><h2 class="dr3-q">Across the interview</h2>
        <p class="dr3-sub">What to carry into your next interview, beyond single answers.</p></div></header>
      <div class="dr-across">${parts.join('')}</div></article>`;
  }

  // ---------- Summary ----------
  function summaryHtml(s, fb, judged, goal, more) {
    const across = groupsAcross(fb);
    const count = (v) => fb.topics.filter((t) => t.verdict === v).length;
    const tally = ['good_job', 'on_track', 'needs_work'].filter(count).map((v) => `<span class="d-pill ${LEVEL[v][1]}">${count(v)} ${LEVEL[v][0]}</span>`).join('');
    const goalQ = goal && goal.slot_id ? fb.topics.findIndex((t) => t.slot_id === goal.slot_id) : -1;
    const gt = goalQ >= 0 ? fb.topics[goalQ] : null;
    const head = `<section class="dr-sum-main dr2-head">
      <div class="dr-sum-head">
        <span class="dr-sum-icon" aria-hidden="true"><svg class="ic"><use href="#i-doc"/></svg></span>
        <div><h2>How your interview went</h2>
          ${judged && fb.overall ? `<p class="dr-overall" id="drOverall">${esc(fb.overall)}</p><button class="dr-more" type="button" id="drOverallMore" aria-expanded="false" hidden>Read more</button>` : ''}
          ${judged ? '' : '<p class="dr-overall">None of your answers was long enough to judge. Open a topic for the steps to answer it next time.</p>'}</div>
        ${tally ? `<div class="dr-tally" role="group" aria-label="Results across your answers">${tally}</div>` : ''}
      </div>
    </section>`;
    // The habit to fix first: where it happened, in the student's own words, and how to say it (from that topic).
    const rail = `<aside class="dr-sum-side">
      <h2>How to improve?</h2>
      ${goal ? `<div class="dr-goal"><div class="dr-goal-meta"><span>Fix this first</span><span class="dr-impact"><svg class="ic" aria-hidden="true"><use href="#i-up"/></svg>High impact</span></div>
        <h3>${esc(goal.title)}</h3>${goal.action ? `<p><strong>Try this:</strong> ${esc(goal.action)}</p>` : ''}${goal.why ? `<p class="dr-muted">${esc(goal.why)}</p>` : ''}
        ${gt ? `<div class="dr2-where"><span class="dr2-where-h">Where it happened</span>
          <button class="dr2-where-link" type="button" data-open="${goalQ}">Topic ${goalQ + 1} · ${esc(topicName(gt))}</button>
          ${gt.to_fix_quote ? `<p class="dr2-where-q">“${esc(gt.to_fix_quote)}”</p>` : ''}</div>
          ${gt.stronger_version ? `<div class="dr2-sayit"><span class="dr2-where-h">Say it like this</span><p>${blanks(sentences(gt.stronger_version, 2))}</p>
            <button class="dr-link" type="button" data-open="${goalQ}">See the full answer in topic ${goalQ + 1}</button></div>` : ''}` : ''}
      </div>` : ''}
      ${fb.topics.length ? '<button class="d-btn primary dr-wide" type="button" data-detailed>View Detailed Feedback</button>' : ''}
      ${more.length ? `<h3 class="dr-also-h">Also work on</h3><ul class="dr-also">${more.map((x) => `<li><span class="dr-dot" aria-hidden="true"></span><div><strong>${esc(x.title)}</strong>${x.action ? `<p>${esc(x.action)}</p>` : ''}</div></li>`).join('')}</ul>` : ''}
    </aside>`;
    const rest = `<section class="dr-sum-main dr2-rest">
      <h3 class="dr2-h">Topic by topic</h3>
      <ol class="dr2-topics">${fb.topics.map((t, i) => {
        const fus = (t.follow_ups || []).length;
        return `<li><button type="button" data-open="${i}">
          <span class="dr-num">${i + 1}</span>
          <span class="dr2-topic-text"><strong>${esc(topicName(t))}</strong>
            ${t.question ? `<span class="dr2-asked">“${esc(t.question)}”</span>` : ''}
            <span class="dr2-line">${esc(rowLine(t))}</span>
            ${fus ? `<span class="dr2-meta">${plural(fus, 'follow-up')}</span>` : ''}</span>
          ${resultPill(t, 'sm')}<svg class="ic dr2-chev" aria-hidden="true"><use href="#i-chev"/></svg></button></li>`;
      }).join('')}</ol>
    </section>`;
    // Content Strength across the answers, as its own section under the topics.
    const cs = across.length ? `<section class="dr-sum-main dr2-csec">
      <h3 class="dr2-h">Content Strength across your answers</h3>
      <p class="dr-muted dr2-sub">Whether your answers had the parts a strong answer needs, by VMock's content checks.</p>
      <ul class="dr2-cs">${across.map((g) => `<li><span><strong>${esc(g.name)}</strong>${GROUP_HELP[g.name] ? `<span>${GROUP_HELP[g.name]}</span>` : ''}</span>${pill(g.level, 'sm')}</li>`).join('')}</ul>
      <div class="dr-legend" aria-hidden="true"><span class="good">Good Job</span><span class="track">On Track</span><span class="work">Needs Work</span></div>
    </section>` : '';
    return `<div class="dr-view" id="dr-view-summary" role="tabpanel" aria-labelledby="dr-tab-summary"><div class="dr-sum dr2-sum">${head}${rail}<div class="dr2-restcol">${rest}${cs}</div></div></div>`;
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
    const across = acrossPane(fb, false, goal, more);
    const goalI = goal && goal.slot_id ? fb.topics.findIndex((t) => t.slot_id === goal.slot_id) : -1;
    // The stepper: every topic with its result and follow-ups, the goal's topic marked, then the wrap-up.
    const step = (t, i) => {
      const lv = t.too_short ? ['Too short', 'none'] : LEVEL[t.verdict] || ['', 'none'];
      const fus = (t.follow_ups || []).length;
      return `<button class="dr3-step ${lv[1]}" type="button" role="tab" id="dr-qpill-${i}" aria-controls="dr-q-${i}" aria-selected="${i === open}" tabindex="${i === open ? 0 : -1}" data-q="${i}">
        <span class="dr3-step-n">Topic ${i + 1}${i === goalI ? '<span class="dr3-first">Fix first</span>' : ''}</span>
        <span class="dr3-step-t">${esc(topicName(t))}</span>
        <span class="dr3-step-l"><i aria-hidden="true"></i>${lv[0]}${fus ? ` · ${plural(fus, 'follow-up')}` : ''}</span></button>`;
    };
    const detailed = `<div class="dr-view dr3-view" id="dr-view-detailed" role="tabpanel" aria-labelledby="dr-tab-detailed" hidden>
      <div class="dr3-stepper" role="tablist" aria-label="Topics">${fb.topics.map(step).join('')}
        ${across ? `<button class="dr3-step wrap" type="button" role="tab" id="dr-qpill-across" aria-controls="dr-q-across" aria-selected="false" tabindex="-1" data-q="across"><span class="dr3-step-n">Wrap-up</span><span class="dr3-step-t">Across the interview</span><span class="dr3-step-l">Your goal and habits</span></button>` : ''}</div>
      ${fb.topics.map((t, i) => topicPane(s, fb, t, i, i === open)).join('')}${across}
    </div>`;
    panel.innerHTML = summaryHtml(s, fb, judged, goal, more) + detailed;
    wire(panel, tabs, s, fb);
  }

  function wire(panel, tabs, s, fb) {
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

    // Detailed: the topic stepper (a tablist: arrow keys move between topics).
    const qBtns = [...panel.querySelectorAll('.dr3-stepper .dr3-step')];
    const openQ = (q) => {
      qBtns.forEach((b) => { const on = b.dataset.q === String(q); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panel.querySelectorAll('.dr-qpane').forEach((p) => { p.hidden = p.dataset.q !== String(q); });
      const step = panel.querySelector(`.dr3-step[data-q="${q}"]`);
      if (step) step.parentNode.scrollLeft = step.offsetLeft - 16; // keep the open topic in view in a scrolled stepper
      window.scrollTo({ top: 0, behavior: smooth }); // a new topic opens at its top
    };
    qBtns.forEach((b) => b.addEventListener('click', () => openQ(b.dataset.q)));
    panel.querySelector('.dr3-stepper')?.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const k = qBtns.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const next = qBtns[e.key === 'Home' ? 0 : e.key === 'End' ? qBtns.length - 1 : Math.max(0, Math.min(qBtns.length - 1, k + (e.key === 'ArrowRight' ? 1 : -1)))];
      openQ(next.dataset.q);
      next.focus();
    });
    const goToQ = (q) => { showView('detailed'); openQ(q); };

    panel.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { showView('detailed'); openQ(b.dataset.goto); }));
    // A quote scrolls the answer to the words it came from and flashes them (the whole line if the words are not marked).
    panel.querySelectorAll('[data-quote]').forEach((b) => b.addEventListener('click', () => {
      const pane = b.closest('.dr-qpane');
      const want = b.dataset.quote.toLowerCase().replace(/\s+/g, ' ');
      const norm = (el) => el.textContent.toLowerCase().replace(/\s+/g, ' ');
      const line = [...pane.querySelectorAll('.dr3-msg.you:not(.dr3-other)')].find((l) => norm(l).includes(want));
      if (!line) return;
      pane.querySelector('.dr3-ans').classList.add('open');
      pane.querySelector('[data-read]')?.setAttribute('aria-expanded', 'true');
      pane.querySelectorAll('mark.dr3-lit').forEach((m) => { const p = m.parentNode; m.replaceWith(...m.childNodes); p.normalize(); });
      let target = [...line.querySelectorAll('mark')].find((m) => norm(m).includes(want) || want.includes(norm(m)));
      if (!target) { // light the words up for as long as they are being looked at
        const p = line.querySelector('p');
        const i = p.textContent.toLowerCase().indexOf(b.dataset.quote.toLowerCase());
        if (i >= 0 && p.childNodes.length === 1) {
          const txt = p.firstChild, range = document.createRange();
          range.setStart(txt, i); range.setEnd(txt, i + b.dataset.quote.length);
          target = document.createElement('mark'); target.className = 'dr2-mark dr3-lit';
          range.surroundContents(target);
        }
      }
      const el = target || line;
      el.scrollIntoView({ behavior: smooth, block: 'center' });
      el.classList.remove('dr2-flash');
      void el.offsetWidth; // restart the animation on a second click
      el.classList.add('dr2-flash');
    }));
    // The rest of the interview around this topic, and on a phone the answer itself, folded until asked for.
    panel.querySelectorAll('[data-whole]').forEach((c) => c.addEventListener('change', () => c.closest('.dr3-ans').classList.toggle('whole', c.checked)));
    panel.querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => {
      const open = b.closest('.dr3-ans').classList.toggle('open');
      b.setAttribute('aria-expanded', String(open));
    }));
    panel.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const text = fb.topics[Number(b.dataset.copy)].stronger_version;
      const done = (msg) => { b.textContent = msg; setTimeout(() => { b.textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done('Copied'), () => done('Select and copy'));
      else done('Select and copy');
    }));
    // Practise this line again: CV Deep Dive setup with this topic's CV line already chosen (as "Change setup" does).
    panel.querySelectorAll('[data-practise]').forEach((b) => b.addEventListener('click', () => {
      const t = fb.topics[Number(b.dataset.practise)];
      const line = t ? t.resume_line : '';
      if (!line) return;
      try {
        sessionStorage.setItem('vmock_adaptive_last', JSON.stringify({ entry: 'cv', resume_text: s.inputs.resume_text, resume_name: 'Your CV', domain: s.inputs.domain || '', stage: s.inputs.stage || '', interview_type: 'back_your_resume', style: s.inputs.style || 'balanced', length: 'short', focus_lines: [line] }));
      } catch (_) { return; }
      location.href = '/dashboard/smart-interviews/practice/adaptive/setup?entry=cv&back=1';
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

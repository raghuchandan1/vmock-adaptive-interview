/* Dashboard replica room: the feedback screen (base styles in feedback.css, this version's in feedback-v2.css),
   organised topic by topic (each topic is an opening question plus its follow-ups):
   - Summary: how it went and the tally; the habit to fix first beside it (where it happened, in the student's words,
     and how to say it), then "Topic by topic" (question asked, one line, follow-ups, result) and Content Strength
     across your answers as one divided list, then Across the interview (I/we, moments, JD coverage). On a phone the
     habit comes straight after the summary.
   - Detailed: one topic per page with section links at its top and a glance strip (said unprompted / after a
     follow-up / missing), in the order a student works through it: what you did, how your answer measured up (the
     structure a strong answer has), the follow-ups (each one, then how they were handled), and last how to answer it
     next time (steps, then the improved answer with what it adds to the student's words highlighted). The transcript
     on the right marks every quoted line by level; a quote scrolls to its line. A topic from a CV line offers
     "Practise this line again" (CV Deep Dive with the line chosen).
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
  const resultPill = (t, cls = '') => (t.too_short && !t.ended_early ? `<span class="d-pill none ${cls}">Too short</span>` : pill(t.verdict, cls));
  const topicName = (t) => (t.kind === 'second_chance' ? `${t.topic || 'Earlier topic'} (second try)` : t.topic || KIND[t.kind] || 'Question');
  // A quote is a button: it scrolls the transcript to the line it came from.
  const quote = (q) => (q ? `<button class="dr-quote" type="button" data-quote="${esc(q)}">“${esc(q)}”</button>` : '');
  const blanks = (text) => esc(text).replace(/\[([^\]]+)\]/g, '<span class="dr-blank"><span class="sr">fill in: </span>$1</span>');
  function rowLine(t) {
    if (t.ended_early) return 'This topic ended after two "not sure" or "repeat" answers. Open it to see how to answer next time.';
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

  // ---------- Transcript ("Script") for one question, with times from the start of the interview ----------
  function clock(ms) {
    const sec = Math.max(0, Math.round(ms / 1000));
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
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
  const ORDER = { needs_work: 0, on_track: 1, good_job: 2 };
  function marksFor(t) {
    // The fix and CV-mismatch quotes take their cards' amber; each element's quote takes its level's colour.
    const out = [{ q: t.to_fix_quote, cls: 'track', label: 'What to fix' }];
    if (t.resume_mismatch) out.push({ q: t.resume_mismatch.quote, cls: 'track', label: "Doesn't match your CV" });
    out.push({ q: t.went_well_quote, cls: 'good', label: 'What went well' });
    [...(t.ratings || [])].filter((r) => r.quote && LEVEL[r.level]).sort((a, b) => ORDER[a.level] - ORDER[b.level])
      .forEach((r) => out.push({ q: r.quote, cls: LEVEL[r.level][1], label: `${r.label}: ${LEVEL[r.level][0]}` }));
    return out.filter((m) => m.q);
  }
  function scriptPane(s, t) {
    const t0 = Date.parse((s.transcript[0] || {}).at || s.created_at);
    const lines = s.transcript.filter((e) => e.slot_id === t.slot_id);
    const marks = marksFor(t);
    const seg = t.segment && t.segment.start ? `<span class="dr-seg">${clock(Date.parse(t.segment.start) - t0)} - ${t.segment.end ? clock(Date.parse(t.segment.end) - t0) : '…'}</span>` : '';
    return `<aside class="dr-script" aria-label="Script">
      <div class="dr-script-tabs"><span class="dr-script-tab" aria-current="true">Script</span>${seg}</div>
      <div class="dr-script-body">${lines.length ? lines.map((e) => `<div class="dr-line ${e.role === 'candidate' ? 'you' : 'ai'}">
          <div class="dr-line-who">${e.role === 'candidate' ? 'You' : 'Interviewer'}<time>${e.at ? clock(Date.parse(e.at) - t0) : ''}</time></div>
          <p>${e.role === 'candidate' ? annotate(e.text, marks) : esc(e.text)}</p></div>`).join('')
        : '<p class="dr-muted">No transcript for this topic.</p>'}</div>
      ${marks.length ? '<p class="dr-script-key"><mark class="dr2-mark good">Went well</mark> <mark class="dr2-mark track">To fix or partly there</mark> <mark class="dr2-mark work">Needs work</mark> Hover a highlight to see what it shows.</p>' : ''}
    </aside>`;
  }

  // ---------- Detailed Feedback: one question, sub-nav on the left, content in the middle, script on the right ----------
  // The improved answer with what it adds marked: a word stays plain when it is part of a three-word run the student
  // said in this topic; a run of new words is marked only if it holds a real word (4+ letters or a number), so
  // "the" or "and" between the student's own phrases is not lit up. "[brackets]" stay fill-in boxes.
  function markNew(text, own) {
    const key = (w) => w.toLowerCase().replace(/[^a-z0-9%]/g, '');
    const mine = own.split(/\s+/).map(key).filter(Boolean);
    const grams = new Set(mine.slice(2).map((w, i) => `${mine[i]} ${mine[i + 1]} ${w}`));
    let marked = false;
    const html = text.split(/(\[[^\]]+\])/).map((part, k) => {
      if (k % 2) return blanks(part);
      const words = part.split(/(\s+)/);
      const idx = words.map((w, i) => (i % 2 ? null : key(w)));
      const real = idx.map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
      const covered = new Set();
      real.forEach((i, n) => {
        const run = real.slice(n, n + 3);
        if (run.length === 3 && grams.has(run.map((j) => idx[j]).join(' '))) run.forEach((j) => covered.add(j));
      });
      let out = '', run = [];
      const flush = () => {
        if (!run.length) return;
        const tail = /^\s+$/.test(run[run.length - 1]) ? run.pop() : ''; // the space after a run stays outside its mark
        const hit = run.some((w) => key(w).length >= 4 || /\d/.test(w));
        const body = esc(run.join(''));
        out += (hit ? `<mark class="dr2-new">${body}</mark>` : body) + tail;
        marked = marked || hit;
        run = [];
      };
      words.forEach((w, i) => {
        if (i % 2) { if (run.length) run.push(w); else out += esc(w); return; }
        const isNew = idx[i] ? !covered.has(i) : run.length > 0; // punctuation joins the run it sits in
        if (isNew) run.push(w);
        else { flush(); out += esc(w); }
      });
      flush();
      return out;
    }).join('');
    return { html, marked };
  }
  const ownWords = (s, t) => s.transcript.filter((e) => e.role === 'candidate' && e.slot_id === t.slot_id).map((e) => e.text).join(' ');
  function nextTimeBody(s, t) {
    const plan = t.answer_plan || [];
    let html = '';
    if (t.too_short) html += `<div class="dr-banner">Your answer here was too short to give feedback on. Use the ${plan.length === 1 ? 'step' : 'steps'} below to prepare this one.</div>`;
    if (plan.length) html += `<ol class="dr2-steps">${plan.map((p) => `<li>${blanks(p)}</li>`).join('')}</ol>`;
    // A rewrite reaches the screen only after its grounding check (the server empties it when the check fails).
    if (t.stronger_version) {
      const better = markNew(t.stronger_version, ownWords(s, t));
      html += `<div class="dr2-better"><span class="dr2-better-tag">Your answer, improved</span><p>${better.html}</p>
        ${better.marked ? '<p class="dr2-better-key"><mark class="dr2-new">Highlighted</mark> what this version adds to your answer. The rest is in your own words.</p>' : ''}
        ${/\[[^\]]+\]/.test(t.stronger_version) ? '<p class="dr2-better-hint">Fill in the boxes with your own details.</p>' : ''}
        <p class="dr2-checked"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>Checked: uses only facts from your CV, the job description and your answers.</p></div>`;
    }
    if (t.example_answer) {
      html += `<div class="dr-sample"><span class="dr-sample-tag">SAMPLE RESPONSE</span><p>${esc(t.example_answer)}</p>
        <p class="dr-muted">From a sample candidate, to show the approach. Use your own example.</p></div>`;
    }
    return html || '<p class="dr-muted">No steps for this topic.</p>';
  }
  function didBody(t) {
    const boxes = [];
    if (t.went_well) boxes.push(`<div class="dr-box well"><h4>What went well</h4>${quote(t.went_well_quote)}<p>${esc(t.went_well)}</p></div>`);
    // Went well and what to fix side by side; a CV mismatch runs full width under them.
    if (t.to_fix) boxes.push(`<div class="dr-box fix"><h4>What to fix</h4>${quote(t.to_fix_quote)}<p>${esc(t.to_fix)}</p></div>`);
    if (t.resume_mismatch) boxes.push(`<div class="dr-box fix dr2-wide"><h4>Doesn't match your CV</h4>${quote(t.resume_mismatch.quote)}<p>${esc(t.resume_mismatch.note)}</p>${t.resume_mismatch.tip ? `<p class="dr-tip">${esc(t.resume_mismatch.tip)}</p>` : ''}</div>`);
    return boxes.join('') || '<p class="dr-muted">Nothing to note here.</p>';
  }
  // What a strong answer covers: each element on one aligned row (level, element, then the reason with where it
  // appeared and the student's words), under VMock's group names with the group's level.
  // The answer's structure only: how follow-ups were handled is judged under Follow-ups.
  const structureGroups = (t) => groupsFor(t).filter((g) => g.name !== 'Handling follow-ups');
  function checklist(t) {
    return `<div class="dr2-check">${structureGroups(t).map((g) => {
      const single = g.items.length === 1 && g.items[0].label === g.name; // "Handling follow-ups" under "Handling follow-ups"
      return `<div class="dr2-check-group">
        <div class="dr2-check-top"><div class="dr2-check-head"><strong>${esc(g.name)}</strong>${pill(moduleLevel(g.items.map((r) => r.level)))}</div>
          ${GROUP_HELP[g.name] ? `<p class="dr2-check-help">${GROUP_HELP[g.name]}</p>` : ''}</div>
        ${g.items.map((r) => `<div class="dr2-crit${single ? ' single' : ''}">
          ${single ? '' : `<div class="dr2-crit-level">${pill(r.level)}</div><strong class="dr2-crit-name">${esc(r.label)}</strong>`}
          <div class="dr2-crit-body"><p>${esc(r.reason)}${r.found ? ` <span class="dr2-crit-found">· ${FOUND[r.found]}</span>` : ''}</p>${quote(r.quote)}</div>
        </div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  }
  // Each follow-up (what it asked for, whether the reply added it), then how the follow-ups were handled overall.
  function followUpsBody(t) {
    const handled = (t.ratings || []).find((r) => r.dimension === 'followup');
    const list = (t.follow_ups || []).length ? `<ul class="dr-fus">${t.follow_ups.map((f) => `<li><p class="dr-fu-q">“${esc(f.question)}”</p>${f.why ? `<p class="dr-muted">${esc(f.why)}</p>` : ''}
      ${f.asked_for_label && f.given !== null ? `<span class="d-pill sm ${f.given ? 'good' : 'work'}">${f.given ? 'You added' : 'Still missing'}: ${esc(f.asked_for_label.toLowerCase())}</span>` : ''}</li>`).join('')}</ul>` : '';
    const how = handled ? `<div class="dr2-handled"><div class="dr2-handled-head"><strong>How you handled them</strong>${pill(handled.level)}</div><p>${esc(handled.reason)}</p>${quote(handled.quote)}</div>` : '';
    return list + how;
  }
  const section = (id, title, body, extra = '') => (body ? `<section class="dr2-sec" id="${id}"><div class="dr2-sec-head"><h3>${title}</h3>${extra}</div>${body}</section>` : '');
  // What the topic's lesson is at a glance: which parts came unprompted, which only after a follow-up, which never.
  function glance(t) {
    const rs = (t.ratings || []).filter((r) => r.dimension !== 'followup' && r.found);
    const parts = [['first_answer', 'Said unprompted'], ['after_follow_up', 'After a follow-up'], ['not_given', 'Missing']]
      .map(([f, name]) => [f, name, rs.filter((r) => r.found === f).map((r) => r.label)]).filter(([, , ls]) => ls.length);
    return parts.length ? `<div class="dr2-glance">${parts.map(([f, name, ls]) => `<span class="dr2-glance-item ${f}"><b>${name}:</b> ${esc(ls.join(', '))}</span>`).join('')}</div>` : '';
  }
  function topicPane(s, t, i, n, open) {
    const source = t.resume_line ? `<p class="dr-from"><span>From your CV</span>“${esc(t.resume_line)}”</p>`
      : t.jd_line ? `<p class="dr-from"><span>From the job description</span>${esc(t.jd_line)}</p>` : '';
    const fus = (t.follow_ups || []).length;
    const handled = (t.ratings || []).some((r) => r.dimension === 'followup');
    const parts = structureGroups(t).reduce((k, g) => k + g.items.length, 0);
    // What you did, how it measured up against a strong answer, how the follow-ups went, then what to do next time.
    const secs = [
      !t.too_short && ['did', 'What you did', didBody(t)],
      !t.too_short && parts && ['check', 'How your answer measured up', `<p class="dr-muted dr2-sec-sub">The parts a strong answer to this question has, and whether yours had them.</p>${checklist(t)}`, `<span class="dr2-count">${parts}</span>`],
      (fus || handled) && ['fu', 'Follow-ups', followUpsBody(t), fus ? `<span class="dr2-count">${fus}</span>` : ''],
      ['next', 'How to answer it next time', nextTimeBody(s, t)],
    ].filter(Boolean);
    const nav = `<div class="dr2-nav">${i > 0 ? `<button class="d-btn outline sm" type="button" data-goto="${i - 1}">Previous topic</button>` : '<span></span>'}
      ${i < n - 1 ? `<button class="d-btn primary sm" type="button" data-goto="${i + 1}">Next topic</button>` : '<button class="d-btn outline sm" type="button" data-summary>Back to Summary</button>'}</div>`;
    return `<article class="dr-qpane" id="dr-q-${i}" data-q="${i}" role="tabpanel" aria-labelledby="dr-qpill-${i}"${open ? '' : ' hidden'}>
      <div class="dr2-topic">
        <div class="dr2-topic-main"><p class="dr2-eyebrow">Topic ${i + 1} of ${n} · ${esc(topicName(t))}${fus ? ` · ${plural(fus, 'follow-up')}` : ''}</p>
          <p class="dr2-q">${esc(t.question || topicName(t))}</p>${source}${t.too_short ? '' : glance(t)}</div>
        <div class="dr2-topic-side">${resultPill(t)}${t.resume_line ? `<button class="d-btn outline sm" type="button" data-practise="${i}">Practise this line again</button>` : ''}</div>
      </div>
      <div class="dr-qgrid">
        <div class="dr2-body">
          ${secs.length > 1 ? `<nav class="dr2-secnav" aria-label="Sections">${secs.map(([id, title]) => `<a href="#dr2-${i}-${id}" data-sec="dr2-${i}-${id}">${title}</a>`).join('')}</nav>` : ''}
          ${secs.map(([id, title, body, extra]) => section(`dr2-${i}-${id}`, title, body, extra)).join('')}
          ${nav}
        </div>
        ${scriptPane(s, t)}
      </div>
    </article>`;
  }

  // Across the interview, on the Summary after Content Strength: talking about your own work, moments, JD coverage.
  function acrossSection(fb) {
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
      parts.push(`<div class="dr-card"><h3>${esc(MOMENT[m.slot_id] || (t ? `Matching your CV: ${topicName(t)}` : 'A moment to note'))}</h3>${m.quote ? `<blockquote class="dr-quote">“${esc(m.quote)}”</blockquote>` : ''}<p>${esc(m.note)}</p>${m.tip ? `<p class="dr-tip">${esc(m.tip)}</p>` : ''}</div>`);
    }
    if ((fb.jd_coverage || []).length) {
      parts.push(`<div class="dr-card wide"><h3>Job description coverage</h3><p>The must-haves from the job description, and whether your answers showed them.</p>
        <ul class="dr-jd">${fb.jd_coverage.map((c) => `<li><span class="d-pill sm ${(JD[c.status] || JD.not_reached)[1]}">${(JD[c.status] || JD.not_reached)[0]}</span>${esc(c.name)}</li>`).join('')}</ul></div>`);
    }
    if (!parts.length) return '';
    return `<section class="dr-sum-main dr2-acrosssec">
      <h3 class="dr2-h">Across the interview</h3>
      <p class="dr-muted dr2-sub">How you came across overall, beyond single answers.</p>
      <div class="dr-across">${parts.join('')}</div></section>`;
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
          ${judged || !fb.topics.every((t) => t.too_short) ? '' : '<p class="dr-overall">None of your answers was long enough to judge. Open a topic for the steps to answer it next time.</p>'}</div>
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
          ${gt.stronger_version ? `<div class="dr2-sayit"><span class="dr2-where-h">Say it like this</span><p>${markNew(sentences(gt.stronger_version, 2), ownWords(s, gt)).html}</p>
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
    return `<div class="dr-view" id="dr-view-summary" role="tabpanel" aria-labelledby="dr-tab-summary"><div class="dr-sum dr2-sum">${head}${rail}<div class="dr2-restcol">${rest}${cs}${acrossSection(fb)}</div></div></div>`;
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
    const detailed = `<div class="dr-view" id="dr-view-detailed" role="tabpanel" aria-labelledby="dr-tab-detailed" hidden>
      <div class="dr-qbar" role="tablist" aria-label="Topics">${fb.topics.map((t, i) => `<button class="dr-qp ${t.too_short && !t.ended_early ? '' : (LEVEL[t.verdict] || [])[1] || ''}" type="button" role="tab" id="dr-qpill-${i}" aria-controls="dr-q-${i}" aria-selected="${i === open}" data-q="${i}" title="${esc(topicName(t))}" aria-label="Topic ${i + 1}, ${esc(topicName(t))}, ${t.too_short ? 'too short' : esc((LEVEL[t.verdict] || [''])[0])}">Topic ${i + 1}</button>`).join('')}</div>
      ${fb.topics.map((t, i) => topicPane(s, t, i, fb.topics.length, i === open)).join('')}
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

    // Detailed: question pills, and the sub-nav inside each question.
    const qBtns = [...panel.querySelectorAll('.dr-qbar .dr-qp')];
    const openQ = (q) => {
      qBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.q === String(q))));
      panel.querySelectorAll('.dr-qpane').forEach((p) => { p.hidden = p.dataset.q !== String(q); });
    };
    qBtns.forEach((b) => b.addEventListener('click', () => openQ(b.dataset.q)));
    const goToQ = (q) => { showView('detailed'); openQ(q); };

    panel.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { openQ(b.dataset.goto); window.scrollTo({ top: 0, behavior: smooth }); }));
    // A quote scrolls the transcript to the answer it came from and flashes that line.
    panel.querySelectorAll('[data-quote]').forEach((b) => b.addEventListener('click', () => {
      const want = b.dataset.quote.toLowerCase().replace(/\s+/g, ' ');
      const line = [...b.closest('.dr-qpane').querySelectorAll('.dr-line.you')].find((l) => l.textContent.toLowerCase().replace(/\s+/g, ' ').includes(want));
      if (!line) return;
      line.scrollIntoView({ behavior: smooth, block: 'center' });
      line.classList.remove('dr2-flash');
      void line.offsetWidth; // restart the animation on a second click
      line.classList.add('dr2-flash');
    }));
    // Section links: jump within the topic, and mark the section being read.
    panel.querySelectorAll('.dr2-secnav a').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.sec).scrollIntoView({ behavior: smooth, block: 'start' });
    }));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const nav = en.target.closest('.dr2-body').querySelector('.dr2-secnav');
        if (nav) nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.sec === en.target.id));
      }), { rootMargin: '-35% 0px -60% 0px' });
      panel.querySelectorAll('.dr2-sec').forEach((sec) => io.observe(sec));
    }
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
    panel.querySelectorAll('[data-summary]').forEach((b) => b.addEventListener('click', () => showView('summary')));

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

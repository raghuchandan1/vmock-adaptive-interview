/* VMock adaptive interview prototype: browser app. */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  const SETTINGS_KEY = 'vmock-adaptive-settings';

  const state = {
    config: null,
    settings: {},
    sessionId: null,
    view: null,
    trace: null,
    lastInputs: null,
    agendaOpen: false,
    busy: false,
  };

  // ---------- API ----------
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
    return data;
  }

  // ---------- Screens ----------
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    window.scrollTo({ top: 0 });
  }

  // ---------- Settings ----------
  function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (_) { /* ignore */ }
    const d = state.config.defaults;
    state.settings = {
      planner_model: saved.planner_model || d.planner_model,
      planner_effort: saved.planner_effort || d.planner_effort,
      turn_model: saved.turn_model || d.turn_model,
      turn_effort: saved.turn_effort || d.turn_effort,
      show_agenda: Boolean(saved.show_agenda),
    };
  }

  function openSettings() {
    const s = state.settings;
    $('plannerModel').value = s.planner_model;
    $('plannerEffort').value = s.planner_effort;
    $('turnModel').value = s.turn_model;
    $('turnEffort').value = s.turn_effort;
    $('showAgendaDefault').checked = s.show_agenda;
    $('apiKey').value = '';
    $('keyStatus').textContent = state.config.has_key
      ? (state.config.key_source === 'env' ? 'Using the key from your .env file. Enter a key here to override it for this run.' : 'A key is set for this run.')
      : 'No key yet. It stays on your computer: the server keeps it in memory and never sends it to the page.';
    $('settings').showModal();
  }

  async function saveSettings() {
    state.settings = {
      planner_model: $('plannerModel').value.trim() || state.config.defaults.planner_model,
      planner_effort: $('plannerEffort').value,
      turn_model: $('turnModel').value.trim() || state.config.defaults.turn_model,
      turn_effort: $('turnEffort').value,
      show_agenda: $('showAgendaDefault').checked,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    const key = $('apiKey').value.trim();
    if (key) {
      const r = await api('/api/key', { method: 'POST', body: { api_key: key } });
      state.config.has_key = r.has_key;
      state.config.key_source = 'page';
    }
    updateKeyHint();
  }

  function updateKeyHint() {
    $('keyHint').hidden = state.config.has_key;
  }

  // ---------- Setup ----------
  async function loadSamples() {
    const samples = await api('/api/samples');
    state.samples = samples;
    const label = (id) => id.replace(/^(resume|jd)-/, '').replace(/-/g, ' ');
    for (const s of samples) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = label(s.id);
      (s.kind === 'jd' ? $('jdSample') : $('resumeSample')).appendChild(opt);
    }
  }

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

  function readSetup() {
    const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
    return {
      resume_text: $('resume').value,
      jd_text: $('jd').value,
      target_role: $('role').value,
      interview_type: val('type'),
      style: val('style'),
      length: val('length'),
    };
  }

  function setupError(msg) {
    $('setupError').textContent = msg || '';
    $('setupError').hidden = !msg;
  }

  // Keep the active interview across a refresh. Storage can be blocked, so every access is guarded.
  const remember = (id) => { try { if (id) localStorage.setItem('vmock_active_session', id); else localStorage.removeItem('vmock_active_session'); } catch (_) { /* storage unavailable */ } };
  const remembered = () => { try { return localStorage.getItem('vmock_active_session'); } catch (_) { return null; } };

  async function prepare(inputs) {
    setupError('');
    if (!state.config.has_key) { setupError('Add your OpenAI API key in Settings, then try again.'); openSettings(); return; }
    if (inputs.resume_text.trim().length < 200) { setupError('Add a resume of at least a few lines.'); return; }
    if (!inputs.target_role.trim() && !inputs.jd_text.trim()) { setupError('Add a target role or a job description.'); return; }
    if (state.preparing) return;
    state.preparing = true;
    state.lastInputs = inputs;
    show('planning');
    try {
      const view = await api('/api/sessions', { method: 'POST', body: { ...inputs, settings: state.settings } });
      state.sessionId = view.id;
      state.view = view;
      state.trace = null;
      remember(view.id);
      renderBrief(view.pre_brief);
      show('brief');
    } catch (err) {
      show('setup');
      setupError(`We couldn't prepare the interview. Your resume and settings are still here, so you can try again. (${err.message})`);
    } finally {
      state.preparing = false;
    }
  }

  // ---------- Pre-brief ----------
  function renderBrief(b) {
    $('briefTitle').textContent = b.role ? `${b.interview_type} interview: ${b.role}${b.company ? ` at ${b.company}` : ''}` : `${b.interview_type} interview`;
    const rows = [
      ['Interviewer', b.surprise ? 'You\'ll find out as you go' : `${b.style} style`],
      ['Topics', `About ${b.topics}, plus a warm-up and your questions at the end`],
      ['Length', `Around ${b.minutes} minutes`],
    ];
    if (b.jd_used) rows.push(['Job description', 'Questions reflect the job description you added']);
    $('briefList').innerHTML = rows.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
    $('briefWarn').hidden = !b.mismatch_note;
    $('briefWarn').textContent = b.mismatch_note ? `Note: ${b.mismatch_note}` : '';
  }

  // ---------- Interview ----------
  function startInterview() {
    state.agendaOpen = state.settings.show_agenda;
    renderInterview();
    show('interview');
    setAgenda(state.agendaOpen);
    $('answer').focus();
  }

  function renderInterview() {
    const t = state.view.transcript;
    const lastInterviewer = [...t].reverse().find((e) => e.role === 'interviewer');
    const lastIdx = t.lastIndexOf(lastInterviewer);
    const earlier = t.slice(0, lastIdx);
    let html = '';
    for (let i = 0; i < earlier.length; i++) {
      if (earlier[i].role !== 'interviewer') continue;
      const a = earlier[i + 1] && earlier[i + 1].role === 'candidate' ? earlier[i + 1].text : '';
      html += `<div class="exchange"><p class="q">${esc(earlier[i].text)}</p>${a ? `<p class="a">${esc(a)}</p>` : ''}</div>`;
    }
    $('thread').innerHTML = html;
    $('question').textContent = lastInterviewer ? lastInterviewer.text : '';
    $('answer').value = '';
    $('wordCount').textContent = '0 words';
  }

  async function sendAnswer() {
    if (state.busy) return;
    const answer = $('answer').value.trim();
    $('turnError').hidden = true;
    if (!answer) { $('turnError').textContent = 'Type an answer before sending.'; $('turnError').hidden = false; return; }
    state.busy = true;
    $('sendBtn').disabled = true;
    $('answer').disabled = true;
    $('typing').hidden = false;
    try {
      state.view = await api(`/api/sessions/${state.sessionId}/answers`, { method: 'POST', body: { answer } });
      if (state.view.status === 'ended') {
        await openReview();
      } else {
        renderInterview();
        if (state.agendaOpen) await refreshAgenda();
      }
    } catch (err) {
      $('turnError').textContent = `${err.message} Your answer is still in the box, so you can send it again.`;
      $('turnError').hidden = false;
    } finally {
      state.busy = false;
      $('sendBtn').disabled = false;
      $('answer').disabled = false;
      $('typing').hidden = true;
      if (!$('screen-interview').hidden) $('answer').focus();
    }
  }

  async function endInterview() {
    if (state.busy) return;
    if (!confirm('End the interview now? Topics not reached will show as not covered.')) return;
    state.view = await api(`/api/sessions/${state.sessionId}/end`, { method: 'POST' });
    await openReview();
  }

  // ---------- Agenda drawer ----------
  async function setAgenda(open) {
    state.agendaOpen = open;
    $('agenda').hidden = !open;
    document.querySelector('.interview-layout').classList.toggle('with-agenda', open);
    $('agendaToggle').textContent = open ? 'Hide the hidden agenda' : 'Show the hidden agenda';
    $('agendaToggle').setAttribute('aria-expanded', String(open));
    if (open) await refreshAgenda();
  }

  async function refreshAgenda() {
    state.trace = await api(`/api/sessions/${state.sessionId}/trace`);
    const s = state.trace;
    const slot = s.slots[s.current];
    const last = s.turns[s.turns.length - 1];
    const pending = s.slots.filter((x, i) => i > s.current && x.status === 'pending' && x.kind !== 'candidate_questions');
    let html = `<dl>
      <dt>Style</dt><dd>${esc(s.style)}${s.surprise ? ' (surprise)' : ''}</dd>
      <dt>Now on</dt><dd>${esc(slotLabel(slot))}</dd>`;
    if (slot.anchor_text) html += `<dt>Resume line</dt><dd>${esc(slot.anchor_text)}</dd>`;
    if (slot.intent_private) html += `<dt>Needs</dt><dd>${esc(slot.intent_private)}</dd>`;
    if (slot.probe_angle && slot.probe_angle !== 'none') html += `<dt>Angle</dt><dd>${esc(slot.probe_angle.replace('_', ' '))}${slot.technical_focus ? ', technical depth' : ''}</dd>`;
    if (slot.budget) html += `<dt>Follow-ups</dt><dd>${slot.follow_ups_used} of ${slot.budget} used</dd>`;
    if (last) {
      html += `<dt>Last decision</dt><dd>${esc(last.decision.replace(/_/g, ' '))}${last.output.probe_rung && last.output.probe_rung !== 'none' ? ` (${esc(last.output.probe_rung)})` : ''}</dd>`;
      html += `<dt>Why</dt><dd>${esc(last.output.internal_rationale)}</dd>`;
      if (last.output.missing?.length) html += `<dt>Missing</dt><dd>${esc(last.output.missing.join('; '))}</dd>`;
      if (last.guards.length) html += `<dt>Guards</dt><dd>${esc(last.guards.join(' '))}</dd>`;
    }
    html += `<dt>Still to come</dt><dd>${pending.length ? pending.map((p) => esc(slotLabel(p))).join('<br>') : 'Candidate questions, then close'}</dd></dl>`;
    $('agendaBody').innerHTML = html;
  }

  function slotLabel(slot) {
    const kinds = { warmup: 'Warm-up', background: 'Background walkthrough', claim: 'Resume claim', gap: 'Gap topic', motivation: 'Motivation', concerns: 'Concerns', second_chance: 'Second chance', candidate_questions: 'Candidate questions' };
    return slot.competency_name ? `${kinds[slot.kind]}: ${slot.competency_name}` : kinds[slot.kind];
  }

  // ---------- Review ----------
  async function openReview(sessionId) {
    if (sessionId) state.sessionId = sessionId;
    remember(null);
    state.trace = await api(`/api/sessions/${state.sessionId}/trace`);
    const s = state.trace;
    state.lastInputs = {
      resume_text: s.inputs.resume_text, jd_text: s.inputs.jd_text, target_role: s.inputs.target_role,
      interview_type: s.inputs.interview_type, style: s.inputs.style, length: s.inputs.length,
    };
    $('reviewTitle').textContent = s.status === 'ended' ? 'Interview complete' : 'Interview in progress';
    const who = s.plan.candidate?.name ? `${s.plan.candidate.name}, ` : '';
    $('reviewLede').textContent = `${who}${s.plan.candidate?.current_or_last_role || ''}. ${s.turns.length} answers. Style: ${s.style}${s.surprise ? ' (surprise)' : ''}.`;
    renderReveal(s);
    renderPlanner(s);
    renderTurns(s);
    renderTranscript(s);
    selectTab(s.status === 'ended' ? 'feedback' : 'reveal');
    show('review');
    if (s.status === 'ended') loadFeedback(s); else $('panel-feedback').innerHTML = '<p class="lede">Finish the interview to get your feedback.</p>';
  }

  async function loadFeedback(s) {
    const panel = $('panel-feedback');
    if (s.feedback && s.feedback.version) return renderFeedback(s, s.feedback); // older shapes: the server rewrites them
    panel.innerHTML = '<p class="lede">Writing your feedback…</p>';
    const id = state.sessionId;
    try {
      const fb = await api(`/api/sessions/${id}/feedback`, { method: 'POST' });
      if (id === state.sessionId) renderFeedback(s, fb);
    } catch (err) {
      if (id !== state.sessionId) return;
      panel.innerHTML = `<p class="error">${esc(err.message)}</p><button class="secondary" id="retryFeedback" type="button">Try again</button>`;
      $('retryFeedback').addEventListener('click', () => loadFeedback(s));
    }
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

  const MOMENT_NAME = { warmup: 'Warm-up', background: 'Your background', candidate_questions: 'Your questions at the end' };
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

  function renderFeedback(s, fb) {
    const [goal, ...more] = fb.priorities;
    let html = `<p class="lede">${esc(fb.overall)}</p>`;
    if (goal) {
      html += `<section class="goal"><span>Your goal for the next attempt</span><strong>${esc(goal.title)}</strong><p>${esc(goal.why)}</p><p class="do">${esc(goal.action)}</p></section>`;
    }
    if (more.length) {
      html += `<h2 class="section-title">Also work on</h2><ol class="priorities">${more.map((p) => `<li><strong>${esc(p.title)}</strong><span>${esc(p.why)}</span><em>${esc(p.action)}</em></li>`).join('')}</ol>`;
    }
    html += '<h2 class="section-title">Question by question</h2>';
    for (const t of fb.topics) {
      const verdict = t.too_short ? '<span class="lv lv-none">Not enough to judge</span>' : t.verdict ? `<span class="lv ${LEVEL[t.verdict][1]}">${LEVEL[t.verdict][0]}</span>` : '';
      html += `<article class="topic"><div class="topic-head"><h3>${esc(slotLabel({ kind: t.kind, competency_name: t.topic }))}</h3>${verdict}</div>
        ${t.question ? `<p class="asked"><span>The question</span>${esc(t.question)}</p>` : ''}`;
      if (t.too_short) {
        html += '<p class="a">Your answer here was too short to give feedback on. Use the steps below to prepare this one.</p>';
      } else {
        if (t.went_well) html += `<section class="fb-block well"><h4>What went well</h4>${quoteHtml(t.went_well_quote)}<p>${esc(t.went_well)}</p></section>`;
        if (t.to_fix) html += `<section class="fb-block fix"><h4>What to fix</h4>${quoteHtml(t.to_fix_quote)}<p>${esc(t.to_fix)}</p></section>`;
      }
      html += nextTimeHtml(t);
      const content = (t.ratings || []).filter((r) => r.dimension !== 'followup'); // follow-ups are shown under Conversation
      if (content.length) {
        html += `<details class="checklist"><summary>${esc(RUBRIC_NAME[t.rubric] || 'Checklist')}: what a strong answer covers</summary><div class="ratings">${content.map(ratingRow).join('')}</div></details>`;
      }
      const answers = s.transcript.filter((e) => e.role === 'candidate' && e.slot_id === t.slot_id).map((e) => e.text);
      if (answers.length) html += `<details class="your-answer"><summary>Your answers, with highlights</summary>${answers.map((a) => `<p class="a">${highlight(a, [t.went_well_quote, t.to_fix_quote])}</p>`).join('')}</details>`;
      html += '</article>';
    }
    html += conversationHtml(fb);
    if (fb.jd_coverage && fb.jd_coverage.length) {
      html += `<h2 class="section-title">Job description coverage</h2><ul class="jd-cov">${fb.jd_coverage.map((c) => `<li><span class="chip jd-${c.status}">${esc(JD_STATUS[c.status])}</span> ${esc(c.name)}</li>`).join('')}</ul>`;
    }
    $('panel-feedback').innerHTML = html;
  }

  function selectTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.id !== `panel-${name}`; });
  }

  function qaForSlot(s, slotId) {
    const out = [];
    const t = s.transcript;
    for (let i = 0; i < t.length; i++) {
      if (t[i].role === 'interviewer' && t[i].slot_id === slotId) {
        const a = t[i + 1] && t[i + 1].role === 'candidate' ? t[i + 1].text : '';
        out.push({ q: t[i].text, why: t[i].why, a });
      }
    }
    return out;
  }

  const OUTCOME = {
    sufficient: 'Covered with enough evidence',
    gap_after_budget: 'Some evidence still missing after follow-ups',
    moved_on_without_full_evidence: 'Moved on with some evidence missing',
  };

  function renderReveal(s) {
    const scored = s.slots.filter((x) => !['warmup', 'candidate_questions'].includes(x.kind));
    let html = `<p class="lede">Here's what the interviewer was quietly working through, and why each question was asked. Your personal feedback is in the first tab.</p>`;
    html += `<dl class="kv"><dt>Interviewer style</dt><dd>${esc(cap(s.style))}${s.surprise ? ' (picked at random)' : ''}</dd>
      <dt>Resume read as</dt><dd>${esc(cap(s.plan.candidate.resume_band))} band, ${esc(s.plan.candidate.experience_level)}</dd></dl>`;
    for (const slot of scored) {
      const qas = qaForSlot(s, slot.id);
      const status = slot.status === 'dropped' ? 'Not reached (dropped to finish on time)'
        : slot.status === 'pending' ? 'Not reached'
          : slot.kind === 'background' ? 'Sets context for later questions; not part of the feedback'
            : (OUTCOME[slot.outcome] || (slot.status === 'done' ? 'Covered' : 'In progress'));
      html += `<article class="topic"><h3>${esc(slotLabel(slot))}</h3>
        <div class="meta">${esc(status)}${slot.pivoted_into ? '. Reached through a thread in your earlier answer' : ''}</div>`;
      if (slot.anchor_text) html += `<div class="line">${esc(slot.anchor_text)}</div>`;
      if (slot.summary) html += `<p>${esc(slot.summary)}</p>`;
      for (const qa of qas) {
        html += `<div class="qa"><p class="q">${esc(qa.q)}</p>${qa.why ? `<p class="why">${esc(qa.why)}</p>` : ''}${qa.a ? `<p class="a">${esc(qa.a)}</p>` : ''}</div>`;
      }
      html += '</article>';
    }
    $('panel-reveal').innerHTML = html;
  }

  function renderPlanner(s) {
    const p = s.plan;
    const tr = s.plan_trace || {};
    let html = '<h2 class="section-title">Plan checks</h2><ul class="check-list">';
    for (const c of s.plan_checks) html += `<li class="${c.level}">${c.level === 'ok' ? 'OK' : 'Check'}: ${esc(c.message)}</li>`;
    html += '</ul>';

    html += `<h2 class="section-title">Candidate</h2><dl class="kv">
      <dt>Experience level</dt><dd>${esc(p.candidate.experience_level)}</dd>
      <dt>Current or last role</dt><dd>${esc(p.candidate.current_or_last_role)}</dd>
      <dt>Resume band</dt><dd>${esc(p.candidate.resume_band)}: ${esc(p.candidate.band_reason)}</dd>
      <dt>Mismatch</dt><dd>${p.mismatch.is_mismatch ? esc(p.mismatch.note) : 'None'}</dd>
      <dt>Planner notes</dt><dd>${esc(p.plan_notes)}</dd>
      <dt>Model</dt><dd>${esc(tr.model)}${tr.reasoning_effort ? ` (${esc(tr.reasoning_effort)})` : ''}, ${tr.latency_ms ? `${(tr.latency_ms / 1000).toFixed(1)} s` : ''}${tr.usage ? `, ${tr.usage.prompt_tokens} in / ${tr.usage.completion_tokens} out tokens` : ''}</dd>
    </dl>`;

    if (p.jd.present) {
      html += `<h2 class="section-title">Job description</h2><dl class="kv">
        <dt>Role</dt><dd>${esc(p.jd.role_title || '')}${p.jd.company ? ` at ${esc(p.jd.company)}` : ''}${p.jd.seniority ? ` (${esc(p.jd.seniority)})` : ''}</dd>
        <dt>Must-haves</dt><dd>${p.jd.must_haves.map((m) => `${esc(m.requirement)} <span class="chip">${esc(m.competency)}</span>`).join('<br>') || 'None'}</dd>
        <dt>Nice-to-haves</dt><dd>${p.jd.nice_to_haves.map((m) => `${esc(m.requirement)} <span class="chip">${esc(m.competency)}</span>`).join('<br>') || 'None'}</dd>
        <dt>Stated values</dt><dd>${esc(p.jd.stated_values.join(', ') || 'None')}</dd></dl>`;
    }

    html += '<h2 class="section-title">Topic plan</h2><div class="table-wrap"><table><thead><tr><th>Topic</th><th>Opening question</th><th>What a complete answer needs</th><th>Planned follow-ups</th><th>Priority, budget, status</th></tr></thead><tbody>';
    for (const slot of s.slots.filter((x) => x.kind !== 'candidate_questions')) {
      html += `<tr><td><strong>${esc(slotLabel(slot))}</strong>${slot.technical_focus ? ' <span class="chip">technical depth</span>' : ''}${slot.anchor_text ? `<br><span class="chip">${esc(slot.anchor_claim_id)}</span> ${esc(slot.anchor_text)}` : ''}</td>
        <td>${esc(slot.core_question || '(written live)')}</td><td>${esc(slot.intent_private)}</td>
        <td>${slot.likely_probes.length ? `<ul>${slot.likely_probes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</td>
        <td>${slot.priority || '-'}, ${slot.budget}, ${esc(slot.status)}${slot.outcome ? `<br>${esc(slot.outcome.replace(/_/g, ' '))}` : ''}</td></tr>`;
    }
    html += '</tbody></table></div>';

    html += '<h2 class="section-title">Claim inventory</h2><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Claim</th><th>From</th><th>Strength</th><th>Flags</th><th>Relevance</th><th>Angle</th></tr></thead><tbody>';
    for (const c of [...p.claims].sort((a, b) => a.rank - b.rank)) {
      html += `<tr><td>${c.rank}</td><td>${esc(c.text)}${c.grounded === false ? ' <span class="chip bad">not an exact quote</span>' : ''}${c.distinctive ? ' <span class="chip on">distinctive</span>' : ''}</td><td>${esc(c.parent)}</td>
        <td>${esc(c.strength)}<br>${c.strength_signals.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</td>
        <td>${c.weak_flags.map((x) => `<span class="chip warn">${esc(x.replace(/_/g, ' '))}</span>`).join('')}</td>
        <td>${esc(c.relevance)}</td><td>${esc(c.probe_angle.replace('_', ' '))}</td></tr>`;
    }
    html += '</tbody></table></div>';

    html += '<h2 class="section-title">Competencies</h2><div class="table-wrap"><table><thead><tr><th>Competency</th><th>Source</th><th>Must-have</th><th>Evidence on resume</th></tr></thead><tbody>';
    for (const k of p.competencies) {
      html += `<tr><td>${esc(k.name)}</td><td>${esc(k.source.replace(/_/g, ' '))}</td><td>${k.must_have ? 'Yes' : 'No'}</td><td>${k.is_gap ? '<span class="chip warn">gap</span>' : k.evidence_claim_ids.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</td></tr>`;
    }
    html += '</tbody></table></div>';

    html += `<h2 class="section-title">Concerns</h2>${p.concerns.length ? `<ul>${p.concerns.map((c) => `<li><strong>${esc(c.type.replace('_', ' '))}</strong>: ${esc(c.detail)}</li>`).join('')}</ul>` : '<p class="empty">None found.</p>'}`;
    html += `<details><summary>Raw planner input and output</summary><pre>${esc(tr.request_user_message || '')}</pre><pre>${esc(JSON.stringify(p, null, 2))}</pre></details>`;
    $('panel-planner').innerHTML = html;
  }

  function renderTurns(s) {
    if (!s.turns.length) { $('panel-turns').innerHTML = '<p class="empty">No answers yet.</p>'; return; }
    let html = '';
    for (const t of s.turns) {
      const o = t.output;
      const e = o.evidence;
      const lastCall = t.calls[t.calls.length - 1];
      const tr = lastCall?.trace || {};
      const star = ['situation', 'task', 'action', 'result'].map((k) => `<span class="chip ${e[k] ? 'on' : ''}">${k}${e[k] ? '' : ' missing'}</span>`).join('');
      const tags = [
        `ownership: ${e.ownership.replace(/_/g, ' ')}`, `specificity: ${e.specificity.replace(/_/g, ' ')}`,
        `resume line: ${e.anchor_fit.replace(/_/g, ' ')}`, `on topic: ${e.on_topic}`, `answer: ${e.answer_type.replace(/_/g, ' ')}`,
      ].map((x) => `<span class="chip">${esc(x)}</span>`).join('');
      const allowed = t.allowed_decisions.map((d) => `<span class="chip ${d === t.decision ? 'chosen' : ''}">${esc(d.replace(/_/g, ' '))}</span>`).join('');
      html += `<article class="turn">
        <div class="turn-head"><strong>Answer ${t.n}: ${esc(t.slot_id)} (${esc(t.slot_kind.replace(/_/g, ' '))})</strong>
          <span>${esc(tr.model || '')}${tr.reasoning_effort ? ` (${esc(tr.reasoning_effort)})` : ''}, ${tr.latency_ms ? `${(tr.latency_ms / 1000).toFixed(1)} s` : ''}${tr.usage ? `, ${tr.usage.prompt_tokens} in / ${tr.usage.completion_tokens} out` : ''}${t.calls.length > 1 ? `, ${t.calls.length} calls` : ''}</span></div>
        <p class="answer">${esc(t.answer)}</p>
        <div class="row"><b>Evidence</b>${star} ${tags}</div>
        <div class="row"><b>Enough to judge</b>${o.evidence_sufficient ? 'Yes' : 'No'}${o.missing.length ? `. Missing: ${esc(o.missing.join('; '))}` : ''}</div>
        ${e.new_hook.present ? `<div class="row"><b>Thread noticed</b>${esc(e.new_hook.description)}</div>` : ''}
        <div class="row"><b>Allowed</b>${allowed}</div>
        ${o.probe_rung !== 'none' ? `<div class="row"><b>Follow-up rung</b>${esc(o.probe_rung)}</div>` : ''}
        ${o.pivot_target_slot_id ? `<div class="row"><b>Pivot to</b>${esc(o.pivot_target_slot_id)}</div>` : ''}
        <div class="row"><b>Reasoning</b>${esc(o.internal_rationale)}</div>
        <p class="utter">${esc(o.utterance)}</p>
        <div class="row"><b>Shown to the student later</b>${esc(o.why_asked_for_student || '')}</div>
        ${o.slot_summary ? `<div class="row"><b>Topic summary</b>${esc(o.slot_summary)}</div>` : ''}
        ${t.guards.length ? `<div class="row"><b>Guards</b>${t.guards.map((g) => `<span class="chip warn">${esc(g)}</span>`).join('')}</div>` : ''}
        ${t.leak_flags.length ? `<div class="row"><b>Wording flags</b>${t.leak_flags.map((g) => `<span class="chip bad">${esc(g)}</span>`).join('')}</div>` : ''}
        <details><summary>Raw turn input and output</summary>${t.calls.map((c, i) => `<p>Call ${i + 1}</p><pre>${esc(JSON.stringify(c.payload, null, 2))}</pre><pre>${esc(JSON.stringify(c.output, null, 2))}</pre>`).join('')}</details>
      </article>`;
    }
    $('panel-turns').innerHTML = html;
  }

  function renderTranscript(s) {
    $('panel-transcript').innerHTML = s.transcript.map((e) => `<div class="transcript-line ${e.role}"><div class="who">${e.role === 'interviewer' ? 'Interviewer' : 'Candidate'}</div><p>${esc(e.text)}</p></div>`).join('');
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state.trace, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `interview-${state.trace.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function openPast() {
    const list = await api('/api/sessions');
    $('pastList').innerHTML = list.length ? list.map((x) => `<div class="past-row"><div><strong>${esc(x.candidate || 'Candidate')}: ${esc(x.interview_type || '')}${x.role ? `, ${esc(x.role)}` : ''}</strong><br><span>${esc(new Date(x.created_at).toLocaleString())}, ${x.turns} answers, ${esc(x.status)}</span></div><button class="secondary" data-open="${esc(x.id)}" type="button">Open review</button></div>`).join('')
      : '<p class="empty">No sessions yet. Finished and in-progress interviews appear here.</p>';
    show('past');
  }

  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

  // ---------- Wire up ----------
  async function init() {
    state.config = await api('/api/config');
    loadSettings();
    updateKeyHint();
    await loadSamples();

    $('settingsBtn').addEventListener('click', openSettings);
    $('settings').addEventListener('close', () => { if ($('settings').returnValue === 'save') saveSettings().catch((e) => alert(e.message)); });
    $('resumeSample').addEventListener('change', (e) => { const s = state.samples.find((x) => x.id === e.target.value); if (s) $('resume').value = s.text; e.target.value = ''; });
    $('jdSample').addEventListener('change', (e) => { const s = state.samples.find((x) => x.id === e.target.value); if (s) $('jd').value = s.text; e.target.value = ''; });
    $('resumePdf').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setupError('');
      try { $('resume').value = await readPdf(file); } catch (err) { setupError(err.message); }
      e.target.value = '';
    });
    $('prepareBtn').addEventListener('click', () => prepare(readSetup()));
    $('startBtn').addEventListener('click', startInterview);
    $('sendBtn').addEventListener('click', sendAnswer);
    $('answer').addEventListener('input', () => { $('wordCount').textContent = `${words($('answer').value)} words`; });
    $('answer').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendAnswer(); } });
    $('endBtn').addEventListener('click', () => endInterview().catch((e) => alert(e.message)));
    $('agendaToggle').addEventListener('click', () => setAgenda(!state.agendaOpen).catch((e) => alert(e.message)));
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));
    $('downloadBtn').addEventListener('click', downloadJson);
    $('newBtn').addEventListener('click', () => show('setup'));
    $('rerunBtn').addEventListener('click', () => prepare(state.lastInputs));
    $('pastBtn').addEventListener('click', () => openPast().catch((e) => alert(e.message)));
    $('pastBackBtn').addEventListener('click', () => show('setup'));
    $('pastList').addEventListener('click', (e) => { const id = e.target.dataset.open; if (id) openReview(id).catch((err) => alert(err.message)); });

    show('setup');
    const saved = remembered();
    if (saved) {
      try {
        const view = await api(`/api/sessions/${encodeURIComponent(saved)}`);
        if (view.status === 'active') { state.sessionId = view.id; state.view = view; startInterview(); return; }
      } catch (_) { /* session gone: fall through to setup */ }
      remember(null);
    }
    if (!state.config.has_key) openSettings();
  }

  init().catch((err) => { document.body.innerHTML = `<p style="padding:24px">Couldn't start the prototype: ${esc(err.message)}. Is the server running?</p>`; });
})();

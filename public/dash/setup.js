// Dashboard replica: the setup sheet (copy of the dashboard's SMART Interview sheet). Same handoff as the /vmock wizard
// (vmock/setup.js): the inputs go to sessionStorage and the room takes them; "entry" says which product it came from.
//   entry=mock (Mock Interview, Resume + JD): Job description (required) -> Select CV -> Interview details.
//   entry=cv (CV Deep Dive): Select CV -> Interview details; resume only, type fixed to the resume deep dive.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = VM.esc;
  const HANDOFF_KEY = 'vmock_adaptive_setup';
  const entry = new URLSearchParams(location.search).get('entry') === 'cv' ? 'cv' : 'mock';
  const STEPS = entry === 'cv' ? ['resume', 'details'] : ['jd', 'resume', 'details'];
  const LABELS = { jd: 'Upload Job Description', resume: 'Select CV', details: 'Interview Details' };
  const ENTRY_URL = entry === 'cv' ? '/dashboard/smart-interviews/practice/cv-deep-dive' : '/dashboard/smart-interviews/practice/career-interviews?tab=adaptive';
  const STYLE_HINT = {
    supportive: 'Warm, one follow-up per topic. Good for a first try.',
    balanced: 'Neutral and to the point, like most real interviews.',
    probing: 'More follow-ups; asks for numbers and your exact part.',
    surprise: 'You find out as you go.',
  };
  const state = { step: STEPS[0], resumes: [], resumeId: null, query: '', hasKey: true };

  const words = (t) => (String(t || '').trim() ? String(t).trim().split(/\s+/).length : 0);
  const selectedResume = () => state.resumes.find((r) => r.id === state.resumeId);
  const showError = (msg) => { $('dsError').textContent = msg || ''; $('dsError').hidden = !msg; };
  const firstLine = (t) => String(t || '').split('\n').map((x) => x.trim()).find(Boolean) || '';

  function canGoOn() {
    if (state.step === 'jd') return Boolean($('jd').value.trim());
    if (state.step === 'resume') return Boolean(selectedResume());
    if (state.step === 'details') return Boolean($('domain').value);
    return true;
  }

  function go(step) {
    state.step = step;
    showError('');
    document.querySelectorAll('.ds-step').forEach((s) => { s.hidden = s.dataset.step !== step; });
    if (step === 'details') renderSummary();
    render();
    document.querySelector('.ds-body').scrollTop = 0;
    const focusEl = step === 'jd' ? $('jd') : step === 'details' ? $('domain') : null;
    if (focusEl) focusEl.focus();
  }
  function next() {
    if (!canGoOn()) return;
    const i = STEPS.indexOf(state.step);
    if (i < STEPS.length - 1) return go(STEPS[i + 1]);
    prepare();
  }
  function back() {
    const i = STEPS.indexOf(state.step);
    if (i > 0) go(STEPS[i - 1]);
  }

  // Stepper as on the dashboard: numbered circles joined by dashes, the current one labelled, done ones ticked.
  function renderStepper() {
    const cur = STEPS.indexOf(state.step);
    $('stepper').innerHTML = STEPS.map((s, i) => {
      const kind = i < cur ? 'done' : i === cur ? 'now' : 'todo';
      const dot = kind === 'done' ? '<svg class="ic"><use href="#i-check"/></svg>' : i + 1;
      return `${i ? '<li class="ds-dash" aria-hidden="true"></li>' : ''}<li class="ds-dot ${kind}"${kind === 'now' ? ' aria-current="step"' : ''}><span>${dot}</span>${kind === 'now' ? `<b>${LABELS[s]}</b>` : `<span class="sr">${LABELS[s]}</span>`}</li>`;
    }).join('');
  }

  function renderResumes() {
    const q = state.query.trim().toLowerCase();
    const shown = state.resumes.filter((r) => !q || r.name.toLowerCase().includes(q));
    $('resumeRows').innerHTML = shown.map((r) => {
      const on = r.id === state.resumeId;
      return `<button class="ds-row${on ? ' on' : ''}" type="button" role="radio" aria-checked="${on}" data-id="${esc(r.id)}">
        <span class="ds-radio"><svg class="ic"><use href="#i-check"/></svg></span>
        <span class="ds-name"><strong>${esc(r.name)}</strong><span class="ds-tag">${words(r.text)} words</span></span>
        <span class="ds-cell">${esc(r.meta)}</span>
        <span class="ds-cell"><span class="ds-tag blue">${esc(r.source)}</span></span>
      </button>`;
    }).join('');
    $('cvNone').hidden = Boolean(shown.length) || !state.resumes.length;
    const r = selectedResume();
    $('cvPreview').textContent = r ? r.text : 'Select a CV to see it here.';
    $('cvPreview').classList.toggle('empty', !r);
  }

  function renderSummary() {
    const r = selectedResume();
    $('sumCv').textContent = r ? r.name : '';
    $('sumCvMeta').textContent = r ? `${r.meta} · ${words(r.text)} words` : '';
    $('sumJdWrap').hidden = entry === 'cv';
    $('sumTypeWrap').hidden = entry !== 'cv';
    if (entry !== 'cv') {
      const jd = $('jd').value.trim();
      $('sumJd').textContent = firstLine(jd).slice(0, 80);
      $('sumJdMeta').textContent = `${words(jd)} words`;
    }
  }

  function render() {
    const last = state.step === STEPS[STEPS.length - 1];
    $('backBtn').hidden = state.step === STEPS[0];
    $('nextBtn').disabled = !canGoOn();
    $('nextBtn').textContent = last ? 'Start Practicing' : 'Next';
    $('jdCount').textContent = `${$('jd').value.length} / 30000`;
    const style = (document.querySelector('input[name="style"]:checked') || {}).value;
    $('styleHint').textContent = STYLE_HINT[style] || '';
    renderStepper();
  }

  function addResume(r) {
    state.resumes = [r, ...state.resumes.filter((x) => x.id !== r.id)];
    state.resumeId = r.id;
    state.query = '';
    $('cvSearch').value = '';
    renderResumes();
    render();
  }

  async function readPdfInto(file, onText) {
    if (!file) return;
    showError('');
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return showError('That file isn\'t a PDF. Choose a PDF, or paste the text.');
    try { onText(await VM.readPdf(file), file.name); } catch (err) { showError(err.message); }
  }

  function prepare() {
    const resume = selectedResume();
    const inputs = {
      entry,
      resume_text: resume ? resume.text : '',
      resume_name: resume ? resume.name : '',
      jd_text: entry === 'mock' ? $('jd').value.trim() : '',
      target_role: $('role').value.trim(),
      domain: $('domain').value,
      stage: (document.querySelector('input[name="stage"]:checked') || {}).value || '',
      interview_type: entry === 'cv' ? 'back_your_resume' : document.querySelector('input[name="type"]:checked').value,
      style: document.querySelector('input[name="style"]:checked').value,
      length: document.querySelector('input[name="length"]:checked').value,
    };
    if (!state.hasKey) return showError('No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
    if (entry === 'mock' && !inputs.jd_text) return showError('Add the job description first.');
    if (inputs.resume_text.trim().length < 200) return showError('That CV is very short. Add a CV of at least a few lines.');
    if (!inputs.domain) return showError('Choose a domain for your interview.');
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(inputs)); } catch (_) {
      return showError('Your browser blocked session storage, so the setup can\'t be passed on.');
    }
    location.href = `/interviews/adaptive/room?entry=${entry}`;
  }

  // Back from the room ("Change setup", "New interview", or a failed preparation): reopen on the last step with the
  // inputs the student already gave, if they were for this entry.
  function restoreLast() {
    if (!new URLSearchParams(location.search).has('back')) return;
    history.replaceState(null, '', `${location.pathname}?entry=${entry}`); // a reload starts fresh
    let last = null;
    try { last = JSON.parse(sessionStorage.getItem('vmock_adaptive_last') || 'null'); } catch (_) { return; }
    if (!last || typeof last !== 'object' || !last.resume_text || (last.entry || 'mock') !== entry) return;
    if (entry === 'mock') $('jd').value = String(last.jd_text || '');
    $('role').value = String(last.target_role || '');
    $('domain').value = String(last.domain || '');
    for (const [name, key] of [['stage', 'stage'], ['type', 'interview_type'], ['style', 'style'], ['length', 'length']]) {
      const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(String(last[key] || ''))}"]`);
      if (radio) radio.checked = true;
    }
    const sample = state.resumes.find((r) => r.text === last.resume_text);
    if (sample) state.resumeId = sample.id;
    else addResume({ id: 'last', name: String(last.resume_name || 'Your CV'), meta: 'From your last setup', source: 'Last used', text: String(last.resume_text) });
    renderResumes();
    go('details');
    let err = '';
    try { err = sessionStorage.getItem('vmock_adaptive_error') || ''; sessionStorage.removeItem('vmock_adaptive_error'); } catch (_) { /* no message */ }
    if (err) showError(err);
  }

  async function init() {
    $('closeBtn').href = ENTRY_URL;
    $('typeField').hidden = entry === 'cv';
    $('cvSub').textContent = entry === 'cv' ? 'Pick the CV to be interviewed on, line by line' : 'Pick a CV to build your interview from, with the job description';
    document.title = `${entry === 'cv' ? 'CV Deep Dive' : 'Mock Interview'} setup | VMock Dashboard`;
    $('nextBtn').addEventListener('click', next);
    $('backBtn').addEventListener('click', back);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') location.href = ENTRY_URL; });

    $('jd').addEventListener('input', render);
    $('jdPdf').addEventListener('change', (e) => { readPdfInto(e.target.files[0], (text) => { $('jd').value = text.slice(0, 30000); render(); }); e.target.value = ''; });
    $('jdSamples').addEventListener('click', (e) => {
      const b = e.target.closest('[data-jd]');
      if (!b) return;
      $('jd').value = b.dataset.text;
      document.querySelectorAll('[data-jd]').forEach((x) => x.classList.toggle('on', x === b));
      render();
    });

    $('resumePdf').addEventListener('change', (e) => {
      readPdfInto(e.target.files[0], (text, name) => addResume({ id: `pdf:${name}`, name: name.replace(/\.pdf$/i, ''), meta: 'Uploaded just now', source: 'PDF Upload', text }));
      e.target.value = '';
    });
    $('pasteBtn').addEventListener('click', () => { $('pasteBox').hidden = false; $('pasteText').focus(); });
    $('pasteCancel').addEventListener('click', () => { $('pasteBox').hidden = true; });
    $('pasteSave').addEventListener('click', () => {
      const text = $('pasteText').value.trim();
      if (!text) return $('pasteText').focus();
      addResume({ id: 'pasted', name: 'Pasted CV', meta: 'Pasted just now', source: 'Pasted', text });
      $('pasteBox').hidden = true;
    });
    $('cvSearch').addEventListener('input', (e) => { state.query = e.target.value; renderResumes(); });
    $('resumeRows').addEventListener('click', (e) => {
      const row = e.target.closest('.ds-row');
      if (!row) return;
      state.resumeId = row.dataset.id;
      renderResumes();
      render();
    });
    $('domain').addEventListener('change', render);
    document.querySelectorAll('input[name="style"]').forEach((r) => r.addEventListener('change', render));
    $('role').addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); });

    go(STEPS[0]);
    try {
      const [config, samples] = await Promise.all([fetch('/api/config').then((r) => r.json()), fetch('/api/samples').then((r) => r.json())]);
      state.hasKey = Boolean(config.has_key);
      const nice = (id) => id.replace(/^(resume|jd)-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      $('jdSamples').innerHTML = samples.filter((x) => x.kind === 'jd').map((s) => `<button class="ds-jd-item" type="button" role="listitem" data-jd="${esc(s.id)}" data-text="${esc(s.text)}">
          <span class="ds-file-icon jd"><svg class="ic"><use href="#i-brief"/></svg></span><span><strong>${esc(firstLine(s.text).slice(0, 60) || nice(s.id))}</strong><span>${esc(nice(s.id))}</span></span></button>`).join('');
      state.resumes = samples.filter((x) => x.kind === 'resume').map((s) => ({ id: s.id, name: nice(s.id), meta: 'Sample CV', source: 'Sample', text: s.text }));
      renderResumes();
      render();
    } catch (err) {
      showError(`Couldn't load the samples (${err.message}). You can still upload or paste a CV.`);
    }
    restoreLast();
    if (!state.hasKey && !$('dsError').textContent) showError('No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
  }

  init();
})();

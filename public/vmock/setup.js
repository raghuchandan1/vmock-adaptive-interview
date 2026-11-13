// Adaptive Interview setup, in the shape of VMock's Generate Interview wizard.
// Steps: Get Started -> Job description (JD path only) -> Resume -> Interview details.
// "Prepare Interview" hands the inputs to /student in sessionStorage; the student page then opens its lobby.
(() => {
  const $ = (id) => document.getElementById(id);
  const HANDOFF_KEY = 'vmock_adaptive_setup';
  const LABELS = { start: 'Get Started', jd: 'Job description', resume: 'Resume', details: 'Interview details' };
  const state = {
    path: null,          // 'both' | 'resume'
    step: 'start',
    resumes: [],         // { id, name, text, source }
    resumeId: null,
    hasKey: true,
  };

  const steps = () => (state.path === 'resume' ? ['start', 'resume', 'details'] : ['start', 'jd', 'resume', 'details']);
  const words = (t) => (String(t || '').trim() ? String(t).trim().split(/\s+/).length : 0);
  const selectedResume = () => state.resumes.find((r) => r.id === state.resumeId);
  const showError = (msg) => { $('wzError').textContent = msg || ''; $('wzError').hidden = !msg; };

  function canGoOn() {
    if (state.step === 'start') return Boolean(state.path);
    if (state.step === 'jd') return Boolean($('jd').value.trim());
    if (state.step === 'resume') return Boolean(selectedResume());
    if (state.step === 'details') return Boolean($('domain').value); // the domain is required
    return true;
  }

  function go(step) {
    state.step = step;
    showError('');
    document.querySelectorAll('.wz-step').forEach((s) => { s.hidden = s.dataset.step !== step; });
    render();
    window.scrollTo({ top: 0 });
    const focusEl = step === 'jd' ? $('jd') : step === 'details' ? $('role') : null;
    if (focusEl) focusEl.focus();
  }

  function next() {
    if (!canGoOn()) return;
    const list = steps();
    const i = list.indexOf(state.step);
    if (i < list.length - 1) return go(list[i + 1]);
    prepare();
  }

  function back() {
    const list = steps();
    const i = list.indexOf(state.step);
    if (i > 0) go(list[i - 1]);
  }

  // Stepper as on VMock: the first and last step always show, the current one shows its label,
  // steps in between collapse into "…".
  function renderStepper() {
    const list = state.path ? steps() : ['start', 'jd', 'resume', 'details'];
    const cur = list.indexOf(state.step);
    const shown = [...new Set([0, cur, list.length - 1])].sort((a, b) => a - b);
    const html = [];
    shown.forEach((i, k) => {
      if (k > 0) html.push(i - shown[k - 1] > 1 ? '<li class="wz-gap" aria-hidden="true"><svg class="ic"><use href="#i-dots"/></svg></li>' : `<li class="wz-line${shown[k - 1] < cur ? ' done' : ''}" aria-hidden="true"></li>`);
      const kind = i < cur ? 'done' : i === cur ? 'now' : 'todo';
      const dot = kind === 'done' ? '<svg class="ic"><use href="#i-check"/></svg>' : i + 1;
      html.push(`<li class="wz-dot-item ${kind}"${kind === 'now' ? ' aria-current="step"' : ''}><span class="wz-dot">${dot}</span>${kind === 'now' ? `<span class="wz-dot-label">${LABELS[list[i]]}</span>` : `<span class="sr">${i + 1} - ${LABELS[list[i]]}</span>`}</li>`);
    });
    $('stepper').innerHTML = html.join('');
    $('progress').style.width = `${((cur + 1) / list.length) * 100}%`;
  }

  function renderResumes() {
    $('resumeRows').innerHTML = state.resumes.map((r) => {
      const on = r.id === state.resumeId;
      return `<button class="wz-trow${on ? ' on' : ''}" type="button" role="radio" aria-checked="${on}" data-id="${VM.esc(r.id)}">
        <span class="wz-radio"><svg class="ic"><use href="#i-check"/></svg></span>
        <span class="wz-tname"><span>${VM.esc(r.name)}</span><small>${VM.esc(r.meta)}</small></span>
        <span class="wz-tcell"><span class="wz-chip strong">${words(r.text)}</span></span>
        <span class="wz-tcell"><span class="wz-chip">${VM.esc(r.source)}</span></span>
      </button>`;
    }).join('');
  }

  function render() {
    document.querySelectorAll('.wz-choice').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.path === state.path)));
    const last = state.step === 'details';
    $('backBtn').hidden = state.step === 'start';
    $('nextBtn').disabled = !canGoOn();
    $('nextBtn').firstChild.textContent = last ? 'Prepare Interview' : 'Next';
    const jdLen = $('jd').value.length;
    $('jdCount').textContent = `${jdLen} / 30000`;
    $('jdClear').hidden = !jdLen;
    renderStepper();
  }

  function addResume(r) {
    state.resumes = [r, ...state.resumes.filter((x) => x.id !== r.id)];
    state.resumeId = r.id;
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
      resume_text: resume ? resume.text : '',
      resume_name: resume ? resume.name : '',
      jd_text: state.path === 'both' ? $('jd').value.trim() : '',
      target_role: $('role').value.trim(),
      domain: $('domain').value,
      stage: (document.querySelector('input[name="stage"]:checked') || {}).value || '',
      interview_type: document.querySelector('input[name="type"]:checked').value,
      style: document.querySelector('input[name="style"]:checked').value,
      length: document.querySelector('input[name="length"]:checked').value,
    };
    if (!state.hasKey) return showError('No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
    if (inputs.resume_text.trim().length < 200) return showError('That resume is very short. Add a resume of at least a few lines.');
    if (!inputs.domain) return showError('Choose a domain for your interview.');
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(inputs)); } catch (_) {
      return showError('Your browser blocked session storage, so the setup can\'t be passed on. Use the student page directly.');
    }
    location.href = '/vmock/adaptive-interview/room';
  }

  // The 30-minute round is not offered for a recruiter screen (the server refuses it too).
  function syncLength() {
    const full = document.querySelector('input[name="length"][value="full"]');
    if (!full) return;
    const screen = document.querySelector('input[name="type"]:checked')?.value === 'recruiter_screen';
    full.closest('label').style.display = screen ? 'none' : '';
    if (screen && full.checked) document.querySelector('input[name="length"][value="standard"]').checked = true;
  }
  document.addEventListener('change', (e) => { if (e.target.name === 'type') syncLength(); });

  // Back from the room ("Change setup", "New interview", or a failed preparation): reopen on the last step with the
  // inputs the student already gave.
  function restoreLast() {
    if (!new URLSearchParams(location.search).has('back')) return;
    history.replaceState(null, '', location.pathname); // a reload starts fresh
    let last = null;
    try { last = JSON.parse(sessionStorage.getItem('vmock_adaptive_last') || 'null'); } catch (_) { return; }
    if (!last || typeof last !== 'object' || !last.resume_text) return;
    state.path = last.jd_text ? 'both' : 'resume';
    $('jd').value = String(last.jd_text || '');
    $('role').value = String(last.target_role || '');
    $('domain').value = String(last.domain || '');
    for (const [name, key] of [['stage', 'stage'], ['type', 'interview_type'], ['style', 'style'], ['length', 'length']]) {
      const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(String(last[key] || ''))}"]`);
      if (radio) radio.checked = true;
    }
    syncLength();
    const sample = state.resumes.find((r) => r.text === last.resume_text);
    if (sample) state.resumeId = sample.id;
    else addResume({ id: 'last', name: String(last.resume_name || 'Your resume'), meta: 'From your last setup', source: 'Last used', text: String(last.resume_text) });
    renderResumes();
    go('details');
    // The room sends back why it couldn't start (e.g. the server rejected the inputs).
    let err = '';
    try { err = sessionStorage.getItem('vmock_adaptive_error') || ''; sessionStorage.removeItem('vmock_adaptive_error'); } catch (_) { /* no message */ }
    if (err) { showError(err); $('wzError').scrollIntoView({ block: 'center' }); } // it sits below the long Details form
  }

  async function init() {
    document.querySelectorAll('.wz-choice').forEach((c) => c.addEventListener('click', () => {
      state.path = c.dataset.path;
      next(); // as on VMock, picking a card moves on
    }));
    $('nextBtn').addEventListener('click', next);
    $('backBtn').addEventListener('click', back);

    $('jd').addEventListener('input', render);
    $('jdClear').addEventListener('click', () => { $('jd').value = ''; render(); $('jd').focus(); });
    $('jdPdf').addEventListener('change', (e) => { readPdfInto(e.target.files[0], (text) => { $('jd').value = text.slice(0, 30000); render(); }); e.target.value = ''; });

    $('resumePdf').addEventListener('change', (e) => {
      readPdfInto(e.target.files[0], (text, name) => addResume({ id: `pdf:${name}`, name: name.replace(/\.pdf$/i, ''), meta: 'Uploaded just now', source: 'Uploaded', text }));
      e.target.value = '';
    });
    $('pasteBtn').addEventListener('click', () => { $('pasteBox').hidden = false; $('pasteText').focus(); });
    $('pasteCancel').addEventListener('click', () => { $('pasteBox').hidden = true; });
    $('pasteSave').addEventListener('click', () => {
      const text = $('pasteText').value.trim();
      if (!text) return $('pasteText').focus();
      addResume({ id: 'pasted', name: 'Pasted resume', meta: 'Pasted just now', source: 'Pasted', text });
      $('pasteBox').hidden = true;
    });
    $('resumeRows').addEventListener('click', (e) => {
      const row = e.target.closest('.wz-trow');
      if (!row) return;
      state.resumeId = row.dataset.id;
      renderResumes();
      render();
    });
    $('role').addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); });
    $('domain').addEventListener('change', render);

    render();
    try {
      const [config, samples] = await Promise.all([fetch('/api/config').then((r) => r.json()), fetch('/api/samples').then((r) => r.json())]);
      state.hasKey = Boolean(config.has_key);
      const nice = (id) => id.replace(/^(resume|jd)-/, '').replace(/-/g, ' ');
      for (const s of samples.filter((x) => x.kind === 'jd')) {
        $('jdSample').add(new Option(nice(s.id), s.id));
      }
      $('jdSample').addEventListener('change', (e) => {
        const s = samples.find((x) => x.id === e.target.value);
        if (s) { $('jd').value = s.text; render(); }
        e.target.value = '';
      });
      state.resumes = samples.filter((x) => x.kind === 'resume').map((s) => ({ id: s.id, name: nice(s.id), meta: 'Sample resume', source: 'Sample', text: s.text }));
      renderResumes();
      render();
    } catch (err) {
      showError(`Couldn't load the sample resumes (${err.message}). You can still upload or paste one.`);
    }
    restoreLast();
    // Same as the student page: say up front when the server has no key, not only on Prepare.
    if (!state.hasKey && !$('wzError').textContent) showError('No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
  }

  init();
})();

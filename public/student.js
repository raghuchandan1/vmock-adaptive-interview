/* VMock adaptive interview: student page with voice. The interviewer speaks (server text-to-speech), the student
   answers out loud, and the answer is sent after a pause (silence.js) and transcribed on the server. */
(() => {
  const $ = (id) => document.getElementById(id);
  const { esc } = VM;
  const { createSilenceDetector, isFillerTranscript } = Silence;
  const TICK_MS = 50;

  const state = {
    config: null, samples: [], sessionId: null, view: null, minutes: 15,
    stream: null, micOk: false, camOk: false, audioCtx: null, analyser: null, buf: null,
    mode: 'voice', phase: 'idle', recorder: null, chunks: [], loop: null, timer: null, startedAt: 0,
    previewLoop: null, endArmed: null, busy: false,
  };
  const audio = $('voice');

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

  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    document.body.classList.toggle('live', name === 'live');
    window.scrollTo({ top: 0 });
  }
  const showError = (id, msg) => { $(id).textContent = msg || ''; $(id).hidden = !msg; };

  // ---------- Setup ----------
  function readSetup() {
    const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
    return { resume_text: $('resume').value, jd_text: $('jd').value, target_role: $('role').value, interview_type: val('type'), style: val('style'), length: val('length') };
  }

  async function prepare() {
    const inputs = readSetup();
    showError('setupError', '');
    if (!state.config.has_key) return showError('setupError', 'No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
    if (inputs.resume_text.trim().length < 200) return showError('setupError', 'Add a resume of at least a few lines.');
    if (!inputs.target_role.trim() && !inputs.jd_text.trim()) return showError('setupError', 'Add a target role or a job description.');
    if (state.busy) return;
    state.busy = true;
    $('briefBody').hidden = true;
    $('startBtn').disabled = true;
    showError('briefError', '');
    show('brief');
    setupDevices(); // runs while the planner thinks
    const steps = [...$('prepSteps').children];
    steps.forEach((li) => { li.className = ''; });
    let step = 0;
    const advance = () => { if (step < steps.length - 1) { if (step) steps[step - 1].className = 'done'; steps[step].className = 'now'; step += 1; } };
    advance();
    const stepTimer = setInterval(() => { if (step < steps.length - 1) advance(); }, 6000);
    try {
      state.view = await api('/api/sessions', { method: 'POST', body: inputs });
      state.sessionId = state.view.id;
      steps.forEach((li) => { li.className = 'done'; });
      renderBrief(state.view.pre_brief);
      $('briefBody').hidden = false;
      $('startBtn').disabled = false;
    } catch (err) {
      showError('briefError', `We couldn't prepare the interview. (${err.message})`);
      steps.forEach((li) => { li.className = ''; });
      setTimeout(() => { stopDevices(); show('setup'); showError('setupError', `We couldn't prepare the interview. Your resume is still here, so you can try again. (${err.message})`); }, 2500);
    } finally {
      clearInterval(stepTimer);
      state.busy = false;
    }
  }

  function renderBrief(b) {
    state.minutes = b.minutes;
    $('briefTitle').textContent = `Your ${b.interview_type} interview${b.role ? `: ${b.role}${b.company ? ` at ${b.company}` : ''}` : ''}`;
    const rows = [
      ['Interviewer', b.surprise ? 'You\'ll find out as you go' : `${b.style} style`],
      ['Length', `About ${b.minutes} minutes, ${b.topics} topics`],
    ];
    if (b.jd_used) rows.push(['Job description', 'Used to shape the questions']);
    $('briefList').innerHTML = rows.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
    $('briefWarn').hidden = !b.mismatch_note;
    $('briefWarn').textContent = b.mismatch_note ? `Heads up: ${b.mismatch_note}` : '';
  }

  // ---------- Camera and mic ----------
  async function setupDevices() {
    if (state.stream) return;
    const status = $('deviceStatus');
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'This browser can\'t use the microphone here. You can type your answers.'; return useTyping(); }
    const audioOpts = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: audioOpts });
      state.camOk = true;
    } catch (_) {
      try { state.stream = await navigator.mediaDevices.getUserMedia({ audio: audioOpts }); } catch (err) {
        status.textContent = 'No microphone access, so you\'ll type your answers. To speak instead, allow the microphone in the browser and reload.';
        return useTyping();
      }
    }
    state.micOk = state.stream.getAudioTracks().length > 0;
    $('previewVideo').srcObject = state.camOk ? state.stream : null;
    $('previewOff').hidden = state.camOk;
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = state.audioCtx.createMediaStreamSource(state.stream);
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 1024;
    state.buf = new Float32Array(state.analyser.fftSize);
    state.audioCtx.resume().catch(() => {}); // can start suspended outside a click
    src.connect(state.analyser);
    status.textContent = state.camOk ? 'Camera and mic are on. Say a few words to check the meter moves.' : 'Mic is on (no camera found). Say a few words to check the meter moves.';
    clearInterval(state.previewLoop);
    state.previewLoop = setInterval(() => setMeter('previewMeter', level()), TICK_MS);
  }

  function useTyping() { state.micOk = false; state.mode = 'type'; }

  function level() {
    if (!state.analyser) return 0;
    state.analyser.getFloatTimeDomainData(state.buf);
    let sum = 0;
    for (const v of state.buf) sum += v * v;
    return Math.sqrt(sum / state.buf.length);
  }
  const setMeter = (id, l) => { $(id).style.width = `${Math.min(100, Math.round(l * 600))}%`; };

  function stopDevices() {
    clearInterval(state.previewLoop);
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    if (state.audioCtx) state.audioCtx.close().catch(() => {});
    Object.assign(state, { stream: null, audioCtx: null, analyser: null, camOk: false });
  }

  // ---------- Live interview ----------
  function startInterview() {
    clearInterval(state.previewLoop);
    if (state.audioCtx && state.audioCtx.state === 'suspended') state.audioCtx.resume();
    $('selfView').srcObject = state.camOk ? state.stream : null;
    $('noVideo').hidden = state.camOk;
    $('liveSub').textContent = `About ${state.minutes} min`;
    $('modeBtn').hidden = !state.micOk;
    state.startedAt = Date.now();
    clearInterval(state.timer);
    state.timer = setInterval(tickTimer, 1000);
    tickTimer();
    render();
    show('live');
    speakLatest(); // inside the click, so the browser allows audio playback from here on
  }

  function tickTimer() {
    const s = Math.floor((Date.now() - state.startedAt) / 1000);
    $('timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')} : ${String(s % 60).padStart(2, '0')}`;
  }

  function render() {
    const t = state.view.transcript;
    const lastQ = t.map((e) => e.role).lastIndexOf('interviewer');
    $('thread').innerHTML = t.slice(0, lastQ).map((e) => `<p class="sv-bubble ${e.role === 'interviewer' ? 'q' : 'a'}">${esc(e.text)}</p>`).join('');
    $('thread').scrollTop = $('thread').scrollHeight;
    $('question').textContent = lastQ >= 0 ? t[lastQ].text : '';
  }

  const LABELS = {
    speaking: 'Interviewer is speaking…',
    waiting: '🎤 Listening… start your answer whenever you\'re ready',
    listening: '🎤 Listening…',
    transcribing: 'Got it. One moment…',
    thinking: 'Interviewer is thinking…',
    typing: 'Type your answer, then press Send answer',
    ended: 'Interview complete',
  };

  function setPhase(phase, label) {
    state.phase = phase;
    const typing = state.mode === 'type';
    $('statusLabel').textContent = label || LABELS[phase] || '';
    $('status').dataset.phase = phase;
    $('interviewerTile').classList.toggle('talking', phase === 'speaking');
    const canAnswer = ['waiting', 'listening', 'countdown', 'typing'].includes(phase);
    $('typed').hidden = !typing;
    $('liveMeter').parentElement.hidden = typing || !['waiting', 'listening', 'countdown'].includes(phase);
    $('sendBtn').textContent = typing ? 'Send answer' : 'Send now';
    $('sendBtn').disabled = !canAnswer;
    $('modeBtn').textContent = typing ? 'Switch to speaking' : 'Switch to typing';
    if (typing && phase === 'typing') $('typed').focus();
  }

  function speakLatest() {
    setPhase('speaking');
    let done = false;
    let fellBack = false;
    const next = () => { if (done) return; done = true; audio.onended = null; audio.onerror = null; afterSpeech(); };
    // If the server voice fails (no audio model access, network), the browser's own voice reads the question.
    // onerror and the play() rejection can both fire, so this runs once.
    const fallback = () => {
      if (done || fellBack) return;
      fellBack = true;
      audio.onended = null; audio.onerror = null;
      const text = $('question').textContent;
      if (!window.speechSynthesis || !text) { showError('liveError', 'The interviewer\'s voice didn\'t play. Read the question on the right.'); return next(); }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.onend = next;
      u.onerror = next;
      // Chrome sometimes never fires onend on long text; move on after a generous estimate of the speaking time.
      setTimeout(() => { if (!done) { speechSynthesis.cancel(); next(); } }, 4000 + text.split(/\s+/).length * 600);
      speechSynthesis.speak(u);
    };
    audio.onended = next;
    audio.onerror = fallback;
    audio.src = `/api/sessions/${state.sessionId}/speech?n=${state.view.transcript.length}`;
    audio.play().catch(fallback);
  }

  function afterSpeech() {
    if (state.phase === 'ended') return; // a cancelled voice still fires its end event
    if (state.view.status === 'ended') return finish();
    if (state.mode === 'voice' && state.micOk) startListening(); else setPhase('typing');
  }

  function startListening() {
    stopListening(true);
    const tracks = state.stream.getAudioTracks();
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
    try {
      state.recorder = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type } : undefined);
    } catch (err) {
      showError('liveError', 'Recording isn\'t available in this browser, so please type your answer.');
      useTyping(); $('modeBtn').hidden = true;
      return setPhase('typing');
    }
    state.chunks = [];
    state.recorder.ondataavailable = (e) => { if (e.data.size) state.chunks.push(e.data); };
    state.recorder.start(1000);
    const step = createSilenceDetector();
    const started = performance.now();
    setPhase('waiting');
    state.loop = setInterval(() => {
      // Nothing said for 3 minutes: start a fresh recording rather than let an empty one grow.
      if (state.phase === 'waiting' && performance.now() - started > 180000) return startListening();
      const l = level();
      setMeter('liveMeter', l);
      const r = step(l, performance.now());
      if (r.state === 'send') return sendVoice();
      if (r.state === 'countdown') setPhase('countdown', `Sending in ${Math.ceil(r.remainingMs / 1000)}… keep talking to continue`);
      else if (r.state === 'speaking' && state.phase !== 'listening') setPhase('listening');
    }, TICK_MS);
  }

  // Stops the recorder and returns the recorded audio (or null when discarded).
  function stopListening(discard) {
    clearInterval(state.loop);
    state.loop = null;
    const rec = state.recorder;
    state.recorder = null;
    if (!rec || rec.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => resolve(discard ? null : new Blob(state.chunks, { type: rec.mimeType || 'audio/webm' }));
      rec.stop();
    });
  }

  async function sendVoice() {
    if (!state.recorder) return;
    showError('liveError', '');
    setPhase('transcribing');
    const blob = await stopListening(false);
    if (!blob || blob.size < 1000) return relisten();
    let text;
    try {
      const res = await fetch(`/api/sessions/${state.sessionId}/transcribe`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status}).`);
      text = data.text;
    } catch (err) {
      state.sttFailures = (state.sttFailures || 0) + 1;
      if (state.sttFailures >= 2) {
        // Transcription keeps failing (no model access, network): don't make the student repeat themselves again.
        state.mode = 'type';
        showError('liveError', `Voice answers aren't working right now (${err.message}). Please type this answer.`);
        return setPhase('typing');
      }
      showError('liveError', `We couldn't hear that answer (${err.message}). Please say it again, or switch to typing.`);
      return startListening();
    }
    state.sttFailures = 0;
    if (isFillerTranscript(text)) return relisten();
    submitAnswer(text);
  }

  function relisten() {
    showError('liveError', 'Sorry, I didn\'t catch that. Please answer again.');
    startListening();
  }

  async function submitAnswer(text) {
    setPhase('thinking');
    $('thread').insertAdjacentHTML('beforeend', `<p class="sv-bubble q">${esc($('question').textContent)}</p><p class="sv-bubble a">${esc(text)}</p>`);
    $('thread').scrollTop = $('thread').scrollHeight;
    $('question').textContent = '';
    try {
      state.view = await api(`/api/sessions/${state.sessionId}/answers`, { method: 'POST', body: { answer: text } });
      $('typed').value = '';
      render();
      speakLatest();
    } catch (err) {
      render();
      // Keep the answer: put it in the box so the student can send it again.
      state.mode = 'type';
      $('typed').value = text;
      showError('liveError', `${err.message} Your answer is in the box, so you can send it again.`);
      setPhase('typing');
    }
  }

  async function onSend() {
    if (state.mode === 'type') {
      const text = $('typed').value.trim();
      if (!text) return showError('liveError', 'Type an answer before sending.');
      showError('liveError', '');
      return submitAnswer(text);
    }
    sendVoice();
  }

  async function toggleMode() {
    showError('liveError', '');
    const answering = ['waiting', 'listening', 'countdown', 'typing'].includes(state.phase);
    if (state.mode === 'voice') {
      state.mode = 'type';
      await stopListening(true);
      setPhase(answering ? 'typing' : state.phase);
    } else {
      state.mode = 'voice';
      if (answering) startListening(); else setPhase(state.phase);
    }
  }

  async function endInterview() {
    // Two clicks instead of a confirm dialog.
    if (!state.endArmed) {
      $('endBtn').textContent = 'Click again to end';
      state.endArmed = setTimeout(() => { state.endArmed = null; $('endBtn').textContent = 'End interview'; }, 3000);
      return;
    }
    clearTimeout(state.endArmed);
    state.endArmed = null;
    $('endBtn').textContent = 'End interview';
    if (state.phase === 'thinking' || state.phase === 'transcribing') return showError('liveError', 'Your last answer is still being processed. Try again in a moment.');
    try {
      state.view = await api(`/api/sessions/${state.sessionId}/end`, { method: 'POST' });
      finish();
    } catch (err) { showError('liveError', err.message); }
  }

  // ---------- Feedback ----------
  async function finish() {
    if (state.phase === 'ended') return;
    setPhase('ended');
    await stopListening(true);
    audio.pause();
    if (window.speechSynthesis) speechSynthesis.cancel();
    clearInterval(state.timer);
    stopDevices();
    show('feedback');
    loadFeedback();
  }

  async function loadFeedback() {
    const panel = $('feedbackPanel');
    panel.innerHTML = '<p class="lede">Writing your feedback. This takes about a minute…</p>';
    try {
      const session = await api(`/api/sessions/${state.sessionId}/trace`);
      const fb = await api(`/api/sessions/${state.sessionId}/feedback`, { method: 'POST' });
      VM.renderFeedback(panel, session, fb);
    } catch (err) {
      panel.innerHTML = `<p class="error">${esc(err.message)}</p><button class="secondary" id="retryFeedback" type="button">Try again</button>`;
      $('retryFeedback').addEventListener('click', loadFeedback);
    }
  }

  // ---------- Wire up ----------
  async function init() {
    state.config = await api('/api/config');
    state.samples = await api('/api/samples');
    for (const s of state.samples) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.id.replace(/^(resume|jd)-/, '').replace(/-/g, ' ');
      $(s.kind === 'jd' ? 'jdSample' : 'resumeSample').appendChild(opt);
    }
    const pick = (box) => (e) => { const s = state.samples.find((x) => x.id === e.target.value); if (s) $(box).value = s.text; e.target.value = ''; };
    $('resumeSample').addEventListener('change', pick('resume'));
    $('jdSample').addEventListener('change', (e) => { pick('jd')(e); $('jdDetails').open = true; });
    $('resumePdf').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showError('setupError', '');
      try { $('resume').value = await VM.readPdf(file); } catch (err) { showError('setupError', err.message); }
      e.target.value = '';
    });
    $('prepareBtn').addEventListener('click', prepare);
    $('startBtn').addEventListener('click', startInterview);
    $('sendBtn').addEventListener('click', onSend);
    $('modeBtn').addEventListener('click', toggleMode);
    $('endBtn').addEventListener('click', endInterview);
    $('typed').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSend(); } });
    $('newBtn').addEventListener('click', () => { state.mode = 'voice'; state.sessionId = null; state.phase = 'idle'; show('setup'); });
    if (!state.config.has_key) showError('setupError', 'No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
    show('setup');
  }

  init().catch((err) => { document.body.innerHTML = `<p style="padding:24px">Couldn't start: ${esc(err.message)}. Is the server running?</p>`; });
})();

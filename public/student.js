/* VMock adaptive interview: student page with voice. The interviewer speaks (server text-to-speech), the student
   answers out loud with push-to-talk (hold Space or the button), and the answer is transcribed on the server. */
(() => {
  const $ = (id) => document.getElementById(id);
  const { esc } = VM;
  const TICK_MS = 50;
  // "5 Nov 2026, 15:00": no seconds, no ambiguous day/month order.
  const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  // Touch screens have no Space key and nothing to click: the instructions follow the device.
  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ACT = FINE ? 'Click' : 'Tap';

  const state = {
    config: null, samples: [], sessionId: null, view: null, minutes: 15,
    stream: null, micOk: false, camOk: false, audioCtx: null, analyser: null, buf: null,
    mode: 'voice', phase: 'idle', sttFailed: new Set(), recorder: null, chunks: [], loop: null, timer: null, startedAt: 0,
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
    // A page with its own setup (the VMock replica room) sends the student back there instead of this page's form.
    const setupUrl = document.body.dataset.setupUrl;
    if (name === 'setup' && setupUrl) { location.href = setupUrl; return; }
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    document.body.classList.toggle('live', name === 'live');
    $('pastBtn').hidden = name === 'brief' || name === 'live'; // leaving mid-interview would drop the call
    window.scrollTo({ top: 0 });
  }
  const showError = (id, msg) => { $(id).textContent = msg || ''; $(id).hidden = !msg; };

  // ---------- Setup ----------
  // The resume box: a drop zone that turns into a "loaded" summary; the text box opens only to paste or edit.
  function setResume(text, name) {
    $('resume').value = text;
    state.resumeName = name;
    updateResume();
  }
  function updateResume() {
    const text = $('resume').value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    $('dropEmpty').hidden = Boolean(text);
    $('dropLoaded').hidden = !text;
    $('resumeName').textContent = state.resumeName || 'Pasted resume';
    $('resumeName').title = $('resumeName').textContent;
    $('resumeWords').textContent = `${words} word${words === 1 ? '' : 's'}`;
  }
  async function loadResumeFile(file) {
    if (!file) return;
    showError('setupError', '');
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return showError('setupError', 'That file isn\'t a PDF. Choose a PDF, or paste the resume text.');
    try { setResume(await VM.readPdf(file), file.name); } catch (err) { showError('setupError', err.message); }
  }

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
    const run = state.prepRun = (state.prepRun || 0) + 1; // "Change setup" bumps this so a late plan is ignored
    $('briefBody').hidden = true;
    $('startBtn').disabled = true;
    showError('briefError', '');
    setHost('preparing', 'Preparing for your interview');
    show('brief');
    setupDevices(); // runs while the planner thinks
    // The interviewer's activity, one line per stage of the real work (resume, job description, planner).
    // The progress is timed, not reported by the server; the last line stays open until the plan arrives.
    const role = inputs.target_role.trim();
    const lines = [
      'Opening your resume',
      'Reading about your experience',
      inputs.jd_text.trim() ? 'Reading the job description' : role ? `Thinking about the ${role} role` : 'Thinking about the role',
      'Planning what to ask you',
      'Joining the call',
    ];
    const list = $('prepSteps');
    list.replaceChildren(...lines.map((text) => Object.assign(document.createElement('li'), { textContent: text })));
    const steps = [...list.children];
    const mark = (n) => steps.forEach((li, i) => { li.className = i < n ? 'done' : i === n ? 'now' : ''; });
    let step = 0;
    mark(0);
    const stepTimer = setInterval(() => { if (step < steps.length - 2) mark(++step); }, 5000);
    try {
      const view = await api('/api/sessions', { method: 'POST', body: inputs });
      if (run !== state.prepRun) return;
      state.view = view;
      state.sessionId = view.id;
      clearInterval(stepTimer);
      mark(steps.length - 1); // the short "joining" beat
      setHost('joining', 'Joining the call');
      await new Promise((r) => setTimeout(r, 1200));
      if (run !== state.prepRun) return;
      mark(steps.length);
      setHost('ready', 'In the call, ready when you are');
      renderBrief(state.view.pre_brief);
      $('briefBody').hidden = false;
      $('startBtn').disabled = false;
    } catch (err) {
      if (run !== state.prepRun) return;
      setHost('failed', 'Couldn\'t join');
      showError('briefError', `We couldn't prepare the interview. (${err.message})`);
      steps.forEach((li) => { li.className = ''; });
      setTimeout(() => { if (run !== state.prepRun) return; stopDevices(); show('setup'); showError('setupError', `We couldn't prepare the interview. Your resume is still here, so you can try again. (${err.message})`); }, 2500);
    } finally {
      clearInterval(stepTimer);
      if (run === state.prepRun) state.busy = false;
    }
  }

  // Leaves the lobby with the inputs still filled in. A plan still being prepared is ignored when it arrives.
  function backToSetup() {
    state.prepRun = (state.prepRun || 0) + 1;
    state.busy = false;
    state.sessionId = null;
    stopDevices();
    show('setup');
  }

  function setHost(stateName, text) {
    $('hostCard').dataset.state = stateName;
    $('presence').textContent = text;
  }

  function renderBrief(b) {
    state.minutes = b.minutes;
    const label = (s) => (window.ROOM_LABELS && window.ROOM_LABELS[s]) || s; // the replica room renames types and styles
    $('briefTitle').textContent = `${label(b.interview_type)}${window.ROOM_LABELS ? '' : ' interview'}${b.role ? `: ${b.role}${b.company ? ` at ${b.company}` : ''}` : ''}`;
    const rows = [
      ['Interviewer', b.surprise ? 'You\'ll find out as you go' : `${label(b.style)} style`],
      ['Length', `About ${b.minutes} minutes, ${b.topics} topics`],
    ];
    if (b.jd_used) rows.push(['Job description', 'Used to shape the questions']);
    $('briefList').innerHTML = rows.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
    $('briefWarn').hidden = !b.mismatch_note;
    $('briefWarn').textContent = b.mismatch_note ? `Heads up: ${b.mismatch_note}` : '';
    document.dispatchEvent(new CustomEvent('vm:brief', { detail: b })); // lets a page show the plan its own way
  }

  // ---------- Camera and mic ----------
  async function setupDevices() {
    if (state.stream) return;
    $('previewMeterWrap').hidden = false;
    $('micTry').hidden = true;
    $('previewOff').textContent = 'Allow camera and mic when your browser asks';
    $('previewOff').hidden = false;
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
    $('previewOff').textContent = 'Camera off';
    $('previewOff').hidden = state.camOk;
    $('tryStatus').textContent = FINE ? 'Hold Space (or this button) and say hello.' : 'Hold the button and say hello.';
    $('micTry').hidden = !state.micOk;
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = state.audioCtx.createMediaStreamSource(state.stream);
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 1024;
    state.buf = new Float32Array(state.analyser.fftSize);
    state.audioCtx.resume().catch(() => {}); // can start suspended outside a click
    src.connect(state.analyser);
    status.textContent = state.camOk ? 'Camera and mic are on. Say a few words to check the meter moves.' : 'Mic is on (no camera found). Say a few words to check the meter moves.';
    clearInterval(state.previewLoop);
    state.previewLoop = setInterval(() => {
      const l = level();
      setMeter('previewMeter', l);
      if (state.trying) state.tryPeak = Math.max(state.tryPeak, l);
    }, TICK_MS);
  }

  function useTyping() {
    state.micOk = false;
    state.mode = 'type';
    $('previewMeterWrap').hidden = true;
    $('previewOff').textContent = 'Camera and mic are off';
    $('previewOff').hidden = false;
  }

  // Mic practice in the lobby: same gesture as answering, nothing recorded or sent.
  const HEARD_LEVEL = 0.02;
  function tryStart() {
    if (state.trying || !state.micOk) return;
    if (state.audioCtx && state.audioCtx.state === 'suspended') state.audioCtx.resume();
    state.trying = true;
    state.tryPeak = 0;
    $('tryBtn').classList.add('on');
    $('tryStatus').textContent = 'Listening…';
  }
  function tryEnd() {
    if (!state.trying) return;
    state.trying = false;
    $('tryBtn').classList.remove('on');
    $('tryStatus').textContent = state.tryPeak >= HEARD_LEVEL ? 'Heard you. Your mic works.' : 'Didn\'t hear anything. Check your mic isn\'t muted, then try again.';
  }

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
    $('liveSub').textContent = $('briefTitle').textContent;
    $('modeBtn').hidden = !state.micOk;
    $('camBtn').hidden = !state.camOk;
    setCamera(true);
    if (!state.micOk) state.mode = 'type'; // e.g. joined before answering the browser's mic prompt
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
    $('timer').innerHTML = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}<span class="of"> of about ${Number(state.minutes)} min</span>`;
  }

  // One transcript line, timed against the call clock; the interviewer's current question is highlighted.
  const clock = (at) => {
    const s = Math.max(0, Math.floor(((at ? Date.parse(at) : Date.now()) - state.startedAt) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  const msg = (role, text, now, at) => `<div class="sv-msg${now ? ' now' : ''}"><div class="who">${role === 'interviewer' ? 'Interviewer' : 'You'}<time>${clock(at)}</time></div><p>${esc(text)}</p></div>`;
  const scrollThread = () => { $('thread').scrollTop = $('thread').scrollHeight; };

  function render() {
    const t = state.view.transcript;
    const lastQ = t.map((e) => e.role).lastIndexOf('interviewer');
    $('thread').innerHTML = t.map((e, i) => msg(e.role, e.text, i === lastQ, e.at)).join('');
    scrollThread();
    $('question').textContent = lastQ >= 0 ? t[lastQ].text : '';
  }

  // Turns the student's own camera on or off (the track keeps running, so turning it back on is instant).
  function setCamera(on) {
    if (state.stream) state.stream.getVideoTracks().forEach((track) => { track.enabled = on; });
    const label = on ? 'Turn camera off' : 'Turn camera on';
    $('camBtn').setAttribute('aria-pressed', String(on));
    $('camBtn').setAttribute('aria-label', label);
    $('camBtn').title = label;
    $('noVideo').hidden = on && state.camOk;
  }

  const LABELS = {
    speaking: 'Interviewer is speaking…',
    ready: FINE ? 'Your turn. Click Start answering, or hold Space while you talk.' : 'Your turn. Tap Start answering, then talk.',
    recording: 'Recording… let go to send',
    transcribing: 'Got it. One moment…',
    thinking: 'Interviewer is thinking…',
    typing: 'Type your answer, then press Send answer',
    ended: 'Interview complete',
  };
  const ANSWERING = ['ready', 'recording', 'typing'];

  function setPhase(phase, label) {
    state.phase = phase;
    const typing = state.mode === 'type';
    $('statusLabel').textContent = label || LABELS[phase] || '';
    $('status').dataset.phase = phase;
    $('interviewerTile').dataset.phase = phase;
    $('interviewerState').textContent = phase === 'speaking' ? 'Speaking' : ['thinking', 'transcribing'].includes(phase) ? 'Thinking…' : ANSWERING.includes(phase) ? 'Listening' : '';
    $('status').classList.remove('sv-warn');
    $('typed').hidden = !typing;
    $('liveMeter').parentElement.hidden = typing || phase !== 'recording';
    $('caption').hidden = typing || !['recording', 'transcribing'].includes(phase) || !$('caption').textContent;
    const btn = $('sendBtn');
    btn.disabled = !ANSWERING.includes(phase);
    btn.classList.toggle('sv-talk', !typing);
    btn.classList.toggle('on', phase === 'recording');
    btn.textContent = typing ? 'Send answer' : phase === 'recording' ? (state.toggled ? 'Done answering' : 'Release to send') : 'Start answering';
    const modeLabel = typing ? 'Switch to speaking' : 'Switch to typing';
    $('modeBtn').setAttribute('aria-label', modeLabel);
    $('modeBtn').title = modeLabel;
    $('modeBtn').classList.toggle('is-typing', typing);
    $('spaceHint').hidden = typing || !FINE;
    if (typing && phase === 'typing') $('typed').focus();
  }

  // The browser's own voice: works with no audio model access. Picks a natural-sounding English voice if there is one.
  function browserSpeak(text, next) {
    if (!window.speechSynthesis || !text) { showError('liveError', 'The interviewer\'s voice didn\'t play. Read the question on the right.'); return next(); }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Local voices only when there are any: Chrome's network voices can stop about 15 s into a long question.
    const english = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
    const voices = english.some((v) => v.localService) ? english.filter((v) => v.localService) : english;
    u.voice = voices.find((v) => /premium|enhanced|natural|neural/i.test(v.name))
      || voices.find((v) => /samantha|daniel|serena|karen|moira|aria|jenny|guy/i.test(v.name)) || voices.find((v) => v.default) || voices[0] || null;
    u.lang = u.voice ? u.voice.lang : 'en-US';
    // Chrome sometimes never fires onend on long text; move on after a generous estimate of the speaking time.
    const watchdog = setTimeout(() => { speechSynthesis.cancel(); spoken(); }, 4000 + text.split(/\s+/).length * 600);
    let ended = false;
    const spoken = () => { if (ended) return; ended = true; clearTimeout(watchdog); next(); };
    u.onend = spoken;
    u.onerror = spoken;
    speechSynthesis.speak(u);
  }

  // The first message is a greeting plus the warm-up question: say the greeting, pause, then ask the question,
  // so the question isn't buried at the end of a long paragraph.
  function speakLatest() {
    setPhase('speaking');
    const t = state.view.transcript;
    const g = state.view.greeting;
    if (t.length === 1 && g && t[0].text.startsWith(g) && t[0].text.length > g.length) {
      const q = t[0].text.slice(g.length).trim();
      $('question').textContent = g;
      return speakText(g, 'greeting', () => {
        $('thread').innerHTML = msg('interviewer', g, false, t[0].at) + msg('interviewer', q, true);
        $('question').textContent = q;
        setTimeout(() => { if (state.phase === 'speaking') speakText(q, 'question', afterSpeech); }, 600);
      });
    }
    speakText($('question').textContent, null, afterSpeech);
  }

  function speakText(text, part, then) {
    let done = false;
    const next = () => { if (done) return; done = true; audio.onended = null; audio.onerror = null; then(); };
    if (state.tts === 'browser') return browserSpeak(text, next);
    // The OpenAI voice failed (no audio model access, network): use the browser's voice from now on.
    // onerror and the play() rejection can both fire, so this runs once.
    let fellBack = false;
    const fallback = () => {
      if (done || fellBack) return;
      fellBack = true;
      audio.onended = null; audio.onerror = null;
      state.tts = 'browser';
      browserSpeak(text, next);
    };
    audio.onended = next;
    audio.onerror = fallback;
    audio.src = `/api/sessions/${state.sessionId}/speech?n=${state.view.transcript.length}${part ? `&part=${part}` : ''}`;
    audio.play().catch(fallback);
  }

  function afterSpeech() {
    if (state.phase === 'ended') return; // a cancelled voice still fires its end event
    if (state.view.status === 'ended') return finish();
    setPhase(state.mode === 'voice' && state.micOk ? 'ready' : 'typing');
  }

  // Transcribers sometimes return filler for near-silence; such a transcript is not an answer.
  const isFiller = (text) => /^\W*(thank you|thanks( for watching)?|you|bye|okay|ok|uh+|um+|hmm+)?\W*$/i.test(String(text || ''));

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Browser speech recognition (Chrome, Edge), used only when OpenAI transcription isn't available.
  // Restarts itself when the browser ends it early on a pause.
  function startRecognition() {
    const rec = new Recognition();
    rec.lang = /^en/i.test(navigator.language) ? navigator.language : 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    const heard = { final: '', interim: '' };
    rec.onresult = (e) => {
      heard.interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) heard.final += `${e.results[i][0].transcript} `; else heard.interim += e.results[i][0].transcript;
      }
      $('caption').textContent = `${heard.final}${heard.interim}`.trim();
      $('caption').hidden = !$('caption').textContent || state.mode === 'type';
    };
    rec.onerror = (e) => {
      if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported'].includes(e.error)) rec.failed = e.error;
    };
    rec.onend = () => {
      if (rec.stopping) return rec.resolveStop && rec.resolveStop();
      if (rec.failed) return sttFailed('browser', rec.failed);
      try { rec.start(); } catch (_) { /* already started */ }
    };
    rec.heard = heard;
    rec.start();
    state.recognition = rec;
  }

  // ---------- Push-to-talk ----------
  // Hold Space or the button to record; let go to send. A quick tap starts recording and the next tap sends,
  // for anyone who finds holding awkward.
  const HOLD_MS = 350;
  const MIN_ANSWER_MS = 700;
  const MAX_ANSWER_MS = 180000;
  const WARN_MS = 30000;

  function pressStart() {
    if (state.mode !== 'voice') return;
    if (state.phase === 'recording') { state.stopOnRelease = true; return; } // second tap of a tap-to-toggle
    if (state.phase !== 'ready') return;
    showError('liveError', '');
    state.pressedAt = performance.now();
    state.toggled = false;
    state.stopOnRelease = false;
    if (!startCapture()) return;
    setPhase('recording');
  }

  function pressEnd() {
    if (state.phase !== 'recording') return;
    if (state.stopOnRelease || performance.now() - state.pressedAt >= HOLD_MS) return sendVoice();
    state.toggled = true; // a quick tap: keep recording until the next tap
    setPhase('recording', FINE ? 'Recording. Click Done answering (or tap Space) when you finish.' : 'Recording. Tap Done answering when you finish.');
  }

  // Starts recording with the current provider. Returns false if it couldn't start.
  function startCapture() {
    $('caption').textContent = '';
    if (state.stt === 'browser') {
      try { startRecognition(); } catch (err) { sttFailed('browser', err.message); return false; }
    } else {
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      try {
        state.recorder = new MediaRecorder(new MediaStream(state.stream.getAudioTracks()), type ? { mimeType: type } : undefined);
      } catch (err) {
        sttFailed('openai', 'recording isn\'t available in this browser');
        return false;
      }
      state.chunks = [];
      state.recorder.ondataavailable = (e) => { if (e.data.size) state.chunks.push(e.data); };
      state.recorder.start(1000);
    }
    state.capturedAt = performance.now();
    state.loop = setInterval(() => {
      setMeter('liveMeter', level());
      const left = MAX_ANSWER_MS - (performance.now() - state.capturedAt);
      if (left <= 0) return sendVoice('Time\'s up for this answer. Sending it now…'); // the length cap
      if (left <= WARN_MS && state.phase === 'recording') {
        $('status').classList.add('sv-warn');
        $('statusLabel').textContent = `${Math.ceil(left / 1000)} seconds left in this answer`;
      }
    }, TICK_MS);
    return true;
  }

  // Stops recording. Returns the audio Blob (OpenAI) or the heard text (browser), or null when discarded.
  function stopCapture(discard) {
    clearInterval(state.loop);
    state.loop = null;
    const rec = state.recognition;
    if (rec) {
      state.recognition = null;
      rec.stopping = true;
      const text = () => `${rec.heard.final} ${rec.heard.interim}`.replace(/\s+/g, ' ').trim();
      if (discard) { try { rec.abort(); } catch (_) { /* ended */ } return Promise.resolve(null); }
      return new Promise((resolve) => {
        rec.resolveStop = () => resolve(text());
        setTimeout(() => resolve(text()), 1500); // the last words are usually finalised on stop; don't wait forever
        try { rec.stop(); } catch (_) { resolve(text()); }
      });
    }
    const recorder = state.recorder;
    state.recorder = null;
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      recorder.onstop = () => resolve(discard ? null : new Blob(state.chunks, { type: recorder.mimeType || 'audio/webm' }));
      recorder.stop();
    });
  }

  async function sendVoice(label) {
    if (state.phase !== 'recording') return;
    const heldMs = performance.now() - state.capturedAt;
    setPhase('transcribing', typeof label === 'string' ? label : undefined);
    const captured = await stopCapture(false);
    if (heldMs < MIN_ANSWER_MS) return retry(FINE ? 'That was very short. Hold Space (or the button) for the whole time you are speaking.' : `That was very short. ${ACT} Start answering, talk, then tap Done answering.`);
    let text = captured;
    if (captured instanceof Blob) {
      try {
        const res = await fetch(`/api/sessions/${state.sessionId}/transcribe`, { method: 'POST', headers: { 'Content-Type': captured.type }, body: captured });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status}).`);
        text = data.text;
      } catch (err) {
        state.sttFailures = (state.sttFailures || 0) + 1;
        if (state.sttFailures >= 2) return sttFailed('openai', err.message);
        return retry(`We couldn't hear that answer (${err.message}). Please answer again.`);
      }
      state.sttFailures = 0;
    }
    if (isFiller(text)) return retry('Sorry, I didn\'t catch that. Please answer again.');
    submitAnswer(text);
  }

  function retry(message) {
    showError('liveError', message);
    setPhase('ready');
  }

  // A transcription provider keeps failing: switch to the other one if it hasn't failed too, else to typing.
  function sttFailed(provider, reason) {
    stopCapture(true);
    state.sttFailed.add(provider);
    const other = provider === 'openai' ? 'browser' : 'openai';
    const otherOk = !state.sttFailed.has(other) && (other === 'browser' ? Recognition : state.config.has_key && window.MediaRecorder);
    if (otherOk) {
      state.stt = other;
      return retry(`Voice answers hit a problem (${reason}), so we switched to another way of hearing you. Please answer again.`);
    }
    state.mode = 'type';
    showError('liveError', `Voice answers aren't working right now (${reason}). Please type this answer.`);
    setPhase('typing');
  }

  async function submitAnswer(text) {
    setPhase('thinking');
    $('thread').querySelectorAll('.sv-msg.now').forEach((m) => m.classList.remove('now'));
    $('thread').insertAdjacentHTML('beforeend', msg('candidate', text, false));
    scrollThread();
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

  function sendTyped() {
    if (state.mode !== 'type') return; // in voice mode the button is push-to-talk (pointer events)
    const text = $('typed').value.trim();
    if (!text) return showError('liveError', 'Type an answer before sending.');
    showError('liveError', '');
    submitAnswer(text);
  }

  async function toggleMode() {
    showError('liveError', '');
    const answering = ANSWERING.includes(state.phase);
    if (state.mode === 'voice') {
      state.mode = 'type';
      await stopCapture(true);
      setPhase(answering ? 'typing' : state.phase);
    } else {
      state.mode = 'voice';
      setPhase(answering ? 'ready' : state.phase);
    }
  }

  // Space is push-to-talk on the live screen, except while typing in a box.
  const spaceTarget = (e) => e.code === 'Space' && !$('screen-live').hidden && state.mode === 'voice' && !/^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName);

  async function endInterview() {
    // Two clicks instead of a confirm dialog.
    if (!state.endArmed) {
      $('endBtn').textContent = `${ACT} again to end`;
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
    await stopCapture(true);
    audio.pause();
    if (window.speechSynthesis) speechSynthesis.cancel();
    clearInterval(state.timer);
    stopDevices();
    show('feedback');
    loadFeedback();
  }

  async function loadFeedback() {
    const panel = $('feedbackPanel');
    panel.innerHTML = `<div class="sv-host sv-host-wait" data-state="left">
      <div class="sv-host-head"><span class="sv-avatar sv-host-avatar">AI</span><div><div class="sv-host-name">Your interviewer</div><div class="sv-presence">Left the call</div></div></div>
      <ol class="sv-steps" aria-live="polite"><li class="now">Going over your answers</li><li>Writing your feedback</li></ol>
      <p class="hint">This takes about a minute.</p></div>`;
    const steps = panel.querySelectorAll('.sv-steps li');
    const stepTimer = setTimeout(() => { steps[0].className = 'done'; steps[1].className = 'now'; }, 8000);
    try {
      const session = await api(`/api/sessions/${state.sessionId}/trace`);
      const role = session.plan?.jd?.role_title || session.inputs?.target_role;
      $('feedbackMeta').textContent = `${role ? `${role}, ` : ''}${fmtDate(session.created_at)}`;
      const fb = await api(`/api/sessions/${state.sessionId}/feedback`, { method: 'POST' });
      VM.renderFeedback(panel, session, fb);
    } catch (err) {
      clearTimeout(stepTimer);
      panel.innerHTML = `<p class="error">${esc(err.message)}</p><button class="secondary" id="retryFeedback" type="button">Try again</button>`;
      $('retryFeedback').addEventListener('click', loadFeedback);
    }
  }

  // ---------- Past interviews ----------
  // No accounts in this prototype: lists every finished interview saved on this server.
  async function openPast() {
    show('past');
    const list = $('pastList');
    list.innerHTML = '<p class="empty">Loading your interviews…</p>';
    try {
      const done = (await api('/api/sessions')).filter((x) => x.status === 'ended');
      list.innerHTML = done.length
        ? done.map((x) => `<div class="past-row"><div><strong>${esc(x.interview_type || 'Interview')}${x.role ? `: ${esc(x.role)}` : ''}</strong><br><span>${esc(fmtDate(x.created_at))}, ${x.turns}&nbsp;answer${x.turns === 1 ? '' : 's'}</span></div><button class="secondary" data-open="${esc(x.id)}" type="button">${x.has_feedback ? 'See feedback' : 'Get feedback'}</button></div>`).join('')
        : '<p class="empty">No finished interviews yet. Your feedback shows up here after each one.</p>';
    } catch (err) { list.innerHTML = `<p class="error">${esc(err.message)}</p>`; }
  }

  function openPastFeedback(id) {
    state.sessionId = id;
    $('feedbackMeta').textContent = '';
    show('feedback');
    loadFeedback();
  }

  function newInterview() { state.mode = 'voice'; state.sessionId = null; state.phase = 'idle'; show('setup'); }

  // ---------- Wire up ----------
  async function init() {
    state.config = await api('/api/config');
    // OpenAI voices by default; VOICE_PROVIDER=browser uses the browser's own speech (Chrome, Edge).
    state.tts = state.config.voice_provider === 'browser' ? 'browser' : 'openai';
    state.stt = state.config.voice_provider === 'browser' && Recognition ? 'browser' : 'openai';
    if (window.speechSynthesis) speechSynthesis.getVoices(); // starts loading the voice list
    state.samples = await api('/api/samples');
    for (const s of state.samples) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.id.replace(/^(resume|jd)-/, '').replace(/-/g, ' ');
      $(s.kind === 'jd' ? 'jdSample' : 'resumeSample').appendChild(opt);
    }
    const sample = (e) => state.samples.find((x) => x.id === e.target.value);
    $('resumeSample').addEventListener('change', (e) => {
      const s = sample(e);
      if (s) setResume(s.text, `${e.target.selectedOptions[0].textContent} (sample)`);
      e.target.value = '';
    });
    $('jdSample').addEventListener('change', (e) => { const s = sample(e); if (s) $('jd').value = s.text; e.target.value = ''; $('jdDetails').open = true; });
    $('resumePdf').addEventListener('change', (e) => { loadResumeFile(e.target.files[0]); e.target.value = ''; });
    const drop = $('resumeDrop');
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); loadResumeFile(e.dataTransfer.files[0]); });
    const openText = () => { $('resume').hidden = false; $('resume').focus(); };
    $('pasteBtn').addEventListener('click', openText);
    $('editResumeBtn').addEventListener('click', openText);
    $('removeResumeBtn').addEventListener('click', () => { setResume('', ''); $('resume').hidden = true; });
    $('resume').addEventListener('input', () => updateResume());
    $('backBtn').addEventListener('click', backToSetup);
    $('tryBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); try { $('tryBtn').setPointerCapture(e.pointerId); } catch (_) { /* fine without */ } tryStart(); });
    $('tryBtn').addEventListener('pointerup', tryEnd);
    $('tryBtn').addEventListener('pointercancel', tryEnd);
    const lobbySpace = (e) => e.code === 'Space' && !$('screen-brief').hidden && !$('micTry').hidden && !/^(TEXTAREA|INPUT|SELECT|BUTTON)$/.test(e.target.tagName);
    document.addEventListener('keydown', (e) => { if (!lobbySpace(e)) return; e.preventDefault(); if (!e.repeat) tryStart(); });
    document.addEventListener('keyup', (e) => { if (!lobbySpace(e)) return; e.preventDefault(); tryEnd(); });
    $('prepareBtn').addEventListener('click', prepare);
    $('startBtn').addEventListener('click', startInterview);
    $('sendBtn').addEventListener('click', sendTyped);
    $('sendBtn').addEventListener('pointerdown', (e) => { if (state.mode !== 'voice') return; e.preventDefault(); try { $('sendBtn').setPointerCapture(e.pointerId); } catch (_) { /* keeps working without capture */ } pressStart(); });
    $('sendBtn').addEventListener('pointerup', pressEnd);
    $('sendBtn').addEventListener('pointercancel', pressEnd);
    document.addEventListener('keydown', (e) => { if (!spaceTarget(e)) return; e.preventDefault(); if (!e.repeat) pressStart(); });
    document.addEventListener('keyup', (e) => { if (!spaceTarget(e)) return; e.preventDefault(); pressEnd(); });
    if (!FINE) document.querySelector('#briefBody .brief-note').textContent = 'The interviewer speaks each question. When they finish, tap Start answering, talk, then tap Done answering. You can switch to typing at any time.';
    $('modeBtn').addEventListener('click', toggleMode);
    $('camBtn').addEventListener('click', () => setCamera($('camBtn').getAttribute('aria-pressed') !== 'true'));
    $('endBtn').addEventListener('click', endInterview);
    $('typed').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendTyped(); } });
    $('newBtn').addEventListener('click', newInterview);
    $('pastNewBtn').addEventListener('click', newInterview);
    $('pastBtn').addEventListener('click', openPast);
    $('pastList').addEventListener('click', (e) => { const id = e.target.dataset.open; if (id) openPastFeedback(id); });
    if (!state.config.has_key) showError('setupError', 'No OpenAI key found. Add OPENAI_API_KEY to the .env file and restart the server.');
    if (!takeHandoff()) show('setup');
  }

  // The VMock replica's setup wizard (/vmock/adaptive-interview) passes its inputs here and goes straight to the lobby.
  // Only runs when that wizard left something in this tab's sessionStorage; otherwise the page starts at its own setup.
  // The inputs are kept as "last" so the wizard can reopen with them after "Change setup".
  function takeHandoff() {
    let inputs = null;
    try {
      inputs = JSON.parse(sessionStorage.getItem('vmock_adaptive_setup') || 'null');
      sessionStorage.removeItem('vmock_adaptive_setup');
      if (inputs) sessionStorage.setItem('vmock_adaptive_last', JSON.stringify(inputs));
    } catch (_) { return false; }
    if (!inputs || typeof inputs !== 'object') return false;
    setResume(String(inputs.resume_text || ''), String(inputs.resume_name || 'Resume'));
    $('jd').value = String(inputs.jd_text || '');
    $('jdDetails').open = Boolean($('jd').value);
    $('role').value = String(inputs.target_role || '');
    for (const name of ['type', 'style', 'length']) {
      const key = name === 'type' ? 'interview_type' : name;
      const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(String(inputs[key] || ''))}"]`);
      if (radio) radio.checked = true;
    }
    prepare();
    if (!state.busy) show('setup'); // prepare() stopped at a check before leaving the setup: show its error there
    return true;
  }

  init().catch((err) => { document.body.innerHTML = `<p style="padding:24px">Couldn't start: ${esc(err.message)}. Is the server running?</p>`; });
})();

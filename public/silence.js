/* Hands-free end-of-answer detection. Pure: feed it mic levels (RMS, 0..1) with a time in ms and it says what to do.
   Used by student.js in the browser and tested in node by test/run-flow.js. */
(function (root) {
  function createSilenceDetector(opts = {}) {
    const o = {
      calibrateMs: 300, // learn the room's noise floor first
      minLevel: 0.02, // speech threshold never drops below this
      floorFactor: 3, // speech is this many times louder than the floor
      minSpeechMs: 800, // shorter bursts (a cough, a click) are not an answer
      silenceMs: 3000, // quiet this long after speech sends the answer
      countdownAfterMs: 1000, // show "Sending in N" once quiet this long
      maxMs: 180000, // hard cap on one answer
      ...opts,
    };
    let start = null; let last = null; let floorSum = 0; let floorN = 0; let threshold = o.minLevel;
    let speechMs = 0; let lastVoice = null;

    // Returns { state, remainingMs? }. States: calibrating, waiting, speaking, countdown, send.
    return function step(level, t) {
      if (start === null) { start = t; last = t; }
      const dt = Math.max(0, t - last);
      last = t;
      const elapsed = t - start;
      if (elapsed < o.calibrateMs) {
        floorSum += level; floorN += 1;
        threshold = Math.max(o.minLevel, (floorSum / floorN) * o.floorFactor);
        return { state: 'calibrating' };
      }
      if (level >= threshold) { speechMs += dt; lastVoice = t; }
      if (elapsed >= o.maxMs) return { state: speechMs >= o.minSpeechMs ? 'send' : 'waiting' };
      if (lastVoice === null) return { state: 'waiting' };
      const quiet = t - lastVoice;
      if (speechMs < o.minSpeechMs) {
        // A short burst followed by quiet was noise, not the start of an answer: forget it.
        if (quiet >= o.silenceMs) { speechMs = 0; lastVoice = null; return { state: 'waiting' }; }
        return { state: 'speaking' };
      }
      if (quiet >= o.silenceMs) return { state: 'send' };
      if (quiet >= o.countdownAfterMs) return { state: 'countdown', remainingMs: o.silenceMs - quiet };
      return { state: 'speaking' };
    };
  }

  // Transcribers sometimes return filler for near-silence; such a transcript is not an answer.
  const FILLER = /^\W*(thank you|thanks( for watching)?|you|bye|okay|ok|uh+|um+|hmm+)\W*$/i;
  const isFillerTranscript = (text) => !String(text || '').trim() || FILLER.test(String(text).trim());

  const api = { createSilenceDetector, isFillerTranscript };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Silence = api;
})(this);

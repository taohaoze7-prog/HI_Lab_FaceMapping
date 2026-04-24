/* ============================================
   MUSIC — 观相 adaptive ambient score
   Procedural generative music that evolves with phase.
   Pentatonic modal system (宫调式 / 羽调式).
   ============================================ */

const Music = {
  sound: null,       // reference to Soundscape
  ctx: null,
  musicGain: null,   // master music bus (below Soundscape.masterGain)
  droneGain: null,   // drone layer bus
  pluckGain: null,   // melodic pluck bus

  _started: false,
  _currentPhase: null,
  _droneVoices: [],  // active drone oscillators, destroyed on phase change
  _pluckTimer: null,
  _phaseObserver: null,

  // Scale presets — frequencies in Hz, rooted to give each phase its color.
  // 羽调式 = minor pentatonic (1 b3 4 5 b7); 宫调式 = major pentatonic (1 2 3 5 6)
  presets: {
    entry: {
      scale: [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00], // D羽: D F G A C D F G
      droneFreqs: [73.42, 110.00],      // D2 + A2 (fifth)
      droneLevel: 0.22,
      pluckLevel: 0.18,
      pluckIntervalMs: [5000, 9000],    // sparse
      pluckRegister: [4, 7],            // indices into scale
      phraseChance: 0.3,                // chance a pluck triggers a 2-note phrase
    },
    questions: {
      scale: [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23],
      droneFreqs: [73.42, 110.00],
      droneLevel: 0.20,                  // slightly softer for focus
      pluckLevel: 0.16,
      pluckIntervalMs: [7000, 12000],
      pluckRegister: [3, 6],
      phraseChance: 0.25,
    },
    computing: {
      // D宫: D E F# A B (brightening)
      scale: [146.83, 164.81, 185.00, 220.00, 246.94, 293.66, 329.63, 369.99, 440.00],
      droneFreqs: [73.42, 110.00, 146.83], // D2 + A2 + D3 (denser)
      droneLevel: 0.28,
      pluckLevel: 0.24,
      pluckIntervalMs: [1800, 3200],     // faster, building tension
      pluckRegister: [4, 8],
      phraseChance: 0.5,
    },
    result: {
      // A宫 (E major pentatonic-ish, open & triumphant): A C# E F# A ...
      // using A major pent: A B C# E F#
      scale: [110.00, 123.47, 138.59, 164.81, 185.00, 220.00, 246.94, 277.18, 329.63],
      droneFreqs: [55.00, 82.41],        // A1 + E2 — open fifth, warm
      droneLevel: 0.26,
      pluckLevel: 0.22,
      pluckIntervalMs: [3500, 6500],
      pluckRegister: [4, 8],
      phraseChance: 0.4,
    },
    fortune: {
      scale: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // D羽 high
      droneFreqs: [73.42, 110.00],
      droneLevel: 0.22,
      pluckLevel: 0.18,
      pluckIntervalMs: [6000, 11000],
      pluckRegister: [3, 6],
      phraseChance: 0.3,
    },
    analyzing: {
      scale: [146.83, 174.61, 196.00, 220.00, 261.63],
      droneFreqs: [73.42, 110.00],
      droneLevel: 0.11,                  // -50% so host voice cuts through
      pluckLevel: 0.10,
      pluckIntervalMs: [12000, 20000],   // very sparse
      pluckRegister: [2, 5],
      phraseChance: 0.15,
    },
  },

  /* ──────────────────────────────────────────
     Lifecycle
     ────────────────────────────────────────── */

  start(soundscape) {
    if (this._started) return;
    this._started = true;
    this.sound = soundscape;
    this.ctx = soundscape.ctx;

    // Bus: musicGain → Soundscape.masterGain → destination
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;    // overall music level (subtle)
    this.musicGain.connect(soundscape.masterGain);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 1.0;
    this.droneGain.connect(this.musicGain);

    this.pluckGain = this.ctx.createGain();
    this.pluckGain.gain.value = 1.0;
    this.pluckGain.connect(this.musicGain);

    // Initial phase from body
    const initial = document.body.dataset.phase || 'entry';
    this.setPhase(initial);

    // Auto-watch phase changes
    this._phaseObserver = new MutationObserver(() => {
      const p = document.body.dataset.phase;
      if (p && p !== this._currentPhase) this.setPhase(p);
    });
    this._phaseObserver.observe(document.body, {
      attributes: true, attributeFilter: ['data-phase']
    });
  },

  setPhase(phase) {
    if (!this.ctx || !this.presets[phase]) return;
    if (phase === this._currentPhase) return;
    this._currentPhase = phase;

    const preset = this.presets[phase];

    // Crossfade drones: fade out old, start new
    this._stopDrones(1.8);
    setTimeout(() => this._startDrones(preset), 200);

    // Reschedule plucks
    if (this._pluckTimer) clearTimeout(this._pluckTimer);
    this._schedulePluck(preset, 1500); // first note ~1.5s after phase change
  },

  /* ──────────────────────────────────────────
     Drone layer — sustained pad
     ────────────────────────────────────────── */

  _startDrones(preset) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;

    // Shared lowpass for warmth
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 800;
    lpf.Q.value = 0.7;

    // Slow LFO on cutoff for breathing motion
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08;  // 12.5s cycle
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(lpf.frequency);
    lfo.start(t0);

    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0, t0);
    layerGain.gain.linearRampToValueAtTime(preset.droneLevel, t0 + 2.5);

    lpf.connect(layerGain).connect(this.droneGain);

    // Build voices
    preset.droneFreqs.forEach((freq, i) => {
      // Two detuned saws + sub sine for depth
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const oscSub = this.ctx.createOscillator();
      oscA.type = 'sawtooth'; oscA.frequency.value = freq;
      oscB.type = 'sawtooth'; oscB.frequency.value = freq;
      oscA.detune.value = -6; oscB.detune.value = +6;
      oscSub.type = 'sine';   oscSub.frequency.value = freq * 0.5;

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.value = 0.18;

      oscA.connect(voiceGain);
      oscB.connect(voiceGain);
      oscSub.connect(voiceGain);
      voiceGain.connect(lpf);

      oscA.start(t0); oscB.start(t0); oscSub.start(t0);
      this._droneVoices.push(oscA, oscB, oscSub, lfo, layerGain);
    });

    this._currentLayerGain = layerGain;
  },

  _stopDrones(fadeSec = 1.8) {
    if (!this.ctx || this._droneVoices.length === 0) return;
    const t0 = this.ctx.currentTime;
    const voices = this._droneVoices.slice();
    this._droneVoices = [];

    if (this._currentLayerGain) {
      try {
        this._currentLayerGain.gain.cancelScheduledValues(t0);
        this._currentLayerGain.gain.setValueAtTime(this._currentLayerGain.gain.value, t0);
        this._currentLayerGain.gain.linearRampToValueAtTime(0.0001, t0 + fadeSec);
      } catch (e) {}
    }

    setTimeout(() => {
      voices.forEach(v => {
        try { if (v.stop) v.stop(); } catch (e) {}
      });
    }, fadeSec * 1000 + 100);
  },

  /* ──────────────────────────────────────────
     Pluck layer — guqin-style melodic fragments
     ────────────────────────────────────────── */

  _schedulePluck(preset, delay) {
    this._pluckTimer = setTimeout(() => {
      if (this._currentPhase && this.presets[this._currentPhase] === preset) {
        this._playPluck(preset);

        // Occasional 2-note phrase (classical guqin gesture)
        if (Math.random() < preset.phraseChance) {
          setTimeout(() => this._playPluck(preset, 0.85), 400 + Math.random() * 400);
        }

        // Schedule next
        const [lo, hi] = preset.pluckIntervalMs;
        const next = lo + Math.random() * (hi - lo);
        this._schedulePluck(preset, next);
      }
    }, delay);
  },

  _playPluck(preset, levelScale = 1) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;

    // Choose a note from the preset's register range
    const [lo, hi] = preset.pluckRegister;
    const idx = Math.floor(lo + Math.random() * (hi - lo + 1));
    const freq = preset.scale[Math.min(idx, preset.scale.length - 1)];

    const level = preset.pluckLevel * levelScale;
    const decay = 2.0 + Math.random() * 1.2;

    // Pluck transient — short filtered noise
    const noiseLen = 0.012;
    const bufSize = Math.floor(this.ctx.sampleRate * noiseLen);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nFilt = this.ctx.createBiquadFilter();
    nFilt.type = 'bandpass';
    nFilt.frequency.value = freq * 3;
    nFilt.Q.value = 4;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(level * 0.35, t0);
    nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    noise.connect(nFilt).connect(nGain).connect(this.pluckGain);
    noise.start(t0);
    noise.stop(t0 + noiseLen);

    // Body — sine + 3rd harmonic with slight freq drop (string settling)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.005, t0);
    osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.3);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0, t0);
    oscGain.gain.linearRampToValueAtTime(level, t0 + 0.004);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    osc.connect(oscGain).connect(this.pluckGain);
    osc.start(t0);
    osc.stop(t0 + decay + 0.1);

    // Harmonic (3rd partial) — adds guqin shimmer
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3.0;
    const osc3Gain = this.ctx.createGain();
    osc3Gain.gain.setValueAtTime(0, t0);
    osc3Gain.gain.linearRampToValueAtTime(level * 0.18, t0 + 0.003);
    osc3Gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay * 0.6);
    osc3.connect(osc3Gain).connect(this.pluckGain);
    osc3.start(t0);
    osc3.stop(t0 + decay + 0.1);
  },

  /* ──────────────────────────────────────────
     Ducking — auto-lower music during ritual cues
     ────────────────────────────────────────── */

  duck(durationSec = 2.0) {
    if (!this.ctx || !this.musicGain) return;
    const t0 = this.ctx.currentTime;
    try {
      this.musicGain.gain.cancelScheduledValues(t0);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t0);
      this.musicGain.gain.linearRampToValueAtTime(0.10, t0 + 0.25);    // -10dB
      this.musicGain.gain.linearRampToValueAtTime(0.32, t0 + durationSec);
    } catch (e) {}
  },
};

document.addEventListener('DOMContentLoaded', () => {
  // No init call needed — Soundscape._initCtx() calls Music.start() after unlock.
});

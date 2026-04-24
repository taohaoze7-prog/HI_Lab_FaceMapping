/* ============================================
   SOUNDSCAPE — 观相 ritual cues
   Web Audio API synthesis (no external files).
   Three ritual anchors:
     1. Hand on Jade (entry → questions)
     2. Six-Yao computation (six wood-fish beats + closing bell)
     3. AI divination begins (one distant bell)
   ============================================ */

const Soundscape = {
  ctx: null,
  muted: false,
  masterGain: null,
  _ready: false,

  init() {
    // Restore mute preference
    try {
      this.muted = localStorage.getItem('guanxiang.muted') === '1';
    } catch (e) { /* ignore */ }

    this._buildMuteToggle();

    // Audio ctx must be created after a user gesture — defer until first click.
    const unlock = () => {
      if (this._ready) return;
      this._initCtx();
      this._ready = true;
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
    document.addEventListener('click', unlock, true);
    document.addEventListener('touchstart', unlock, true);
  },

  _initCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.85;
    this.masterGain.connect(this.ctx.destination);

    // Music starts after context is unlocked
    if (typeof Music !== 'undefined') Music.start(this);
  },

  _buildMuteToggle() {
    const btn = document.createElement('button');
    btn.className = 'mute-toggle';
    btn.id = 'muteToggle';
    btn.setAttribute('aria-label', 'Toggle sound');
    btn.innerHTML = this.muted ? '🔇' : '🔊';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
      btn.innerHTML = this.muted ? '🔇' : '🔊';
    });
    document.body.appendChild(btn);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(
        this.muted ? 0 : 0.85, this.ctx.currentTime + 0.15);
    }
    try { localStorage.setItem('guanxiang.muted', this.muted ? '1' : '0'); } catch (e) {}
  },

  /* ──────────────────────────────────────────
     Synth primitives
     ────────────────────────────────────────── */

  // Singing bowl / bell — layered sines with long exponential decay.
  _bowl({ fundamental = 220, decay = 4.5, level = 0.35, detune = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const partials = [
      { ratio: 1,    gain: 1.00 },
      { ratio: 2.01, gain: 0.55 },
      { ratio: 3.02, gain: 0.30 },
      { ratio: 4.03, gain: 0.15 },
      { ratio: 5.95, gain: 0.08 },
    ];
    partials.forEach((p, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = fundamental * p.ratio;
      osc.detune.value = detune + (i * 2); // slight shimmer beats
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(level * p.gain, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + decay + 0.1);
    });
  },

  // Wood fish "笃" — short noise burst + low-mid resonance.
  _woodFish({ pitch = 320, level = 0.55 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.18;

    // Noise burst
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = pitch * 1.8;
    bp.Q.value = 6;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(level * 0.45, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

    noise.connect(bp).connect(noiseGain).connect(this.masterGain);
    noise.start(t0);
    noise.stop(t0 + dur);

    // Low resonant tone (the hollow "thunk")
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch * 1.4, t0);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, t0 + 0.12);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0, t0);
    oscGain.gain.linearRampToValueAtTime(level, t0 + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(oscGain).connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  },

  // Jade tap "叮" — short crystalline ping for option selection.
  _jadeTap({ pitch = 1240, level = 0.28 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.55;

    // Two detuned sines create the "tink" shimmer
    const freqs = [pitch, pitch * 1.504, pitch * 2.01];
    const gains = [1.0, 0.45, 0.18];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(level * gains[i], t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  },

  // Public: click/select feedback
  tap() { this._jadeTap(); },

  // Low breath / drone — slow fade, accompanies bowl on ritual 1.
  _breath({ freq = 70, duration = 2.2, level = 0.18 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Add a faint 5th for depth
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(level, t0 + duration * 0.4);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t0); osc2.start(t0);
    osc.stop(t0 + duration + 0.05);
    osc2.stop(t0 + duration + 0.05);
  },

  /* ──────────────────────────────────────────
     Ritual anchors
     ────────────────────────────────────────── */

  // Ritual 1 — 置手于玉 (entry → questions)
  ritualHandOnJade() {
    if (!this.ctx) return;
    if (typeof Music !== 'undefined') Music.duck(2.0);
    this._bowl({ fundamental: 196, decay: 5.5, level: 0.38 }); // G3 bowl
    this._breath({ freq: 65, duration: 2.8, level: 0.22 });
  },

  // Ritual 2 — 六爻推演: six escalating wood-fish beats + closing bell.
  // Call at the start of compute(). Internally schedules all timings.
  ritualSixYao() {
    if (!this.ctx) return;
    if (typeof Music !== 'undefined') Music.duck(4.0);
    // Yao animation timings: 600 + i*350 ms
    const pitches = [260, 275, 290, 305, 320, 340]; // ascending tension
    pitches.forEach((p, i) => {
      setTimeout(() => this._woodFish({ pitch: p, level: 0.5 + i * 0.04 }),
                 600 + i * 350);
    });
    // Final bowl/bell at hexagram reveal (~600 + 6*350 + 200 = 2900)
    setTimeout(() => {
      this._bowl({ fundamental: 330, decay: 5.0, level: 0.42 }); // E4 — brighter
    }, 600 + 6 * 350 + 200);
  },

  // Ritual 3 — AI 辨证: one distant contemplative bell.
  ritualDivination() {
    if (!this.ctx) return;
    if (typeof Music !== 'undefined') Music.duck(3.0);
    this._bowl({ fundamental: 147, decay: 6.0, level: 0.32 }); // D3 — low, pensive
  },
};

document.addEventListener('DOMContentLoaded', () => Soundscape.init());

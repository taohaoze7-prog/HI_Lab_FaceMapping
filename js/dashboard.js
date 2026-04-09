/* ============================================
   DASHBOARD — Screen 2 Interactions
   ============================================ */

const Dashboard = {
  matchEl: null,
  waveCanvas: null,
  waveCtx: null,
  waveAnimId: null,

  init() {
    this.matchEl = document.getElementById('matchPct');
    this.waveCanvas = document.getElementById('waveCanvas');

    if (this.waveCanvas) {
      this.waveCtx = this.waveCanvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = this.waveCanvas.getBoundingClientRect();
      this.waveCanvas.width = rect.width * dpr;
      this.waveCanvas.height = rect.height * dpr;
      this.waveCtx.scale(dpr, dpr);
    }

    // Interactive toggles
    this.setupToggles();
  },

  onEnter() {
    // Animate radar chart
    setTimeout(() => RadarChart.animateIn(), 1000);

    // Animate match percentage
    setTimeout(() => this.animateMatch(90), 1500);

    // Start voice wave animation
    setTimeout(() => this.startWave(), 800);
  },

  animateMatch(target) {
    if (!this.matchEl) return;
    let current = 0;
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      current = Math.round(target * ease);
      this.matchEl.textContent = current;

      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  },

  startWave() {
    if (!this.waveCtx) return;
    const ctx = this.waveCtx;
    const rect = this.waveCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    let phase = 0;

    const drawWave = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();

      const mid = h / 2;
      const bars = 60;
      const barWidth = w / bars;

      for (let i = 0; i < bars; i++) {
        const x = i * barWidth;
        const noise = Math.sin(i * 0.3 + phase) * Math.cos(i * 0.15 + phase * 0.7);
        const amp = (Math.random() * 0.3 + 0.7) * noise;
        const barH = Math.abs(amp) * (h * 0.4) + 2;

        ctx.fillStyle = `rgba(0, 200, 255, ${0.3 + Math.abs(amp) * 0.5})`;
        ctx.fillRect(x + 1, mid - barH / 2, barWidth - 2, barH);
      }

      phase += 0.06;
      this.waveAnimId = requestAnimationFrame(drawWave);
    };

    drawWave();
  },

  stopWave() {
    if (this.waveAnimId) {
      cancelAnimationFrame(this.waveAnimId);
      this.waveAnimId = null;
    }
  },

  setupToggles() {
    // Shape options toggle
    document.querySelectorAll('.shape-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        opt.parentElement.querySelectorAll('.shape-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });

    // Toggle buttons
    document.querySelectorAll('.toggle-group').forEach(group => {
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    });

    // Voice tags
    document.querySelectorAll('.vtag').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('active');
      });
    });

    // Tactile buttons
    document.querySelectorAll('.tact-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.parentElement.querySelectorAll('.tact-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Sleep positions
    document.querySelectorAll('.sleep-pos').forEach(pos => {
      pos.addEventListener('click', () => {
        pos.parentElement.querySelectorAll('.sleep-pos').forEach(p => p.classList.remove('active'));
        pos.classList.add('active');
      });
    });

    // Habits checkboxes update radar
    document.querySelectorAll('.habit-check input').forEach(cb => {
      cb.addEventListener('change', () => {
        this.updateFromInputs();
      });
    });
  },

  updateFromInputs() {
    // Simulate radar update based on checked habits
    const checked = document.querySelectorAll('.habit-check input:checked').length;
    const total = document.querySelectorAll('.habit-check input').length;
    const ratio = checked / total;

    const newValues = [
      0.5 + Math.random() * 0.4,
      0.3 + ratio * 0.5,
      0.4 + Math.random() * 0.3,
      0.2 + (1 - ratio) * 0.5,
      0.5 + ratio * 0.3,
    ];

    RadarChart.setValues(newValues);

    // Update match percentage
    const match = Math.round(60 + ratio * 30 + Math.random() * 10);
    this.animateMatch(match);
  }
};

/* ============================================
   APP.JS — Screen Router, Navigation,
   Bagua Interactions, Voice Wave
   ============================================ */

const App = {
  currentScreen: 0,
  totalScreens: 3,
  screens: null,
  dots: null,
  transitioning: false,
  miniWaveId: null,

  init() {
    this.screens = document.querySelectorAll('.screen');
    this.dots = document.querySelectorAll('.nav-dot');

    // Nav dots
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        this.goTo(parseInt(dot.dataset.screen));
      });
    });

    // Nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.dir === 'next') this.next();
        else this.prev();
      });
    });

    // Screen 1 enter button
    document.getElementById('enterDiagBtn').addEventListener('click', () => this.goTo(1));

    // Screen 2 compute button
    document.getElementById('computeBtn').addEventListener('click', () => this.compute());

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
    });

    // Bagua panel interactions
    this.setupBaguaInteractions();

    // Posture slider
    const slider = document.getElementById('postureSlider');
    if (slider) {
      slider.addEventListener('input', () => {
        const v = parseInt(slider.value);
        const tag = document.getElementById('postureTag');
        if (v < 30) tag.textContent = '前倾型';
        else if (v > 70) tag.textContent = '后仰型';
        else tag.textContent = '中正';
      });
    }

    // Init radar
    RadarChart.init();
  },

  goTo(idx) {
    if (idx === this.currentScreen || this.transitioning) return;
    if (idx < 0 || idx >= this.totalScreens) return;

    this.transitioning = true;

    this.screens[this.currentScreen].classList.remove('active');
    this.dots[this.currentScreen].classList.remove('active');

    setTimeout(() => {
      this.currentScreen = idx;
      this.screens[idx].classList.add('active');
      this.dots[idx].classList.add('active');

      // Screen-specific triggers
      if (idx === 1) this.onEnterScreen2();
      if (idx === 2) this.onEnterScreen3();

      this.transitioning = false;
    }, 400);
  },

  next() {
    if (this.currentScreen < this.totalScreens - 1) this.goTo(this.currentScreen + 1);
  },

  prev() {
    if (this.currentScreen > 0) this.goTo(this.currentScreen - 1);
  },

  // ---- Screen 2 ----

  onEnterScreen2() {
    // Start mini voice wave
    this.startMiniWave();
  },

  setupBaguaInteractions() {
    // All gua-opt buttons: mutual exclusive within their parent
    document.querySelectorAll('.gua-options').forEach(group => {
      group.querySelectorAll('.gua-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.gua-opt').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          // Visual feedback: brief warm pulse on taiji
          const taiji = document.querySelector('.taiji-svg');
          if (taiji) {
            taiji.style.filter = 'drop-shadow(0 0 15px rgba(200,160,96,0.3))';
            setTimeout(() => taiji.style.filter = '', 300);
          }
        });
      });
    });
  },

  startMiniWave() {
    const canvas = document.getElementById('miniWave');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 140 * dpr;
    canvas.height = 40 * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 140, 40);
      const bars = 30;
      const barW = 140 / bars;

      for (let i = 0; i < bars; i++) {
        const noise = Math.sin(i * 0.35 + phase) * Math.cos(i * 0.18 + phase * 0.6);
        const amp = Math.abs(noise);
        const h = amp * 16 + 2;

        ctx.fillStyle = `rgba(200, 160, 96, ${0.15 + amp * 0.35})`;
        ctx.fillRect(i * barW + 1, 20 - h / 2, barW - 2, h);
      }

      phase += 0.07;
      this.miniWaveId = requestAnimationFrame(draw);
    };
    draw();
  },

  // ---- Compute & Transition to Screen 3 ----

  compute() {
    const btn = document.getElementById('computeBtn');
    btn.classList.add('computing');

    // Simulate "quantum collapse" computation delay
    setTimeout(() => {
      const result = IChing.computeFromInputs();
      btn.classList.remove('computing');

      // Navigate to screen 3
      this.goTo(2);

      // Render talisman after transition
      setTimeout(() => Talisman.render(result), 600);
    }, 1800);
  },

  onEnterScreen3() {
    // Radar and talisman rendering handled by Talisman.render()
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

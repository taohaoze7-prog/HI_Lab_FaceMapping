/* ============================================
   RADAR CHART — 五行雷达图 (Bagua-inspired)
   With ink-wash aesthetic and jade glow
   ============================================ */

const RadarChart = {
  canvas: null,
  ctx: null,
  cx: 150,
  cy: 150,
  radius: 110,
  labels: ['金 Metal', '木 Wood', '火 Fire', '土 Earth', '水 Water'],
  keys: ['metal', 'wood', 'fire', 'earth', 'water'],
  colors: {
    metal: '#a8a8a0',
    wood:  '#6a9e6e',
    fire:  '#c45c4a',
    earth: '#c8a060',
    water: '#5a8ab4',
  },
  currentValues: [0, 0, 0, 0, 0],
  targetValues:  [0.5, 0.5, 0.5, 0.5, 0.5],
  animating: false,

  init() {
    this.canvas = document.getElementById('radarCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.cx = rect.width / 2;
    this.cy = rect.height / 2;
    this.radius = Math.min(rect.width, rect.height) / 2 - 40;

    this.draw();
  },

  getPoint(index, value) {
    const angle = (Math.PI * 2 / 5) * index - Math.PI / 2;
    return {
      x: this.cx + Math.cos(angle) * this.radius * value,
      y: this.cy + Math.sin(angle) * this.radius * value,
    };
  },

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.getBoundingClientRect().width;
    const h = this.canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    // Bagua outer frame (octagon hint)
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
      const x = this.cx + Math.cos(angle) * (this.radius + 12);
      const y = this.cy + Math.sin(angle) * (this.radius + 12);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(200, 190, 170, 0.06)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Concentric rings (pentagon)
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      const scale = ring / 5;
      for (let i = 0; i <= 5; i++) {
        const p = this.getPoint(i % 5, scale);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(200, 190, 170, ${0.04 + ring * 0.02})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Axis lines with element colors
    for (let i = 0; i < 5; i++) {
      const p = this.getPoint(i, 1);
      const color = this.colors[this.keys[i]];
      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, 0.15)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Element endpoint marker
      const ep = this.getPoint(i, 1.05);
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.5)`;
      ctx.fill();

      // Element label
      const lp = this.getPoint(i, 1.2);
      ctx.font = '11px "Noto Sans SC"';
      ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.7)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.labels[i], lp.x, lp.y);
    }

    // Data area
    if (this.currentValues.some(v => v > 0)) {
      // Glow layer
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const p = this.getPoint(i % 5, this.currentValues[i % 5]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 190, 170, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 190, 170, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Main data fill
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const p = this.getPoint(i % 5, this.currentValues[i % 5]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.radius);
      grad.addColorStop(0, 'rgba(200, 160, 96, 0.12)');
      grad.addColorStop(0.7, 'rgba(200, 160, 96, 0.06)');
      grad.addColorStop(1, 'rgba(200, 160, 96, 0.02)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(200, 160, 96, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Data points with colored glow
      for (let i = 0; i < 5; i++) {
        const p = this.getPoint(i, this.currentValues[i]);
        const color = this.colors[this.keys[i]];

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.15)`;
        ctx.fill();

        // Inner point
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Value text
        const vp = this.getPoint(i, this.currentValues[i] + 0.12);
        ctx.font = '9px "DM Sans"';
        ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.6)`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(this.currentValues[i] * 100), vp.x, vp.y);
      }
    }

    // Center yin-yang symbol
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 190, 170, 0.1)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 190, 170, 0.4)';
    ctx.fill();
  },

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
  },

  animateIn(targetObj) {
    if (targetObj) {
      this.targetValues = this.keys.map(k => targetObj[k] || 0.3);
    }

    if (this.animating) return;
    this.animating = true;
    this.currentValues = [0, 0, 0, 0, 0];

    const duration = 1500;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      for (let i = 0; i < 5; i++) {
        this.currentValues[i] = this.targetValues[i] * ease;
      }

      this.draw();

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this.animating = false;
      }
    };

    requestAnimationFrame(tick);
  },

  setValues(targetObj) {
    this.targetValues = this.keys.map(k => targetObj[k] || 0.3);
    this.animateIn();
  }
};

/* ============================================
   CODE RAIN — 墨色代码雨 (Ink Code Rain)
   Uses Chinese characters + hexagram symbols
   ============================================ */

const CodeRain = {
  canvas: null,
  ctx: null,
  columns: [],
  fontSize: 14,
  chars: '天地玄黄宇宙洪荒日月盈昃辰宿列張寒來暑往秋收冬藏閏餘成歲律呂調陽金木水火土乾坤震巽坎離艮兌☰☱☲☳☴☵☶☷陰陽氣血經絡脈象望聞問切'.split(''),

  init() {
    this.canvas = document.getElementById('codeRain');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);

    const colCount = Math.floor(window.innerWidth / this.fontSize);
    this.columns = Array(colCount).fill(0).map(() => Math.random() * -100);
  },

  animate() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Fade — pure black wash
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < this.columns.length; i++) {
      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      const y = this.columns[i] * this.fontSize;

      // Warm ivory — barely visible texture, not a feature
      const alpha = 0.08 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(200, 190, 170, ${alpha})`;
      ctx.font = `${this.fontSize}px "Noto Sans SC", monospace`;
      ctx.fillText(char, x, y);

      // Reset column randomly when it goes off screen
      if (y > h && Math.random() > 0.975) {
        this.columns[i] = 0;
      }
      this.columns[i] += 0.5 + Math.random() * 0.3; // Slower, more meditative
    }

    requestAnimationFrame(() => this.animate());
  }
};

document.addEventListener('DOMContentLoaded', () => CodeRain.init());

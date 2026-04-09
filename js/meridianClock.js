/* ============================================
   MERIDIAN CLOCK — 子午流注时钟
   Based on 《黄帝内经》 twelve-hour meridian flow
   ============================================ */

const MeridianClock = {
  canvas: null,
  ctx: null,
  cx: 320,
  cy: 320,
  radius: 290,

  // 十二时辰 → 经络映射
  meridians: [
    { hour: 23, name: '胆经',       organ: '胆', full: '足少阳胆经',       color: '#4caf50', time: '23:00-01:00', advice: '宜入睡，胆汁代谢' },
    { hour: 1,  name: '肝经',       organ: '肝', full: '足厥阴肝经',       color: '#2e7d32', time: '01:00-03:00', advice: '深睡解毒，忌熬夜' },
    { hour: 3,  name: '肺经',       organ: '肺', full: '手太阴肺经',       color: '#c0c0c0', time: '03:00-05:00', advice: '肺主呼吸，宜深睡' },
    { hour: 5,  name: '大肠经',     organ: '肠', full: '手阳明大肠经',     color: '#e0e0e0', time: '05:00-07:00', advice: '宜排便，饮温水' },
    { hour: 7,  name: '胃经',       organ: '胃', full: '足阳明胃经',       color: '#c8a84e', time: '07:00-09:00', advice: '宜进早餐，营养吸收' },
    { hour: 9,  name: '脾经',       organ: '脾', full: '足太阴脾经',       color: '#a08030', time: '09:00-11:00', advice: '脾主运化，宜思考' },
    { hour: 11, name: '心经',       organ: '心', full: '手少阴心经',       color: '#f44336', time: '11:00-13:00', advice: '宜静养，忌大汗' },
    { hour: 13, name: '小肠经',     organ: '腸', full: '手太阳小肠经',     color: '#ff7043', time: '13:00-15:00', advice: '宜午休，吸收营养' },
    { hour: 15, name: '膀胱经',     organ: '膀', full: '足太阳膀胱经',     color: '#2196f3', time: '15:00-17:00', advice: '宜饮水，排毒代谢' },
    { hour: 17, name: '肾经',       organ: '肾', full: '足少阴肾经',       color: '#1565c0', time: '17:00-19:00', advice: '宜补肾，忌过劳' },
    { hour: 19, name: '心包经',     organ: '包', full: '手厥阴心包经',     color: '#e91e63', time: '19:00-21:00', advice: '宜散步，愉悦心情' },
    { hour: 21, name: '三焦经',     organ: '焦', full: '手少阳三焦经',     color: '#9c27b0', time: '21:00-23:00', advice: '宜放松，准备入睡' },
  ],

  init() {
    this.canvas = document.getElementById('meridianClock');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = 640 * dpr;
    this.canvas.height = 640 * dpr;
    this.canvas.style.width = '640px';
    this.canvas.style.height = '640px';
    this.ctx.scale(dpr, dpr);

    this.draw();
    setInterval(() => this.draw(), 1000);
    this.updateHUD();
    setInterval(() => this.updateHUD(), 1000);
  },

  getCurrentMeridian() {
    const now = new Date();
    const h = now.getHours();
    // Find which meridian is active
    for (let i = this.meridians.length - 1; i >= 0; i--) {
      if (h >= this.meridians[i].hour) return this.meridians[i];
    }
    return this.meridians[this.meridians.length - 1]; // wrap around (23:00)
  },

  updateHUD() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const timeEl = document.getElementById('hudTime');
    if (timeEl) timeEl.textContent = timeStr;

    const m = this.getCurrentMeridian();
    const meridianEl = document.getElementById('hudMeridian');
    if (meridianEl) meridianEl.textContent = `${m.name}当令`;

    // Update floating meridian info
    const organEl = document.getElementById('mcOrgan');
    if (organEl) {
      organEl.textContent = m.organ;
      // Use warm gold for all organs — consistent palette
      organEl.style.color = '';
    }
    const nameEl = document.getElementById('mcName');
    if (nameEl) nameEl.textContent = m.full;
    const timeInfoEl = document.getElementById('mcTime');
    if (timeInfoEl) timeInfoEl.textContent = m.time;
    const adviceEl = document.getElementById('mcAdvice');
    if (adviceEl) adviceEl.textContent = m.advice;
  },

  draw() {
    const ctx = this.ctx;
    const cx = this.cx, cy = this.cy, r = this.radius;
    ctx.clearRect(0, 0, 640, 640);

    const current = this.getCurrentMeridian();
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();

    // Warm ivory base color for all clock elements
    const warmBase = '232, 228, 222';

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${warmBase}, 0.04)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${warmBase}, 0.02)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Draw 12 meridian segments
    this.meridians.forEach((m, i) => {
      const angle1 = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const angle2 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
      const midAngle = (angle1 + angle2) / 2;
      const isActive = m === current;

      // Segment arc
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.92, angle1, angle2);
      ctx.strokeStyle = isActive
        ? `rgba(200, 160, 96, 0.5)`
        : `rgba(${warmBase}, 0.04)`;
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Active glow — very subtle
      if (isActive) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.92, angle1, angle2);
        ctx.strokeStyle = 'rgba(200, 160, 96, 0.08)';
        ctx.lineWidth = 14;
        ctx.stroke();
      }

      // Tick marks — hair-thin
      ctx.beginPath();
      const tx1 = cx + Math.cos(angle1) * r * 0.96;
      const ty1 = cy + Math.sin(angle1) * r * 0.96;
      const tx2 = cx + Math.cos(angle1) * r * 0.88;
      const ty2 = cy + Math.sin(angle1) * r * 0.88;
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = `rgba(${warmBase}, 0.06)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Organ label
      const labelR = r * 0.75;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;

      ctx.save();
      ctx.font = isActive ? '500 13px "Noto Sans SC"' : '300 10px "Noto Sans SC"';
      ctx.fillStyle = isActive ? 'rgba(200, 160, 96, 0.6)' : `rgba(${warmBase}, 0.08)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.name, lx, ly);
      ctx.restore();
    });

    // Clock hand — thin, warm gold
    const handAngle = (totalMinutes / (24 * 60)) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const hx = cx + Math.cos(handAngle) * r * 0.55;
    const hy = cy + Math.sin(handAngle) * r * 0.55;
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = 'rgba(200, 160, 96, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hand tip
    ctx.beginPath();
    ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 160, 96, 0.5)';
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${warmBase}, 0.15)`;
    ctx.fill();
  },

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
  }
};

document.addEventListener('DOMContentLoaded', () => MeridianClock.init());

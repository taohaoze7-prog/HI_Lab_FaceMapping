/* ============================================
   FACE MAPPING — Screen 1 Scan Animation
   ============================================ */

const FaceMapping = {
  palaces: [
    { id: 'mingGong',   zh: '命宫',   en: 'Life Palace',     x: 50,  y: 195, side: 'left' },
    { id: 'fuqi',       zh: '夫妻宫', en: 'Spouse Palace',   x: 305, y: 90,  side: 'right' },
    { id: 'caibo',      zh: '财帛宫', en: 'Wealth Palace',   x: 40,  y: 260, side: 'left' },
    { id: 'tianzhai',   zh: '田宅宫', en: 'Property Palace', x: 30,  y: 310, side: 'left' },
    { id: 'fumu',       zh: '父母宫', en: 'Parents Palace',  x: 20,  y: 370, side: 'left' },
    { id: 'guanlu',     zh: '官禄宫', en: 'Career Palace',   x: 310, y: 370, side: 'right' },
  ],

  scanBtn: null,
  statusLine: null,
  progressBar: null,
  proceedBtn: null,
  faceOutline: null,
  scanLine: null,

  init() {
    this.scanBtn = document.getElementById('scanBtn');
    this.statusLine = document.getElementById('statusLine');
    this.progressBar = document.getElementById('progressBar');
    this.proceedBtn = document.getElementById('proceedBtn');
    this.faceOutline = document.querySelector('.face-outline');
    this.scanLine = document.getElementById('scanLine');

    // Create palace markers
    this.createPalaceMarkers();

    // Bind scan button
    this.scanBtn.addEventListener('click', () => this.startScan());
  },

  createPalaceMarkers() {
    const container = document.getElementById('palaceMarkers');
    this.palaces.forEach(p => {
      const marker = document.createElement('div');
      marker.className = `palace-marker ${p.side}`;
      marker.id = `palace-${p.id}`;
      marker.style.left = `${p.x}px`;
      marker.style.top = `${p.y}px`;

      if (p.side === 'left') {
        marker.innerHTML = `
          <div class="palace-info">
            <span class="palace-zh">${p.zh}</span>
            <span class="palace-en">${p.en}</span>
          </div>
          <div class="palace-line"></div>
          <div class="palace-dot"></div>
        `;
      } else {
        marker.innerHTML = `
          <div class="palace-dot"></div>
          <div class="palace-line"></div>
          <div class="palace-info">
            <span class="palace-zh">${p.zh}</span>
            <span class="palace-en">${p.en}</span>
          </div>
        `;
      }

      container.appendChild(marker);
    });
  },

  async startScan() {
    // Hide scan button
    this.scanBtn.classList.add('hidden');

    // Step 1: Face wireframe reveal
    await this.step('INITIALIZING FACE MESH...', 10, async () => {
      this.faceOutline.classList.add('revealed');
      await this.delay(1500);
    });

    // Step 2: Scan line
    await this.step('SCANNING FACIAL STRUCTURE...', 30, async () => {
      this.scanLine.classList.add('scanning');
      await this.delay(2000);
      this.scanLine.classList.remove('scanning');
    });

    // Step 3: Crosshairs
    await this.step('LOCKING TARGET COORDINATES...', 40, async () => {
      document.querySelectorAll('.crosshair').forEach(ch => {
        ch.classList.add('visible');
      });
      await this.delay(600);
    });

    // Step 4: Feature marks
    await this.step('DETECTING FACIAL FEATURES...', 55, async () => {
      const features = document.querySelectorAll('.feature-mark');
      for (let i = 0; i < features.length; i++) {
        features[i].classList.add('visible');
        await this.delay(150);
      }
    });

    // Step 5: Three compartments
    await this.step('MAPPING THREE COMPARTMENTS...', 70, async () => {
      document.querySelectorAll('.compartment-line').forEach(l => l.classList.add('visible'));
      document.querySelectorAll('.comp-label').forEach(l => l.classList.add('visible'));
      await this.delay(800);
    });

    // Step 6: Five eyes
    await this.step('CALCULATING FIVE EYES RATIO...', 80, async () => {
      const lines = document.querySelectorAll('.eye-line');
      for (let i = 0; i < lines.length; i++) {
        lines[i].classList.add('visible');
        await this.delay(150);
      }
      document.querySelector('.five-eyes-label').classList.add('visible');
      await this.delay(400);
    });

    // Step 7: Palace markers one by one
    await this.step('IDENTIFYING TWELVE PALACES...', 90, async () => {
      const markers = document.querySelectorAll('.palace-marker');
      for (let i = 0; i < markers.length; i++) {
        markers[i].classList.add('visible');
        await this.delay(400);
      }
    });

    // Complete
    this.statusLine.textContent = 'SCAN COMPLETE — READY FOR ANALYSIS';
    this.statusLine.style.color = '#00ff88';
    this.progressBar.style.width = '100%';
    this.progressBar.style.background = 'linear-gradient(90deg, #00ff88, #00c8ff)';

    // Show proceed button
    await this.delay(500);
    this.proceedBtn.classList.add('visible');
  },

  async step(message, progress, action) {
    this.statusLine.textContent = message;
    this.progressBar.style.width = `${progress}%`;
    await action();
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/* ============================================
   TALISMAN — 符箓输出 & Screen 3 renderer
   Draws hexagram lines, updates diagnosis text,
   mapping table, and tips
   ============================================ */

const Talisman = {
  lastResult: null,

  /**
   * Render the full talisman output from a computation result
   */
  render(result) {
    this.lastResult = result;
    const hex = result.hexagram;
    const diag = IChing.generateDiagnosis(result);

    // Title & subtitle
    document.getElementById('hexagramName').textContent = hex.title;
    document.getElementById('hexagramDesc').textContent = `第${hex.num}卦 · ${hex.name}卦 · ${hex.nature}`;

    // Binary visual (yao lines as text)
    const yaoChars = result.binary.split('').map(b => b === '1' ? '━━━' : '━ ━').join('  ');
    document.getElementById('hexagramBinary').textContent = yaoChars;

    // Draw hexagram lines in SVG
    this.drawHexagramLines(result.binary);

    // Diagnosis text
    document.getElementById('diagLine1').textContent = diag.line1;
    document.getElementById('diagLine2').textContent = diag.line2;
    document.getElementById('diagLine3').textContent = diag.line3;
    document.getElementById('talismanCalligraphy').textContent = diag.calligraphy;
    document.getElementById('sealText').textContent = hex.name;
    document.getElementById('costLine1').textContent = diag.cost1;
    document.getElementById('costLine2').textContent = diag.cost2;

    // Radar chart
    RadarChart.animateIn(result.weights);

    // Match percentage
    this.animateMatch(this.calculateConfidence(result));

    // Match circle
    this.animateMatchCircle(this.calculateConfidence(result));

    // Mapping table
    this.renderMappingTable(result);

    // Tips
    this.renderTips(result);
  },

  /**
   * Draw the 6 yao lines inside the talisman SVG
   */
  drawHexagramLines(binary) {
    const container = document.getElementById('hexagramLines');
    container.innerHTML = '';

    const lineWidth = 80;
    const gapWidth = 12;
    const lineHeight = 5;
    const spacing = 18;

    // Draw from bottom to top (line 1 at bottom)
    for (let i = 5; i >= 0; i--) {
      const y = (5 - i) * spacing;
      const isYang = binary[i] === '1';
      const yaoColors = {
        yang: 'rgba(0, 200, 180, 0.7)',
        yin:  'rgba(200, 168, 78, 0.5)',
      };

      if (isYang) {
        // Yang line: solid
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '10');
        rect.setAttribute('y', y.toString());
        rect.setAttribute('width', lineWidth.toString());
        rect.setAttribute('height', lineHeight.toString());
        rect.setAttribute('rx', '2');
        rect.setAttribute('fill', yaoColors.yang);
        rect.style.opacity = '0';
        rect.style.transition = `opacity 0.5s ease ${(5 - i) * 0.15}s`;
        container.appendChild(rect);
        requestAnimationFrame(() => rect.style.opacity = '1');
      } else {
        // Yin line: broken (two segments)
        const segW = (lineWidth - gapWidth) / 2;
        for (let s = 0; s < 2; s++) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', (10 + s * (segW + gapWidth)).toString());
          rect.setAttribute('y', y.toString());
          rect.setAttribute('width', segW.toString());
          rect.setAttribute('height', lineHeight.toString());
          rect.setAttribute('rx', '2');
          rect.setAttribute('fill', yaoColors.yin);
          rect.style.opacity = '0';
          rect.style.transition = `opacity 0.5s ease ${(5 - i) * 0.15}s`;
          container.appendChild(rect);
          requestAnimationFrame(() => rect.style.opacity = '1');
        }
      }
    }
  },

  /**
   * Calculate confidence score
   */
  calculateConfidence(result) {
    const w = result.weights;
    const values = Object.values(w);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const spread = max - min;

    // Higher spread = more distinct profile = higher confidence
    const base = 65;
    const bonus = spread * 40;
    return Math.min(Math.round(base + bonus + Math.random() * 8), 98);
  },

  /**
   * Animate match percentage number
   */
  animateMatch(target) {
    const el = document.getElementById('matchPct');
    if (!el) return;

    let current = 0;
    const duration = 1800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      current = Math.round(target * ease);
      el.textContent = current;
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  },

  /**
   * Animate the SVG ring
   */
  animateMatchCircle(target) {
    const circle = document.getElementById('matchCircle');
    if (!circle) return;

    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference * (1 - target / 100);

    circle.style.transition = 'none';
    circle.setAttribute('stroke-dashoffset', circumference.toString());

    requestAnimationFrame(() => {
      circle.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      circle.setAttribute('stroke-dashoffset', offset.toString());
    });
  },

  /**
   * Render mapping table
   */
  renderMappingTable(result) {
    const container = document.getElementById('mapRows');
    const mappings = IChing.getMappingTable(result);

    container.innerHTML = '';

    mappings.forEach((m, i) => {
      const row = document.createElement('div');
      row.className = 'map-row-item';
      row.style.opacity = '0';
      row.style.transform = 'translateX(-10px)';
      row.style.transition = `all 0.4s ease ${0.3 + i * 0.15}s`;

      row.innerHTML = `
        <div class="map-trait">${m.trait}</div>
        <div class="map-elem ${m.element}">${m.elementChar}</div>
        <div class="map-cost">${m.cost}</div>
      `;

      container.appendChild(row);
      requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      });
    });

    // If no mappings, show default
    if (mappings.length === 0) {
      container.innerHTML = `
        <div class="map-row-item">
          <div class="map-trait">综合分析</div>
          <div class="map-elem ${result.hexagram.element}">${this.getElemChar(result.hexagram.element)}</div>
          <div class="map-cost">${result.hexagram.nature}</div>
        </div>
      `;
    }
  },

  getElemChar(elem) {
    return { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' }[elem] || '？';
  },

  /**
   * Render tips
   */
  renderTips(result) {
    const container = document.getElementById('tipItems');
    const tips = IChing.generateTips(result);

    container.innerHTML = '';
    tips.forEach((tip, i) => {
      const item = document.createElement('div');
      item.className = 'tip-item';
      item.style.opacity = '0';
      item.style.transition = `opacity 0.5s ease ${0.5 + i * 0.2}s`;
      item.innerHTML = `
        <span class="tip-icon">${tip.icon}</span>
        <span>${tip.text}</span>
      `;
      container.appendChild(item);
      requestAnimationFrame(() => item.style.opacity = '1');
    });
  }
};

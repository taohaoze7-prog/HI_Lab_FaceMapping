/* ============================================
   THE CHAMBER v3 — 玉匣交互引擎
   Full-screen result + AI analyst trigger.
   ============================================ */

const Chamber = {
  currentQuestion: 0,
  answers: {},
  lastResult: null,
  headScene: null,

  elemGuess: {
    round: 'earth', square: 'metal', oval: 'wood', long: 'water',
    red: 'fire', pale: 'metal', yellow: 'earth', dark: 'water',
    deep: 'water', high: 'fire', fast: 'wood', slow: 'earth',
    joy: 'fire', anger: 'wood', worry: 'earth', grief: 'metal', fear: 'water',
    sour: 'wood', bitter: 'fire', sweet: 'earth', spicy: 'metal', salty: 'water',
    good: 'earth', light: 'wood', dream: 'fire', insomnia: 'water',
  },

  examNames: { '望': '望诊', '闻': '闻诊', '问': '问诊', '切': '切诊' },

  questions: [
    {
      exam: '望', label: '面形', desc: '观察面部轮廓形态',
      cite: '《灵枢·五色》："以五色命脏，青为肝，赤为心，白为肺，黄为脾，黑为肾。"',
      key: 'faceShape', pointIndex: 1,
      options: [
        { text: '圆润', value: 'round', sub: '土', elem: 'earth' },
        { text: '方正', value: 'square', sub: '金', elem: 'metal' },
        { text: '椭圆', value: 'oval', sub: '木', elem: 'wood' },
        { text: '修长', value: 'long', sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '望', label: '气色', desc: '面部气血色泽判断',
      cite: '《素问·脉要精微论》："夫精明五色者，气之华也。"',
      key: 'complexion', pointIndex: 6,
      options: [
        { text: '红润', value: 'red', sub: '火', elem: 'fire' },
        { text: '苍白', value: 'pale', sub: '金', elem: 'metal' },
        { text: '偏黄', value: 'yellow', sub: '土', elem: 'earth' },
        { text: '暗沉', value: 'dark', sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '闻', label: '声纹', desc: '声音质地与气息强弱',
      cite: '《素问·阴阳应象大论》："肝在声为呼，心在声为笑，脾在声为歌。"',
      key: 'voice', pointIndex: 4,
      options: [
        { text: '低沉', value: 'deep', sub: '水', elem: 'water' },
        { text: '高亢', value: 'high', sub: '火', elem: 'fire' },
        { text: '急促', value: 'fast', sub: '木', elem: 'wood' },
        { text: '和缓', value: 'slow', sub: '土', elem: 'earth' },
      ]
    },
    {
      exam: '问', label: '情志', desc: '近期主导情绪状态',
      cite: '《素问·举痛论》："怒则气上，喜则气缓，悲则气消，恐则气下。"',
      key: 'emotion', pointIndex: 2,
      options: [
        { text: '喜', value: 'joy', sub: '火', elem: 'fire' },
        { text: '怒', value: 'anger', sub: '木', elem: 'wood' },
        { text: '思虑', value: 'worry', sub: '土', elem: 'earth' },
        { text: '悲', value: 'grief', sub: '金', elem: 'metal' },
        { text: '恐', value: 'fear', sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '问', label: '饮食', desc: '近期偏好的口味',
      cite: '《素问·宣明五气》："酸入肝，辛入肺，苦入心，咸入肾，甘入脾。"',
      key: 'taste', pointIndex: 5,
      options: [
        { text: '酸', value: 'sour', sub: '木', elem: 'wood' },
        { text: '苦', value: 'bitter', sub: '火', elem: 'fire' },
        { text: '甘', value: 'sweet', sub: '土', elem: 'earth' },
        { text: '辛', value: 'spicy', sub: '金', elem: 'metal' },
        { text: '咸', value: 'salty', sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '切', label: '睡眠', desc: '近期睡眠质量状态',
      cite: '《灵枢·口问》："阳气尽，阴气盛，则目瞑；阴气尽，阳气盛，则寤矣。"',
      key: 'sleep', pointIndex: 0,
      options: [
        { text: '安眠', value: 'good', sub: '土', elem: 'earth' },
        { text: '浅眠', value: 'light', sub: '木', elem: 'wood' },
        { text: '多梦', value: 'dream', sub: '火', elem: 'fire' },
        { text: '失眠', value: 'insomnia', sub: '水', elem: 'water' },
      ]
    },
  ],

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    document.getElementById('startBtn').addEventListener('click', () => this.startQuestions());
    document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    document.getElementById('restartBtn2').addEventListener('click', () => this.restart());
    document.getElementById('deepBtn').addEventListener('click', () => this.triggerDeepAnalysis());

    const progress = document.getElementById('qProgress');
    this.questions.forEach(() => {
      const dot = document.createElement('span');
      dot.className = 'q-dot';
      progress.appendChild(dot);
    });

    RadarChart.init();
  },

  updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const el = document.getElementById('topClock');
    if (el) el.textContent = `${h}:${m}`;
  },

  setPhase(phase) {
    document.body.dataset.phase = phase;
  },

  startQuestions() {
    this.currentQuestion = 0;
    this.answers = {};
    this.setPhase('questions');
    document.querySelectorAll('.q-dot').forEach(d => d.className = 'q-dot');
    setTimeout(() => this.showQuestion(0), 800);
  },

  showQuestion(index) {
    if (index >= this.questions.length) {
      this.compute();
      return;
    }

    const q = this.questions[index];
    const card = document.getElementById('qCard');

    document.getElementById('qExam').textContent = q.exam;
    document.getElementById('qLabel').textContent = q.label;
    document.getElementById('qDesc').textContent = q.desc;
    document.getElementById('qCite').textContent = q.cite || '';
    document.getElementById('qStepNum').textContent = (index + 1).toString().padStart(2, '0');
    document.getElementById('qStepExam').textContent = this.examNames[q.exam] || q.exam;

    const optionsEl = document.getElementById('qOptions');
    optionsEl.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'q-opt';
      btn.dataset.elem = opt.elem || '';
      btn.innerHTML = `
        <span class="q-opt-text">${opt.text}</span>
        <span class="q-opt-sub">${opt.sub || ''}</span>
      `;
      btn.addEventListener('click', () => {
        this.selectAnswer(index, opt);
        optionsEl.querySelectorAll('.q-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      optionsEl.appendChild(btn);
    });

    document.querySelectorAll('.q-dot').forEach((dot, i) => {
      dot.classList.remove('active');
      if (i < index) dot.classList.add('done');
      if (i === index) dot.classList.add('active');
    });

    card.classList.remove('visible', 'exiting');
    void card.offsetWidth;
    card.classList.add('visible');
  },

  selectAnswer(index, opt) {
    const q = this.questions[index];
    this.answers[q.key] = {
      value: opt.value,
      text: opt.text,
      element: opt.elem || this.elemGuess[opt.value] || null,
      sub: opt.sub || '',
    };

    if (this.headScene && typeof this.headScene.highlightPoint === 'function') {
      this.headScene.highlightPoint(q.pointIndex, opt.elem);
    }

    setTimeout(() => {
      const card = document.getElementById('qCard');
      card.classList.remove('visible');
      card.classList.add('exiting');

      const dots = document.querySelectorAll('.q-dot');
      if (dots[index]) {
        dots[index].classList.remove('active');
        dots[index].classList.add('done');
      }

      setTimeout(() => {
        this.currentQuestion = index + 1;
        this.showQuestion(this.currentQuestion);
      }, 400);
    }, 600);
  },

  compute() {
    this.setPhase('computing');

    if (this.headScene && typeof this.headScene.pulseAll === 'function') {
      this.headScene.pulseAll();
    }

    const labels = ['阴阳交感', '五行归位', '经络共鸣', '卦象成形'];
    const labelEl = document.getElementById('computingLabel');
    const subEl = document.getElementById('computingSub');
    let labelIdx = 0;

    const labelInterval = setInterval(() => {
      labelIdx++;
      if (labelIdx < labels.length) {
        labelEl.style.opacity = '0';
        setTimeout(() => {
          labelEl.textContent = labels[labelIdx];
          labelEl.style.opacity = '1';
        }, 300);
      }
    }, 700);

    const posMap = {
      faceShape: 'n', complexion: 'ne', voice: 'e',
      emotion: 'se', taste: 's', sleep: 'sw',
    };
    const inputs = {};
    for (const [key, val] of Object.entries(this.answers)) {
      const pos = posMap[key];
      if (pos) inputs[pos] = val;
    }

    const binary = IChing.inputsToBinary(inputs);
    const hexagram = IChing.hexagrams[binary] || IChing.hexagrams['101010'];
    const weights = IChing.calculateWuxingWeights(inputs);
    const result = { binary, hexagram, weights, inputs, timestamp: new Date() };

    const yaoWrap = document.getElementById('computingYao');
    yaoWrap.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const isYang = binary[i] === '1';
      const yao = document.createElement('div');
      yao.className = `computing-yao ${isYang ? 'yang' : 'yin'}`;
      yao.innerHTML = isYang
        ? '<div class="computing-yao-seg"></div>'
        : '<div class="computing-yao-seg"></div><div class="computing-yao-seg"></div>';
      yaoWrap.appendChild(yao);
      setTimeout(() => yao.classList.add('appear'), 600 + i * 350);
    }

    setTimeout(() => {
      subEl.textContent = hexagram.title;
      subEl.style.opacity = '1';
    }, 600 + 6 * 350 + 200);

    setTimeout(() => {
      clearInterval(labelInterval);
      this.showResult(result);
    }, 600 + 6 * 350 + 1200);
  },

  showResult(result) {
    this.lastResult = result;
    const hex = result.hexagram;
    const w = result.weights;

    // Hero
    document.getElementById('rHexName').textContent = hex.title;
    document.getElementById('rHexNature').textContent = `第${hex.num}卦 · ${hex.nature}`;

    // Yao lines
    const linesEl = document.getElementById('rHexLines');
    linesEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const div = document.createElement('div');
      const isYang = result.binary[i] === '1';
      div.className = `yao-line ${isYang ? 'yao-yang' : 'yao-yin'}`;
      div.innerHTML = isYang
        ? '<div class="yao-seg"></div>'
        : '<div class="yao-seg"></div><div class="yao-seg"></div>';
      linesEl.appendChild(div);
    }

    // Mapping table
    const elemNames = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    const labelMap = {
      faceShape: '面形', complexion: '气色', voice: '声纹',
      emotion: '情志', taste: '饮食', sleep: '睡眠',
    };

    let mappingHTML = '<div class="result-mapping-title">五行推演</div>';
    for (const [key, val] of Object.entries(this.answers)) {
      const elem = val.element || 'earth';
      mappingHTML += `
        <div class="mapping-row">
          <span class="mapping-label">${labelMap[key] || key}</span>
          <span class="mapping-arrow">→</span>
          <span class="mapping-value">${val.text}</span>
          <span class="mapping-elem ${elem}">${elemNames[elem] || ''}</span>
        </div>`;
    }
    document.getElementById('rMapping').innerHTML = mappingHTML;

    // Diagnosis — centered calligraphy
    const sorted = Object.entries(w).sort((a, b) => b[1] - a[1]);
    const organMap = { metal: '肺', wood: '肝', water: '肾', fire: '心', earth: '脾' };
    const weak = sorted[sorted.length - 1][0];

    document.getElementById('rDiag').innerHTML = [
      `五行偏重：${elemNames[sorted[0][0]]} · ${elemNames[sorted[1][0]]}`,
      `${elemNames[weak]}气不足 → ${organMap[weak]}系统需调理`,
      `卦象：${hex.nature}`,
    ].map(t => `<div class="diag-line">${t}</div>`).join('');

    // Tips — 3 cards
    const tips = IChing.generateTips(result);
    const tipsEl = document.getElementById('rTips');
    const cards = [
      { cat: 'cat-food', label: '食养', items: [tips[0], tips[2]].filter(Boolean) },
      { cat: 'cat-point', label: '穴位', items: [tips[1]].filter(Boolean) },
      { cat: 'cat-life', label: '起居', items: tips.length > 2 ? [{ icon: '🌙', text: '顺应时令，早睡养神' }] : [] },
    ];

    tipsEl.innerHTML = cards.map(c =>
      `<div class="tip-card ${c.cat}">
        <div class="tip-card-label">${c.label}</div>
        <div class="tip-card-content">${c.items.map(t => `${t.icon} ${t.text}`).join('<br>')}</div>
      </div>`
    ).join('');

    // Radar
    RadarChart.animateIn(w);

    // Match percentage
    this.animateMatch(result);

    // Scroll to top
    document.getElementById('phaseResult').scrollTop = 0;

    this.setPhase('result');
  },

  animateMatch(result) {
    const w = result.weights;
    const values = Object.values(w);
    const spread = Math.max(...values) - Math.min(...values);
    const target = Math.min(Math.round(65 + spread * 40 + Math.random() * 8), 98);

    const el = document.getElementById('matchPct');
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min((now - startTime) / 1800, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  triggerDeepAnalysis() {
    if (!this.lastResult) return;
    Analyst.startAnalysis(this.lastResult, this.answers);
  },

  restart() {
    this.currentQuestion = 0;
    this.answers = {};
    this.lastResult = null;
    if (this.headScene && typeof this.headScene.resetGlow === 'function') {
      this.headScene.resetGlow();
    }
    document.getElementById('computingYao').innerHTML = '';
    document.getElementById('computingSub').textContent = '';
    document.getElementById('computingLabel').textContent = '阴阳交感';
    document.getElementById('aContent').innerHTML = '';
    document.getElementById('aFooter').classList.remove('visible');

    this.setPhase('entry');
  },
};

document.addEventListener('DOMContentLoaded', () => Chamber.init());

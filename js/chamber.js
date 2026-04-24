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
  examNamesEn: { '望': 'Observation', '闻': 'Listening', '问': 'Inquiry', '切': 'Palpation' },
  examGlyphEn: { '望': 'Look', '闻': 'Listen', '问': 'Ask', '切': 'Touch' },

  questions: [
    {
      exam: '望', label: '面形', labelEn: 'Face Shape', desc: '观察面部轮廓形态', descEn: 'Observe facial contour',
      cite: '《灵枢·五色》："以五色命脏，青为肝，赤为心，白为肺，黄为脾，黑为肾。"',
      citeEn: 'Lingshu · Five Colors: "Five colors map to the organs — green/liver, red/heart, white/lung, yellow/spleen, black/kidney."',
      key: 'faceShape', pointIndex: 1,
      options: [
        { text: '圆润', textEn: 'Round',    value: 'round',  sub: '土', elem: 'earth' },
        { text: '方正', textEn: 'Square',   value: 'square', sub: '金', elem: 'metal' },
        { text: '椭圆', textEn: 'Oval',     value: 'oval',   sub: '木', elem: 'wood'  },
        { text: '修长', textEn: 'Elongated', value: 'long',  sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '望', label: '气色', labelEn: 'Complexion', desc: '面部气血色泽判断', descEn: 'Read facial qi-blood color',
      cite: '《素问·脉要精微论》："夫精明五色者，气之华也。"',
      citeEn: 'Suwen: "The five colors of brightness are the flowering of qi."',
      key: 'complexion', pointIndex: 6,
      options: [
        { text: '红润', textEn: 'Rosy',    value: 'red',    sub: '火', elem: 'fire'  },
        { text: '苍白', textEn: 'Pale',    value: 'pale',   sub: '金', elem: 'metal' },
        { text: '偏黄', textEn: 'Yellowish', value: 'yellow', sub: '土', elem: 'earth' },
        { text: '暗沉', textEn: 'Dull',    value: 'dark',   sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '闻', label: '声纹', labelEn: 'Voice', desc: '声音质地与气息强弱', descEn: 'Voice tone and breath strength',
      cite: '《素问·阴阳应象大论》："肝在声为呼，心在声为笑，脾在声为歌。"',
      citeEn: 'Suwen: "Liver sounds as shouting, heart as laughter, spleen as singing."',
      key: 'voice', pointIndex: 4,
      options: [
        { text: '低沉', textEn: 'Low',    value: 'deep', sub: '水', elem: 'water' },
        { text: '高亢', textEn: 'High',   value: 'high', sub: '火', elem: 'fire'  },
        { text: '急促', textEn: 'Rapid',  value: 'fast', sub: '木', elem: 'wood'  },
        { text: '和缓', textEn: 'Gentle', value: 'slow', sub: '土', elem: 'earth' },
      ]
    },
    {
      exam: '问', label: '情志', labelEn: 'Emotion', desc: '近期主导情绪状态', descEn: 'Dominant emotion lately',
      cite: '《素问·举痛论》："怒则气上，喜则气缓，悲则气消，恐则气下。"',
      citeEn: 'Suwen: "Anger lifts qi, joy relaxes it, grief disperses it, fear sinks it."',
      key: 'emotion', pointIndex: 2,
      options: [
        { text: '喜',   textEn: 'Joy',    value: 'joy',    sub: '火', elem: 'fire'  },
        { text: '怒',   textEn: 'Anger',  value: 'anger',  sub: '木', elem: 'wood'  },
        { text: '思虑', textEn: 'Worry',  value: 'worry',  sub: '土', elem: 'earth' },
        { text: '悲',   textEn: 'Grief',  value: 'grief',  sub: '金', elem: 'metal' },
        { text: '恐',   textEn: 'Fear',   value: 'fear',   sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '问', label: '饮食', labelEn: 'Taste', desc: '近期偏好的口味', descEn: 'Preferred taste lately',
      cite: '《素问·宣明五气》："酸入肝，辛入肺，苦入心，咸入肾，甘入脾。"',
      citeEn: 'Suwen: "Sour enters liver, pungent lung, bitter heart, salty kidney, sweet spleen."',
      key: 'taste', pointIndex: 5,
      options: [
        { text: '酸', textEn: 'Sour',    value: 'sour',   sub: '木', elem: 'wood'  },
        { text: '苦', textEn: 'Bitter',  value: 'bitter', sub: '火', elem: 'fire'  },
        { text: '甘', textEn: 'Sweet',   value: 'sweet',  sub: '土', elem: 'earth' },
        { text: '辛', textEn: 'Pungent', value: 'spicy',  sub: '金', elem: 'metal' },
        { text: '咸', textEn: 'Salty',   value: 'salty',  sub: '水', elem: 'water' },
      ]
    },
    {
      exam: '切', label: '睡眠', labelEn: 'Sleep', desc: '近期睡眠质量状态', descEn: 'Recent sleep quality',
      cite: '《灵枢·口问》："阳气尽，阴气盛，则目瞑；阴气尽，阳气盛，则寤矣。"',
      citeEn: 'Lingshu: "When yang is exhausted and yin abundant, eyes close; when yin spent and yang rises, one wakes."',
      key: 'sleep', pointIndex: 0,
      options: [
        { text: '安眠', textEn: 'Sound',    value: 'good',     sub: '土', elem: 'earth' },
        { text: '浅眠', textEn: 'Light',    value: 'light',    sub: '木', elem: 'wood'  },
        { text: '多梦', textEn: 'Dreamy',   value: 'dream',    sub: '火', elem: 'fire'  },
        { text: '失眠', textEn: 'Insomnia', value: 'insomnia', sub: '水', elem: 'water' },
      ]
    },
  ],

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    document.getElementById('startBtn').addEventListener('click', () => this.startQuestions());
    document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    document.getElementById('restartBtn2').addEventListener('click', () => this.restart());
    document.getElementById('fortuneBtn').addEventListener('click', () => this.showFortune());
    document.getElementById('fortuneDeepBtn').addEventListener('click', () => this.triggerDeepAnalysis());
    document.getElementById('restartBtn3').addEventListener('click', () => this.restart());

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
    if (typeof Soundscape !== 'undefined') Soundscape.ritualHandOnJade();
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

    const examGlyphEn = this.examGlyphEn[q.exam] || '';
    document.getElementById('qExam').innerHTML =
      `${q.exam}<span class="en-sub">${examGlyphEn}</span>`;
    document.getElementById('qLabel').innerHTML =
      `${q.label}<span class="en-sub">${q.labelEn || ''}</span>`;
    document.getElementById('qDesc').innerHTML =
      `${q.desc}<span class="en-sub">${q.descEn || ''}</span>`;
    document.getElementById('qCite').innerHTML =
      `${q.cite || ''}${q.citeEn ? `<span class="en-sub">${q.citeEn}</span>` : ''}`;
    document.getElementById('qStepNum').textContent = (index + 1).toString().padStart(2, '0');
    document.getElementById('qStepExam').innerHTML =
      `${this.examNames[q.exam] || q.exam}<span class="en-sub">${this.examNamesEn[q.exam] || ''}</span>`;

    const optionsEl = document.getElementById('qOptions');
    optionsEl.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'q-opt';
      btn.dataset.elem = opt.elem || '';
      btn.innerHTML = `
        <span class="q-opt-text">${opt.text}<span class="en-sub">${opt.textEn || ''}</span></span>
        <span class="q-opt-sub">${opt.sub || ''}</span>
      `;
      btn.addEventListener('click', () => {
        if (typeof Soundscape !== 'undefined') Soundscape.tap();
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

    if (typeof Soundscape !== 'undefined') Soundscape.ritualSixYao();

    if (this.headScene && typeof this.headScene.pulseAll === 'function') {
      this.headScene.pulseAll();
    }

    const labels = [
      { zh: '阴阳交感', en: 'Yin-Yang Resonance' },
      { zh: '五行归位', en: 'Five Elements Aligning' },
      { zh: '经络共鸣', en: 'Meridian Harmonics' },
      { zh: '卦象成形', en: 'Hexagram Forming' },
    ];
    const labelEl = document.getElementById('computingLabel');
    const subEl = document.getElementById('computingSub');
    let labelIdx = 0;

    const labelInterval = setInterval(() => {
      labelIdx++;
      if (labelIdx < labels.length) {
        labelEl.style.opacity = '0';
        setTimeout(() => {
          labelEl.innerHTML = `${labels[labelIdx].zh}<span class="en-sub">${labels[labelIdx].en}</span>`;
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

  // Translate hexagram 4-character nature into a short English phrase.
  // Falls back to a transliteration-style hint if not in the dictionary.
  _natureEn(natureZh) {
    const map = {
      '刚健中正': 'Firm & Centered',
      '厚德载物': 'Boundless Virtue',
      '初始艰难': 'Difficult Beginnings',
      '启蒙教化': 'Youthful Folly Enlightened',
      '等待时机': 'Awaiting the Moment',
      '争讼不吉': 'Conflict — Inauspicious',
      '统率众人': 'Leading the Multitude',
      '亲密辅佐': 'Close Alliance',
      '蓄养力量': 'Gathering Strength',
      '小心行事': 'Treading Carefully',
      '通泰亨通': 'Peace & Flow',
      '闭塞不通': 'Stagnation',
      '志同道合': 'Kindred Spirits',
      '大有所得': 'Great Possession',
      '谦虚受益': 'Humility Rewarded',
      '愉悦欢乐': 'Joyous Enthusiasm',
      '随顺时势': 'Following the Current',
      '拨乱反正': 'Correcting Disorder',
      '亲临其境': 'Approaching Closely',
      '观察省思': 'Contemplation',
      '明断是非': 'Decisive Judgement',
      '文饰修养': 'Adornment & Refinement',
      '剥落衰败': 'Stripping Away',
      '回复初心': 'Return to Origin',
      '无妄之行': 'Without Pretense',
      '大蓄力量': 'Great Accumulation',
      '颐养正道': 'Nourishment',
      '过度失衡': 'Critical Excess',
      '险阻重重': 'Repeated Peril',
      '光明附丽': 'Radiance Clinging',
      '感应相通': 'Mutual Resonance',
      '恒久不变': 'Enduring Constancy',
      '退避保全': 'Strategic Retreat',
      '壮盛强大': 'Great Power',
      '进步上升': 'Steady Progress',
      '韬光养晦': 'Hiding the Light',
      '家道正轨': 'Family in Order',
      '乖违背离': 'Estrangement',
      '行路艰难': 'Obstruction',
      '解除困难': 'Deliverance',
      '减损得益': 'Decrease Becomes Gain',
      '增益发展': 'Increase & Growth',
      '决断果敢': 'Decisive Breakthrough',
      '不期而遇': 'Unexpected Encounter',
      '聚集汇合': 'Gathering Together',
      '上升进步': 'Pushing Upward',
      '困顿穷厄': 'Oppression',
      '井养不穷': 'The Well — Inexhaustible',
      '变革更新': 'Revolution',
      '鼎新革故': 'Renewal of the Cauldron',
      '震动奋发': 'Arousing Movement',
      '止而不动': 'Stillness',
      '循序渐进': 'Gradual Development',
      '归宿安定': 'Marrying Maiden',
      '丰盛繁荣': 'Abundance',
      '旅途漂泊': 'The Wanderer',
      '柔顺渗透': 'Gentle Penetration',
      '喜悦和乐': 'Joyful Harmony',
      '涣散离散': 'Dispersion',
      '节制适度': 'Limitation',
      '诚信内守': 'Inner Truth',
      '小有过越': 'Small Excess',
      '事已成就': 'After Completion',
      '事未完成': 'Before Completion',
    };
    return map[natureZh] || 'Cosmic Pattern';
  },

  showResult(result) {
    this.lastResult = result;
    const hex = result.hexagram;
    const w = result.weights;

    // Hero
    document.getElementById('rHexName').textContent = hex.title;
    document.getElementById('rHexNature').innerHTML =
      `第${hex.num}卦 · ${hex.nature}<span class="en-sub">Hexagram #${hex.num} · ${this._natureEn(hex.nature)}</span>`;

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
    const elemNamesEn = { metal: 'Metal', wood: 'Wood', water: 'Water', fire: 'Fire', earth: 'Earth' };
    const labelMap = {
      faceShape: ['面形', 'Face'], complexion: ['气色', 'Color'], voice: ['声纹', 'Voice'],
      emotion: ['情志', 'Mood'], taste: ['饮食', 'Taste'], sleep: ['睡眠', 'Sleep'],
    };

    let mappingHTML = '<div class="result-mapping-title">五行推演<span class="en-sub">Five-Element Mapping</span></div>';
    for (const [key, val] of Object.entries(this.answers)) {
      const elem = val.element || 'earth';
      const [zh, en] = labelMap[key] || [key, ''];
      mappingHTML += `
        <div class="mapping-row">
          <span class="mapping-label">${zh}<span class="en-sub" style="display:inline;margin-left:4px;font-size:9px;">${en}</span></span>
          <span class="mapping-arrow">→</span>
          <span class="mapping-value">${val.text}</span>
          <span class="mapping-elem ${elem}">${elemNames[elem] || ''} · ${elemNamesEn[elem] || ''}</span>
        </div>`;
    }
    document.getElementById('rMapping').innerHTML = mappingHTML;

    // Diagnosis — centered calligraphy
    const sorted = Object.entries(w).sort((a, b) => b[1] - a[1]);
    const organMap = { metal: '肺', wood: '肝', water: '肾', fire: '心', earth: '脾' };
    const organMapEn = { metal: 'Lung', wood: 'Liver', water: 'Kidney', fire: 'Heart', earth: 'Spleen' };
    const weak = sorted[sorted.length - 1][0];

    document.getElementById('rDiag').innerHTML = [
      [
        `五行偏重：${elemNames[sorted[0][0]]} · ${elemNames[sorted[1][0]]}`,
        `Dominant elements: ${elemNamesEn[sorted[0][0]]} · ${elemNamesEn[sorted[1][0]]}`,
      ],
      [
        `${elemNames[weak]}气不足 → ${organMap[weak]}系统需调理`,
        `${elemNamesEn[weak]} qi deficient → ${organMapEn[weak]} system needs care`,
      ],
      [
        `卦象：${hex.nature}`,
        `Hexagram nature: ${this._natureEn(hex.nature)}`,
      ],
    ].map(([zh, en]) =>
      `<div class="diag-line">${zh}<span class="en-sub">${en}</span></div>`
    ).join('');

    // Tips — 3 cards
    const tips = IChing.generateTips(result);
    const tipsEl = document.getElementById('rTips');
    const cards = [
      { cat: 'cat-food',  label: '食养', labelEn: 'Diet',     items: [tips[0], tips[2]].filter(Boolean) },
      { cat: 'cat-point', label: '穴位', labelEn: 'Acupoint', items: [tips[1]].filter(Boolean) },
      { cat: 'cat-life',  label: '起居', labelEn: 'Lifestyle',
        items: tips.length > 2 ? [{ icon: '🌙', text: '顺应时令，早睡养神 · Follow the season, sleep early to nourish spirit' }] : [] },
    ];

    tipsEl.innerHTML = cards.map(c =>
      `<div class="tip-card ${c.cat}">
        <div class="tip-card-label">${c.label}<span class="en-sub">${c.labelEn}</span></div>
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

  showFortune() {
    if (!this.lastResult) return;
    const fortune = IChing.generateFortune(this.lastResult);
    const hex = this.lastResult.hexagram;

    document.getElementById('fHexName').textContent = hex.title;
    document.getElementById('fHexNum').textContent = `第 ${hex.num} 卦`;

    document.getElementById('fEnNature').textContent = fortune.en.nature;
    document.getElementById('fEnElem').textContent = `Dominant Element · ${fortune.en.element}`;
    document.getElementById('fEnBody').textContent = fortune.en.body;

    document.getElementById('fZhNature').textContent = fortune.zh.nature;
    document.getElementById('fZhElem').textContent = `主行五行 · ${fortune.zh.element}`;
    document.getElementById('fZhBody').textContent = fortune.zh.body;

    document.getElementById('phaseFortune').scrollTop = 0;
    this.setPhase('fortune');
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
    document.getElementById('computingLabel').innerHTML =
      '阴阳交感<span class="en-sub">Yin-Yang Resonance</span>';
    document.getElementById('aContent').innerHTML = '';
    document.getElementById('aFooter').classList.remove('visible');

    // Reset deeper analysis state (multi-round)
    const phase = document.getElementById('phaseAnalyzing');
    // Remove any dynamically inserted round 3+ wrappers (round 2 lives in #deeperBody)
    phase.querySelectorAll('.analyzing-body.deeper-body:not(#deeperBody)').forEach(el => el.remove());
    // Reset the static round-2 container
    const deeperBody = document.getElementById('deeperBody');
    deeperBody.style.display = 'none';
    let dContent = document.getElementById('dContent') || phase.querySelector('[id^="dContent-round-"]');
    if (dContent) {
      dContent.id = 'dContent';
      dContent.innerHTML = '';
    }
    const divLabel = deeperBody.querySelector('.deeper-divider-label');
    if (divLabel) divLabel.textContent = '第二次分析 · Round 2 — Deeper Reading';
    document.getElementById('deeperInputWrap').classList.remove('visible');
    document.getElementById('deeperTextarea').value = '';
    const submitBtn = document.getElementById('deeperSubmitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '✦ 进行第二次分析 · Deepen the Analysis';

    this.setPhase('entry');
  },
};

document.addEventListener('DOMContentLoaded', () => Chamber.init());

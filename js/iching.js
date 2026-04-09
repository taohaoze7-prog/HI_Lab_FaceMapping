/* ============================================
   I-CHING CORE — 易经算法引擎
   6-bit binary hexagram computation
   ============================================ */

const IChing = {
  // 六十四卦完整数据库
  hexagrams: {
    '111111': { name: '乾', title: '乾为天',   num: 1,  nature: '刚健中正', element: 'metal' },
    '000000': { name: '坤', title: '坤为地',   num: 2,  nature: '厚德载物', element: 'earth' },
    '100010': { name: '屯', title: '水雷屯',   num: 3,  nature: '初始艰难', element: 'water' },
    '010001': { name: '蒙', title: '山水蒙',   num: 4,  nature: '启蒙教化', element: 'earth' },
    '111010': { name: '需', title: '水天需',   num: 5,  nature: '等待时机', element: 'water' },
    '010111': { name: '讼', title: '天水讼',   num: 6,  nature: '争讼不吉', element: 'metal' },
    '010000': { name: '师', title: '地水师',   num: 7,  nature: '统率众人', element: 'earth' },
    '000010': { name: '比', title: '水地比',   num: 8,  nature: '亲密辅佐', element: 'water' },
    '111011': { name: '小畜', title: '风天小畜', num: 9,  nature: '蓄养力量', element: 'wood' },
    '110111': { name: '履', title: '天泽履',   num: 10, nature: '小心行事', element: 'metal' },
    '111000': { name: '泰', title: '地天泰',   num: 11, nature: '通泰亨通', element: 'earth' },
    '000111': { name: '否', title: '天地否',   num: 12, nature: '闭塞不通', element: 'metal' },
    '101111': { name: '同人', title: '天火同人', num: 13, nature: '志同道合', element: 'fire' },
    '111101': { name: '大有', title: '火天大有', num: 14, nature: '大有所得', element: 'fire' },
    '001000': { name: '谦', title: '地山谦',   num: 15, nature: '谦虚受益', element: 'earth' },
    '000100': { name: '豫', title: '雷地豫',   num: 16, nature: '愉悦欢乐', element: 'wood' },
    '100110': { name: '随', title: '泽雷随',   num: 17, nature: '随顺时势', element: 'metal' },
    '011001': { name: '蛊', title: '山风蛊',   num: 18, nature: '拨乱反正', element: 'wood' },
    '110000': { name: '临', title: '地泽临',   num: 19, nature: '亲临其境', element: 'earth' },
    '000011': { name: '观', title: '风地观',   num: 20, nature: '观察省思', element: 'wood' },
    '100101': { name: '噬嗑', title: '火雷噬嗑', num: 21, nature: '明断是非', element: 'fire' },
    '101001': { name: '贲', title: '山火贲',   num: 22, nature: '文饰修养', element: 'fire' },
    '000001': { name: '剥', title: '山地剥',   num: 23, nature: '剥落衰败', element: 'earth' },
    '100000': { name: '复', title: '地雷复',   num: 24, nature: '回复初心', element: 'wood' },
    '100111': { name: '无妄', title: '天雷无妄', num: 25, nature: '无妄之行', element: 'metal' },
    '111001': { name: '大畜', title: '山天大畜', num: 26, nature: '大蓄力量', element: 'earth' },
    '100001': { name: '颐', title: '山雷颐',   num: 27, nature: '颐养正道', element: 'earth' },
    '011110': { name: '大过', title: '泽风大过', num: 28, nature: '过度失衡', element: 'wood' },
    '010010': { name: '坎', title: '坎为水',   num: 29, nature: '险阻重重', element: 'water' },
    '101101': { name: '离', title: '离为火',   num: 30, nature: '光明附丽', element: 'fire' },
    '001110': { name: '咸', title: '泽山咸',   num: 31, nature: '感应相通', element: 'metal' },
    '011100': { name: '恒', title: '雷风恒',   num: 32, nature: '恒久不变', element: 'wood' },
    '001111': { name: '遁', title: '天山遁',   num: 33, nature: '退避保全', element: 'metal' },
    '111100': { name: '大壮', title: '雷天大壮', num: 34, nature: '壮盛强大', element: 'wood' },
    '000101': { name: '晋', title: '火地晋',   num: 35, nature: '进步上升', element: 'fire' },
    '101000': { name: '明夷', title: '地火明夷', num: 36, nature: '韬光养晦', element: 'fire' },
    '101011': { name: '家人', title: '风火家人', num: 37, nature: '家道正轨', element: 'wood' },
    '110101': { name: '睽', title: '火泽睽',   num: 38, nature: '乖违背离', element: 'fire' },
    '001010': { name: '蹇', title: '水山蹇',   num: 39, nature: '行路艰难', element: 'water' },
    '010100': { name: '解', title: '雷水解',   num: 40, nature: '解除困难', element: 'wood' },
    '110001': { name: '损', title: '山泽损',   num: 41, nature: '减损得益', element: 'earth' },
    '100011': { name: '益', title: '风雷益',   num: 42, nature: '增益发展', element: 'wood' },
    '011111': { name: '夬', title: '泽天夬',   num: 43, nature: '决断果敢', element: 'metal' },
    '111110': { name: '姤', title: '天风姤',   num: 44, nature: '不期而遇', element: 'metal' },
    '000110': { name: '萃', title: '泽地萃',   num: 45, nature: '聚集汇合', element: 'earth' },
    '011000': { name: '升', title: '地风升',   num: 46, nature: '上升进步', element: 'wood' },
    '010110': { name: '困', title: '泽水困',   num: 47, nature: '困顿穷厄', element: 'water' },
    '011010': { name: '井', title: '水风井',   num: 48, nature: '井养不穷', element: 'water' },
    '101110': { name: '革', title: '泽火革',   num: 49, nature: '变革更新', element: 'fire' },
    '011101': { name: '鼎', title: '火风鼎',   num: 50, nature: '鼎新革故', element: 'fire' },
    '100100': { name: '震', title: '震为雷',   num: 51, nature: '震动奋发', element: 'wood' },
    '001001': { name: '艮', title: '艮为山',   num: 52, nature: '止而不动', element: 'earth' },
    '001011': { name: '渐', title: '风山渐',   num: 53, nature: '循序渐进', element: 'wood' },
    '110100': { name: '归妹', title: '雷泽归妹', num: 54, nature: '归宿安定', element: 'metal' },
    '101100': { name: '丰', title: '雷火丰',   num: 55, nature: '丰盛繁荣', element: 'fire' },
    '001101': { name: '旅', title: '火山旅',   num: 56, nature: '旅途漂泊', element: 'fire' },
    '011011': { name: '巽', title: '巽为风',   num: 57, nature: '柔顺渗透', element: 'wood' },
    '110110': { name: '兑', title: '兑为泽',   num: 58, nature: '喜悦和乐', element: 'metal' },
    '010011': { name: '涣', title: '风水涣',   num: 59, nature: '涣散离散', element: 'water' },
    '110010': { name: '节', title: '水泽节',   num: 60, nature: '节制适度', element: 'water' },
    '110011': { name: '中孚', title: '风泽中孚', num: 61, nature: '诚信内守', element: 'wood' },
    '001100': { name: '小过', title: '雷山小过', num: 62, nature: '小有过越', element: 'wood' },
    '101010': { name: '既济', title: '水火既济', num: 63, nature: '事已成就', element: 'water' },
    '010101': { name: '未济', title: '火水未济', num: 64, nature: '事未完成', element: 'fire' },
  },

  // 五行生克关系
  wuxing: {
    generate: { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' },
    overcome: { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' },
    weakened: { wood: 'metal', fire: 'water', earth: 'wood', metal: 'fire', water: 'earth' },
  },

  // 情志 → 五行
  emotionMap: {
    joy: 'fire', anger: 'wood', worry: 'earth', grief: 'metal', fear: 'water'
  },

  // 味觉 → 五行
  tasteMap: {
    sour: 'wood', bitter: 'fire', sweet: 'earth', spicy: 'metal', salty: 'water'
  },

  /**
   * Compute hexagram from user inputs
   * Collects all 8 bagua panel selections and generates 6-bit binary
   */
  computeFromInputs() {
    const inputs = {};

    // Collect all active selections from bagua panels
    document.querySelectorAll('.bagua-panel').forEach(panel => {
      const pos = panel.dataset.pos;
      const activeOpt = panel.querySelector('.gua-opt.active');
      if (activeOpt) {
        inputs[pos] = {
          value: activeOpt.dataset.val,
          element: activeOpt.dataset.elem || null
        };
      }
    });

    // Posture slider
    const slider = document.getElementById('postureSlider');
    if (slider) inputs.posture = parseInt(slider.value);

    // Generate hash from inputs
    const binary = this.inputsToBinary(inputs);
    const hexagram = this.hexagrams[binary] || this.hexagrams['101010']; // fallback: 既济

    // Calculate five element weights
    const weights = this.calculateWuxingWeights(inputs);

    return {
      binary,
      hexagram,
      weights,
      inputs,
      timestamp: new Date(),
    };
  },

  /**
   * Convert inputs to 6-bit binary string
   * Uses a hash-like approach mixing multiple input dimensions
   */
  inputsToBinary(inputs) {
    // Seed from current time (子午流注 influence)
    const now = new Date();
    const timeSeed = now.getHours() * 60 + now.getMinutes();

    // Collect element counts
    const elemCounts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    Object.values(inputs).forEach(inp => {
      if (inp && inp.element) {
        elemCounts[inp.element] = (elemCounts[inp.element] || 0) + 1;
      }
    });

    // Map selections to numeric values for hashing
    const allValues = Object.values(inputs).map(inp => {
      if (typeof inp === 'number') return inp;
      if (inp && inp.value) {
        let hash = 0;
        for (let c of inp.value) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
        return Math.abs(hash);
      }
      return 0;
    });

    const combined = allValues.reduce((a, b) => a + b, 0) + timeSeed;

    // Generate 6 yao lines
    let binary = '';
    for (let i = 0; i < 6; i++) {
      const seed = combined * (i + 1) + timeSeed * (i + 3);
      const bit = ((seed * 9301 + 49297) % 233280) / 233280;
      binary += bit > 0.5 ? '1' : '0';
    }

    // Ensure we have a valid hexagram
    if (!this.hexagrams[binary]) {
      // Find closest valid one
      const keys = Object.keys(this.hexagrams);
      binary = keys[combined % keys.length];
    }

    return binary;
  },

  /**
   * Calculate five element weights from all inputs
   */
  calculateWuxingWeights(inputs) {
    const weights = { metal: 0.3, wood: 0.3, water: 0.3, fire: 0.3, earth: 0.3 };

    // Time-based influence (子午流注)
    const now = new Date();
    const h = now.getHours();
    const timeElements = [
      [23, 1, 'wood'],  // 胆经 → 木
      [1, 3, 'wood'],   // 肝经 → 木
      [3, 5, 'metal'],  // 肺经 → 金
      [5, 7, 'metal'],  // 大肠经 → 金
      [7, 9, 'earth'],  // 胃经 → 土
      [9, 11, 'earth'], // 脾经 → 土
      [11, 13, 'fire'], // 心经 → 火
      [13, 15, 'fire'], // 小肠经 → 火
      [15, 17, 'water'],// 膀胱经 → 水
      [17, 19, 'water'],// 肾经 → 水
      [19, 21, 'fire'], // 心包经 → 火
      [21, 23, 'fire'], // 三焦经 → 火
    ];

    for (const [start, end, elem] of timeElements) {
      if ((start <= h && h < end) || (start === 23 && (h >= 23 || h < end))) {
        weights[elem] += 0.25;
        break;
      }
    }

    // Input-based influence
    Object.values(inputs).forEach(inp => {
      if (inp && inp.element && weights[inp.element] !== undefined) {
        weights[inp.element] += 0.2;
      }
    });

    // Apply 生克 relationships
    const dominant = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
    const generated = this.wuxing.generate[dominant];
    const overcome = this.wuxing.overcome[dominant];
    if (generated) weights[generated] += 0.1;
    if (overcome) weights[overcome] -= 0.05;

    // Normalize to 0-1 range
    const max = Math.max(...Object.values(weights));
    for (const key in weights) {
      weights[key] = Math.min(Math.max(weights[key] / max, 0.15), 1);
    }

    return weights;
  },

  // English translations of each hexagram's nature
  natureEn: {
    '111111': 'Strength Through Integrity',
    '000000': 'Virtue That Supports All Things',
    '100010': 'Difficulty at the Outset',
    '010001': 'Awakening and Guidance',
    '111010': 'Patient Awaiting of Opportunity',
    '010111': 'Conflict Brings No Fortune',
    '010000': 'Leadership of the People',
    '000010': 'Close Alliance and Support',
    '111011': 'Gathering Inner Power',
    '110111': 'Treading with Caution',
    '111000': 'Harmony and Prosperity Flow',
    '000111': 'Obstruction Blocks the Way',
    '101111': 'Kindred Souls in Union',
    '111101': 'Great Abundance Is Yours',
    '001000': 'Humility Opens the Path',
    '000100': 'Joy and Celebration Abound',
    '100110': 'Follow the Flow of Time',
    '011001': 'Restore Order from Chaos',
    '110000': 'Drawing Near with Purpose',
    '000011': 'Contemplation and Reflection',
    '100101': 'Clear Judgment of Right and Wrong',
    '101001': 'Grace and Inner Cultivation',
    '000001': 'Deterioration Calls for Rest',
    '100000': 'Return to Original Nature',
    '100111': 'Act Without Presumption',
    '111001': 'Storing Great Power Within',
    '100001': 'Nourishment on the Righteous Path',
    '011110': 'Excess Disrupts Balance',
    '010010': 'Obstacles on Every Side',
    '101101': 'Radiance Illuminates All',
    '001110': 'Hearts in Resonance',
    '011100': 'Endurance and Constancy',
    '001111': 'Strategic Retreat Preserves Strength',
    '111100': 'Vigor and Righteous Power',
    '000101': 'Progress Rises Forward',
    '101000': 'Conceal Brilliance, Bide Your Time',
    '101011': 'Family Harmony on Right Course',
    '110101': 'Separation Invites Reflection',
    '001010': 'The Road Ahead Is Steep',
    '010100': 'Liberation from Difficulty',
    '110001': 'Through Sacrifice Comes Gain',
    '100011': 'Increase Brings Development',
    '011111': 'Resolve with Decisive Courage',
    '111110': 'An Unexpected Encounter',
    '000110': 'Gathering Forces Together',
    '011000': 'Rising Through Steady Effort',
    '010110': 'Adversity Tests the Spirit',
    '011010': 'The Well Nourishes Without End',
    '101110': 'Transformation and Renewal',
    '011101': 'The Cauldron Purifies and Renews',
    '100100': 'Thunder Awakens Decisive Action',
    '001001': 'Stillness Offers Clarity',
    '001011': 'Gradual Progress, Step by Step',
    '110100': 'Finding Home and Stability',
    '101100': 'Abundance and Flourishing',
    '001101': 'The Journey of the Wanderer',
    '011011': 'Gentle Persistence Penetrates All',
    '110110': 'Joy and Harmonious Exchange',
    '010011': 'Dispersion Precedes Renewal',
    '110010': 'Moderation Sustains the Way',
    '110011': 'Inner Sincerity Holds True',
    '001100': 'Small Excess, Small Correction',
    '101010': 'The Task Is Accomplished',
    '010101': 'The Work Is Not Yet Done',
  },

  // Element-based fortune supplements
  elementFortuneEn: {
    metal: 'The Metal element calls for clarity and decisive action. Purify your intentions, set clear boundaries, and trust your capacity to discern what truly matters. This season invites you to release what no longer serves and refine what endures.',
    wood: 'The Wood element invites growth and long-range vision. Align yourself with goals that take root over time, nurture your creative spirit, and let your aspirations rise like a young tree reaching steadily toward light.',
    water: 'The Water element brings deep wisdom and quiet adaptability. Flow around the obstacles before you rather than resisting them. Trust your intuition — in stillness lies a power greater than force.',
    fire: 'The Fire element illuminates what was once hidden. Your inner warmth is a genuine gift; share it openly, lead from the heart, and let enthusiasm and clarity guide each step of your path.',
    earth: 'The Earth element grounds and sustains. Tend carefully to your foundations, honor the commitments you have made, and trust that patient, steady effort laid day by day will bring a lasting and worthy harvest.',
  },

  elementFortuneZh: {
    metal: '金气主收敛，宜清心寡欲，明断取舍。此时当以清静之心应物，去浮躁而存本真，方能纳秋气之恩泽，得内在之清明。',
    wood: '木气主生发，宜养肝疏情，目光长远。当以向上之志开拓前路，如春芽破土而出，顺势而为则万物生长，勇于进取则前程光明。',
    water: '水气主智慧，宜顺势而为，以柔克刚。静水深流，智者知时而动。内敛而不失锋芒，守柔方可驾驭刚强，顺流而进自有所成。',
    fire: '火气主明达，宜以热忱感召，以真心相待。内心光明则外事通达，善用直觉以应万变。慷慨分享所知，心火旺盛则道路自明。',
    earth: '土气主厚重，宜稳固根基，守信践诺。厚德载物，持重待时。以诚信之心立足，踏实耕耘必有收获，根深则枝叶自然繁茂。',
  },

  /**
   * Generate bilingual fortune reading
   */
  generateFortune(result) {
    const hex = result.hexagram;
    const sorted = Object.entries(result.weights).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const elemNames = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    const elemNamesEn = { metal: 'Metal', wood: 'Wood', water: 'Water', fire: 'Fire', earth: 'Earth' };

    const natureEn = this.natureEn[result.binary] || hex.nature;

    return {
      en: {
        nature: natureEn,
        element: elemNamesEn[dominant],
        body: this.elementFortuneEn[dominant],
      },
      zh: {
        title: hex.title,
        nature: hex.nature,
        element: elemNames[dominant],
        body: this.elementFortuneZh[dominant],
      },
    };
  },

  /**
   * Generate diagnosis text lines
   */
  generateDiagnosis(result) {
    const w = result.weights;
    const sorted = Object.entries(w).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0];
    const weak = sorted[sorted.length - 1];

    const elemNames = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    const organMap = { metal: '肺', wood: '肝', water: '肾', fire: '心', earth: '脾' };

    const meridianClock = MeridianClock.getCurrentMeridian();

    return {
      line1: `五行偏重：${elemNames[dominant[0]]} · ${elemNames[sorted[1][0]]}`,
      line2: `当令经络：${meridianClock.full}`,
      line3: `${elemNames[weak[0]]}气不足 → ${organMap[weak[0]]}系统需调理`,
      calligraphy: result.hexagram.title,
      cost1: `得：${result.hexagram.nature} · 内在稳固`,
      cost2: `失：${elemNames[this.wuxing.weakened[dominant[0]]]}气受制 · 需平衡调养`,
    };
  },

  /**
   * Get mapping table data
   */
  getMappingTable(result) {
    const elemNames = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    const traits = [];

    Object.entries(result.inputs).forEach(([key, val]) => {
      if (!val || !val.value) return;
      const elem = val.element || this.guessElement(val.value);
      if (!elem) return;

      traits.push({
        trait: this.translateTrait(key, val.value),
        element: elem,
        elementChar: elemNames[elem],
        cost: this.getOpportunityCost(elem),
      });
    });

    return traits;
  },

  guessElement(val) {
    const map = {
      round: 'earth', square: 'metal', oval: 'wood', long: 'water',
      red: 'fire', pale: 'metal', yellow: 'earth', dark: 'water',
      deep: 'water', high: 'fire', fast: 'wood', slow: 'earth',
      strong: 'earth', medium: 'metal', thin: 'wood', plump: 'earth',
      good: 'earth', light: 'wood', dream: 'fire', insomnia: 'water',
    };
    return map[val] || null;
  },

  translateTrait(key, val) {
    const keyMap = { n: '面形', ne: '气色', e: '声纹', se: '情志', s: '饮食', sw: '睡眠', w: '体质', nw: '体态' };
    const valMap = {
      round: '圆润', square: '方正', oval: '椭圆', long: '修长',
      red: '红润', pale: '苍白', yellow: '偏黄', dark: '暗沉',
      deep: '低沉', high: '高亢', fast: '急促', slow: '和缓',
      joy: '喜', anger: '怒', worry: '思虑', grief: '悲', fear: '恐',
      sour: '酸', bitter: '苦', sweet: '甘', spicy: '辛', salty: '咸',
      good: '安眠', light: '浅眠', dream: '多梦', insomnia: '失眠',
      strong: '壮实', medium: '匀称', thin: '瘦削', plump: '丰腴',
    };
    return `${keyMap[key] || key}：${valMap[val] || val}`;
  },

  getOpportunityCost(elem) {
    const costs = {
      wood: '得长期决策力，失爆发力',
      fire: '得洞察力与热情，失沉稳',
      earth: '得稳定与包容，失灵活',
      metal: '得决断力与效率，失变通',
      water: '得智慧与韧性，失行动力',
    };
    return costs[elem] || '';
  },

  /**
   * Generate tips based on diagnosis
   */
  generateTips(result) {
    const w = result.weights;
    const sorted = Object.entries(w).sort((a, b) => b[1] - a[1]);
    const weak = sorted[sorted.length - 1][0];

    const tipSets = {
      wood: [
        { icon: '🌿', text: '多食绿色蔬菜，养肝护目' },
        { icon: '🧘', text: '按压太冲穴，疏肝理气' },
        { icon: '🌅', text: '丑时（1-3点）前入睡，肝血充盈' },
      ],
      fire: [
        { icon: '🫀', text: '午时静养，清心降火' },
        { icon: '🍵', text: '宜饮莲子心茶或苦丁茶' },
        { icon: '😌', text: '保持心境平和，勿大喜大悲' },
      ],
      earth: [
        { icon: '🍚', text: '饮食规律，细嚼慢咽' },
        { icon: '🦶', text: '按压足三里，健脾和胃' },
        { icon: '🧠', text: '减少思虑，适度运动助消化' },
      ],
      metal: [
        { icon: '🌬️', text: '深呼吸练习，润肺养气' },
        { icon: '💧', text: '多饮温水，保持呼吸道湿润' },
        { icon: '🍐', text: '秋冬宜食梨、银耳润肺' },
      ],
      water: [
        { icon: '🛌', text: '酉时（17-19点）补肾，忌过劳' },
        { icon: '🫘', text: '多食黑色食物：黑豆、黑芝麻' },
        { icon: '🦵', text: '按压涌泉穴，固肾培元' },
      ],
    };

    return tipSets[weak] || tipSets.water;
  }
};

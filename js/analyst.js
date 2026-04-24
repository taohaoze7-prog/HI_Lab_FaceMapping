/* ============================================
   ANALYST — AI 深度辨证
   Gemini 2.5 Flash streaming integration.
   ============================================ */

// API key is kept server-side — the browser only talks to the local proxy
const GEMINI_URL = '/api/analyze';

const Analyst = {
  isStreaming: false,
  _lastResult:  null,
  _lastAnswers: null,
  _firstAnalysisText: '',
  _roundCount: 0,            // 0 = none yet, 1 = first done, 2+ = deeper rounds
  _conversation: [],         // [{ round, userDetails, analysis }]

  init() {
    document.getElementById('deeperSubmitBtn').addEventListener('click', () => {
      this.deeperAnalyze();
    });

    // Allow Ctrl/Cmd+Enter to submit
    document.getElementById('deeperTextarea').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.deeperAnalyze();
    });
  },

  /**
   * Start the initial deep analysis.
   */
  startAnalysis(result, answers) {
    this._lastResult  = result;
    this._lastAnswers = answers;
    this._firstAnalysisText = '';
    this._roundCount = 0;
    this._conversation = [];

    // Reset deeper section (handles both fresh state and post-multi-round)
    const wrap = document.getElementById('deeperInputWrap');
    wrap.classList.remove('visible');
    document.getElementById('deeperTextarea').value = '';
    const submitBtn = document.getElementById('deeperSubmitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '✦ 进行第二次分析 · Deepen the Analysis';
    const phase = document.getElementById('phaseAnalyzing');
    phase.querySelectorAll('.analyzing-body.deeper-body:not(#deeperBody)').forEach(el => el.remove());
    const deeperBody = document.getElementById('deeperBody');
    deeperBody.style.display = 'none';
    let dContentEl = document.getElementById('dContent') || phase.querySelector('[id^="dContent-round-"]');
    if (dContentEl) {
      dContentEl.id = 'dContent';
      dContentEl.innerHTML = '';
    }
    const divLabel = deeperBody.querySelector('.deeper-divider-label');
    if (divLabel) divLabel.textContent = '第二次分析 · Round 2 — Deeper Reading';

    this.analyze(result, answers);
  },

  /**
   * Initial analysis stream.
   */
  async analyze(result, answers) {
    if (this.isStreaming) return;
    this.isStreaming = true;

    if (typeof Soundscape !== 'undefined') Soundscape.ritualDivination();

    document.getElementById('aHexName').textContent = result.hexagram.title;

    const contentEl = document.getElementById('aContent');
    const loadingEl = document.getElementById('aLoading');
    const footerEl  = document.getElementById('aFooter');

    contentEl.innerHTML = '';
    contentEl.appendChild(loadingEl);
    loadingEl.style.display = 'block';
    footerEl.classList.remove('visible');

    document.body.dataset.phase = 'analyzing';

    const prompt = this.buildPrompt(result, answers);

    try {
      const fullText = await this.stream(prompt, contentEl, true);
      this._firstAnalysisText = fullText;
      this._roundCount = 1;
      this._conversation.push({ round: 1, userDetails: '(initial four-diagnosis intake)', analysis: fullText });

      // Reveal deeper input after a short pause
      setTimeout(() => {
        document.getElementById('deeperInputWrap').classList.add('visible');
        footerEl.classList.add('visible');
      }, 600);

    } catch (error) {
      loadingEl.style.display = 'none';
      contentEl.innerHTML = this.errorHTML(error.message);
      footerEl.classList.add('visible');
    }

    this.isStreaming = false;
  },

  /**
   * Deeper analysis using the extra details the user typed.
   * Supports multiple rounds — each new submission appends a new section.
   */
  async deeperAnalyze() {
    const details = document.getElementById('deeperTextarea').value.trim();
    if (!details || this.isStreaming) return;
    this.isStreaming = true;

    const submitBtn = document.getElementById('deeperSubmitBtn');
    submitBtn.disabled = true;

    const deeperBodyEl = document.getElementById('deeperBody');
    deeperBodyEl.style.display = 'block';

    const roundNum = this._roundCount + 1;
    const sectionId = `dContent-round-${roundNum}`;

    // First deeper round writes into the existing #dContent.
    // Subsequent rounds append a fresh divider+container.
    let dContentEl;
    if (roundNum === 2) {
      dContentEl = document.getElementById('dContent');
      dContentEl.id = sectionId;
      // also set the existing divider label to include round number
      const divLabel = deeperBodyEl.querySelector('.deeper-divider-label');
      if (divLabel) divLabel.textContent = `第二次分析 · Round 2 — Deeper Reading`;
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'analyzing-body deeper-body';
      wrap.innerHTML = `
        <div class="deeper-divider">
          <span class="deeper-divider-label">第${this._cn(roundNum)}次分析 · Round ${roundNum} — Further Reading</span>
        </div>
        <div class="analyzing-content" id="${sectionId}"></div>`;
      deeperBodyEl.parentNode.insertBefore(wrap, document.getElementById('deeperInputWrap'));
      dContentEl = document.getElementById(sectionId);
    }

    dContentEl.innerHTML = `
      <div class="analyzing-loading">
        深层辨证中 · Diagnosing<span class="dot-pulse"><span></span><span></span><span></span></span>
      </div>`;

    // Scroll to the new section
    setTimeout(() => {
      dContentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const prompt = this.buildDeeperPrompt(details, roundNum);

    try {
      const fullText = await this.stream(prompt, dContentEl, true);
      this._roundCount = roundNum;
      this._conversation.push({ round: roundNum, userDetails: details, analysis: fullText });

      // Reset textarea for next round
      document.getElementById('deeperTextarea').value = '';
      submitBtn.disabled = false;
      submitBtn.innerHTML = `✦ 继续追问 · Ask a Follow-up`;
    } catch (error) {
      dContentEl.innerHTML = this.errorHTML(error.message);
      submitBtn.disabled = false;
    }

    this.isStreaming = false;
  },

  _cn(n) {
    return ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n] || n;
  },

  /**
   * Core SSE streaming helper. Returns the full accumulated text.
   * bilingual=true splits on [MANDARIN] and renders two panels.
   */
  async stream(prompt, containerEl, bilingual = false) {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 6144, temperature: 0.7 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    containerEl.innerHTML = '';

    // For bilingual mode the cursor sits after the container, not inside it
    // (renderBilingual replaces innerHTML on every chunk which would wipe it)
    const textContainer = bilingual ? null : document.createElement('div');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    if (!bilingual) {
      containerEl.appendChild(textContainer);
      containerEl.appendChild(cursor);
    } else {
      containerEl.insertAdjacentElement('afterend', cursor);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer   = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const part = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (part) {
            fullText += part;
            if (bilingual) {
              this.renderBilingual(containerEl, fullText);
            } else {
              this.renderMarkdown(textContainer, fullText);
            }
            const phase = document.getElementById('phaseAnalyzing');
            phase.scrollTop = phase.scrollHeight;
          }
        } catch (e) { /* skip */ }
      }
    }

    cursor.remove();
    return fullText;
  },

  /**
   * Initial TCM diagnosis prompt — bilingual (English first, [MANDARIN] divider, Chinese after).
   */
  buildPrompt(result, answers) {
    const elemNames   = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    const elemNamesEn = { metal: 'Metal', wood: 'Wood', water: 'Water', fire: 'Fire', earth: 'Earth' };
    const w = result.weights;

    const answerLines = Object.entries(answers).map(([key, val]) => {
      const labelMap = {
        faceShape: ['面形', 'Face shape'], complexion: ['气色', 'Complexion'],
        voice: ['声纹', 'Voice'], emotion: ['情志', 'Emotion'],
        taste: ['饮食', 'Taste preference'], sleep: ['睡眠', 'Sleep'],
      };
      const [zh, en] = labelMap[key] || [key, key];
      return `- ${zh} / ${en}: ${val.text} (${elemNames[val.element] || '?'} / ${elemNamesEn[val.element] || '?'})`;
    }).join('\n');

    const weightLine = Object.entries(w)
      .map(([k, v]) => `${elemNamesEn[k]}:${Math.round(v * 100)}%`)
      .join('  ');

    return `You are a senior practitioner of Traditional Chinese Medicine, expert in face diagnosis (mian zhen), meridian theory, and Five-Element pattern differentiation. Write in a warm, professional, confident tone — no hedging, no AI disclaimers, no "as an AI" preambles.

PATIENT FOUR-DIAGNOSIS INTAKE (望闻问切)
${answerLines}

Hexagram: ${result.hexagram.title} (#${result.hexagram.num}) — ${result.hexagram.nature}
Five-element weights: ${weightLine}

This reading is delivered live by a host to an audience. The host must be able to scan the top and grab key points instantly, then expand into specifics. Optimise for that.

OUTPUT STRUCTURE — use these EXACT English headings, in this order:

## Verdict
ONE bold sentence, ≤20 words. The single-line takeaway the host can open with. Example form: "A Wood-Fire constitution meeting the Hexagram of Fire — bright mind, but the heart-spirit burns fast."

## Key Points
Exactly three bullet points, each ONE short sentence:
- **Constitution:** [core label] — [one-clause why]
- **Hexagram signal:** [what this hexagram is saying about them right now]
- **Watch for:** [the single most important risk or tendency]

## Constitutional & Organ Reading
One substantial paragraph (90-130 words). Identify the constitutional type from all six indicators together, name the weakest element and its zang-fu organ system, and describe likely physical manifestations. Be specific — reference the patient's actual answers, not generic TCM.

## Hexagram Life Insight
One paragraph (80-110 words). Read the hexagram as a guide to the patient's current life rhythm — personality leaning, where opportunity sits, what to guard against. Tie it back to the body, not abstract fortune.

## Regimen
Up to 4 bullets total. Each bullet ONE line, concrete and actionable:
- **Diet:** [1-2 specific foods/drinks + when]
- **Acupoint:** [1 point with pinyin + location + how to press]
- **Rhythm:** [sleep / movement / seasonal — pick the most urgent one]
- **Emotion:** [one clear instruction for the heart-spirit]

## This Week's Focus
ONE sentence. The single observable signal the patient should track this week. Sets up the next round.

LENGTH & STYLE
- Total English: 350-500 words.
- Be specific, reference the patient's actual answers, no generic filler.
- Begin immediately with "## Verdict" — no preamble, no AI disclaimers.

After the English completes, output the EXACT marker line on its own:
[MANDARIN]

Then write a faithful Chinese translation using these exact headings in this order:
## 一句定论
## 关键三点
## 体质与脏腑
## 卦象人生启示
## 调养建议
## 本周观察

Inside the Chinese translation, translate the bullet sub-labels as **体质**、**卦象信号**、**需留意**、**食养**、**穴位**、**节律**、**情志**.

The Chinese section must be a faithful translation, not a re-analysis.`;
  },

  /**
   * Deeper follow-up prompt — bilingual, supports multi-round.
   * roundNum: 2 = first deeper round, 3+ = further rounds.
   */
  buildDeeperPrompt(userDetails, roundNum = 2) {
    const result  = this._lastResult;
    const answers = this._lastAnswers;
    const elemNames = { metal: 'Metal', wood: 'Wood', water: 'Water', fire: 'Fire', earth: 'Earth' };

    const answerLines = Object.entries(answers).map(([key, val]) => {
      const labelMap = {
        faceShape: 'Face shape', complexion: 'Complexion', voice: 'Voice',
        emotion: 'Emotion', taste: 'Taste preference', sleep: 'Sleep',
      };
      return `- ${labelMap[key] || key}: ${val.text} (${elemNames[val.element] || 'unknown'})`;
    }).join('\n');

    const weightLine = Object.entries(result.weights)
      .map(([k, v]) => `${elemNames[k]}:${Math.round(v * 100)}%`)
      .join('  ');

    // Build conversation history (compact form)
    const history = this._conversation.map(turn => {
      const summary = (turn.analysis || '').slice(0, 600);
      return `--- Round ${turn.round} ---
PATIENT NOTE: ${turn.userDetails}
ANALYSIS SUMMARY: ${summary}`;
    }).join('\n\n');

    return `You are a senior Traditional Chinese Medicine practitioner conducting an iterative consultation. This is round ${roundNum} of the conversation. Write directly — no AI preambles, no disclaimers.

PATIENT INTAKE (four-diagnosis baseline)
${answerLines}

Hexagram: ${result.hexagram.title} (#${result.hexagram.num}) — ${result.hexagram.nature}
Five-element weights: ${weightLine}

PRIOR CONSULTATION HISTORY
${history}

PATIENT'S NEW INPUT (round ${roundNum})
${userDetails}

OUTPUT STRUCTURE — use exactly these four English headings, in this order:

## Deeper Pattern
2-3 sentences. What does this new information reveal about the underlying pattern? Be specific.

## What This Changes from Round ${roundNum - 1}
2-3 sentences. Explicitly call out where the prior analysis was reinforced, refined, or revised by the new input. Don't be vague — name the shift.

## Targeted Recommendations
3-4 concrete, prioritised actions. Each one tied to the new information. Include at least one diet, one acupoint or movement, and one behavioural / scheduling change.

## 7-Day Tracking Plan
3 specific signals to observe over the next week. Each must be measurable or clearly observable (timing, sensation quality, frequency). These will inform the next round.

LENGTH
- Total English: 350-500 words.
- Begin immediately with "## Deeper Pattern" — no preamble.

After the English completes, output on its own line:
[MANDARIN]

Then write a faithful Chinese translation using these exact headings:
## 深层辨证
## 与第${this._cn(roundNum - 1)}次分析的差异
## 精准调理
## 七日追踪计划

The Chinese section must be a translation, not a re-analysis.`;
  },

  /**
   * Bilingual renderer — splits on [MANDARIN] marker.
   * English panel on top, Mandarin panel below.
   */
  renderBilingual(container, text) {
    const marker = '[MANDARIN]';
    const idx = text.indexOf(marker);

    const enRaw = idx === -1 ? text : text.slice(0, idx);
    const zhRaw = idx === -1 ? ''   : text.slice(idx + marker.length);

    let html = `<div class="bilingual-en">${this.markdownToHTML(enRaw)}</div>`;

    if (zhRaw.trim()) {
      html += `
        <div class="bilingual-divider">
          <span class="bilingual-divider-label">中文译文</span>
        </div>
        <div class="bilingual-zh">${this.markdownToHTML(zhRaw)}</div>`;
    }

    container.innerHTML = html;
  },

  /**
   * Simple markdown → HTML renderer.
   */
  renderMarkdown(container, text) {
    container.innerHTML = this.markdownToHTML(text);
  },

  markdownToHTML(text) {
    let html = text.trim()
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/((?:<li>.*?<\/li>\n?)+)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    if (!html.startsWith('<h2>') && !html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }
    return html;
  },

  errorHTML(msg) {
    return `
      <div style="color: var(--elem-fire); padding: 20px 0;">
        <p style="margin-bottom: 8px;">分析请求失败</p>
        <p style="font-size: 11px; color: var(--warm-12);">${this.escapeHtml(msg)}</p>
        <p style="font-size: 11px; color: var(--warm-06); margin-top: 12px;">请检查网络连接是否正常。</p>
      </div>`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => Analyst.init());

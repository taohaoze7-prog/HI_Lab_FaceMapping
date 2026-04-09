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

    // Reset deeper section
    const wrap = document.getElementById('deeperInputWrap');
    wrap.classList.remove('visible');
    document.getElementById('deeperTextarea').value = '';
    document.getElementById('deeperSubmitBtn').disabled = false;
    document.getElementById('deeperBody').style.display = 'none';
    document.getElementById('dContent').innerHTML = '';

    this.analyze(result, answers);
  },

  /**
   * Initial analysis stream.
   */
  async analyze(result, answers) {
    if (this.isStreaming) return;
    this.isStreaming = true;

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
      const fullText = await this.stream(prompt, contentEl);
      this._firstAnalysisText = fullText;

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
   */
  async deeperAnalyze() {
    const details = document.getElementById('deeperTextarea').value.trim();
    if (!details || this.isStreaming) return;

    document.getElementById('deeperSubmitBtn').disabled = true;

    const deeperBodyEl = document.getElementById('deeperBody');
    const dContentEl   = document.getElementById('dContent');
    deeperBodyEl.style.display = 'block';
    dContentEl.innerHTML = `
      <div class="analyzing-loading">
        深层辨证中<span class="dot-pulse"><span></span><span></span><span></span></span>
      </div>`;

    // Scroll to the deeper section
    setTimeout(() => {
      deeperBodyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const prompt = this.buildDeeperPrompt(details);

    try {
      await this.stream(prompt, dContentEl, true);
    } catch (error) {
      dContentEl.innerHTML = this.errorHTML(error.message);
    }
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
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
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
   * Initial TCM diagnosis prompt.
   */
  buildPrompt(result, answers) {
    const elemNames = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    const w = result.weights;

    const answerLines = Object.entries(answers).map(([key, val]) => {
      const labelMap = {
        faceShape: '面形', complexion: '气色', voice: '声纹',
        emotion: '情志', taste: '饮食', sleep: '睡眠',
      };
      return `- ${labelMap[key] || key}：${val.text}（${elemNames[val.element] || '未知'}）`;
    }).join('\n');

    const weightLine = Object.entries(w)
      .map(([k, v]) => `${elemNames[k]}:${Math.round(v * 100)}`)
      .join(' ');

    return `你是一位精通中医面诊、经络学说和五行辨证的资深分析师。请用温和专业的语气进行分析。

以下是通过望闻问切四诊收集的信息：

【四诊数据】
${answerLines}

【卦象】${result.hexagram.title}（第${result.hexagram.num}卦）— ${result.hexagram.nature}
【五行权重】${weightLine}

请按以下结构输出分析：

## 体质辨识

综合六项指标判断体质类型，说明五行偏盛与不足的关系，以及与卦象的呼应。2-3段即可。

## 脏腑分析

重点分析最弱五行对应的脏腑系统，说明可能的身体表现和潜在风险。结合其他指标做交叉验证。2-3段即可。

## 个性化调理方案

分三个维度给出具体建议：

**食养**：推荐 3-4 种具体食材或饮品，说明功效。

**穴位**：推荐 2-3 个穴位，说明位置和按摩方法。

**起居**：作息建议、运动方式、情志调节方法各一条。

保持简洁，总字数控制在 600-800 字。`;
  },

  /**
   * Deeper follow-up prompt — includes first analysis + user details.
   * Output format: English first, then [MANDARIN] marker, then Chinese translation.
   */
  buildDeeperPrompt(userDetails) {
    const result  = this._lastResult;
    const answers = this._lastAnswers;
    const elemNames = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };

    const answerLines = Object.entries(answers).map(([key, val]) => {
      const labelMap = {
        faceShape: 'Face shape', complexion: 'Complexion', voice: 'Voice',
        emotion: 'Emotion', taste: 'Taste preference', sleep: 'Sleep',
      };
      return `- ${labelMap[key] || key}: ${val.text} (${val.element || 'unknown'})`;
    }).join('\n');

    const weightLine = Object.entries(result.weights)
      .map(([k, v]) => `${k}:${Math.round(v * 100)}%`)
      .join('  ');

    return `You are a senior Traditional Chinese Medicine practitioner writing a personalised deeper reading. Write directly — no introductory phrases, no disclaimers, no references to being an AI or a language model.

PATIENT CONTEXT
${answerLines}

Hexagram: ${result.hexagram.title} (#${result.hexagram.num}) — ${result.hexagram.nature}
Five-element weights: ${weightLine}

INITIAL ANALYSIS (summary)
${this._firstAnalysisText.slice(0, 1000)}

PATIENT'S ADDITIONAL DETAILS
${userDetails}

OUTPUT RULES
- Begin writing immediately with the first section heading.
- Use exactly these three section headings (in this order): ## Deeper Pattern, ## Targeted Recommendations, ## Key Cautions
- Under each heading write 2–4 concise sentences or bullet points.
- Total length: 220–300 words.
- No preamble. No closing remarks. No "In conclusion". No "As a TCM practitioner".
- After the English is complete, output the exact marker line: [MANDARIN]
- Then write a faithful Mandarin Chinese translation of everything above the marker, using the same three headings translated as: ## 深层辨证, ## 精准调理, ## 注意事项
- The Mandarin section must be a translation, not a new analysis.`;
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

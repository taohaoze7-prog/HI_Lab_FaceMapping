/* ============================================
   ANALYST — AI 深度辨证
   Claude Haiku streaming integration.
   ============================================ */

const Analyst = {
  apiKey: null,
  isStreaming: false,

  init() {
    // Load saved API key
    this.apiKey = localStorage.getItem('claude_api_key') || null;

    // Modal handlers
    document.getElementById('apiModalCancel').addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('apiModalSave').addEventListener('click', () => {
      const key = document.getElementById('apiKeyInput').value.trim();
      if (key) {
        this.apiKey = key;
        localStorage.setItem('claude_api_key', key);
        this.hideModal();
        // Trigger analysis after saving key
        if (this._pendingResult) {
          this.analyze(this._pendingResult, this._pendingAnswers);
          this._pendingResult = null;
          this._pendingAnswers = null;
        }
      }
    });

    // Close modal on overlay click
    document.getElementById('apiModal').addEventListener('click', (e) => {
      if (e.target.id === 'apiModal') this.hideModal();
    });
  },

  showModal() {
    const modal = document.getElementById('apiModal');
    const input = document.getElementById('apiKeyInput');
    if (this.apiKey) input.value = this.apiKey;
    modal.classList.add('visible');
    setTimeout(() => input.focus(), 100);
  },

  hideModal() {
    document.getElementById('apiModal').classList.remove('visible');
  },

  /**
   * Start deep analysis.
   * If no API key, show modal first.
   */
  startAnalysis(result, answers) {
    if (!this.apiKey) {
      this._pendingResult = result;
      this._pendingAnswers = answers;
      this.showModal();
      return;
    }
    this.analyze(result, answers);
  },

  /**
   * Core analysis — call Claude Haiku with streaming.
   */
  async analyze(result, answers) {
    if (this.isStreaming) return;
    this.isStreaming = true;

    // Set up analyzing phase UI
    document.getElementById('aHexName').textContent = result.hexagram.title;

    const contentEl = document.getElementById('aContent');
    const loadingEl = document.getElementById('aLoading');
    const footerEl = document.getElementById('aFooter');

    contentEl.innerHTML = '';
    contentEl.appendChild(loadingEl);
    loadingEl.style.display = 'block';
    footerEl.classList.remove('visible');

    // Switch phase
    document.body.dataset.phase = 'analyzing';

    // Build prompt
    const prompt = this.buildPrompt(result, answers);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          stream: true,
          messages: [{
            role: 'user',
            content: prompt,
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err}`);
      }

      // Hide loading, start streaming
      loadingEl.style.display = 'none';

      // Create content container with cursor
      const textContainer = document.createElement('div');
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      contentEl.appendChild(textContainer);
      contentEl.appendChild(cursor);

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' &&
                parsed.delta && parsed.delta.type === 'text_delta') {
              const text = parsed.delta.text;
              fullText += text;
              this.renderMarkdown(textContainer, fullText);

              // Auto-scroll
              const phase = document.getElementById('phaseAnalyzing');
              phase.scrollTop = phase.scrollHeight;
            }
          } catch (e) {
            // Skip unparseable lines
          }
        }
      }

      // Remove cursor, show footer
      cursor.remove();
      footerEl.classList.add('visible');

    } catch (error) {
      loadingEl.style.display = 'none';

      contentEl.innerHTML = `
        <div style="color: var(--elem-fire); padding: 20px 0;">
          <p style="margin-bottom: 8px;">分析请求失败</p>
          <p style="font-size: 11px; color: var(--warm-12);">${this.escapeHtml(error.message)}</p>
          <p style="font-size: 11px; color: var(--warm-06); margin-top: 12px;">
            请检查 API Key 是否正确，或网络是否可用。
          </p>
          <button onclick="Analyst.showModal()" style="
            margin-top: 16px; padding: 8px 24px;
            border: 1px solid var(--jade-25); background: transparent;
            color: var(--jade); font-size: 12px; cursor: pointer;
            font-family: var(--font-body); letter-spacing: 0.05em;
          ">重新配置 API Key</button>
        </div>
      `;
      footerEl.classList.add('visible');
    }

    this.isStreaming = false;
  },

  /**
   * Build the TCM analysis prompt.
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
   * Simple markdown → HTML renderer.
   */
  renderMarkdown(container, text) {
    let html = text
      // Headers
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // List items
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines within paragraphs
      .replace(/\n/g, '<br>');

    // Wrap in paragraph
    if (!html.startsWith('<h2>') && !html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }

    container.innerHTML = html;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => Analyst.init());

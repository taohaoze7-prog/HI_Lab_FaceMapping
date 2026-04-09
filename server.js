/* ============================================
   DEV SERVER — Static files + Gemini proxy
   Run: node server.js
   ============================================ */

require('dotenv').config();

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT           = 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-2.5-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.glb':  'model/gltf-binary',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

const server = http.createServer(async (req, res) => {

  // ── Gemini proxy ──────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/analyze') {
    if (!GEMINI_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set in .env' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const upstream = await fetch(GEMINI_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        res.writeHead(upstream.status, {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        });

        // Pipe the SSE stream straight through to the browser
        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── Static file server ────────────────────────────────
  const urlPath  = req.url.split('?')[0];
  const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`H&I Lab running at http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn('⚠  GEMINI_API_KEY missing — add it to .env');
  }
});

import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompt.js';
import { sanitizeMessages } from './pii.js';
import { createRateLimiter } from './rateLimit.js';
import { validateChat } from './validate.js';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.KALAM_MODEL ?? 'claude-sonnet-5-5';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const allow = createRateLimiter({ max: 30, windowMs: 60_000 });

// La clé vient UNIQUEMENT de la variable d'environnement ANTHROPIC_API_KEY du serveur.
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/chat') return send(res, 404, { error: 'not found' });

  if (!allow(req.socket.remoteAddress ?? 'unknown')) return send(res, 429, { error: 'too many requests' });
  if (!client) return send(res, 503, { error: 'server not configured' });

  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'invalid json' }); }
  const { value, error } = validateChat(body);
  if (error) return send(res, 400, { error });

  const clean = sanitizeMessages(value.messages, value.ageProfile);
  if (clean.error) return send(res, 400, { error: clean.error });

  try {
    const reply = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: buildSystemPrompt(value),
      messages: clean.messages,
    });
    const text = reply.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    send(res, 200, { reply: text });
  } catch (e) {
    console.error('anthropic error', e?.status ?? e?.message);
    send(res, 502, { error: 'teacher unavailable' });
  }
});

server.listen(PORT, () => console.log(`Kalam backend on :${PORT}`));

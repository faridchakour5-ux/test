import http from 'node:http';
import { buildSystemPrompt } from './prompt.js';
import { sanitizeMessages } from './pii.js';
import { createRateLimiter } from './rateLimit.js';
import { validateChat } from './validate.js';

const MAX_BODY = 20_000;

// Crée le serveur HTTP. `client` est le client Anthropic (ou un faux dans les tests): aucune clé ici.
export function createApp({ client, model = 'claude-sonnet-5-5', allowedOrigin = '*', rate = { max: 30, windowMs: 60_000 }, log = console }) {
  const allow = createRateLimiter(rate);

  function send(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    res.end(status === 204 ? undefined : JSON.stringify(payload));
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      let tooLarge = false;
      req.on('data', (c) => {
        if (tooLarge) return;
        data += c;
        if (data.length > MAX_BODY) { tooLarge = true; data = ''; }
      });
      req.on('end', () => (tooLarge ? reject(Object.assign(new Error('too large'), { status: 413 })) : resolve(data)));
      req.on('error', reject);
    });
  }

  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});
      if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, configured: !!client });
      if (req.method !== 'POST' || req.url !== '/chat') return send(res, 404, { error: 'not found' });

      if (!allow(req.socket.remoteAddress ?? 'unknown')) return send(res, 429, { error: 'too many requests' });
      if (!client) return send(res, 503, { error: 'server not configured' });

      let body;
      try { body = JSON.parse(await readBody(req)); }
      catch (e) { return send(res, e?.status === 413 ? 413 : 400, { error: e?.status === 413 ? 'payload too large' : 'invalid json' }); }

      const { value, error } = validateChat(body);
      if (error) return send(res, 400, { error });
      const clean = sanitizeMessages(value.messages, value.ageProfile);
      if (clean.error) return send(res, 400, { error: clean.error });

      try {
        const reply = await client.messages.create({
          model,
          max_tokens: value.ageProfile === 'kids' ? 150 : 300,
          system: buildSystemPrompt(value),
          messages: clean.messages,
        });
        const text = reply.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
        if (!text) return send(res, 502, { error: 'empty reply' });
        send(res, 200, { reply: text });
      } catch (e) {
        log.error('anthropic error', e?.status ?? e?.message);
        // 429 côté fournisseur: on dit au client de réessayer plus tard; le reste est une panne côté serveur.
        send(res, e?.status === 429 ? 429 : 502, { error: 'teacher unavailable' });
      }
    } catch (e) {
      log.error('unexpected', e?.message);
      if (!res.headersSent) send(res, 500, { error: 'internal error' });
    }
  });
}

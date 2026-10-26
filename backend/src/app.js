import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { buildSystemPrompt } from './prompt.js';
import { sanitizeMessages } from './pii.js';
import { clientKey, createDailyBudget, createRateLimiter } from './rateLimit.js';
import { validateChat } from './validate.js';

// Consigne interne envoyée à la place d'un message de l'apprenant quand le professeur ouvre la scène.
export const OPENING_PROMPT = '(Start the role-play now. Greet me briefly in character and ask your first simple question.)';

const MAX_BODY = 20_000;

// Crée le serveur HTTP. `client` est le client Anthropic (ou un faux dans les tests): aucune clé ici.
export function createApp({ client, model = 'claude-sonnet-5-5', allowedOrigin = '*', rate = { max: 30, windowMs: 60_000 }, trustProxy = false, dailyBudget = 0, log = console }) {
  const allow = createRateLimiter(rate);
  const takeBudget = createDailyBudget(dailyBudget);

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
      let done = false;
      const fail = (err) => { if (!done) { done = true; reject(err); } };
      req.on('data', (c) => {
        if (done) return;
        data += c;
        if (data.length > MAX_BODY) { data = ''; fail(Object.assign(new Error('too large'), { status: 413 })); }
      });
      req.on('end', () => { if (!done) { done = true; resolve(data); } });
      req.on('error', fail);
    });
  }

  // Réponse en flux (SSE): chaque morceau de texte part dès qu'il arrive. Les erreurs AVANT le premier
  // morceau sont de vraies erreurs HTTP (le client peut se replier sur /chat); après, un évènement « error ».
  async function streamReply(req, res, params) {
    let aborted = false;
    res.on('close', () => { aborted = true; });
    let stream;
    try {
      stream = await client.messages.create({ ...params, stream: true });
    } catch (e) {
      log.error('anthropic stream error', e?.status ?? e?.message);
      takeBudget.refund(); // rien n'a été produit: la place du budget est rendue (comme pour /chat)
      return send(res, e?.status === 429 ? 429 : 502, { error: 'teacher unavailable' });
    }
    let started = false;
    let total = '';
    const begin = () => {
      if (started) return;
      started = true;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': allowedOrigin,
        'X-Content-Type-Options': 'nosniff',
      });
    };
    try {
      for await (const ev of stream) {
        if (aborted) { stream.controller?.abort?.(); return; }
        if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
          begin();
          total += ev.delta.text;
          res.write(`data: ${JSON.stringify({ delta: ev.delta.text })}\n\n`);
        }
      }
      if (!total.trim()) { takeBudget.refund(); return started ? res.end(`data: ${JSON.stringify({ error: 'empty reply' })}\n\n`) : send(res, 502, { error: 'empty reply' }); }
      res.end(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (e) {
      log.error('anthropic stream error', e?.status ?? e?.message);
      if (!started) { takeBudget.refund(); return send(res, e?.status === 429 ? 429 : 502, { error: 'teacher unavailable' }); } // avant le 1er morceau: rien produit
      res.end(`data: ${JSON.stringify({ error: 'teacher unavailable' })}\n\n`);
    }
  }

  return http.createServer(async (req, res) => {
    // Journal d'accès: identifiant de requête, route, statut et durée. JAMAIS le contenu des messages, JAMAIS l'adresse IP
    // (données personnelles): de quoi diagnostiquer une panne sans stocker de données d'utilisateur.
    const requestId = randomUUID();
    const startedAt = Date.now();
    res.setHeader('X-Request-Id', requestId);
    res.on('close', () => {
      log.info?.(JSON.stringify({ evt: 'request', id: requestId, method: req.method, path: (req.url ?? '').split('?')[0].slice(0, 40), status: res.statusCode, ms: Date.now() - startedAt }));
    });
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});
      // Chemin sans paramètres d'adresse ni barre finale: « /health?x=1 » ou « /chat/ » ne donnent plus 404.
      const path = (req.url ?? '').split('?')[0].replace(/\/+$/, '') || '/';
      if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, configured: !!client });
      const streaming = req.method === 'POST' && path === '/chat/stream';
      if (req.method !== 'POST' || (path !== '/chat' && !streaming)) return send(res, 404, { error: 'not found' });

      if (!allow(clientKey(req, trustProxy))) return send(res, 429, { error: 'too many requests' });
      if (!client) return send(res, 503, { error: 'server not configured' });

      let body;
      try { body = JSON.parse(await readBody(req)); }
      catch (e) {
        if (e?.status !== 413) return send(res, 400, { error: 'invalid json' });
        // Corps trop gros: on répond, puis on coupe la connexion au lieu de continuer à lire l'envoi.
        res.setHeader('Connection', 'close');
        res.on('finish', () => req.destroy());
        return send(res, 413, { error: 'payload too large' });
      }

      const { value, error } = validateChat(body);
      if (error) return send(res, 400, { error });
      const incoming = value.start ? [{ role: 'user', content: OPENING_PROMPT }] : value.messages;
      const clean = sanitizeMessages(incoming, value.ageProfile);
      if (clean.error) return send(res, 400, { error: clean.error });
      // Le budget quotidien ne compte que les requêtes valides, celles qui coûtent vraiment un appel à l'IA.
      if (!takeBudget()) return send(res, 503, { error: 'daily budget reached' });

      // La conversation commence par le salut du professeur (réponse à la consigne d'ouverture): l'API demande un premier message de
      // l'apprenant, on remet donc la consigne d'ouverture devant (l'historique fenêtré peut aussi commencer par le professeur).
      const history = clean.messages[0]?.role === 'assistant' ? [{ role: 'user', content: OPENING_PROMPT }, ...clean.messages] : clean.messages;
      const params = {
        model,
        max_tokens: value.ageProfile === 'kids' ? 150 : 300,
        system: buildSystemPrompt(value),
        messages: history,
      };

      if (streaming) return await streamReply(req, res, params);

      try {
        const reply = await client.messages.create(params);
        const text = reply.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
        if (!text) { takeBudget.refund(); return send(res, 502, { error: 'empty reply' }); }
        send(res, 200, { reply: text });
      } catch (e) {
        log.error('anthropic error', e?.status ?? e?.message);
        takeBudget.refund(); // l'appel a échoué sans rien produire: la place est rendue (les nouvelles tentatives ne vident pas le budget)
        // 429 côté fournisseur: on dit au client de réessayer plus tard; le reste est une panne côté serveur.
        send(res, e?.status === 429 ? 429 : 502, { error: 'teacher unavailable' });
      }
    } catch (e) {
      log.error('unexpected', e?.message);
      if (!res.headersSent) send(res, 500, { error: 'internal error' });
    }
  });
}

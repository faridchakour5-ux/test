import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp, OPENING_PROMPT } from '../src/app.js';

const delta = (text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } });
const textClient = (text = 'Hello there!') => ({ messages: { create: async () => ({ content: [{ type: 'text', text }] }) } });
const failClient = (status) => ({ messages: { create: async () => { throw Object.assign(new Error('x'), { status }); } } });

async function withServer(opts, fn) {
  const logs = { error: [], info: [] };
  const log = { error: (...a) => logs.error.push(a), info: (s) => logs.info.push(JSON.parse(s)) };
  const server = createApp({ log, ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base, logs); } finally { await new Promise((r) => server.close(r)); }
}
const valid = { ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content: 'Hi' }] };
const post = (base, path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('toutes les réponses JSON portent les en-têtes de sécurité et l\'origine autorisée', async () => {
  await withServer({ client: textClient(), allowedOrigin: 'https://kalam.example' }, async (base) => {
    const r = await post(base, '/chat', valid);
    assert.equal(r.headers.get('content-type'), 'application/json');
    assert.equal(r.headers.get('access-control-allow-origin'), 'https://kalam.example');
    assert.equal(r.headers.get('access-control-allow-headers'), 'Content-Type');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  });
});
test('origine autorisée par défaut: toutes (*)', async () => {
  await withServer({ client: textClient() }, async (base) => {
    assert.equal((await post(base, '/chat', valid)).headers.get('access-control-allow-origin'), '*');
  });
});
test('OPTIONS (pré-vérification du navigateur): 204 sans corps, avec les en-têtes', async () => {
  await withServer({ client: textClient() }, async (base) => {
    const r = await fetch(`${base}/chat`, { method: 'OPTIONS' });
    assert.equal(r.status, 204);
    assert.equal(await r.text(), '');
    assert.equal(r.headers.get('access-control-allow-headers'), 'Content-Type');
  });
});
test('/health: 200 { ok, configured } sans passer par la limite de débit', async () => {
  await withServer({ client: textClient(), rate: { max: 1, windowMs: 60_000 } }, async (base) => {
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`${base}/health`);
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { ok: true, configured: true });
    }
  });
});
test('routes: seules POST /chat et POST /chat/stream existent', async () => {
  await withServer({ client: textClient() }, async (base) => {
    for (const [m, p] of [['GET', '/chat'], ['GET', '/chat/stream'], ['POST', '/health'], ['POST', '/autre'], ['PUT', '/chat'], ['DELETE', '/chat'], ['GET', '/']]) {
      const r = await fetch(base + p, { method: m });
      assert.equal(r.status, 404, `${m} ${p}`);
      assert.deepEqual(await r.json(), { error: 'not found' });
    }
  });
});
test('messages d\'erreur exacts: 503, 400 (json, validation, données perso), 429', async () => {
  await withServer({ client: null }, async (base) => {
    const r = await post(base, '/chat', valid);
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { error: 'server not configured' });
  });
  await withServer({ client: textClient(), rate: { max: 2, windowMs: 60_000 } }, async (base) => {
    let r = await post(base, '/chat', '{nope');
    assert.deepEqual([r.status, await r.json()], [400, { error: 'invalid json' }]);
    r = await post(base, '/chat', { ...valid, level: 'Z9' });
    assert.deepEqual([r.status, await r.json()], [400, { error: 'invalid level' }]);
    r = await post(base, '/chat', valid);
    assert.equal(r.status, 429);
    assert.deepEqual(await r.json(), { error: 'too many requests' });
  });
  await withServer({ client: textClient() }, async (base) => {
    const r = await post(base, '/chat', { ageProfile: 'kids', level: 'A1', messages: [{ role: 'user', content: 'write me a@b.co' }] });
    assert.deepEqual([r.status, await r.json()], [400, { error: 'personal information is not allowed' }]);
  });
});
test('corps trop gros: 413, connexion fermée, message exact', async () => {
  await withServer({ client: textClient() }, async (base) => {
    const r = await post(base, '/chat', 'x'.repeat(20_001));
    assert.equal(r.status, 413);
    assert.deepEqual(await r.json(), { error: 'payload too large' });
    assert.equal(r.headers.get('connection'), 'close');
  });
});
test('corps de 20 000 caractères pile: accepté jusqu\'à la validation (400, pas 413)', async () => {
  await withServer({ client: textClient() }, async (base) => {
    const r = await post(base, '/chat', ' '.repeat(20_000));
    assert.equal(r.status, 400);
  });
});
test('budget quotidien épuisé: 503 avec message exact; une requête invalide ne consomme rien', async () => {
  await withServer({ client: textClient(), dailyBudget: 1 }, async (base) => {
    await post(base, '/chat', { ...valid, level: 'zz' });
    assert.equal((await post(base, '/chat', valid)).status, 200);
    const r = await post(base, '/chat', valid);
    assert.deepEqual([r.status, await r.json()], [503, { error: 'daily budget reached' }]);
  });
});
test('réponse IA: seuls les blocs texte, assemblés et nettoyés; vide → 502', async () => {
  const mixed = { messages: { create: async () => ({ content: [{ type: 'thinking', text: 'secret' }, { type: 'text', text: ' Hello ' }, { type: 'text', text: 'world \n' }] }) } };
  await withServer({ client: mixed }, async (base) => {
    assert.deepEqual(await (await post(base, '/chat', valid)).json(), { reply: 'Hello world' });
  });
  const onlyThinking = { messages: { create: async () => ({ content: [{ type: 'thinking', text: 'x' }] }) } };
  await withServer({ client: onlyThinking }, async (base) => {
    const r = await post(base, '/chat', valid);
    assert.deepEqual([r.status, await r.json()], [502, { error: 'empty reply' }]);
  });
});
test('panne du fournisseur: 502 / 429 selon le statut, journal sans contenu', async () => {
  for (const [status, expected] of [[429, 429], [500, 502], [undefined, 502], [401, 502]]) {
    await withServer({ client: failClient(status) }, async (base, logs) => {
      const r = await post(base, '/chat', valid);
      assert.equal(r.status, expected);
      assert.deepEqual(await r.json(), { error: 'teacher unavailable' });
      assert.deepEqual(logs.error[0], ['anthropic error', status ?? 'x']);
    });
  }
});
test('flux: en-têtes SSE, texte puis done; erreur avant le premier morceau = vraie erreur HTTP (429 ou 502)', async () => {
  const ok = { messages: { create: async () => (async function* () { yield delta('Hel'); yield delta('lo'); })() } };
  await withServer({ client: ok, allowedOrigin: 'https://k.example' }, async (base) => {
    const r = await post(base, '/chat/stream', valid);
    assert.equal(r.headers.get('content-type'), 'text/event-stream; charset=utf-8');
    assert.equal(r.headers.get('cache-control'), 'no-store, no-transform');
    assert.equal(r.headers.get('x-accel-buffering'), 'no');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('access-control-allow-origin'), 'https://k.example');
    assert.equal(await r.text(), 'data: {"delta":"Hel"}\n\ndata: {"delta":"lo"}\n\ndata: {"done":true}\n\n');
  });
  for (const [status, expected] of [[429, 429], [500, 502]]) {
    await withServer({ client: failClient(status) }, async (base, logs) => {
      const r = await post(base, '/chat/stream', valid);
      assert.equal(r.status, expected);
      assert.deepEqual(await r.json(), { error: 'teacher unavailable' });
      assert.deepEqual(logs.error[0], ['anthropic stream error', status]);
    });
  }
});
test('flux: panne en cours de route (429 inclus) = évènement « error », erreur avant tout texte = vraie erreur HTTP', async () => {
  const mid = { messages: { create: async () => (async function* () { yield delta('Hi'); throw Object.assign(new Error('x'), { status: 429 }); })() } };
  await withServer({ client: mid }, async (base) => {
    const r = await post(base, '/chat/stream', valid);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'data: {"delta":"Hi"}\n\ndata: {"error":"teacher unavailable"}\n\n');
  });
  for (const [status, expected] of [[429, 429], [503, 502]]) {
    const early = { messages: { create: async () => (async function* () { throw Object.assign(new Error('x'), { status }); })() } };
    await withServer({ client: early }, async (base, logs) => {
      const r = await post(base, '/chat/stream', valid);
      assert.equal(r.status, expected);
      assert.deepEqual(logs.error[0], ['anthropic stream error', status]);
    });
  }
  const noStatus = { messages: { create: async () => (async function* () { throw new Error('plain'); })() } };
  await withServer({ client: noStatus }, async (base, logs) => {
    assert.equal((await post(base, '/chat/stream', valid)).status, 502);
    assert.deepEqual(logs.error[0], ['anthropic stream error', 'plain']);
  });
});
test('flux: texte vide ou seulement des espaces = 502 « empty reply »; flux qui n\'émet que des blocs non texte aussi', async () => {
  const blank = { messages: { create: async () => (async function* () { yield delta('   '); })() } };
  await withServer({ client: blank }, async (base) => {
    const r = await post(base, '/chat/stream', valid);
    // des espaces sont du texte envoyé: le flux a commencé, l'erreur arrive dans le flux
    assert.equal(r.status, 200);
    assert.match(await r.text(), /"error":"empty reply"/);
  });
  const none = { messages: { create: async () => (async function* () { yield { type: 'message_start' }; yield { type: 'content_block_delta', delta: { type: 'input_json_delta', text: 'x' } }; yield delta(''); })() } };
  await withServer({ client: none }, async (base) => {
    const r = await post(base, '/chat/stream', valid);
    assert.deepEqual([r.status, await r.json()], [502, { error: 'empty reply' }]);
  });
});
test('flux: si le client coupe la connexion, la génération chez le fournisseur est interrompue', async () => {
  let aborted = false;
  let release;
  const gate = new Promise((r) => { release = r; });
  const client = { messages: { create: async () => {
    const it = (async function* () { yield delta('one '); await gate; yield delta('two '); yield delta('three'); })();
    it.controller = { abort: () => { aborted = true; } };
    return it;
  } } };
  await withServer({ client }, async (base) => {
    const ac = new AbortController();
    const r = await fetch(`${base}/chat/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid), signal: ac.signal });
    const reader = r.body.getReader();
    await reader.read();
    ac.abort();
    await new Promise((res) => setTimeout(res, 50));
    release();
    await new Promise((res) => setTimeout(res, 50));
    assert.equal(aborted, true);
  });
});
test('journal d\'accès: méthode, chemin sans paramètres (40 caractères au plus), statut, durée; jamais le contenu', async () => {
  await withServer({ client: textClient() }, async (base, logs) => {
    await post(base, '/chat?secret=abc', { ...valid, messages: [{ role: 'user', content: 'mot-de-passe-123' }] });
    await fetch(`${base}/${'a'.repeat(100)}`);
    await new Promise((r) => setTimeout(r, 20));
    const [a, b] = logs.info;
    assert.equal(a.evt, 'request');
    assert.equal(a.method, 'POST');
    assert.equal(a.status, 404); // /chat?secret=abc n'est pas la route /chat: le chemin exact est exigé
    assert.equal(a.path, '/chat');
    assert.equal(typeof a.ms, 'number');
    assert.ok(a.ms >= 0 && a.ms < 5000);
    assert.equal(b.path.length, 40);
    assert.ok(!JSON.stringify(logs.info).includes('mot-de-passe'));
    assert.match(a.id, /^[0-9a-f-]{36}$/);
  });
});
test('le mode « start » envoie la consigne d\'ouverture au fournisseur, jamais un message utilisateur réel', async () => {
  const calls = [];
  const client = { messages: { create: async (p) => { calls.push(p); return { content: [{ type: 'text', text: 'Hi!' }] }; } } };
  await withServer({ client, model: 'test-model' }, async (base) => {
    await post(base, '/chat', { ageProfile: 'kids', level: 'A1', start: true, messages: [] });
    assert.deepEqual(calls[0].messages, [{ role: 'user', content: OPENING_PROMPT }]);
    assert.equal(calls[0].model, 'test-model');
    assert.equal(calls[0].max_tokens, 150);
    await post(base, '/chat', { ...valid });
    assert.equal(calls[1].max_tokens, 300);
    assert.equal(calls[1].stream, undefined);
  });
});
test('modèle par défaut', async () => {
  const calls = [];
  const client = { messages: { create: async (p) => { calls.push(p); return { content: [{ type: 'text', text: 'Hi!' }] }; } } };
  await withServer({ client }, async (base) => {
    await post(base, '/chat', valid);
    assert.equal(calls[0].model, 'claude-sonnet-5-5');
  });
});
test('limite de débit: par client, via X-Forwarded-For seulement si le proxy est de confiance', async () => {
  const hit = (base, ip) => fetch(`${base}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(valid) });
  await withServer({ client: textClient(), rate: { max: 1, windowMs: 60_000 }, trustProxy: true }, async (base) => {
    assert.equal((await hit(base, '1.1.1.1')).status, 200);
    assert.equal((await hit(base, '2.2.2.2')).status, 200);
    assert.equal((await hit(base, '1.1.1.1')).status, 429);
  });
  await withServer({ client: textClient(), rate: { max: 1, windowMs: 60_000 } }, async (base) => {
    assert.equal((await hit(base, '1.1.1.1')).status, 200);
    assert.equal((await hit(base, '2.2.2.2')).status, 429); // en-tête falsifiable ignoré
  });
});
test('module IA qui plante à l\'appel: 502 (panne côté fournisseur), journal sans contenu', async () => {
  const bad = { messages: { get create() { throw new Error('inattendu'); } } };
  await withServer({ client: bad }, async (base, logs) => {
    const r = await post(base, '/chat', valid);
    assert.equal(r.status, 502); // l'appel au fournisseur est protégé: panne côté serveur
    assert.equal(logs.error[0][0], 'anthropic error');
  });
});
test('requête brute incomplète (client qui coupe avant la fin): le serveur reste debout', async () => {
  await withServer({ client: textClient() }, async (base) => {
    const url = new URL(base);
    await new Promise((resolve) => {
      const req = http.request({ host: url.hostname, port: url.port, method: 'POST', path: '/chat', headers: { 'Content-Type': 'application/json', 'Content-Length': '500' } });
      req.on('error', resolve);
      req.write('{"ageProfile":');
      setTimeout(() => { req.destroy(); resolve(); }, 20);
    });
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});

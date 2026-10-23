import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const quiet = { error() {} };
const okClient = (text = 'Hello! What is your name?') => {
  const calls = [];
  return { calls, messages: { create: async (a) => { calls.push(a); return { content: [{ type: 'text', text }] }; } } };
};

async function withServer(opts, fn) {
  const server = createApp({ log: quiet, ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { await new Promise((r) => server.close(r)); }
}
const post = (base, body, raw) => fetch(`${base}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });
const valid = { ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content: 'Hi' }] };

test('répond avec la réponse du professeur', async () => {
  await withServer({ client: okClient() }, async (base) => {
    const r = await post(base, valid);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { reply: 'Hello! What is your name?' });
  });
});
test('/health indique si la clé est configurée', async () => {
  await withServer({ client: null }, async (base) => {
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true, configured: false });
  });
});
test('503 si le serveur n\'est pas configuré', async () => {
  await withServer({ client: null }, async (base) => assert.equal((await post(base, valid)).status, 503));
});
test('400 sur JSON invalide et sur requête invalide', async () => {
  await withServer({ client: okClient() }, async (base) => {
    assert.equal((await post(base, null, '{nope')).status, 400);
    assert.equal((await post(base, { ...valid, level: 'Z9' })).status, 400);
  });
});
test('413 sur un corps trop gros', async () => {
  await withServer({ client: okClient() }, async (base) => {
    const r = await post(base, null, JSON.stringify({ x: 'a'.repeat(30_000) }));
    assert.equal(r.status, 413);
  });
});
test('429 après trop de requêtes', async () => {
  await withServer({ client: okClient(), rate: { max: 2, windowMs: 60_000 } }, async (base) => {
    assert.equal((await post(base, valid)).status, 200);
    assert.equal((await post(base, valid)).status, 200);
    assert.equal((await post(base, valid)).status, 429);
  });
});
test('502 si le fournisseur d\'IA tombe, 429 s\'il limite', async () => {
  const failing = (status) => ({ messages: { create: async () => { throw Object.assign(new Error('x'), { status }); } } });
  await withServer({ client: failing(500) }, async (base) => assert.equal((await post(base, valid)).status, 502));
  await withServer({ client: failing(429) }, async (base) => assert.equal((await post(base, valid)).status, 429));
});
test('502 si la réponse de l\'IA est vide', async () => {
  await withServer({ client: okClient('   ') }, async (base) => assert.equal((await post(base, valid)).status, 502));
});
test('enfant: données personnelles refusées, jamais envoyées à l\'IA', async () => {
  const client = okClient();
  await withServer({ client }, async (base) => {
    const r = await post(base, { ...valid, ageProfile: 'kids', messages: [{ role: 'user', content: 'my mail is a@b.com' }] });
    assert.equal(r.status, 400);
    assert.equal(client.calls.length, 0);
  });
});
test('adulte: données personnelles masquées avant l\'envoi à l\'IA', async () => {
  const client = okClient();
  await withServer({ client }, async (base) => {
    await post(base, { ...valid, messages: [{ role: 'user', content: 'mail me at a@b.com' }] });
    assert.equal(client.calls[0].messages[0].content, 'mail me at [email removed]');
    assert.match(client.calls[0].system, /Safety/);
  });
});
test('enfant: réponses plus courtes', async () => {
  const client = okClient();
  await withServer({ client }, async (base) => {
    await post(base, { ...valid, ageProfile: 'kids' });
    assert.equal(client.calls[0].max_tokens, 150);
  });
});
test('404 sur une route inconnue', async () => {
  await withServer({ client: okClient() }, async (base) => assert.equal((await fetch(`${base}/nope`)).status, 404));
});

test('le professeur ouvre la conversation (start) avec une consigne interne', async () => {
  const client = okClient('Welcome! What would you like to eat?');
  await withServer({ client }, async (base) => {
    const r = await post(base, { ageProfile: 'adult', level: 'A1', scenario: 'Restaurant', start: true, messages: [] });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).reply, 'Welcome! What would you like to eat?');
    assert.equal(client.calls[0].messages.length, 1);
    assert.equal(client.calls[0].messages[0].role, 'user');
    assert.match(client.calls[0].messages[0].content, /Start the role-play/);
  });
});

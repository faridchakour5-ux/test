import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const quiet = { error() {} };
const valid = { ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content: 'Hi' }] };

const delta = (text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } });

// Faux client: `create({stream:true})` renvoie un flux asynchrone d'évènements comme le vrai SDK.
function streamClient(chunks, { failAfter = null, failBefore = null } = {}) {
  const calls = [];
  return {
    calls,
    messages: {
      create: async (params) => {
        calls.push(params);
        if (failBefore) throw Object.assign(new Error('x'), { status: failBefore });
        async function* gen() {
          let i = 0;
          for (const c of chunks) {
            if (failAfter !== null && i++ === failAfter) throw new Error('boom');
            yield c;
          }
        }
        const it = gen();
        it.controller = { abort() { calls.aborted = true; } };
        return it;
      },
    },
  };
}

async function withServer(opts, fn) {
  const server = createApp({ log: quiet, ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((r) => server.close(r)); }
}
const post = (base, body, path = '/chat/stream') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const events = (text) => text.split('\n\n').filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, '')));

test('envoie les morceaux de texte puis « done » en SSE', async () => {
  const client = streamClient([{ type: 'message_start' }, delta('Hello'), delta(' there!'), delta(' How are you?'), { type: 'message_stop' }]);
  await withServer({ client }, async (base) => {
    const r = await post(base, valid);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/event-stream/);
    const ev = events(await r.text());
    assert.deepEqual(ev, [{ delta: 'Hello' }, { delta: ' there!' }, { delta: ' How are you?' }, { done: true }]);
    assert.equal(client.calls[0].stream, true);
  });
});

test('applique les mêmes protections que /chat (validation, données personnelles enfant)', async () => {
  const client = streamClient([delta('x')]);
  await withServer({ client }, async (base) => {
    assert.equal((await post(base, { ...valid, level: 'Z9' })).status, 400);
    const r = await post(base, { ...valid, ageProfile: 'kids', messages: [{ role: 'user', content: 'mail a@b.com' }] });
    assert.equal(r.status, 400);
    assert.equal(client.calls.length, 0);
  });
});

test('limite de débit et budget quotidien valent aussi pour le flux', async () => {
  const client = streamClient([delta('ok')]);
  await withServer({ client, rate: { max: 1, windowMs: 60_000 } }, async (base) => {
    assert.equal((await post(base, valid)).status, 200);
    assert.equal((await post(base, valid)).status, 429);
  });
  await withServer({ client, dailyBudget: 1 }, async (base) => {
    assert.equal((await post(base, valid)).status, 200);
    assert.equal((await post(base, valid)).status, 503);
  });
});

test('erreur du fournisseur AVANT le premier morceau = vraie erreur HTTP (le client peut se replier)', async () => {
  await withServer({ client: streamClient([], { failBefore: 500 }) }, async (base) => assert.equal((await post(base, valid)).status, 502));
  await withServer({ client: streamClient([], { failBefore: 429 }) }, async (base) => assert.equal((await post(base, valid)).status, 429));
});

test('erreur APRÈS le premier morceau = évènement « error » dans le flux, texte déjà reçu conservé', async () => {
  const client = streamClient([delta('Hel'), delta('lo')], { failAfter: 1 });
  await withServer({ client }, async (base) => {
    const r = await post(base, valid);
    assert.equal(r.status, 200);
    assert.deepEqual(events(await r.text()), [{ delta: 'Hel' }, { error: 'teacher unavailable' }]);
  });
});

test('flux sans texte: 502 (rien n\'a été envoyé)', async () => {
  await withServer({ client: streamClient([{ type: 'message_start' }, { type: 'message_stop' }]) }, async (base) => {
    assert.equal((await post(base, valid)).status, 502);
  });
});

test('le professeur peut ouvrir la conversation en flux (start)', async () => {
  const client = streamClient([delta('Welcome!')]);
  await withServer({ client }, async (base) => {
    const r = await post(base, { ageProfile: 'adult', level: 'A1', start: true, messages: [] });
    assert.deepEqual(events(await r.text()), [{ delta: 'Welcome!' }, { done: true }]);
    assert.match(client.calls[0].messages[0].content, /Start the role-play/);
  });
});

test('/chat (sans flux) continue de fonctionner à côté', async () => {
  const client = { messages: { create: async () => ({ content: [{ type: 'text', text: 'plain' }] }) } };
  await withServer({ client }, async (base) => {
    assert.deepEqual(await (await post(base, valid, '/chat')).json(), { reply: 'plain' });
  });
});

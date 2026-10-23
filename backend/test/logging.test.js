import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function capture() {
  const lines = [];
  return { lines, log: { info: (l) => lines.push(JSON.parse(l)), error() {} } };
}
const okClient = { messages: { create: async () => ({ content: [{ type: 'text', text: 'Reply' }] }) } };
async function withServer(opts, fn) {
  const server = createApp(opts);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((r) => server.close(r)); }
}
const post = (base, body, path = '/chat') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const valid = (content = 'Hi') => ({ ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content }] });
const settle = () => new Promise((r) => setTimeout(r, 30));

test('chaque requête est journalisée: id, méthode, route, statut, durée', async () => {
  const { lines, log } = capture();
  await withServer({ client: okClient, log }, async (base) => {
    const r = await post(base, valid());
    await r.text(); await settle();
    assert.equal(lines.length, 1);
    assert.deepEqual(Object.keys(lines[0]).sort(), ['evt', 'id', 'method', 'ms', 'path', 'status']);
    assert.equal(lines[0].method, 'POST');
    assert.equal(lines[0].path, '/chat');
    assert.equal(lines[0].status, 200);
    assert.ok(Number.isInteger(lines[0].ms) && lines[0].ms >= 0);
  });
});

test('l\'identifiant de requête est renvoyé au client et correspond au journal (pour retrouver une panne)', async () => {
  const { lines, log } = capture();
  await withServer({ client: okClient, log }, async (base) => {
    const r = await post(base, valid());
    await r.text(); await settle();
    const id = r.headers.get('x-request-id');
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal(lines[0].id, id);
    const r2 = await post(base, valid()); await r2.text();
    assert.notEqual(r2.headers.get('x-request-id'), id); // un identifiant par requête
  });
});

test('RGPD: le journal ne contient ni le contenu des messages, ni l\'adresse IP, ni le profil', async () => {
  const { lines, log } = capture();
  await withServer({ client: okClient, log }, async (base) => {
    const secret = 'MON-SECRET-ultra-privé-a@b.com +33 6 12 34 56 78';
    const r = await post(base, { ...valid(secret), scenario: 'SCENARIO-PRIVE', ageProfile: 'kids' });
    await r.text(); await settle();
    const raw = JSON.stringify(lines);
    for (const forbidden of ['MON-SECRET', 'a@b.com', '33 6 12', 'SCENARIO-PRIVE', '127.0.0.1', '::1', 'kids', 'adult', 'Reply']) {
      assert.ok(!raw.includes(forbidden), `le journal contient « ${forbidden} »`);
    }
  });
});

test('les erreurs sont journalisées aussi (400, 404, 429, 502) avec leur statut', async () => {
  const { lines, log } = capture();
  const failing = { messages: { create: async () => { throw Object.assign(new Error('x'), { status: 500 }); } } };
  await withServer({ client: failing, log, rate: { max: 3, windowMs: 60_000 } }, async (base) => {
    (await post(base, { ...valid(), level: 'Z9' })).text();               // 400
    (await fetch(`${base}/nope`)).text();                                  // 404
    (await post(base, valid())).text();                                    // 502
    await settle();
    const statuses = lines.map((l) => l.status).sort();
    assert.deepEqual(statuses, [400, 404, 502]);
  });
  const rl = capture();
  await withServer({ client: okClient, log: rl.log, rate: { max: 1, windowMs: 60_000 } }, async (base) => {
    await (await post(base, valid())).text();
    await (await post(base, valid())).text();
    await settle();
    assert.deepEqual(rl.lines.map((l) => l.status), [200, 429]);
  });
});

test('la route de flux est journalisée avec la bonne route', async () => {
  const { lines, log } = capture();
  const streamClient = { messages: { create: async () => (async function* () { yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } }; })() } };
  await withServer({ client: streamClient, log }, async (base) => {
    await (await post(base, valid(), '/chat/stream')).text(); await settle();
    assert.equal(lines[0].path, '/chat/stream');
    assert.equal(lines[0].status, 200);
  });
});

test('les paramètres d\'URL (qui pourraient contenir des données) ne sont pas journalisés, et la route est bornée', async () => {
  const { lines, log } = capture();
  await withServer({ client: okClient, log }, async (base) => {
    await (await fetch(`${base}/health?email=secret@x.com&token=abc`)).text();
    await (await fetch(`${base}/${'a'.repeat(500)}`)).text();
    await settle();
    assert.ok(!JSON.stringify(lines).includes('secret@x.com'));
    assert.ok(lines.every((l) => l.path.length <= 40));
  });
});

test('un serveur sans journal (log.info absent) fonctionne normalement', async () => {
  await withServer({ client: okClient, log: { error() {} } }, async (base) => {
    assert.equal((await post(base, valid())).status, 200);
  });
});

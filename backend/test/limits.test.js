import test from 'node:test';
import assert from 'node:assert/strict';
import { clientKey, createDailyBudget, createRateLimiter } from '../src/rateLimit.js';
import { createApp } from '../src/app.js';

const DAY = 86_400_000;

test('le budget quotidien plafonne puis repart le jour suivant', () => {
  const take = createDailyBudget(2);
  const t0 = Date.UTC(2026, 0, 1, 12);
  assert.ok(take(t0)); assert.ok(take(t0 + 1000)); assert.equal(take(t0 + 2000), false);
  assert.ok(take(t0 + DAY));
});
test('budget 0 = illimité', () => {
  const take = createDailyBudget(0);
  for (let i = 0; i < 100; i++) assert.ok(take(0));
});
test('clientKey: adresse du socket par défaut, X-Forwarded-For seulement si on fait confiance au proxy', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }, socket: { remoteAddress: '10.0.0.1' } };
  assert.equal(clientKey(req, false), '10.0.0.1');
  assert.equal(clientKey(req, true), '203.0.113.7');
  assert.equal(clientKey({ headers: {}, socket: { remoteAddress: '1.2.3.4' } }, true), '1.2.3.4');
});
test('le limiteur purge les clients inactifs (mémoire bornée)', () => {
  const allow = createRateLimiter({ max: 1, windowMs: 1000, maxKeys: 3 });
  for (let i = 0; i < 3; i++) allow(`ip${i}`, 0);
  // à t=5000 tout est expiré: un nouveau client déclenche la purge et reste autorisé
  assert.ok(allow('new', 5000));
  assert.ok(allow('ip0', 5001));
});

async function withServer(opts, fn) {
  const server = createApp({ log: { error() {} }, ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((r) => server.close(r)); }
}
const client = { messages: { create: async () => ({ content: [{ type: 'text', text: 'ok' }] }) } };
const body = JSON.stringify({ ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content: 'Hi' }] });
const post = (base, headers = {}) => fetch(`${base}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

test('derrière un proxy de confiance, chaque utilisateur a sa propre limite', async () => {
  await withServer({ client, trustProxy: true, rate: { max: 1, windowMs: 60_000 } }, async (base) => {
    assert.equal((await post(base, { 'x-forwarded-for': '1.1.1.1' })).status, 200);
    assert.equal((await post(base, { 'x-forwarded-for': '1.1.1.1' })).status, 429);
    assert.equal((await post(base, { 'x-forwarded-for': '2.2.2.2' })).status, 200);
  });
});
test('sans confiance dans le proxy, X-Forwarded-For ne contourne pas la limite', async () => {
  await withServer({ client, trustProxy: false, rate: { max: 1, windowMs: 60_000 } }, async (base) => {
    assert.equal((await post(base, { 'x-forwarded-for': '1.1.1.1' })).status, 200);
    assert.equal((await post(base, { 'x-forwarded-for': '9.9.9.9' })).status, 429);
  });
});
test('le plafond quotidien global renvoie 503', async () => {
  await withServer({ client, dailyBudget: 2, rate: { max: 100, windowMs: 60_000 } }, async (base) => {
    assert.equal((await post(base)).status, 200);
    assert.equal((await post(base)).status, 200);
    const r = await post(base);
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { error: 'daily budget reached' });
  });
});

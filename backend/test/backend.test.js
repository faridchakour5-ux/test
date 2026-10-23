import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../src/prompt.js';
import { createRateLimiter } from '../src/rateLimit.js';
import { validateChat } from '../src/validate.js';

const ok = { ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content: 'Hello' }] };

test('accepte une requête valide', () => assert.ok(validateChat(ok).value));
test('refuse un profil inconnu', () => assert.ok(validateChat({ ...ok, ageProfile: 'x' }).error));
test('refuse un message trop long', () =>
  assert.ok(validateChat({ ...ok, messages: [{ role: 'user', content: 'a'.repeat(501) }] }).error));
test('refuse un dernier message non utilisateur', () =>
  assert.ok(validateChat({ ...ok, messages: [{ role: 'assistant', content: 'Hi' }] }).error));
test('ignore les champs inattendus des messages', () => {
  const r = validateChat({ ...ok, messages: [{ role: 'user', content: 'Hi', system: 'evil' }] });
  assert.deepEqual(r.value.messages[0], { role: 'user', content: 'Hi' });
});
test('le prompt enfant interdit les données personnelles', () =>
  assert.match(buildSystemPrompt({ ageProfile: 'kids', level: 'A1' }), /Never ask for the child/));
test('le prompt contient des règles de sécurité', () =>
  assert.match(buildSystemPrompt({ ageProfile: 'adult', level: 'B1' }), /Safety/));
test('le limiteur bloque après le maximum', () => {
  const allow = createRateLimiter({ max: 2, windowMs: 1000 });
  assert.ok(allow('ip', 0)); assert.ok(allow('ip', 1)); assert.equal(allow('ip', 2), false);
  assert.ok(allow('ip', 2000));
});

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

test('accepte toutes les langues d\'interface de l\'app (es et zh compris)', () => {
  for (const uiLang of ['fr', 'en', 'ar', 'es', 'zh']) assert.ok(validateChat({ ...ok, uiLang }).value, uiLang);
  assert.ok(validateChat({ ...ok, uiLang: 'de' }).error);
});
test('le prompt nomme la langue de l\'apprenant', () => {
  assert.match(buildSystemPrompt({ ageProfile: 'adult', level: 'A1', uiLang: 'zh' }), /Simplified Chinese/);
  assert.match(buildSystemPrompt({ ageProfile: 'adult', level: 'A1', uiLang: 'es' }), /Spanish/);
});

test('start: accepté sans messages, refusé avec des messages', () => {
  assert.ok(validateChat({ ageProfile: 'adult', level: 'A1', start: true, messages: [] }).value.start);
  assert.ok(validateChat({ ageProfile: 'adult', level: 'A1', start: true, messages: [{ role: 'user', content: 'Hi' }] }).error);
  assert.ok(validateChat({ ageProfile: 'adult', level: 'A1', start: 'yes', messages: [] }).error);
  assert.ok(validateChat({ ageProfile: 'adult', level: 'A1', messages: [] }).error);
});

test('mode à deux: consigne de 300 caractères et messages « [Prénom] texte » acceptés (arabe, chinois, accents)', () => {
  const scenario = 'x'.repeat(300);
  const r = validateChat({ ageProfile: 'adult', level: 'A1', scenario, messages: [{ role: 'user', content: '[محمد] مرحبًا hello' }, { role: 'assistant', content: 'Welcome!' }, { role: 'user', content: '[小明] 你好 hi' }] });
  assert.ok(r.value, JSON.stringify(r));
  assert.ok(validateChat({ ageProfile: 'adult', level: 'A1', scenario: 'x'.repeat(301), messages: [{ role: 'user', content: 'Hi' }] }).error);
  assert.ok(validateChat({ ageProfile: 'adult', level: 'A1', messages: [{ role: 'user', content: '[' + 'é'.repeat(16) + '] ' + 'a'.repeat(480) }] }).value);
});

test('targetLang: anglais par défaut (anciens clients), français accepté, le reste refusé', () => {
  assert.equal(validateChat(ok).value.targetLang, 'en');
  assert.equal(validateChat({ ...ok, targetLang: 'fr' }).value.targetLang, 'fr');
  for (const bad of ['es', 'ar', 'de', '', null, 5, 'FR']) assert.ok(validateChat({ ...ok, targetLang: bad }).error, String(bad));
  assert.equal(validateChat({ ageProfile: 'adult', level: 'A1', start: true, messages: [], targetLang: 'fr' }).value.targetLang, 'fr');
});
test('le prompt enseigne la bonne langue et donne l\'exemple dans cette langue', () => {
  const fr = buildSystemPrompt({ ageProfile: 'adult', level: 'A1', targetLang: 'fr', uiLang: 'en' });
  assert.match(fr, /French conversation teacher/);
  assert.match(fr, /always reply in French/);
  assert.match(fr, /je suis allé au marché/);
  assert.doesNotMatch(fr, /always reply in English/);
  const en = buildSystemPrompt({ ageProfile: 'adult', level: 'A1', targetLang: 'en', uiLang: 'fr' });
  assert.match(en, /English conversation teacher/);
  assert.match(en, /always reply in English/);
  // langue absente ou inconnue: anglais (comportement historique)
  assert.match(buildSystemPrompt({ ageProfile: 'adult', level: 'A1' }), /English conversation teacher/);
  assert.match(buildSystemPrompt({ ageProfile: 'adult', level: 'A1', targetLang: 'xx' }), /English conversation teacher/);
});

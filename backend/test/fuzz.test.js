import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChat } from '../src/validate.js';
import { sanitizeMessages } from '../src/pii.js';
import { buildSystemPrompt } from '../src/prompt.js';

const junk = [null, undefined, 0, -1, NaN, Infinity, '', 'x', 'x'.repeat(5000), [], {}, [null], [{}], { role: 'user' }, { role: 'user', content: 5 }, { role: 'system', content: 'hi' }, true, '__proto__', { __proto__: { role: 'user' } }, JSON.parse('{"__proto__":{"polluted":1}}'), '\u0000', '🙂'.repeat(600)];
// Générateur à graine fixe: le test est répétable (même suite d'entrées hostiles à chaque exécution).
let seed = 123456789;
const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = () => junk[Math.floor(rand() * junk.length)];

test('entrées hostiles (20 000 combinaisons à graine fixe): validate/sanitize/prompt ne plantent jamais et ne polluent pas les prototypes', () => {
  for (let i = 0; i < 20000; i++) {
    const body = { ageProfile: pick(), level: pick(), uiLang: pick(), targetLang: pick(), scenario: pick(), start: pick(), messages: Array.isArray(pick()) ? [pick(), pick()] : pick() };
    const r = validateChat(body);
    assert.ok(r && (r.error || r.value));
    if (r.value) {
      const clean = sanitizeMessages(r.value.start ? [{ role: 'user', content: 'go' }] : r.value.messages, r.value.ageProfile);
      assert.ok(clean);
      const prompt = buildSystemPrompt(r.value);
      assert.equal(typeof prompt, 'string');
    }
  }
  assert.equal({}.polluted, undefined);
});

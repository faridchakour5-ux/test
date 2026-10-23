import test from 'node:test';
import assert from 'node:assert/strict';
import { findPii, redactPii, sanitizeMessages } from '../src/pii.js';

test('détecte email, téléphone, adresse et lien', () => {
  assert.deepEqual(findPii('write me at ana@example.com'), ['email']);
  assert.deepEqual(findPii('call 06 12 34 56 78 now'), ['phone']);
  assert.deepEqual(findPii('I live at 12 rue Victor Hugo'), ['address']);
  assert.deepEqual(findPii('see https://evil.example/x'), ['url']);
});
test('ne signale pas une phrase normale ni de petits nombres', () => {
  assert.deepEqual(findPii('I have 3 apples and 12 books'), []);
});
test('masque les données personnelles', () => {
  assert.equal(redactPii('mail ana@example.com'), 'mail [email removed]');
});
test('enfant: refus; adulte: masquage', () => {
  const msgs = [{ role: 'user', content: 'my mail is ana@example.com' }];
  assert.ok(sanitizeMessages(msgs, 'kids').error);
  assert.equal(sanitizeMessages(msgs, 'adult').messages[0].content, 'my mail is [email removed]');
});
test('laisse passer les messages sans données personnelles', () => {
  const msgs = [{ role: 'user', content: 'I like cats' }];
  assert.deepEqual(sanitizeMessages(msgs, 'kids').messages, msgs);
});

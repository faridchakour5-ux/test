import { MAX_SAVED_MESSAGES, clearAllKalamData, clearConversation, loadAllConversations, loadConversation, loadTopicId, saveConversation, saveTopicId } from './conversations';
import { load, save } from './storage';
import { duoLesson, duoScenario, parseTagged, tagMessage } from '../domain/duo';
import { FREE_TOPICS } from '../domain/freeTopics';

const mockStore = new Map<string, string>();
const mockFail = { on: false };
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => { if (mockFail.on) throw new Error('x'); return mockStore.get(k) ?? null; },
    setItem: async (k: string, v: string) => { if (mockFail.on) throw new Error('x'); mockStore.set(k, v); },
    removeItem: async (k: string) => { if (mockFail.on) throw new Error('x'); mockStore.delete(k); },
    getAllKeys: async () => { if (mockFail.on) throw new Error('x'); return [...mockStore.keys()]; },
    multiRemove: async (ks: string[]) => { if (mockFail.on) throw new Error('x'); ks.forEach((k) => mockStore.delete(k)); },
  },
}));

beforeEach(() => { mockStore.clear(); mockFail.on = false; });

describe('stockage tolérant aux pannes', () => {
  it('lecture: valeur de repli si absent, illisible ou en panne', async () => {
    expect(await load('a', 'repli')).toBe('repli');
    mockStore.set('a', '{pas du json');
    expect(await load('a', 'repli')).toBe('repli');
    mockStore.set('a', '{"x":1}');
    expect(await load('a', null)).toEqual({ x: 1 });
    mockFail.on = true;
    expect(await load('a', 'repli')).toBe('repli');
  });
  it('écriture: ne plante pas en cas de panne, écrit sinon', async () => {
    await save('k', { v: 1 });
    expect(mockStore.get('k')).toBe('{"v":1}');
    mockFail.on = true;
    await expect(save('k2', 1)).resolves.toBeUndefined();
  });
});

describe('conversations: validation à la relecture', () => {
  it('écarte les messages abîmés, garde les bons, limite à MAX', async () => {
    const good = { role: 'user', content: 'ok' };
    mockStore.set('kalam:conv:v1:l', JSON.stringify([good, null, 3, { role: 'system', content: 'x' }, { role: 'user', content: '' }, { role: 'user', content: 5 }, { role: 'user', content: 'x'.repeat(2001) }, { role: 'assistant', content: 'x'.repeat(2000) }]));
    expect((await loadConversation('l')).map((m) => m.content.length)).toEqual([2, 2000]);
    mockStore.set('kalam:conv:v1:l', JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ role: 'user', content: `m${i}` }))));
    const out = await loadConversation('l');
    expect(out).toHaveLength(MAX_SAVED_MESSAGES);
    expect(out[0].content).toBe('m20');
    mockStore.set('kalam:conv:v1:l', '{"pas":"une liste"}');
    expect(await loadConversation('l')).toEqual([]);
  });
});

describe('sujet libre', () => {
  it('seul un identifiant simple (minuscules et tirets, 20 signes) est relu', async () => {
    for (const [v, expected] of [['travel', 'travel'], ['a-b', 'a-b'], ['x'.repeat(20), 'x'.repeat(20)], ['x'.repeat(21), null], ['Travel', null], ['a b', null], ['a1', null], ['', null], ['a\nb', null]] as const) {
      mockStore.set('kalam:topic:v1:free', JSON.stringify(v));
      expect(await loadTopicId('free')).toBe(expected);
    }
    mockStore.set('kalam:topic:v1:free', '5');
    expect(await loadTopicId('free')).toBeNull();
    mockStore.clear();
    expect(await loadTopicId('free')).toBeNull();
  });
  it('enregistré sous sa propre clé, et effacé avec la conversation', async () => {
    await saveTopicId('free', 'travel');
    await saveConversation('free', [{ role: 'user', content: 'hi' }]);
    expect(mockStore.has('kalam:topic:v1:free')).toBe(true);
    await clearConversation('free');
    expect(mockStore.size).toBe(0);
  });
  it('clearConversation ne plante pas si le stockage est en panne', async () => {
    mockFail.on = true;
    await expect(clearConversation('free')).resolves.toBeUndefined();
  });
});

describe('export et effacement (droits RGPD)', () => {
  it('loadAllConversations: toutes les conversations non vides, rangées par leçon; rien d\'autre', async () => {
    await saveConversation('restaurant', [{ role: 'user', content: 'Hello' }]);
    await saveConversation('family', [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Yo' }]);
    mockStore.set('kalam:conv:v1:vide', '[]');
    mockStore.set('kalam:conv:v1:abime', '[null]');
    mockStore.set('kalam:state:v1', '{"profile":"adult"}');
    mockStore.set('kalam:topic:v1:free', '"travel"');
    mockStore.set('autre-app:conv:v1:x', '[{"role":"user","content":"x"}]');
    expect(await loadAllConversations()).toEqual({
      restaurant: [{ role: 'user', content: 'Hello' }],
      family: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Yo' }],
    });
  });
  it('loadAllConversations: stockage en panne → export vide plutôt qu\'un échec', async () => {
    mockFail.on = true;
    await expect(loadAllConversations()).resolves.toEqual({});
  });
  it('clearAllKalamData: supprime tout ce qui commence par « kalam: », pas le reste', async () => {
    mockStore.set('kalam:state:v1', '1'); mockStore.set('kalam:conv:v1:a', '1'); mockStore.set('kalam:topic:v1:a', '1'); mockStore.set('autre:k', '1'); mockStore.set('xkalam:k', '1');
    await clearAllKalamData();
    expect([...mockStore.keys()].sort()).toEqual(['autre:k', 'xkalam:k']);
  });
  it('clearAllKalamData: rien à effacer ou panne → ne plante pas', async () => {
    await expect(clearAllKalamData()).resolves.toBeUndefined();
    mockFail.on = true;
    await expect(clearAllKalamData()).resolves.toBeUndefined();
  });
});

describe('mode à deux: texte exact', () => {
  it('étiquette et lecture d\'un message', () => {
    expect(tagMessage('Léa', 'Hello')).toBe('[Léa] Hello');
    expect(parseTagged('[Léa] Hello')).toEqual({ speaker: 'Léa', text: 'Hello' });
    expect(parseTagged('[Léa]\nHello\nsecond line')).toEqual({ speaker: 'Léa', text: 'Hello\nsecond line' });
    expect(parseTagged('[Léa]Hello')).toEqual({ speaker: 'Léa', text: 'Hello' });
    expect(parseTagged('[Léa]')).toEqual({ speaker: 'Léa', text: '' });
    expect(parseTagged('Hello [Léa]')).toEqual({ speaker: null, text: 'Hello [Léa]' });
    expect(parseTagged(' [Léa] Hello')).toEqual({ speaker: null, text: ' [Léa] Hello' });
    expect(parseTagged('[' + 'x'.repeat(41) + '] Hi').speaker).toBeNull();
    expect(parseTagged('[' + 'x'.repeat(40) + '] Hi').speaker).toBe('x'.repeat(40));
    expect(parseTagged('[a\nb] Hi').speaker).toBeNull();
  });
  it('consigne: sujet nettoyé, ou « any everyday topic »', () => {
    expect(duoScenario('Léa', 'Tom', null)).toBe('Host a chat between learners Léa and Tom about any everyday topic. Messages start with [name]. Invite each in turn, by name, with gentle feedback. Keep replies short.');
    const t = FREE_TOPICS[0];
    const s = duoScenario('A', 'B', t);
    expect(s).not.toContain('Free conversation about: ');
    expect(s).not.toContain('Let the learner');
    expect(s.startsWith('Host a chat between learners A and B about ')).toBe(true);
    expect(s.length).toBeLessThanOrEqual(300);
  });
  it('leçon à deux: titre « A & B » dans toutes les langues, niveau A1, sans vocabulaire', () => {
    const l = duoLesson('Léa', 'Tom', null);
    expect(l.level).toBe('A1');
    expect(l.vocab).toEqual([]);
    expect(Object.values(l.title)).toEqual(['Léa & Tom', 'Léa & Tom', 'Léa & Tom', 'Léa & Tom', 'Léa & Tom']);
  });
});

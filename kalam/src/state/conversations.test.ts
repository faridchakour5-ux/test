import { MAX_SAVED_MESSAGES, clearAllKalamData, clearConversation, loadConversation, loadTopicId, saveConversation, saveTopicId, trimConversation } from './conversations';
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore.get(k) ?? null,
    setItem: async (k: string, v: string) => { mockStore.set(k, v); },
    removeItem: async (k: string) => { mockStore.delete(k); },
    getAllKeys: async () => [...mockStore.keys()],
    multiRemove: async (ks: string[]) => { ks.forEach((k) => mockStore.delete(k)); },
  },
}));


beforeEach(() => mockStore.clear());

describe('conversations', () => {
  it('sauvegarde puis recharge une conversation', async () => {
    await saveConversation('restaurant', [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi!' }]);
    expect(await loadConversation('restaurant')).toEqual([{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi!' }]);
  });
  it('une leçon sans historique renvoie une liste vide', async () => {
    expect(await loadConversation('family')).toEqual([]);
  });
  it('ne garde que les derniers messages', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    const t = trimConversation(many);
    expect(t).toHaveLength(MAX_SAVED_MESSAGES);
    expect(t[t.length - 1].content).toBe('m99');
  });
  it('ignore les données corrompues', async () => {
    mockStore.set('kalam:conv:v1:x', JSON.stringify([{ role: 'hacker', content: 'x' }, { role: 'user', content: '' }, { role: 'user', content: 'ok' }, 42]));
    expect(await loadConversation('x')).toEqual([{ role: 'user', content: 'ok' }]);
    mockStore.set('kalam:conv:v1:y', '{not json');
    expect(await loadConversation('y')).toEqual([]);
  });
  it('efface une conversation', async () => {
    await saveConversation('a', [{ role: 'user', content: 'x' }]);
    await clearConversation('a');
    expect(await loadConversation('a')).toEqual([]);
  });
  it('clearAllKalamData supprime tout Kalam mais pas les autres clés', async () => {
    mockStore.set('kalam:state:v1', '{}'); mockStore.set('kalam:conv:v1:a', '[]'); mockStore.set('other:key', '1');
    await clearAllKalamData();
    expect([...mockStore.keys()]).toEqual(['other:key']);
  });

  it('conserve le sujet libre avec la conversation et l\'efface avec elle', async () => {
    expect(await loadTopicId('free')).toBeNull();
    await saveTopicId('free', 'travel');
    expect(await loadTopicId('free')).toBe('travel');
    await clearConversation('free');
    expect(await loadTopicId('free')).toBeNull();
  });
  it('ignore un sujet corrompu', async () => {
    mockStore.set('kalam:topic:v1:free', JSON.stringify('<script>'));
    expect(await loadTopicId('free')).toBeNull();
    mockStore.set('kalam:topic:v1:free', JSON.stringify(42));
    expect(await loadTopicId('free')).toBeNull();
  });
});

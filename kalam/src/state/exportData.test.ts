import { EXPORT_FORMAT_VERSION, ExportableState, buildExport } from './exportData';
import { initialKids } from './AppState';
import { initialProgress } from '../domain/progress';
import { newCard } from '../domain/srs';

const state = (over: Partial<ExportableState> = {}): ExportableState => ({
  profile: 'adult', targetLang: 'fr', levels: { en: 'A2', fr: 'A1' }, uiLang: 'fr', palette: 'ocean',
  progress: { ...initialProgress('2026-03-10'), xp: 42, streak: 3, completedLessons: ['family'] },
  cards: [newCard('family:0', 0)],
  kids: { ...initialKids(), stars: 7, storiesRead: ['little-cat'] },
  reminder: { enabled: true, hour: 8, minute: 30 },
  ...over,
});
const conv = { restaurant: [{ role: 'user' as const, content: 'I would like water' }, { role: 'assistant' as const, content: 'Of course!' }] };
const parse = (s: string) => JSON.parse(s);

describe('buildExport (droit à la portabilité)', () => {
  it('produit un JSON valide et lisible avec toutes les données de l\'utilisateur', () => {
    const json = buildExport(state(), conv, new Date('2026-03-10T10:00:00Z'));
    expect(json).toContain('\n'); // lisible (indenté)
    const d = parse(json);
    expect(d).toMatchObject({ app: 'kalam', formatVersion: EXPORT_FORMAT_VERSION, exportedAt: '2026-03-10T10:00:00.000Z' });
    expect(d.settings).toEqual({ profile: 'adult', learningLanguage: 'fr', levels: { en: 'A2', fr: 'A1' }, interfaceLanguage: 'fr', palette: 'ocean', dailyReminder: { enabled: true, hour: 8, minute: 30 } });
    expect(d.progress).toMatchObject({ xp: 42, streak: 3, completedLessons: ['family'] });
    expect(d.vocabularyCards).toHaveLength(1);
    expect(d.kidsMode).toMatchObject({ stars: 7, storiesRead: ['little-cat'], microphoneConsent: { micAllowed: false } });
    expect(d.conversations.restaurant).toHaveLength(2);
    expect(d.conversations.restaurant[0].content).toBe('I would like water');
  });
  it('fonctionne pour un tout nouvel utilisateur (profil vide, aucune conversation)', () => {
    const d = parse(buildExport(state({ profile: null, levels: {}, cards: [] }), {}));
    expect(d.settings.profile).toBeNull();
    expect(d.vocabularyCards).toEqual([]);
    expect(d.conversations).toEqual({});
  });
  it('ne contient aucune clé, jeton ni secret', () => {
    const json = buildExport(state(), conv);
    expect(json).not.toMatch(/sk-ant|api[_-]?key|token|secret|password/i);
  });
  it('garde le consentement parental (date et version) pour la preuve', () => {
    const kids = { ...initialKids(), consent: { micAllowed: true, grantedAt: 1700000000000, version: 1 } };
    expect(parse(buildExport(state({ kids }), {})).kidsMode.microphoneConsent).toEqual({ micAllowed: true, grantedAt: 1700000000000, version: 1 });
  });
  it('conserve les caractères non latins (arabe, chinois, emojis) tels quels', () => {
    const d = parse(buildExport(state(), { free: [{ role: 'user', content: 'مرحبًا 你好 😀' }] }));
    expect(d.conversations.free[0].content).toBe('مرحبًا 你好 😀');
  });
});

import { KIDS_TOPICS, STICKERS, STORIES, buildRounds, newlyUnlocked, unlockedStickers } from './kids';
import { CONSENT_VERSION, checkGate, grantMic, makeGate, minutesLeft, noConsent, revokeMic, timeIsUp } from './parental';

describe('contenu enfant', () => {
  it('chaque thème a assez d\'éléments avec les 3 langues', () => {
    for (const t of KIDS_TOPICS) {
      expect(t.items.length).toBeGreaterThanOrEqual(5);
      (['fr', 'en', 'ar', 'es', 'zh'] as const).forEach((l) => expect(t.title[l].trim()).not.toBe(''));
      t.items.forEach((i) => { expect(i.en && i.fr && i.ar && i.es && i.zh && i.emoji).toBeTruthy(); });
      expect(new Set(t.items.map((i) => i.id)).size).toBe(t.items.length);
    }
  });
  it('les histoires ont 5 phrases traduites', () => {
    STORIES.forEach((s) => { expect(s.sentences).toHaveLength(5); s.sentences.forEach((x) => expect(x.fr && x.ar && x.es && x.zh).toBeTruthy()); });
  });
});

describe('buildRounds', () => {
  it('crée des manches de 3 choix contenant la bonne réponse, sans doublon', () => {
    const rounds = buildRounds('animals', 5);
    expect(rounds).toHaveLength(5);
    rounds.forEach((r) => {
      expect(r.options).toHaveLength(3);
      expect(r.options.filter((o) => o.id === r.target.id)).toHaveLength(1);
      expect(new Set(r.options.map((o) => o.id)).size).toBe(3);
    });
    expect(new Set(rounds.map((r) => r.target.id)).size).toBe(5);
  });
  it('thème inconnu -> aucune manche', () => expect(buildRounds('nope')).toEqual([]));
  it('limite au nombre d\'éléments du thème', () => expect(buildRounds('numbers', 10)).toHaveLength(5));
});

describe('récompenses', () => {
  it('les autocollants sont triés par étoiles croissantes', () => {
    const stars = STICKERS.map((s) => s.stars);
    expect([...stars].sort((a, b) => a - b)).toEqual(stars);
  });
  it('débloque selon les étoiles', () => {
    expect(unlockedStickers(2)).toHaveLength(0);
    expect(unlockedStickers(8).map((s) => s.id)).toEqual(['rocket', 'rainbow']);
    expect(newlyUnlocked(2, 3).map((s) => s.id)).toEqual(['rocket']);
    expect(newlyUnlocked(3, 4)).toEqual([]);
  });
});

describe('portail parental', () => {
  it('a 4 options distinctes dont la bonne', () => {
    for (let i = 0; i < 50; i++) {
      const g = makeGate();
      expect(new Set(g.options).size).toBe(4);
      expect(g.options).toContain(g.answer);
      expect(g.answer).toBe(g.question.a * g.question.b);
      expect(checkGate(g, g.answer)).toBe(true);
      expect(checkGate(g, g.answer + 1)).toBe(false);
    }
  });
});

describe('consentement et temps', () => {
  it('micro refusé par défaut, accordé puis révocable', () => {
    const c = noConsent();
    expect(c.micAllowed).toBe(false);
    expect(c.grantedAt).toBeNull();
    const g = grantMic(c, 123);
    expect(g).toMatchObject({ micAllowed: true, grantedAt: 123, version: CONSENT_VERSION });
    expect(revokeMic(g).micAllowed).toBe(false);
  });
  it('limite de temps', () => {
    expect(timeIsUp(null, 999)).toBe(false);
    expect(timeIsUp(20, 19)).toBe(false);
    expect(timeIsUp(20, 20)).toBe(true);
    expect(minutesLeft(20, 5)).toBe(15);
    expect(minutesLeft(20, 50)).toBe(0);
    expect(minutesLeft(null, 5)).toBeNull();
  });
});

import { migrate } from './AppState';

describe('migrate (anciennes sauvegardes)', () => {
  it('une ancienne sauvegarde à niveau unique devient le niveau d\'anglais', () => {
    const m = migrate({ profile: 'adult', level: 'A2', uiLang: 'fr' } as never);
    expect(m.levels).toEqual({ en: 'A2' });
    expect(m.targetLang).toBe('en');
    expect(m.profile).toBe('adult');
  });
  it('conserve les niveaux par langue et la langue apprise', () => {
    const m = migrate({ targetLang: 'fr', levels: { en: 'B1', fr: 'A1' } } as never);
    expect(m).toMatchObject({ targetLang: 'fr', levels: { en: 'B1', fr: 'A1' } });
  });
  it('le niveau unique ne remplace pas un niveau d\'anglais déjà présent', () => {
    expect(migrate({ level: 'A1', levels: { en: 'B1' } } as never).levels.en).toBe('B1');
  });
  it('rejette les langues et niveaux inconnus ou abîmés', () => {
    const m = migrate({ targetLang: 'de', levels: { en: 'Z9', fr: 'A2', ar: 'A1' } } as never);
    expect(m.targetLang).toBe('en');
    expect(m.levels).toEqual({ fr: 'A2' });
    expect(migrate({ level: 'nope' } as never).levels).toEqual({});
  });
  it('une sauvegarde vide ou absente donne l\'état initial', () => {
    expect(migrate({}).targetLang).toBe('en');
    expect(migrate({}).levels).toEqual({});
    expect(migrate({}).cards).toEqual([]);
    expect(migrate({}).kids.consent.micAllowed).toBe(false);
  });

  it.each([null, undefined, 42, 'texte', true, [], [1, 2]])('une sauvegarde qui n\'est pas un objet (%j) donne l\'état initial sans planter', (bad) => {
    const m = migrate(bad as never);
    expect(m.profile).toBeNull();
    expect(m.targetLang).toBe('en');
    expect(m.levels).toEqual({});
    expect(m.cards).toEqual([]);
  });
});

// Sauvegardes abîmées au hasard (graine fixe: mêmes entrées à chaque exécution): migrate ne plante jamais,
// et le résultat respecte toujours les règles de sécurité (consentement micro, limites, doublons).
describe('migrate: rappel quotidien', () => {
  it('une ancienne sauvegarde (sans rappel) donne un rappel désactivé à 19:00', () => {
    expect(migrate({ profile: 'adult' } as never).reminder).toEqual({ enabled: false, hour: 19, minute: 0 });
  });
  it('un rappel valide est conservé', () => {
    expect(migrate({ reminder: { enabled: true, hour: 8, minute: 30 } } as never).reminder).toEqual({ enabled: true, hour: 8, minute: 30 });
  });
  it('un rappel abîmé est désactivé', () => {
    expect(migrate({ reminder: { enabled: true, hour: 99, minute: 0 } } as never).reminder.enabled).toBe(false);
  });
});

describe('migrate: proposition de rappel', () => {
  it('par défaut elle n\'a pas encore été faite; seule la valeur « true » compte', () => {
    expect(migrate({} as never).reminderAsked).toBe(false);
    expect(migrate({ reminderAsked: true } as never).reminderAsked).toBe(true);
    for (const bad of ['true', 1, {}, null, [true]]) expect(migrate({ reminderAsked: bad } as never).reminderAsked).toBe(false);
  });
});

describe('migrate: sauvegardes hostiles', () => {
  let seed = 987654321;
  const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const junk: unknown[] = [null, undefined, 0, -5, 3.7, NaN, Infinity, '', 'x', 'fr', 'kids', 'A1', true, false, [], [null], {}, { a: 1 }, '__proto__', 'constructor', JSON.parse('{"__proto__":{"polluted":1}}'), 'x'.repeat(3000)];
  const pick = (): unknown => junk[Math.floor(rand() * junk.length)];
  const obj = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, pick()]));

  it('3000 sauvegardes aléatoires: aucune exception, états toujours sûrs', () => {
    for (let i = 0; i < 3000; i++) {
      const saved = {
        ...obj(['profile', 'uiLang', 'palette', 'targetLang', 'level', 'dailyGoal', 'handsFree']),
        levels: rand() < 0.5 ? obj(['en', 'fr', 'ar']) : pick(),
        cards: rand() < 0.5 ? [obj(['key', 'ease', 'intervalDays', 'due']), pick(), obj(['key'])] : pick(),
        progress: rand() < 0.5 ? obj(['history', 'xp', 'streak']) : pick(),
        reminder: rand() < 0.7 ? obj(['enabled', 'hour', 'minute']) : pick(),
        kids: rand() < 0.7 ? { ...obj(['stars', 'storiesRead', 'dailyLimit']), consent: rand() < 0.5 ? obj(['micAllowed', 'grantedAt', 'version']) : pick() } : pick(),
      };
      const m = migrate(saved as never);
      // Le micro des enfants n'est jamais autorisé sans consentement complet et daté.
      if (m.kids.consent.micAllowed) expect(m.kids.consent.grantedAt).toBeGreaterThan(0);
      expect(Number.isInteger(m.kids.stars) && m.kids.stars >= 0).toBe(true);
      expect([10, 20, 30, null]).toContain(m.kids.dailyLimit);
      const keys = m.cards.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const c of m.cards) expect(c.ease >= 1.3 && c.ease <= 5 && c.intervalDays >= 0 && Number.isFinite(c.due)).toBe(true);
      expect(['en', 'fr']).toContain(m.targetLang);
      // Rappel: heure toujours valide, jamais « activé » avec une heure abîmée.
      expect(Number.isInteger(m.reminder.hour) && m.reminder.hour >= 0 && m.reminder.hour <= 23).toBe(true);
      expect(Number.isInteger(m.reminder.minute) && m.reminder.minute >= 0 && m.reminder.minute <= 59).toBe(true);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

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

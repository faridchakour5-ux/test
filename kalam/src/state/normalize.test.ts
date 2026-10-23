import { CONSENT_VERSION } from '../domain/parental';
import { normalizeCards, normalizeConsent, normalizeKids, normalizePalette, normalizeProfile, normalizeUiLang } from './normalize';

const card = { key: 'a', ease: 2.5, intervalDays: 1, due: 5 };
const defaults = { stars: 0, storiesRead: [] as string[], consent: normalizeConsent(null), dailyLimit: null as null };

describe('normalize', () => {
  it('profil: inconnu ou hérité de Object.prototype => null', () => {
    expect(normalizeProfile('adult')).toBe('adult');
    expect(normalizeProfile('constructor')).toBeNull();
    expect(normalizeProfile(3)).toBeNull();
  });

  it('langue et palette: valeur sûre par défaut', () => {
    expect(normalizeUiLang('ar')).toBe('ar');
    expect(normalizeUiLang('xx')).toBe('fr');
    expect(normalizePalette('nope')).toBeTruthy();
    expect(normalizePalette(undefined)).toBe(normalizePalette(null));
  });

  it('cartes: garde les bonnes, écarte les abîmées et les doublons', () => {
    const out = normalizeCards([card, card, { ...card, key: 'b', ease: 0.5 }, { ...card, key: 'c', intervalDays: -1 }, { ...card, key: 'd', due: NaN }, null, 'x', { ...card, key: '' }, { ...card, key: 'e' }]);
    expect(out.map((c) => c.key)).toEqual(['a', 'e']);
    expect(normalizeCards('abc')).toEqual([]);
  });

  it('consentement: micro autorisé sans date valide => refusé', () => {
    expect(normalizeConsent({ micAllowed: true }).micAllowed).toBe(false);
    expect(normalizeConsent({ micAllowed: true, grantedAt: -1 }).micAllowed).toBe(false);
    expect(normalizeConsent({ micAllowed: 'yes', grantedAt: 5 }).micAllowed).toBe(false);
    expect(normalizeConsent(null).micAllowed).toBe(false);
    const ok = normalizeConsent({ micAllowed: true, grantedAt: 5 });
    expect(ok).toEqual({ micAllowed: true, grantedAt: 5, version: CONSENT_VERSION });
  });

  it('enfants: étoiles, histoires, limite', () => {
    const k = normalizeKids({ stars: 3.9, storiesRead: ['a', 'a', 2, 'b'], dailyLimit: 20 }, defaults);
    expect(k.stars).toBe(3);
    expect(k.storiesRead).toEqual(['a', 'b']);
    expect(k.dailyLimit).toBe(20);
    const bad = normalizeKids({ stars: -3, storiesRead: 'x', dailyLimit: 99 }, defaults);
    expect(bad).toMatchObject({ stars: 0, storiesRead: [], dailyLimit: null });
    expect(normalizeKids([], defaults).stars).toBe(0);
  });
});

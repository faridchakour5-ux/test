import { normalizeCards, normalizeKids, normalizeConsent } from './normalize';

const card = { key: 'a:0', ease: 2.5, intervalDays: 0, due: 0 };
const defaults = { stars: 7, storiesRead: [] as string[], consent: normalizeConsent(null), dailyLimit: null as null };

describe('normalizeCards: bornes et types exacts', () => {
  it('bornes valides: intervalle 0, facilité 1,3 et 5', () => {
    const out = normalizeCards([card, { ...card, key: 'b', ease: 1.3 }, { ...card, key: 'c', ease: 5 }]);
    expect(out.map((c) => c.key)).toEqual(['a:0', 'b', 'c']);
  });
  it('hors bornes ou pas des nombres: écartées une à une', () => {
    const bad = [
      { ...card, key: 'x1', ease: 1.29 }, { ...card, key: 'x3', intervalDays: -0.1 },
      { ...card, key: 'x4', ease: '2.5' }, { ...card, key: 'x5', intervalDays: '3' }, { ...card, key: 'x6', due: '0' },
      { ...card, key: 'x7', ease: Infinity }, { ...card, key: 'x8', due: Infinity }, { ...card, key: 'x9', intervalDays: NaN },
    ];
    expect(normalizeCards([...bad, { ...card, key: 'ok' }]).map((c) => c.key)).toEqual(['ok']);
  });
  it('facilité trop haute (anciennes versions sans plafond): la carte est GARDÉE, ramenée à 5, avec son avancement', () => {
    const [c] = normalizeCards([{ ...card, key: 'long', ease: 7.3, intervalDays: 400 }]);
    expect(c).toEqual({ ...card, key: 'long', ease: 5, intervalDays: 400 });
    expect(normalizeCards([{ ...card, key: 'e5', ease: 5 }])[0].ease).toBe(5);
    expect(normalizeCards([{ ...card, key: 'inf', ease: Infinity }])).toEqual([]); // pas un nombre fini: toujours écartée
  });
  it('un doublon est supprimé (la première carte gagne)', () => {
    const out = normalizeCards([card, { ...card, ease: 3 }]);
    expect(out).toEqual([card]);
  });
});

describe('normalizeKids.stars', () => {
  it('0 est conservé; négatif, texte ou NaN reviennent à la valeur par défaut; décimal arrondi vers le bas', () => {
    expect(normalizeKids({ stars: 0 }, defaults).stars).toBe(0);
    expect(normalizeKids({ stars: -1 }, defaults).stars).toBe(7);
    expect(normalizeKids({ stars: '5' }, defaults).stars).toBe(7);
    expect(normalizeKids({ stars: NaN }, defaults).stars).toBe(7);
    expect(normalizeKids({ stars: 4.9 }, defaults).stars).toBe(4);
  });
});

describe('consentement retiré et valeurs absurdes (revue de code)', () => {
  it('un consentement RETIRÉ garde la date de l\'ancien consentement (preuve), sans autoriser le micro', () => {
    expect(normalizeConsent({ micAllowed: false, grantedAt: 1700000000000, version: 1 })).toEqual({ micAllowed: false, grantedAt: 1700000000000, version: 1 });
  });
  it('consentement invalide ou jamais donné: refusé, sans date', () => {
    expect(normalizeConsent({ micAllowed: true, grantedAt: 'x', version: 1 }).micAllowed).toBe(false);
    expect(normalizeConsent({ micAllowed: true, grantedAt: 'x', version: 1 }).grantedAt).toBeNull();
    expect(normalizeConsent({ micAllowed: false, grantedAt: -5, version: 1 }).grantedAt).toBeNull();
    expect(normalizeConsent({ micAllowed: false, grantedAt: null, version: 1 }).grantedAt).toBeNull();
    expect(normalizeConsent({ micAllowed: 'oui', grantedAt: 5 }).micAllowed).toBe(false);
    expect(normalizeConsent(null).grantedAt).toBeNull();
  });
  it('étoiles absurdes plafonnées; histoires lues: uniques, courtes, au plus 200', () => {
    const d = { stars: 0, storiesRead: [] as string[], consent: normalizeConsent(null), dailyLimit: null };
    expect(normalizeKids({ stars: 1e308 }, d).stars).toBe(1_000_000);
    expect(normalizeKids({ stars: 12.9 }, d).stars).toBe(12);
    const many = Array.from({ length: 500 }, (_, i) => `s${i}`);
    expect(normalizeKids({ storiesRead: many }, d).storiesRead).toHaveLength(200);
    expect(normalizeKids({ storiesRead: ['a', 'a', '', 'x'.repeat(65), 5, 'b'] }, d).storiesRead).toEqual(['a', 'b']);
  });
});

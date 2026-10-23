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
      { ...card, key: 'x1', ease: 1.29 }, { ...card, key: 'x2', ease: 5.01 }, { ...card, key: 'x3', intervalDays: -0.1 },
      { ...card, key: 'x4', ease: '2.5' }, { ...card, key: 'x5', intervalDays: '3' }, { ...card, key: 'x6', due: '0' },
      { ...card, key: 'x7', ease: Infinity }, { ...card, key: 'x8', due: Infinity }, { ...card, key: 'x9', intervalDays: NaN },
    ];
    expect(normalizeCards([...bad, { ...card, key: 'ok' }]).map((c) => c.key)).toEqual(['ok']);
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

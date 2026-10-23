import { Card, dueCards, newCard, review } from './srs';

const DAY = 86_400_000;
const NOW = 1_000_000_000_000;
const card = (over: Partial<Card> = {}): Card => ({ key: 'k', ease: 2.5, intervalDays: 0, due: NOW, ...over });

// Valeurs exactes de l'algorithme (type SM-2 simplifié): elles fixent le comportement de la révision espacée,
// le cœur de l'apprentissage. Toute modification de la formule doit être voulue (ces tests la signalent).
describe('révision espacée', () => {
  it('une carte neuve: facilité 2,5, aucun intervalle, à revoir tout de suite', () => {
    expect(newCard('a:0', NOW)).toEqual({ key: 'a:0', ease: 2.5, intervalDays: 0, due: NOW });
  });

  describe('réponse réussie (qualité 3, 4 ou 5)', () => {
    it.each([
      // qualité, facilité attendue (depuis 2,5)
      [5, 2.6],
      [4, 2.5],
      [3, 2.36],
    ])('qualité %i: la facilité devient %f', (q, ease) => {
      expect(review(card(), q, NOW).ease).toBeCloseTo(ease, 10);
    });

    it('la qualité 3 est une réussite (le seuil d\'échec est strictement sous 3)', () => {
      const r = review(card({ intervalDays: 3 }), 3, NOW);
      expect(r.intervalDays).toBe(Math.round(3 * 2.36));
      expect(r.intervalDays).toBeGreaterThan(1);
    });

    it('intervalle: 1 jour, puis 3 jours, puis intervalle × facilité (arrondi)', () => {
      const a = review(card(), 5, NOW);
      expect(a.intervalDays).toBe(1);
      const b = review(a, 5, NOW);
      expect(b.intervalDays).toBe(3);
      const c = review(b, 5, NOW);
      expect(c.intervalDays).toBe(Math.round(3 * c.ease));
      expect(c.intervalDays).toBe(8); // 3 × 2,8 = 8,4 -> 8
    });

    it('la prochaine date est maintenant + intervalle en jours', () => {
      expect(review(card(), 5, NOW).due).toBe(NOW + 1 * DAY);
      expect(review(card({ intervalDays: 1, ease: 2.5 }), 4, NOW).due).toBe(NOW + 3 * DAY);
      expect(review(card({ intervalDays: 10, ease: 2.0 }), 4, NOW).due).toBe(NOW + 20 * DAY);
    });

    it('la facilité ne descend jamais sous 1,3', () => {
      expect(review(card({ ease: 1.3 }), 3, NOW).ease).toBe(1.3);
      expect(review(card({ ease: 1.35 }), 3, NOW).ease).toBe(1.3);
    });

    it('une meilleure réponse donne toujours une facilité au moins égale', () => {
      const e = (q: number) => review(card(), q, NOW).ease;
      expect(e(5)).toBeGreaterThan(e(4));
      expect(e(4)).toBeGreaterThan(e(3));
    });
  });

  describe('réponse ratée (qualité 0, 1 ou 2)', () => {
    it.each([0, 1, 2])('qualité %i: retour à 1 jour, facilité −0,2, à revoir demain', (q) => {
      const r = review(card({ ease: 2.5, intervalDays: 30 }), q, NOW);
      expect(r.intervalDays).toBe(1);
      expect(r.ease).toBeCloseTo(2.3, 10);
      expect(r.due).toBe(NOW + DAY);
    });

    it('la facilité ne descend jamais sous 1,3, même après des échecs répétés', () => {
      let c = card({ ease: 1.4 });
      for (let i = 0; i < 5; i++) c = review(c, 0, NOW);
      expect(c.ease).toBe(1.3);
    });

    it('un échec ne fait jamais grimper la facilité', () => {
      expect(review(card({ ease: 3 }), 2, NOW).ease).toBeLessThan(3);
    });
  });

  it('ne modifie jamais la carte d\'origine et garde sa clé', () => {
    const original = card({ key: 'restaurant:menu', intervalDays: 3 });
    const copy = { ...original };
    const r = review(original, 4, NOW);
    expect(original).toEqual(copy);
    expect(r.key).toBe('restaurant:menu');
    expect(r).not.toBe(original);
  });

  describe('cartes à revoir', () => {
    it('une carte dont la date est arrivée (ou passée) est à revoir; une carte future non', () => {
      const cards = [card({ key: 'past', due: NOW - 1 }), card({ key: 'exact', due: NOW }), card({ key: 'future', due: NOW + 1 })];
      expect(dueCards(cards, NOW).map((c) => c.key)).toEqual(['past', 'exact']);
    });
    it('liste vide: rien à revoir', () => {
      expect(dueCards([], NOW)).toEqual([]);
    });
  });
});

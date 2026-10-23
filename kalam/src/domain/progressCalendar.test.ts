import { addMinutes, initialProgress, lastDays, localDay, shiftDay } from './progress';

// Ces tests suivent le calendrier LOCAL de la machine: la CI les rejoue dans plusieurs fuseaux (dont Los Angeles, avec
// heure d'été, et Kiritimati, UTC+14). Aux changements d'heure, une journée dure 23 h ou 25 h: le jour affiché
// et la série ne doivent jamais sauter ni se répéter.
describe('calendrier local et heure d\'été', () => {
  const DAYS = 800; // plus de deux ans: plusieurs changements d'heure d'été et d'hiver

  it('chaque jour local successif est exactement le jour suivant (matin, midi, minuit moins une minute)', () => {
    let expected = localDay(new Date(2026, 0, 1, 12));
    for (let i = 0; i < DAYS; i++) {
      for (const [h, m] of [[0, 1], [3, 30], [12, 0], [23, 59]]) {
        expect(localDay(new Date(2026, 0, 1 + i, h, m))).toBe(expected);
      }
      expected = shiftDay(expected, 1);
    }
  });

  it('une série de jours consécutifs compte un jour de plus chaque jour, sans trou aux changements d\'heure', () => {
    let p = initialProgress(localDay(new Date(2026, 0, 1, 12)));
    for (let i = 0; i < DAYS; i++) {
      p = addMinutes(p, 1, localDay(new Date(2026, 0, 1 + i, 23, 59)));
      expect(p.streak).toBe(i + 1);
    }
  });

  it('le graphique des 7 derniers jours montre 7 jours distincts, dont aujourd\'hui à la fin, partout dans l\'année', () => {
    for (let i = 0; i < 400; i += 7) {
      const today = localDay(new Date(2026, 0, 1 + i, 0, 30));
      const bars = lastDays(initialProgress(today), today);
      expect(new Set(bars.map((b) => b.day)).size).toBe(7);
      expect(bars[6]).toMatchObject({ day: today, isToday: true });
    }
  });
});

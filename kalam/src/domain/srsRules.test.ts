import { newCard, review } from './srs';
import { normalizeCards } from '../state/normalize';


describe('plafond de facilité et notes illisibles', () => {
  it('50 réponses « parfait » de suite: la facilité reste à 5 au plus (sinon la carte serait rejetée à la lecture)', () => {
    let c = newCard('k:0', 0);
    for (let i = 0; i < 50; i++) c = review(c, 5, i);
    expect(c.ease).toBe(5);
    expect(normalizeCards([c])).toHaveLength(1);
  });
  it('une note illisible (NaN, Infinity) ne change rien à la carte', () => {
    const c = review(newCard('k:0', 0), 4, 0);
    expect(review(c, NaN, 5)).toBe(c);
    expect(review(c, Number.NaN, 5)).toEqual(c);
    expect(review(c, Infinity, 5)).toBe(c);
  });
  it('une note au-dessus de 5 vaut 5 (pas de facilité gonflée)', () => {
    const c = newCard('k:0', 0);
    expect(review(c, 9, 0).ease).toBe(review(c, 5, 0).ease);
  });
});

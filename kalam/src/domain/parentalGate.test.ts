import { makeGate } from './parental';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('makeGate: valeurs exactes', () => {
  it('rng bas: 6 × 6, mauvaises réponses -10, +10, -1 (les trois premières), ordre mélangé fixe', () => {
    expect(makeGate(() => 0)).toEqual({ question: { a: 6, b: 6 }, options: [26, 46, 35, 36], answer: 36 });
  });
  it('7 × 7 et 8 × 8', () => {
    expect(makeGate(() => 0.25)).toEqual({ question: { a: 7, b: 7 }, options: [39, 59, 48, 49], answer: 49 });
    expect(makeGate(() => 0.5)).toEqual({ question: { a: 8, b: 8 }, options: [54, 74, 63, 64], answer: 64 });
  });
  it('rng haut: 9 × 9 (jamais 10), ordre mélangé fixe', () => {
    expect(makeGate(() => 0.75)).toEqual({ question: { a: 9, b: 9 }, options: [91, 80, 81, 71], answer: 81 });
    expect(makeGate(() => 0.999999)).toMatchObject({ question: { a: 9, b: 9 }, answer: 81 });
  });
  it('a et b viennent de deux tirages différents', () => {
    expect(makeGate(seq(0, 0.5)).question).toEqual({ a: 6, b: 8 });
    expect(makeGate(seq(0.75, 0.25)).question).toEqual({ a: 9, b: 7 });
  });
  it('pour les 16 questions possibles: 4 propositions distinctes, positives, une seule juste, la bonne n\'est pas toujours à la même place', () => {
    const places = new Set<number>();
    for (const a of [0, 0.25, 0.5, 0.75]) for (const b of [0, 0.25, 0.5, 0.75]) {
      const g = makeGate(seq(a, b));
      expect(g.answer).toBe(g.question.a * g.question.b);
      expect(new Set(g.options).size).toBe(4);
      expect(g.options.every((o) => o > 0)).toBe(true);
      expect(g.options.filter((o) => o === g.answer)).toHaveLength(1);
      expect(g.options).toContain(g.answer - 10);
      expect(g.options).toContain(g.answer + 10);
      expect(g.options).toContain(g.answer - 1);
      places.add(g.options.indexOf(g.answer));
    }
    expect(places.size).toBeGreaterThan(1);
  });
});

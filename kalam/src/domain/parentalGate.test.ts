import { makeGate } from './parental';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('makeGate', () => {
  it('rng bas: 6 × 6; rng haut: 9 × 9 (jamais 10)', () => {
    expect(makeGate(() => 0)).toMatchObject({ question: { a: 6, b: 6 }, answer: 36 });
    expect(makeGate(() => 0.25)).toMatchObject({ question: { a: 7, b: 7 }, answer: 49 });
    expect(makeGate(() => 0.5)).toMatchObject({ question: { a: 8, b: 8 }, answer: 64 });
    expect(makeGate(() => 0.75)).toMatchObject({ question: { a: 9, b: 9 }, answer: 81 });
    expect(makeGate(() => 0.999999)).toMatchObject({ question: { a: 9, b: 9 }, answer: 81 });
  });
  it('a et b viennent de deux tirages différents', () => {
    expect(makeGate(seq(0, 0.5)).question).toEqual({ a: 6, b: 8 });
    expect(makeGate(seq(0.75, 0.25)).question).toEqual({ a: 9, b: 7 });
  });
  it('à hasard figé, le résultat est reproductible (utile aux tests de parcours)', () => {
    expect(makeGate(() => 0)).toEqual(makeGate(() => 0));
    expect(makeGate(() => 0).options).toEqual([35, 37, 36, 46]);
  });
  it('pour chaque question possible: 4 propositions distinctes et positives, une seule juste, proches de la bonne réponse', () => {
    for (const a of [0, 0.25, 0.5, 0.75]) for (const b of [0, 0.25, 0.5, 0.75]) {
      const g = makeGate(seq(a, b));
      expect(g.answer).toBe(g.question.a * g.question.b);
      expect(new Set(g.options).size).toBe(4);
      expect(g.options.every((o) => o > 0)).toBe(true);
      expect(g.options.filter((o) => o === g.answer)).toHaveLength(1);
      expect(g.options.filter((o) => o !== g.answer).every((o) => Math.abs(o - g.answer) <= 10)).toBe(true);
    }
  });
  it('la place de la bonne réponse change d\'un tirage à l\'autre pour la MÊME question (impossible de l\'apprendre par cœur)', () => {
    const places = new Set<number>();
    const wrongSets = new Set<string>();
    for (let k = 0; k < 40; k++) {
      let n = 0;
      const rng = () => (n++ < 2 ? 0 : ((k * 0.137 + n * 0.311) % 1)); // mêmes a et b (6 × 6), puis des tirages variés
      const g = makeGate(rng);
      expect(g.question).toEqual({ a: 6, b: 6 });
      places.add(g.options.indexOf(g.answer));
      wrongSets.add(g.options.filter((o) => o !== g.answer).sort((x, y) => x - y).join(','));
    }
    expect(places.size).toBe(4); // les 4 places sont possibles
    expect(wrongSets.size).toBeGreaterThan(3); // et les mauvaises réponses varient aussi
  });
});

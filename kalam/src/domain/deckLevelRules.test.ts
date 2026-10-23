import { buildReviewSession, parseCardKey, targetOfKey } from './deck';
import { PLACEMENT_EN, PLACEMENT_FR, scorePlacement } from './level';
import { LESSONS } from './lessons';
import { newCard } from './srs';

const L = LESSONS[0].id;
// Réponses: toutes justes pour les niveaux donnés, toutes fausses ailleurs.
const answers = (qs: typeof PLACEMENT_EN, right: (i: number) => boolean) =>
  qs.map((q, i) => (right(i) ? q.answer : (q.answer + 1) % q.options.length));

describe('parseCardKey: formes acceptées et refusées', () => {
  it('forme historique (anglais) et forme avec langue', () => {
    expect(parseCardKey(`${L}:3`)).toEqual({ target: 'en', lessonId: L, index: 3 });
    expect(parseCardKey(`fr:${L}:2`)).toEqual({ target: 'fr', lessonId: L, index: 2 });
  });
  it('accepte un index à plusieurs chiffres', () => {
    expect(parseCardKey(`${L}:12`)).toEqual({ target: 'en', lessonId: L, index: 12 });
    expect(parseCardKey(`fr:${L}:100`)).toEqual({ target: 'fr', lessonId: L, index: 100 });
  });
  it('refuse les formes inattendues', () => {
    for (const k of ['', L, `${L}:`, `:3`, `${L}:x`, `${L}:3x`, `${L}:-1`, `${L}:1.5`, `a${L}:3 `, `xx:${L}:1`, `fr:${L}:x`, `fr:${L}:1:2`, `fr::1`])
      expect(parseCardKey(k)).toBeNull();
  });
  it('une clé à 3 parties dont la langue est inconnue n\'est pas devinée', () => {
    expect(parseCardKey(`${L}:1:2`)).toBeNull();
  });
  it('targetOfKey: langue de la clé, anglais si la clé est illisible', () => {
    expect(targetOfKey(`fr:${L}:0`)).toBe('fr');
    expect(targetOfKey(`${L}:0`)).toBe('en');
    expect(targetOfKey('n\'importe quoi')).toBe('en');
  });
});

describe('buildReviewSession', () => {
  it('trie les cartes les plus en retard d\'abord, et limite la taille', () => {
    const cards = [3, 0, 2, 1].map((i) => ({ ...newCard(`${L}:${i}`, 0), due: (i + 1) * 100 }));
    const s = buildReviewSession(cards, 10_000, 10).map((c) => c.key);
    expect(s).toEqual([`${L}:0`, `${L}:1`, `${L}:2`, `${L}:3`].filter((k) => s.includes(k)));
    expect(buildReviewSession(cards, 10_000, 2)).toHaveLength(Math.min(2, s.length));
  });
  it('ne mélange pas les langues et ignore les cartes dont le mot n\'existe plus', () => {
    const cards = [newCard(`${L}:0`, 0), newCard(`fr:${L}:0`, 0), newCard('inconnue:0', 0), newCard(`${L}:999`, 0)];
    expect(buildReviewSession(cards, 1, 10, 'en').map((c) => c.key)).toEqual([`${L}:0`]);
    expect(buildReviewSession(cards, 1, 10, 'fr').map((c) => c.key)).toEqual([`fr:${L}:0`]);
  });
});

describe('scorePlacement: règle de la moitié, sans casser la chaîne', () => {
  const lv = (i: number) => PLACEMENT_EN[i].level;
  it('tout faux → A1 (jamais en dessous)', () => {
    expect(scorePlacement(answers(PLACEMENT_EN, () => false))).toBe('A1');
    expect(scorePlacement([])).toBe('A1');
  });
  it('tout juste → B1, dans les deux langues', () => {
    expect(scorePlacement(answers(PLACEMENT_EN, () => true))).toBe('B1');
    expect(scorePlacement(answers(PLACEMENT_FR, () => true), 'fr')).toBe('B1');
  });
  it('exactement la moitié des questions d\'un niveau suffit (2 sur 4)', () => {
    let a1 = 0;
    const r = answers(PLACEMENT_EN, (i) => lv(i) === 'A1' && a1++ < 2);
    expect(scorePlacement(r)).toBe('A1');
    // 2 sur 4 en A1 valide A1, puis A2 doit aussi pouvoir passer avec 2 sur 4
    let b = 0; let c = 0;
    const r2 = answers(PLACEMENT_EN, (i) => (lv(i) === 'A1' && b++ < 2) || (lv(i) === 'A2' && c++ < 2));
    expect(scorePlacement(r2)).toBe('A2');
  });
  it('moins de la moitié (1 sur 4) ne valide pas le niveau', () => {
    let n = 0;
    const r = answers(PLACEMENT_EN, (i) => lv(i) === 'A2' || (lv(i) === 'A1' && n++ < 1));
    expect(scorePlacement(r)).toBe('A1');
  });
  it('la chaîne ne saute pas: B1 réussi sans A2 ne donne pas B1', () => {
    expect(scorePlacement(answers(PLACEMENT_EN, (i) => lv(i) !== 'A2'))).toBe('A1');
  });
  it('un niveau sans aucune bonne réponse est refusé même si le seuil est 0', () => {
    expect(scorePlacement(answers(PLACEMENT_EN, (i) => lv(i) === 'B1'))).toBe('A1');
  });
});

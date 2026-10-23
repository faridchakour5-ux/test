import { LESSONS, meaning } from './lessons';
import { PLACEMENT, scorePlacement } from './level';
import { addMinutes, completeLesson, goalReached, initialProgress } from './progress';
import { newCard, review } from './srs';

describe('lessons', () => {
  it('contient 30 leçons uniques avec vocabulaire traduit dans toutes les langues', () => {
    expect(LESSONS).toHaveLength(30);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(30);
    expect(LESSONS.filter((l) => l.level === 'A1').length).toBeGreaterThanOrEqual(8);
    expect(LESSONS.filter((l) => l.level === 'B1').length).toBeGreaterThanOrEqual(8);
    LESSONS.forEach((l) => {
      expect(l.vocab.length).toBeGreaterThanOrEqual(4);
      (['fr', 'en', 'ar', 'es', 'zh'] as const).forEach((lang) => expect(l.title[lang].trim()).not.toBe(''));
      l.vocab.forEach((v) => { expect(v.fr && v.ar && v.es && v.zh).toBeTruthy(); expect(v.ar).toMatch(/[\u0600-\u06ff]/); expect(v.zh).toMatch(/[\u4e00-\u9fff]/); });
    });
  });
});

describe('scorePlacement', () => {
  it('tout juste -> B1', () => expect(scorePlacement(PLACEMENT.map((q) => q.answer))).toBe('B1'));
  it('tout faux -> A1', () => expect(scorePlacement(PLACEMENT.map(() => -1))).toBe('A1'));
  it('A1 et A2 justes, B1 faux -> A2', () =>
    expect(scorePlacement(PLACEMENT.map((q) => (q.level === 'B1' ? -1 : q.answer)))).toBe('A2'));
});

describe('srs', () => {
  const t = 0;
  it('allonge les intervalles quand on réussit', () => {
    let c = newCard('a', t);
    c = review(c, 5, t);
    expect(c.intervalDays).toBe(1);
    c = review(c, 5, t);
    expect(c.intervalDays).toBe(3);
    c = review(c, 5, t);
    expect(c.intervalDays).toBeGreaterThan(3);
  });
  it('revient à 1 jour après un oubli', () => {
    const c = review({ ...newCard('a', t), intervalDays: 10 }, 1, t);
    expect(c.intervalDays).toBe(1);
  });
});

describe('progress', () => {
  it('compte une série sur jours consécutifs', () => {
    let p = addMinutes(initialProgress('2026-01-01'), 5, '2026-01-01');
    p = addMinutes(p, 5, '2026-01-02');
    expect(p.streak).toBe(2);
    expect(goalReached(p)).toBe(false);
  });
  it('repart à 1 après un jour manqué, sans pénalité', () => {
    let p = addMinutes(initialProgress('2026-01-01'), 5, '2026-01-01');
    p = addMinutes(p, 5, '2026-01-05');
    expect(p.streak).toBe(1);
  });
  it('objectif atteint et leçon unique', () => {
    let p = addMinutes(initialProgress('2026-01-01'), 10, '2026-01-01');
    expect(goalReached(p)).toBe(true);
    p = completeLesson(completeLesson(p, 'family'), 'family');
    expect(p.completedLessons).toEqual(['family']);
  });
});

describe('meaning', () => {
  it('donne le sens dans la langue de l\'interface (français pour l\'anglais)', () => {
    const menu = LESSONS.find((l) => l.id === 'restaurant')!.vocab[0];
    expect(meaning(menu, 'fr')).toBe('carte');
    expect(meaning(menu, 'es')).toBe('carta');
    expect(meaning(menu, 'zh')).toBe('菜单');
    expect(meaning(menu, 'ar')).toBe('قائمة الطعام');
    expect(meaning(menu, 'en')).toBe('carte');
  });
});

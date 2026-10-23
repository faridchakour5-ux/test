import { LESSONS, meaning, recommendLessons } from './lessons';
import { PLACEMENT, scorePlacement } from './level';
import { CHALLENGE_POOL, CHALLENGE_XP, ChallengeId, addMinutes, addXp, applyChallenge, challengeProgress, completeLesson, dailyChallenge, goalReached, initialProgress, isChallengeDone, lastDays, lessonsDoneToday, levelFromXp, localDay, noteLessonToday, normalizeProgress, shiftDay, totalMinutes, xpForLevel } from './progress';
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

describe('PLACEMENT', () => {
  it('a 12 questions bien formées, 4 par niveau', () => {
    expect(PLACEMENT).toHaveLength(12);
    for (const lvl of ['A1', 'A2', 'B1'] as const) expect(PLACEMENT.filter((q) => q.level === lvl)).toHaveLength(4);
    PLACEMENT.forEach((q) => {
      expect(q.options.length).toBe(3);
      expect(new Set(q.options).size).toBe(3);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.prompt).toContain('___');
    });
  });
  it('les bonnes réponses ne sont pas toutes à la même place (pas de motif devinable)', () => {
    expect(new Set(PLACEMENT.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
  });
  it('un seul bon choix par question: aucune option répétée dans la question', () => {
    PLACEMENT.forEach((q) => q.options.forEach((o) => expect(q.prompt.toLowerCase()).not.toContain(` ${o.toLowerCase()} `)));
  });
});

describe('scorePlacement', () => {
  it('tout juste -> B1', () => expect(scorePlacement(PLACEMENT.map((q) => q.answer))).toBe('B1'));
  it('tout faux -> A1', () => expect(scorePlacement(PLACEMENT.map(() => -1))).toBe('A1'));
  it('la moitié des A1 seulement et le reste faux -> A1', () => {
    const answers = PLACEMENT.map((q, i) => (q.level === 'A1' && i % 2 === 0 ? q.answer : -1));
    expect(scorePlacement(answers)).toBe('A1');
  });
  it('réussir B1 sans réussir A1 ne donne pas B1 (la chaîne ne se saute pas)', () => {
    const answers = PLACEMENT.map((q) => (q.level === 'B1' ? q.answer : -1));
    expect(scorePlacement(answers)).toBe('A1');
  });
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

describe('recommendLessons', () => {
  it('propose d\'abord des leçons du niveau, sans celles déjà faites', () => {
    const r = recommendLessons('A2', ['shopping']);
    expect(r).toHaveLength(3);
    expect(r.every((l) => l.level === 'A2')).toBe(true);
    expect(r.map((l) => l.id)).not.toContain('shopping');
  });
  it('passe au niveau suivant quand le niveau est terminé, jamais en arrière', () => {
    const doneA2 = LESSONS.filter((l) => l.level === 'A2').map((l) => l.id);
    const r = recommendLessons('A2', doneA2);
    expect(r.every((l) => l.level === 'B1')).toBe(true);
    expect(recommendLessons('B1', []).every((l) => l.level === 'B1')).toBe(true);
  });
  it('liste vide quand tout est fait, et jamais la conversation libre', () => {
    expect(recommendLessons('A1', LESSONS.map((l) => l.id))).toEqual([]);
    expect(recommendLessons('B1', []).map((l) => l.id)).not.toContain('free');
  });
});

describe('historique de progression', () => {
  it('cumule les minutes par jour', () => {
    let p = addMinutes(initialProgress('2026-03-10'), 4, '2026-03-10');
    p = addMinutes(p, 3, '2026-03-10');
    p = addMinutes(p, 5, '2026-03-11');
    expect(p.history).toEqual({ '2026-03-10': 7, '2026-03-11': 5 });
  });
  it('lastDays renvoie 7 jours consécutifs, du plus ancien à aujourd\'hui, avec les jours vides à 0', () => {
    let p = addMinutes(initialProgress('2026-03-10'), 6, '2026-03-10');
    p = addMinutes(p, 9, '2026-03-12');
    const bars = lastDays(p, '2026-03-12');
    expect(bars.map((b) => b.day)).toEqual(['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12']);
    expect(bars.map((b) => b.minutes)).toEqual([0, 0, 0, 0, 6, 0, 9]);
    expect(bars.filter((b) => b.isToday)).toHaveLength(1);
    expect(totalMinutes(bars)).toBe(15);
  });
  it('shiftDay traverse les fins de mois, d\'année et le 29 février', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('purge au-delà de 60 jours', () => {
    let p = addMinutes(initialProgress('2026-01-01'), 5, '2026-01-01');
    p = addMinutes(p, 5, '2026-03-30');
    expect(p.history['2026-01-01']).toBeUndefined();
    expect(p.history['2026-03-30']).toBe(5);
  });
  it('normalizeProgress migre une ancienne sauvegarde sans historique', () => {
    const old = { dailyGoalMinutes: 20, minutesToday: 3, today: '2026-03-10', streak: 4, lastActiveDay: '2026-03-10', completedLessons: ['family'] };
    expect(normalizeProgress(old as never, '2026-03-10')).toMatchObject({ dailyGoalMinutes: 20, streak: 4, completedLessons: ['family'], history: {} });
  });
  it('normalizeProgress répare des données abîmées sans planter', () => {
    const bad = { dailyGoalMinutes: 99, minutesToday: -5, streak: 'x', completedLessons: [1, 'ok'], history: { 'pas-une-date': 5, '2026-03-10': -1, '2026-03-09': 12, '2026-03-08': 99999 } };
    const n = normalizeProgress(bad as never, '2026-03-10');
    expect(n.dailyGoalMinutes).toBe(10);
    expect(n.minutesToday).toBe(0);
    expect(n.streak).toBe(0);
    expect(n.completedLessons).toEqual(['ok']);
    expect(n.history).toEqual({ '2026-03-09': 12 });
    expect(normalizeProgress(null, '2026-03-10').history).toEqual({});
    expect(normalizeProgress('oops' as never, '2026-03-10').streak).toBe(0);
  });
});

describe('niveau d\'expérience (xp)', () => {
  it('1 point par minute, 10 points à la première réussite d\'une leçon seulement', () => {
    let p = addMinutes(initialProgress('2026-03-10'), 5, '2026-03-10');
    expect(p.xp).toBe(5);
    p = completeLesson(p, 'family');
    expect(p.xp).toBe(15);
    p = completeLesson(p, 'family'); // refaire la même leçon ne rapporte rien (pas de farm)
    expect(p.xp).toBe(15);
  });
  it('addXp ajoute, ignore le négatif et les décimales', () => {
    const p = initialProgress('2026-03-10');
    expect(addXp(p, 3).xp).toBe(3);
    expect(addXp(p, -50).xp).toBe(0);
    expect(addXp(p, 2.9).xp).toBe(2);
  });
  it('les points ne baissent jamais, même après plusieurs jours sans activité', () => {
    let p = addMinutes(initialProgress('2026-03-10'), 8, '2026-03-10');
    const before = p.xp;
    p = addMinutes(p, 0, '2026-04-30'); // longue absence
    expect(p.xp).toBeGreaterThanOrEqual(before);
  });
  it('levelFromXp: niveau 1 au départ, progression et seuils', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, levelStart: 0, nextAt: 25, fraction: 0 });
    expect(levelFromXp(24).level).toBe(1);
    expect(levelFromXp(25).level).toBe(2);
    expect(levelFromXp(99).level).toBe(2); // le niveau 3 commence à 25 × 2² = 100
    expect(levelFromXp(100).level).toBe(3);
    expect(levelFromXp(224).level).toBe(3);
    expect(levelFromXp(225).level).toBe(4); // 25 × 3²
    expect(levelFromXp(37).fraction).toBeCloseTo((37 - 25) / (100 - 25));
  });
  it('levelFromXp résiste aux valeurs absurdes', () => {
    for (const bad of [NaN, -5, Infinity as number]) expect(levelFromXp(bad).level).toBeGreaterThanOrEqual(1);
    expect(levelFromXp(-5)).toMatchObject({ level: 1, xp: 0 });
    expect(levelFromXp(1_000_000).level).toBeGreaterThan(100);
  });
  it('les seuils de niveau croissent strictement', () => {
    for (let l = 1; l < 50; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });
  it('normalizeProgress migre xp (absent, négatif ou décimal)', () => {
    expect(normalizeProgress({} as never, '2026-03-10').xp).toBe(0);
    expect(normalizeProgress({ xp: -4 } as never, '2026-03-10').xp).toBe(0);
    expect(normalizeProgress({ xp: 41.7 } as never, '2026-03-10').xp).toBe(41);
  });
});

describe('jour local', () => {
  it('localDay formate AAAA-MM-JJ avec des zéros', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05'); // 23h59 locale = encore le 5, même si UTC est le 6
    expect(localDay(new Date(2026, 10, 30, 0, 1))).toBe('2026-11-30');
  });
  it('normalizeProgress remet les minutes à zéro un nouveau jour, garde le reste', () => {
    const saved = { ...initialProgress('2026-03-09'), minutesToday: 10, streak: 4, xp: 50, completedLessons: ['family'] };
    const n = normalizeProgress(saved, '2026-03-10');
    expect(n).toMatchObject({ today: '2026-03-10', minutesToday: 0, streak: 4, xp: 50, completedLessons: ['family'] });
    expect(normalizeProgress(saved, '2026-03-09').minutesToday).toBe(10); // même jour: conservé
  });
});

describe('défi du jour', () => {
  const T = '2026-03-10';
  const choose = (id: ChallengeId) => { for (let d = 1; d <= 60; d++) { const day = `2026-04-${String((d % 28) + 1).padStart(2, '0')}`; if (dailyChallenge(day) === id) return day; } throw new Error('introuvable'); };

  it('est stable dans la journée et varie selon les jours', () => {
    expect(dailyChallenge(T)).toBe(dailyChallenge(T));
    const seen = new Set<ChallengeId>();
    for (let d = 1; d <= 28; d++) seen.add(dailyChallenge(`2026-02-${String(d).padStart(2, '0')}`));
    expect(seen.size).toBeGreaterThanOrEqual(2);
    seen.forEach((id) => expect(CHALLENGE_POOL).toContain(id));
  });
  it('toujours réalisable: aucun défi ne dépend de cartes à réviser', () => {
    expect(CHALLENGE_POOL.every((id) => ['minutes5', 'minutes10', 'lesson1'].includes(id))).toBe(true);
  });
  it('défi minutes: progresse puis donne le bonus UNE seule fois', () => {
    const day = choose('minutes5');
    let p = initialProgress(day);
    expect(isChallengeDone(p, day)).toBe(false);
    p = applyChallenge(addMinutes(p, 3, day), day);
    expect(p.xp).toBe(3); // pas encore de bonus
    expect(challengeProgress('minutes5', p, day)).toEqual({ done: 3, target: 5 });
    p = applyChallenge(addMinutes(p, 2, day), day);
    expect(p.xp).toBe(5 + CHALLENGE_XP);
    expect(p.challengeClaimedDay).toBe(day);
    const again = applyChallenge(addMinutes(p, 5, day), day);
    expect(again.xp).toBe(p.xp + 5); // les minutes comptent, mais pas de 2e bonus
  });
  it('défi leçon: une leçon terminée (même répétée) le réussit', () => {
    const day = choose('lesson1');
    let p = initialProgress(day);
    p = noteLessonToday(completeLesson(addMinutes(p, 1, day), 'family'), day);
    p = applyChallenge(p, day);
    expect(isChallengeDone(p, day)).toBe(true);
    expect(p.challengeClaimedDay).toBe(day);
  });
  it('le compteur de leçons repart à zéro un autre jour', () => {
    const p = noteLessonToday(initialProgress('2026-03-10'), '2026-03-10');
    expect(lessonsDoneToday(p, '2026-03-10')).toBe(1);
    expect(lessonsDoneToday(p, '2026-03-11')).toBe(0);
  });
  it('un défi non réussi n\'enlève jamais de points', () => {
    const day = choose('minutes10');
    const p = applyChallenge(addMinutes(initialProgress(day), 2, day), day);
    expect(p.xp).toBe(2);
    expect(p.challengeClaimedDay).toBeNull();
  });
  it('normalizeProgress migre lessonsToday et challengeClaimedDay', () => {
    const n = normalizeProgress({ lessonsToday: { day: '2026-03-10', count: 2.9 }, challengeClaimedDay: '2026-03-09' } as never, '2026-03-10');
    expect(n.lessonsToday).toEqual({ day: '2026-03-10', count: 2 });
    expect(n.challengeClaimedDay).toBe('2026-03-09');
    expect(normalizeProgress({ lessonsToday: 'x' } as never, '2026-03-10').lessonsToday).toEqual({ day: '2026-03-10', count: 0 });
  });
});

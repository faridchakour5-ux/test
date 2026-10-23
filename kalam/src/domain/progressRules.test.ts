import {
  CHALLENGE_XP, HISTORY_DAYS, Progress, XP_PER_MINUTE, addMinutes, addXp, applyChallenge, challengeProgress, completeLesson, dailyChallenge,
  initialProgress, isChallengeDone, lastDays, lessonsDoneToday, levelFromXp, noteLessonToday, normalizeProgress, shiftDay, totalMinutes,
} from './progress';

const D = '2026-03-10';
const P = (over: Partial<Progress> = {}): Progress => ({ ...initialProgress(D), ...over });

describe('série de jours (streak)', () => {
  it('première activité de tous les temps: série de 1', () => {
    expect(addMinutes(P(), 5, D).streak).toBe(1);
  });
  it('plusieurs séances le même jour ne comptent qu\'un jour', () => {
    let p = addMinutes(P(), 5, D);
    p = addMinutes(p, 5, D);
    p = addMinutes(p, 5, D);
    expect(p.streak).toBe(1);
    expect(p.minutesToday).toBe(15);
  });
  it('le lendemain: la série augmente de 1', () => {
    let p = addMinutes(P(), 5, D);
    p = addMinutes(p, 5, '2026-03-11');
    expect(p.streak).toBe(2);
    expect(p.minutesToday).toBe(5); // les minutes d'hier ne comptent pas aujourd'hui
    expect(p.lastActiveDay).toBe('2026-03-11');
  });
  it('un jour manqué: la série repart à 1 (sans pénalité ni message culpabilisant)', () => {
    let p = addMinutes(P(), 5, D);
    p = addMinutes(p, 5, '2026-03-11');
    p = addMinutes(p, 5, '2026-03-13'); // le 12 manqué
    expect(p.streak).toBe(1);
  });
  it('la série traverse un changement de mois et d\'année', () => {
    let p = addMinutes(P({ today: '2025-12-31' }), 5, '2025-12-31');
    p = addMinutes(p, 5, '2026-01-01');
    expect(p.streak).toBe(2);
    p = addMinutes(p, 5, '2026-01-02');
    expect(p.streak).toBe(3);
  });
  it('ajouter 0 minute un nouveau jour compte quand même comme activité de ce jour une seule fois', () => {
    const p = addMinutes(addMinutes(P(), 5, D), 0, '2026-03-11');
    expect(p.streak).toBe(2);
    expect(addMinutes(p, 0, '2026-03-11').streak).toBe(2);
  });
});

describe('minutes, historique et points', () => {
  it('les minutes du jour s\'ajoutent à l\'historique du jour', () => {
    const p = addMinutes(addMinutes(P(), 4, D), 3, D);
    expect(p.history).toEqual({ [D]: 7 });
  });
  it('1 point par minute; des minutes négatives ne retirent jamais de points', () => {
    expect(addMinutes(P(), 7, D).xp).toBe(7 * XP_PER_MINUTE);
    expect(addMinutes(P({ xp: 20 }), -5, D).xp).toBe(20);
  });
  it('l\'historique garde exactement les 60 derniers jours (aujourd\'hui compris) et jamais le futur', () => {
    const h: Record<string, number> = {
      [shiftDay(D, -59)]: 1, // le plus ancien gardé
      [shiftDay(D, -60)]: 2, // trop vieux
      [shiftDay(D, -200)]: 3,
      [shiftDay(D, 1)]: 4, // dans le futur
    };
    const p = addMinutes(P({ history: h }), 5, D);
    expect(Object.keys(p.history).sort()).toEqual([shiftDay(D, -59), D].sort());
    expect(HISTORY_DAYS).toBe(60);
  });
});

describe('graphique de la semaine', () => {
  it('7 jours du plus ancien à aujourd\'hui, avec les minutes de chaque jour (0 si rien)', () => {
    const p = P({ history: { [shiftDay(D, -1)]: 12, [shiftDay(D, -6)]: 3 }, minutesToday: 5 });
    const bars = lastDays(p, D);
    expect(bars.map((b) => b.minutes)).toEqual([3, 0, 0, 0, 0, 12, 5]);
    expect(bars.map((b) => b.isToday)).toEqual([false, false, false, false, false, false, true]);
    expect(bars[0].day).toBe(shiftDay(D, -6));
    expect(totalMinutes(bars)).toBe(20);
  });
  it('aujourd\'hui: le plus grand entre les minutes du jour et l\'historique du jour', () => {
    expect(lastDays(P({ minutesToday: 5, history: { [D]: 9 } }), D)[6].minutes).toBe(9);
    expect(lastDays(P({ minutesToday: 9, history: { [D]: 5 } }), D)[6].minutes).toBe(9);
  });
  it('un historique absent (ancienne sauvegarde) ne plante pas', () => {
    const p = { ...P(), history: undefined } as unknown as Progress;
    expect(lastDays(p, D).every((b) => b.minutes === 0 || b.isToday)).toBe(true);
  });
  it('nombre de jours choisi', () => {
    expect(lastDays(P(), D, 3)).toHaveLength(3);
  });
});

describe('relecture d\'une sauvegarde de progression', () => {
  it('rien, null ou autre chose qu\'un objet: progression neuve', () => {
    for (const bad of [null, undefined, 0, 'x', true] as unknown[]) expect(normalizeProgress(bad as never, D)).toEqual(initialProgress(D));
  });
  it('conserve les valeurs valides', () => {
    const raw = { dailyGoalMinutes: 20, minutesToday: 4, today: D, streak: 6, lastActiveDay: '2026-03-09', completedLessons: ['a', 'fr:b'], history: { '2026-03-09': 30 }, xp: 120.7,
      lessonsToday: { day: D, count: 2 }, challengeClaimedDay: D };
    expect(normalizeProgress(raw as never, D)).toEqual({ ...raw, xp: 120 });
  });
  it('nombres abîmés (négatifs, NaN, infinis, textes): valeur sûre', () => {
    const p = normalizeProgress({ today: D, minutesToday: -1, streak: NaN, xp: Infinity } as never, D);
    expect(p).toMatchObject({ minutesToday: 0, streak: 0, xp: 0 });
    expect(normalizeProgress({ today: D, minutesToday: '5', streak: '3', xp: '9' } as never, D)).toMatchObject({ minutesToday: 0, streak: 0, xp: 0 });
  });
  it('zéro est une valeur valide (pas remplacée), les négatifs non', () => {
    expect(normalizeProgress({ today: D, minutesToday: 0, streak: 0 } as never, D)).toMatchObject({ minutesToday: 0, streak: 0 });
    expect(normalizeProgress({ streak: -2 } as never, D).streak).toBe(0);
  });
  it('objectif quotidien: seulement 5, 10 ou 20', () => {
    for (const g of [5, 10, 20]) expect(normalizeProgress({ dailyGoalMinutes: g } as never, D).dailyGoalMinutes).toBe(g);
    for (const g of [7, 0, -5, '10', null]) expect(normalizeProgress({ dailyGoalMinutes: g } as never, D).dailyGoalMinutes).toBe(10);
  });
  it('les minutes d\'hier ne deviennent pas celles d\'aujourd\'hui', () => {
    expect(normalizeProgress({ today: '2026-03-09', minutesToday: 8 } as never, D).minutesToday).toBe(0);
    expect(normalizeProgress({ today: D, minutesToday: 8 } as never, D).minutesToday).toBe(8);
  });
  it('historique: clés « AAAA-MM-JJ » exactes, minutes entre 0 et 1439', () => {
    const history = { '2026-03-09': 10, '2026-03-08': 0, '2026-03-07': 1439, '2026-03-06': 1440, '2026-03-05': -1, '2026-3-5': 5, 'x2026-03-04': 5, '2026-03-04x': 5, '2026-03-03': NaN, '2026-03-02': '9' };
    expect(normalizeProgress({ history } as never, D).history).toEqual({ '2026-03-09': 10, '2026-03-08': 0, '2026-03-07': 1439 });
  });
  it('historique qui n\'est pas un objet: vide', () => {
    expect(normalizeProgress({ history: 'x' } as never, D).history).toEqual({});
    expect(normalizeProgress({ history: null } as never, D).history).toEqual({});
  });
  it('dernier jour actif, leçons, jour du défi: seulement des textes', () => {
    const p = normalizeProgress({ lastActiveDay: 5, completedLessons: ['a', 2, null, 'b'], challengeClaimedDay: 7 } as never, D);
    expect(p.lastActiveDay).toBeNull();
    expect(p.completedLessons).toEqual(['a', 'b']);
    expect(p.challengeClaimedDay).toBeNull();
    expect(normalizeProgress({ completedLessons: 'abc' } as never, D).completedLessons).toEqual([]);
  });
  it('leçons du jour: jour valide exigé (AAAA-MM-JJ), sinon repart à zéro aujourd\'hui', () => {
    expect(normalizeProgress({ lessonsToday: { day: '2026-03-09', count: 3 } } as never, D).lessonsToday).toEqual({ day: '2026-03-09', count: 3 });
    for (const day of ['hier', '2026-3-9', 'x2026-03-09', '2026-03-09x', 5]) {
      expect(normalizeProgress({ lessonsToday: { day, count: 3 } } as never, D).lessonsToday).toEqual({ day: D, count: 0 });
    }
    expect(normalizeProgress({ lessonsToday: { day: D, count: -3 } } as never, D).lessonsToday.count).toBe(0);
  });
});

describe('points, niveaux et leçons', () => {
  it('une leçon ne donne des points qu\'à la première réussite', () => {
    const once = completeLesson(P(), 'family');
    expect(once.xp).toBe(10);
    expect(completeLesson(once, 'family')).toBe(once);
    expect(completeLesson(once, 'other').xp).toBe(20);
  });
  it('addXp arrondit vers le bas et ignore le négatif', () => {
    expect(addXp(P(), 2.9).xp).toBe(2);
    expect(addXp(P({ xp: 10 }), -4).xp).toBe(10);
  });
  it('niveaux: 25 × (n−1)² points, valeurs hostiles = niveau 1', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, levelStart: 0, nextAt: 25, fraction: 0 });
    expect(levelFromXp(24).level).toBe(1);
    expect(levelFromXp(25)).toMatchObject({ level: 2, levelStart: 25, nextAt: 100 });
    expect(levelFromXp(99).level).toBe(2);
    expect(levelFromXp(100).level).toBe(3);
    expect(levelFromXp(62.5).fraction).toBeCloseTo((62 - 25) / 75, 10);
    for (const bad of [-5, NaN, Infinity, -Infinity]) expect(levelFromXp(bad).level).toBe(bad === Infinity ? 1 : 1);
  });
});

describe('défi du jour', () => {
  it('toujours le même toute la journée, valeurs connues (changer la formule doit être voulu)', () => {
    expect(dailyChallenge('2026-03-10')).toBe('lesson1');
    expect(dailyChallenge('2026-03-11')).toBe('minutes5');
    expect(dailyChallenge('2026-03-12')).toBe('minutes10');
    expect(dailyChallenge('2026-01-01')).toBe('minutes5');
    expect(dailyChallenge('2026-12-31')).toBe('lesson1');
  });
  it('avancement: minutes plafonnées à la cible, leçons plafonnées à 1', () => {
    expect(challengeProgress('minutes5', P({ minutesToday: 3 }), D)).toEqual({ done: 3, target: 5 });
    expect(challengeProgress('minutes5', P({ minutesToday: 50 }), D)).toEqual({ done: 5, target: 5 });
    expect(challengeProgress('minutes10', P({ minutesToday: 4 }), D)).toEqual({ done: 4, target: 10 });
    expect(challengeProgress('minutes10', P({ minutesToday: 50 }), D)).toEqual({ done: 10, target: 10 });
    expect(challengeProgress('lesson1', P({ lessonsToday: { day: D, count: 0 } }), D)).toEqual({ done: 0, target: 1 });
    expect(challengeProgress('lesson1', P({ lessonsToday: { day: D, count: 5 } }), D)).toEqual({ done: 1, target: 1 });
  });
  it('les minutes et leçons d\'un autre jour ne comptent pas', () => {
    expect(challengeProgress('minutes5', P({ today: '2026-03-09', minutesToday: 4 }), D).done).toBe(0);
    expect(lessonsDoneToday(P({ lessonsToday: { day: '2026-03-09', count: 4 } }), D)).toBe(0);
    expect(lessonsDoneToday({ ...P(), lessonsToday: undefined } as unknown as Progress, D)).toBe(0);
  });
  it('une leçon terminée compte, même répétée', () => {
    const p = noteLessonToday(noteLessonToday(P(), D), D);
    expect(lessonsDoneToday(p, D)).toBe(2);
    expect(lessonsDoneToday(noteLessonToday(P({ lessonsToday: { day: '2026-03-09', count: 7 } }), D), D)).toBe(1);
  });
  it('bonus de 15 points une seule fois par jour, dès que le défi est réussi', () => {
    // 2026-03-10 = « une leçon »
    const before = P({ xp: 100 });
    expect(isChallengeDone(before, D)).toBe(false);
    expect(applyChallenge(before, D)).toBe(before); // pas réussi: rien
    const done = noteLessonToday(before, D);
    expect(isChallengeDone(done, D)).toBe(true);
    const claimed = applyChallenge(done, D);
    expect(claimed.xp).toBe(100 + CHALLENGE_XP);
    expect(claimed.challengeClaimedDay).toBe(D);
    expect(applyChallenge(claimed, D)).toBe(claimed); // jamais deux fois
  });
});

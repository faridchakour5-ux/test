import { LESSONS, getLesson, recommendLessons } from './lessons';
import { lessonKey } from './targets';
import { UI_LANGS } from '../i18n/strings';

describe('contenu des leçons', () => {
  it('identifiants uniques, niveaux valides, scénario non vide et dans la limite du serveur (300)', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LESSONS) {
      expect(['A1', 'A2', 'B1']).toContain(l.level);
      expect(l.scenario.trim().length).toBeGreaterThan(10);
      expect(l.scenario.length).toBeLessThanOrEqual(300);
      expect(l.id).toMatch(/^[a-z]+$/);
    }
  });
  it('titre dans les 5 langues d\'interface et 4 mots de vocabulaire traduits partout', () => {
    for (const l of LESSONS) {
      for (const lang of UI_LANGS) expect(l.title[lang].trim()).not.toBe('');
      expect(l.vocab).toHaveLength(4);
      for (const v of l.vocab) for (const k of ['en', 'fr', 'ar', 'es', 'zh'] as const) expect(v[k].trim()).not.toBe('');
    }
  });
  it('au moins 5 leçons par niveau (de quoi progresser)', () => {
    for (const lvl of ['A1', 'A2', 'B1']) expect(LESSONS.filter((l) => l.level === lvl && l.id !== 'free').length).toBeGreaterThanOrEqual(5);
  });
  it('getLesson: trouve par identifiant, sinon rien', () => {
    expect(getLesson('family')?.id).toBe('family');
    expect(getLesson('zzz')).toBeUndefined();
  });
});

describe('recommendLessons', () => {
  it('trois leçons du niveau de l\'apprenant, dans l\'ordre du catalogue, jamais « Parle librement »', () => {
    const r = recommendLessons('A1', []);
    expect(r).toHaveLength(3);
    expect(r.every((l) => l.level === 'A1')).toBe(true);
    expect(r.map((l) => l.id)).toEqual(LESSONS.filter((l) => l.level === 'A1').slice(0, 3).map((l) => l.id));
    expect(recommendLessons('B1', [], 99).some((l) => l.id === 'free')).toBe(false);
  });
  it('saute les leçons déjà faites DANS LA LANGUE APPRISE seulement', () => {
    const doneEn = [lessonKey('greetings', 'en')];
    expect(recommendLessons('A1', doneEn, 3, 'en').map((l) => l.id)).not.toContain('greetings');
    expect(recommendLessons('A1', doneEn, 3, 'fr').map((l) => l.id)).toContain('greetings');
  });
  it('complète avec le niveau suivant quand le niveau courant est terminé', () => {
    const a1 = LESSONS.filter((l) => l.level === 'A1').map((l) => lessonKey(l.id, 'en'));
    const r = recommendLessons('A1', a1, 3, 'en');
    expect(r).toHaveLength(3);
    expect(r.every((l) => l.level === 'A2')).toBe(true);
  });
  it('ne remonte jamais en dessous du niveau; respecte n; liste vide si tout est fait', () => {
    expect(recommendLessons('B1', [], 99).every((l) => l.level === 'B1')).toBe(true);
    expect(recommendLessons('A2', [], 2)).toHaveLength(2);
    expect(recommendLessons('A1', [], 0)).toEqual([]);
    const all = LESSONS.map((l) => lessonKey(l.id, 'en'));
    expect(recommendLessons('A1', all, 5, 'en')).toEqual([]);
  });
  it('mélange de niveaux: d\'abord le niveau courant, puis le suivant, dans cet ordre', () => {
    const a2 = LESSONS.filter((l) => l.level === 'A2').map((l) => l.id);
    const doneA2 = a2.slice(0, a2.length - 1).map((id) => lessonKey(id, 'en'));
    const r = recommendLessons('A2', doneA2, 3, 'en');
    expect(r[0].id).toBe(a2[a2.length - 1]);
    expect(r.slice(1).every((l) => l.level === 'B1')).toBe(true);
  });
});

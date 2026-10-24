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
  it('titre dans les 5 langues d\'interface et 6 mots de vocabulaire traduits partout', () => {
    for (const l of LESSONS) {
      for (const lang of UI_LANGS) expect(l.title[lang].trim()).not.toBe('');
      expect(l.vocab).toHaveLength(6);
      for (const v of l.vocab) for (const k of ['en', 'fr', 'ar', 'es', 'zh'] as const) expect(v[k].trim()).not.toBe('');
    }
  });
  it('aucun mot en double dans une même leçon, ni en anglais ni en français', () => {
    for (const l of LESSONS) {
      expect(new Set(l.vocab.map((v) => v.en.toLowerCase())).size).toBe(l.vocab.length);
      expect(new Set(l.vocab.map((v) => v.fr.toLowerCase())).size).toBe(l.vocab.length);
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

// Les cartes de révision déjà enregistrées pointent sur « leçon:index »: les 4 premiers mots de chaque leçon ne doivent
// JAMAIS changer de place ni de sens (on ajoute de nouveaux mots à la FIN).
describe('compatibilité des sauvegardes existantes', () => {
  const FIRST_FOUR: Record<string, string[]> = {
  greetings: ["Hello", "My name is", "Nice to meet you", "How are you?"],
    family: ["mother", "father", "brother", "sister"],
    numbers: ["How much is it?", "cheap", "expensive", "I will take it"],
    restaurant: ["menu", "I would like", "water", "the bill, please"],
    directions: ["turn left", "turn right", "straight ahead", "Where is...?"],
    daily: ["wake up", "breakfast", "go to work", "go to bed"],
    shopping: ["size", "try on", "discount", "receipt"],
    transport: ["ticket", "platform", "delay", "return ticket"],
    doctor: ["headache", "fever", "prescription", "It hurts here"],
    hotel: ["reservation", "key", "single room", "check out"],
    weather: ["sunny", "rainy", "cold", "It is going to rain"],
    school: ["homework", "exam", "subject", "I do not understand"],
    phone: ["Can I speak to", "hold on", "leave a message", "call back"],
    hobbies: ["I like", "play football", "read books", "free time"],
    job: ["experience", "strength", "salary", "apply for"],
    meeting: ["agenda", "deadline", "I agree", "in my opinion"],
    travel: ["boarding pass", "luggage", "customs", "gate"],
    opinions: ["I think that", "however", "because", "on the other hand"],
    problems: ["refund", "broken", "complaint", "replace"],
    bank: ["account", "withdraw money", "deposit", "bank card"],
    pharmacy: ["medicine", "allergic", "twice a day", "side effects"],
    neighbors: ["neighbour", "noisy", "borrow", "I am sorry"],
    time: ["What time is it?", "o'clock", "half past", "I am late"],
    clothes: ["shirt", "shoes", "jacket", "too small"],
    cinema: ["movie", "seat", "popcorn", "subtitles"],
    rent: ["landlord", "rent", "contract", "furnished"],
    news: ["headline", "according to", "in the future", "it depends"],
    emergency: ["Help!", "ambulance", "accident", "call the police"],
    goals: ["goal", "improve", "achieve", "in the long run"],
    free: ["by the way", "actually", "I wonder if", "let me explain"],
    "market": ["vegetables", "a kilo of", "fresh", "bag"],
    "sports": ["team", "match", "win", "lose"],
    "holidays": ["beach", "suitcase", "sightseeing", "I had a great time"],
    "technology": ["password", "download", "battery", "update"],
  };
  it('chaque leçon garde ses 4 premiers mots, dans le même ordre', () => {
    expect(Object.keys(FIRST_FOUR).sort()).toEqual(LESSONS.map((l) => l.id).sort());
    for (const l of LESSONS) expect([l.id, l.vocab.slice(0, 4).map((v) => v.en)]).toEqual([l.id, FIRST_FOUR[l.id]]);
  });
});

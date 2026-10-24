import { getLesson } from './lessons';
import { ANSWER_QUALITY, buildReviewSession, cardKey, cardsForLesson, parseCardKey, targetOfKey, vocabForKey } from './deck';
import { newCard, review } from './srs';

describe('deck', () => {
  it('crée une carte par mot, sans doublon', () => {
    const n = getLesson('restaurant')!.vocab.length;
    const once = cardsForLesson('restaurant', [], 0);
    expect(once).toHaveLength(n);
    expect(cardsForLesson('restaurant', once, 0)).toHaveLength(n);
  });
  it('ignore une leçon inconnue', () => {
    expect(cardsForLesson('nope', [], 0)).toEqual([]);
  });
  it('retrouve le mot d\'une carte', () => {
    expect(vocabForKey(cardKey('restaurant', 0))?.en).toBe('menu');
    expect(vocabForKey('nope:0')).toBeUndefined();
  });
  it('ne propose que les cartes dues, limitées à max', () => {
    const cards = cardsForLesson('family', [], 0).concat(cardsForLesson('numbers', [], 0));
    expect(buildReviewSession(cards, 0, 5)).toHaveLength(5);
    const later = cards.map((c) => review(c, 5, 0));
    expect(buildReviewSession(later, 0)).toHaveLength(0);
    expect(buildReviewSession(later, 10 * 86_400_000).length).toBeGreaterThan(0);
  });
  it('un oubli donne une qualité qui remet la carte à 1 jour', () => {
    expect(review(newCard('a', 0), ANSWER_QUALITY.again, 0).intervalDays).toBe(1);
  });
});

describe('révision par langue apprise', () => {
  it('l\'anglais garde l\'ancien format de clé (compatible avec les sauvegardes existantes), le français est préfixé', () => {
    expect(cardKey('restaurant', 0)).toBe('restaurant:0');
    expect(cardKey('restaurant', 0, 'en')).toBe('restaurant:0');
    expect(cardKey('restaurant', 0, 'fr')).toBe('fr:restaurant:0');
  });
  it('parseCardKey lit les deux formats et refuse le reste', () => {
    expect(parseCardKey('restaurant:2')).toEqual({ target: 'en', lessonId: 'restaurant', index: 2 });
    expect(parseCardKey('fr:restaurant:2')).toEqual({ target: 'fr', lessonId: 'restaurant', index: 2 });
    for (const bad of ['', 'x', 'a:b', 'fr:a:b', 'de:restaurant:1', 'a:b:c:d', ':1', 'restaurant:']) expect(parseCardKey(bad)).toBeNull();
  });
  it('cardsForLesson crée des cartes distinctes par langue pour la même leçon', () => {
    let cards = cardsForLesson('family', [], 0, 'en');
    cards = cardsForLesson('family', cards, 0, 'fr');
    const n = getLesson('family')!.vocab.length;
    expect(cards).toHaveLength(2 * n);
    expect(cards.filter((c) => targetOfKey(c.key) === 'fr')).toHaveLength(n);
    expect(cardsForLesson('family', cards, 0, 'fr')).toHaveLength(2 * n); // pas de doublon
  });
  it('une séance de révision ne mélange jamais les langues', () => {
    const cards = cardsForLesson('family', cardsForLesson('family', [], 0, 'en'), 0, 'fr');
    const en = buildReviewSession(cards, 0, 99, 'en');
    const fr = buildReviewSession(cards, 0, 99, 'fr');
    const n = getLesson('family')!.vocab.length;
    expect(en).toHaveLength(n);
    expect(fr).toHaveLength(n);
    expect(en.every((c) => targetOfKey(c.key) === 'en')).toBe(true);
    expect(fr.every((c) => targetOfKey(c.key) === 'fr')).toBe(true);
    expect(buildReviewSession(cards, 0, 99)).toHaveLength(n); // défaut: anglais
  });
  it('vocabForKey retrouve le mot pour les deux formats de clé', () => {
    expect(vocabForKey('restaurant:0')?.en).toBe('menu');
    expect(vocabForKey('fr:restaurant:0')?.en).toBe('menu');
    expect(vocabForKey('fr:nope:0')).toBeUndefined();
  });
});

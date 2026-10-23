import { ANSWER_QUALITY, buildReviewSession, cardKey, cardsForLesson, vocabForKey } from './deck';
import { newCard, review } from './srs';

describe('deck', () => {
  it('crée une carte par mot, sans doublon', () => {
    const once = cardsForLesson('restaurant', [], 0);
    expect(once).toHaveLength(4);
    expect(cardsForLesson('restaurant', once, 0)).toHaveLength(4);
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

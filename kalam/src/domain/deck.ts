import { LESSONS } from './lessons';
import { Card, dueCards, newCard } from './srs';

// Une carte = un mot d'une leçon terminée. Clé: "<leçon>:<index du mot>".
export const cardKey = (lessonId: string, index: number) => `${lessonId}:${index}`;

export function cardsForLesson(lessonId: string, existing: Card[], now: number): Card[] {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return existing;
  const known = new Set(existing.map((c) => c.key));
  const added = lesson.vocab.map((_, i) => cardKey(lessonId, i)).filter((k) => !known.has(k)).map((k) => newCard(k, now));
  return [...existing, ...added];
}

export function vocabForKey(key: string) {
  const [lessonId, idx] = key.split(':');
  return LESSONS.find((l) => l.id === lessonId)?.vocab[Number(idx)];
}

// Séance de révision: les cartes dues, les plus en retard d'abord, limitées pour rester courtes.
export function buildReviewSession(cards: Card[], now: number, max = 10): Card[] {
  return dueCards(cards, now)
    .filter((c) => vocabForKey(c.key))
    .sort((a, b) => a.due - b.due)
    .slice(0, max);
}

// Les 4 boutons de réponse se traduisent en qualité SM-2.
export type Answer = 'again' | 'hard' | 'good' | 'easy';
export const ANSWER_QUALITY: Record<Answer, number> = { again: 1, hard: 3, good: 4, easy: 5 };

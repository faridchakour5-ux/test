import { LESSONS } from './lessons';
import { DEFAULT_TARGET, TargetLang, isTargetLang } from './targets';
import { Card, dueCards, newCard } from './srs';

// Une carte = un mot d'une leçon terminée. Clé: "<leçon>:<index>" pour l'anglais (format historique,
// compatible avec les sauvegardes existantes), "<langue>:<leçon>:<index>" pour les autres langues apprises.
export const cardKey = (lessonId: string, index: number, target: TargetLang = DEFAULT_TARGET) =>
  target === DEFAULT_TARGET ? `${lessonId}:${index}` : `${target}:${lessonId}:${index}`;

export function parseCardKey(key: string): { target: TargetLang; lessonId: string; index: number } | null {
  const parts = key.split(':');
  let target: TargetLang = DEFAULT_TARGET;
  let lessonId: string;
  let idx: string;
  if (parts.length === 2) [lessonId, idx] = parts;
  else if (parts.length === 3 && isTargetLang(parts[0])) [target, lessonId, idx] = [parts[0], parts[1], parts[2]];
  else return null; // préfixe de langue inconnu ou forme inattendue: on refuse, on ne devine pas
  if (!lessonId || !/^\d+$/.test(idx)) return null;
  return { target, lessonId, index: Number(idx) };
}

export const targetOfKey = (key: string): TargetLang => parseCardKey(key)?.target ?? DEFAULT_TARGET;

export function cardsForLesson(lessonId: string, existing: Card[], now: number, target: TargetLang = DEFAULT_TARGET): Card[] {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return existing;
  const known = new Set(existing.map((c) => c.key));
  const added = lesson.vocab.map((_, i) => cardKey(lessonId, i, target)).filter((k) => !known.has(k)).map((k) => newCard(k, now));
  return [...existing, ...added];
}

export function vocabForKey(key: string) {
  const p = parseCardKey(key);
  return p ? LESSONS.find((l) => l.id === p.lessonId)?.vocab[p.index] : undefined;
}

// Séance de révision: les cartes dues DE LA LANGUE APPRISE, les plus en retard d'abord, limitées pour rester courtes.
export function buildReviewSession(cards: Card[], now: number, max = 10, target: TargetLang = DEFAULT_TARGET): Card[] {
  return dueCards(cards, now)
    .filter((c) => targetOfKey(c.key) === target && vocabForKey(c.key))
    .sort((a, b) => a.due - b.due)
    .slice(0, max);
}

// Les 4 boutons de réponse se traduisent en qualité SM-2.
export type Answer = 'again' | 'hard' | 'good' | 'easy';
export const ANSWER_QUALITY: Record<Answer, number> = { again: 1, hard: 3, good: 4, easy: 5 };

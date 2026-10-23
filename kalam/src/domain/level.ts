import { Level } from './lessons';

// Test de niveau: chaque question vaut un niveau CEFR. Un parcours adaptatif simple.
export interface PlacementQuestion {
  prompt: string;
  options: string[];
  answer: number;
  level: Level;
}

export const PLACEMENT: PlacementQuestion[] = [
  { prompt: 'She ___ a teacher.', options: ['is', 'are', 'am'], answer: 0, level: 'A1' },
  { prompt: 'I ___ coffee every morning.', options: ['drinks', 'drink', 'drinking'], answer: 1, level: 'A1' },
  { prompt: 'This is ___ apple.', options: ['a', 'an', 'the'], answer: 1, level: 'A1' },
  { prompt: 'They ___ from Spain.', options: ['is', 'am', 'are'], answer: 2, level: 'A1' },
  { prompt: 'Yesterday we ___ to the market.', options: ['go', 'goed', 'went'], answer: 2, level: 'A2' },
  { prompt: 'There ___ any milk left.', options: ['isn\'t', 'aren\'t', 'don\'t'], answer: 0, level: 'A2' },
  { prompt: 'I am ___ than my brother.', options: ['tall', 'taller', 'more tall'], answer: 1, level: 'A2' },
  { prompt: 'She has ___ finished her homework.', options: ['already', 'ago', 'yesterday'], answer: 0, level: 'A2' },
  { prompt: 'If it rains, I ___ at home.', options: ['stay', 'will stay', 'stayed'], answer: 1, level: 'B1' },
  { prompt: 'I have lived here ___ 2019.', options: ['for', 'since', 'during'], answer: 1, level: 'B1' },
  { prompt: 'He asked me where ___.', options: ['I lived', 'did I live', 'I do live'], answer: 0, level: 'B1' },
  { prompt: 'The report ___ by the team yesterday.', options: ['wrote', 'was written', 'has write'], answer: 1, level: 'B1' },
];

// Le niveau est le plus haut dont au moins la moitié des questions sont justes, sans casser la chaîne.
export function scorePlacement(answers: number[]): Level {
  const order: Level[] = ['A1', 'A2', 'B1'];
  let result: Level = 'A1';
  for (const lvl of order) {
    const qs = PLACEMENT.map((q, i) => ({ q, i })).filter(({ q }) => q.level === lvl);
    const good = qs.filter(({ q, i }) => answers[i] === q.answer).length;
    if (good * 2 >= qs.length && good > 0) result = lvl;
    else break;
  }
  return result;
}

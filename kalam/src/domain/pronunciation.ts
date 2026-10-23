// Évaluation de prononciation mot par mot, à partir de ce que la reconnaissance vocale a compris.
// Limite assumée: on compare du TEXTE reconnu, pas les sons (phonèmes). Un mot mal compris
// par le moteur est un signal fiable de prononciation difficile à comprendre, pas une mesure acoustique.
export type WordStatus = 'correct' | 'close' | 'wrong' | 'missing';

export interface WordResult {
  word: string;
  status: WordStatus;
  heard?: string;
}

export interface PronunciationResult {
  words: WordResult[];
  score: number; // 0-100
}

export const normalize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

export const similarity = (a: string, b: string): number => {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - editDistance(a, b) / max;
};

const CORRECT_AT = 0.85;
const CLOSE_AT = 0.6;

export function evaluatePronunciation(expected: string, heard: string): PronunciationResult {
  const exp = normalize(expected);
  const hyp = normalize(heard);
  if (exp.length === 0) return { words: [], score: 0 };

  // Alignement des mots attendus avec les mots entendus (programmation dynamique).
  const GAP = 1;
  const n = exp.length;
  const m = hyp.length;
  const cost = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) cost[i][0] = i * GAP;
  for (let j = 1; j <= m; j++) cost[0][j] = j * GAP;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cost[i][j] = Math.min(
        cost[i - 1][j] + GAP,
        cost[i][j - 1] + GAP,
        cost[i - 1][j - 1] + (1 - similarity(exp[i - 1], hyp[j - 1])),
      );
    }
  }

  const matched: (string | undefined)[] = new Array(n).fill(undefined);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const diag = cost[i - 1][j - 1] + (1 - similarity(exp[i - 1], hyp[j - 1]));
    if (Math.abs(cost[i][j] - diag) < 1e-9) { matched[i - 1] = hyp[j - 1]; i--; j--; }
    else if (Math.abs(cost[i][j] - (cost[i - 1][j] + GAP)) < 1e-9) i--;
    else j--;
  }

  const words: WordResult[] = exp.map((word, k) => {
    const h = matched[k];
    if (h === undefined) return { word, status: 'missing' };
    const s = similarity(word, h);
    if (s >= CORRECT_AT) return { word, status: 'correct', heard: h };
    if (s >= CLOSE_AT) return { word, status: 'close', heard: h };
    return { word, status: 'wrong', heard: h };
  });

  const points = words.reduce((sum, w) => sum + (w.status === 'correct' ? 1 : w.status === 'close' ? 0.5 : 0), 0);
  return { words, score: Math.round((points / words.length) * 100) };
}

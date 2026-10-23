import { safeRegExp } from '../util/safeRegex';

// Prépare le texte du professeur pour la synthèse vocale.

export const EMOJI = safeRegExp('\\p{Extended_Pictographic}', 'gu', /[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}]/gu);

// Retire ce qu'une voix lirait mal: markdown, émojis, symboles.
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_`#>~]+/g, '')
    .replace(EMOJI, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Découpe aux fins de phrases pour respecter la longueur maximale du moteur vocal.
export function splitForSpeech(text: string, max: number): string[] {
  const clean = cleanForSpeech(text);
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > max) {
      if (current) { chunks.push(current); current = ''; }
      for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
      continue;
    }
    if ((current + ' ' + s).trim().length > max) { chunks.push(current); current = s; }
    else current = (current + ' ' + s).trim();
  }
  if (current) chunks.push(current);
  return chunks;
}

// Durée maximale plausible d'une lecture: sert de garde-fou si le moteur ne signale jamais la fin.
export function estimateSpeechMs(text: string, rate: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round((words * 600) / Math.max(rate, 0.5)) + 4000;
}

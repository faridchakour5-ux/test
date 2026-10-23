// Expressions régulières Unicode (\p{L}…) construites avec un repli.
// Si le moteur JavaScript d'un appareil ne les comprend pas, une expression littérale lèverait une erreur
// dès le chargement du module, donc au lancement de l'app. Ici, on retombe sur une version plus simple.

export function safeRegExp(source: string, flags: string, fallback: RegExp): RegExp {
  try {
    return new RegExp(source, flags);
  } catch {
    return fallback;
  }
}

// Normalisation Unicode (é = e + accent): sans effet si le moteur ne la supporte pas.
export function nfc(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    return text;
  }
}

// Replis: lettres latines (accents inclus), cyrilliques, arabes et chinois courants.
// Inclut les marques combinantes (accents décomposés, voyelles arabes): sans elles, un mot serait coupé en deux.
export const FALLBACK_LETTERS = 'A-Za-z0-9\\u0300-\\u036F\\u00C0-\\u024F\\u0400-\\u04FF\\u0600-\\u06FF\\u4E00-\\u9FFF';

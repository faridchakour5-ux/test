// Découpe un texte qui arrive par morceaux en phrases complètes, prêtes à être lues à voix haute.
// On ne coupe pas sur les abréviations (Mr., Dr.…), les nombres (3.5) ni les phrases trop courtes.

const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'vs', 'etc', 'eg', 'ie', 'no']);
const MIN_LENGTH = 12; // évite de lire « Hi! » puis « How are you? » comme deux blocs hachés

function endsSentence(text: string, i: number): boolean {
  const ch = text[i];
  if (ch !== '.' && ch !== '!' && ch !== '?') return false;
  const next = text[i + 1];
  if (next === undefined) return false; // on ne sait pas encore: la suite peut arriver
  if (!/\s/.test(next)) return false; // « 3.5 », « e.g. » collé, URL…
  if (ch === '.') {
    const before = text.slice(0, i).match(/([A-Za-z]+)$/)?.[1]?.toLowerCase();
    if (before && ABBREVIATIONS.has(before)) return false;
    if (/\d$/.test(text.slice(0, i)) && /^\s*\d/.test(text.slice(i + 1))) return false;
  }
  return true;
}

export function createSentenceSplitter() {
  let buffer = '';

  // Ajoute du texte et renvoie les phrases désormais complètes.
  function push(chunk: string): string[] {
    buffer += chunk;
    const out: string[] = [];
    let start = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (!endsSentence(buffer, i)) continue;
      // on inclut la ponctuation répétée (« ?! », « ... »)
      let end = i + 1;
      while (end < buffer.length && /[.!?)"'”]/.test(buffer[end])) end++;
      if (end >= buffer.length) break; // fin de tampon: peut-être pas terminé
      const sentence = buffer.slice(start, end).trim();
      if (sentence.length >= MIN_LENGTH) {
        out.push(sentence);
        start = end;
      }
      i = end - 1;
    }
    buffer = buffer.slice(start);
    return out;
  }

  // Fin du flux: renvoie ce qui reste (même court).
  function flush(): string[] {
    const rest = buffer.trim();
    buffer = '';
    return rest ? [rest] : [];
  }

  return { push, flush };
}

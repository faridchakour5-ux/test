// Découpe un texte qui arrive par morceaux en phrases complètes, prêtes à être lues à voix haute.
// On ne coupe pas sur les abréviations (Mr., Dr.…), les nombres (3.5) ni les phrases trop courtes.

// (« no » n'y est pas: « No. » est une vraie réponse en fin de phrase dans un dialogue.)
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'vs', 'etc', 'eg', 'ie']);
const CLOSERS = `)"'”’»`; // guillemets et parenthèses fermants qui restent collés à la ponctuation
// Avance après les fermants collés à la ponctuation. En français, une espace précède le guillemet fermant (« Bonjour ! »).
function skipClosers(text: string, from: number): number {
  let j = from;
  while (j < text.length) {
    if (CLOSERS.includes(text[j])) j++;
    else if (/\s/.test(text[j]) && text[j + 1] === '»') j++;
    else break;
  }
  return j;
}
const MIN_LENGTH = 12; // évite de lire « Hi! » puis « How are you? » comme deux blocs hachés

function endsSentence(text: string, i: number): boolean {
  const ch = text[i];
  if (ch !== '.' && ch !== '!' && ch !== '?') return false;
  // Guillemets et parenthèses fermants collés à la ponctuation (« Hello.\" Then… »): on regarde après eux.
  const j = skipClosers(text, i + 1);
  const next = text[j];
  if (next === undefined) return false; // on ne sait pas encore: la suite peut arriver
  if (!/\s/.test(next)) return false; // « 3.5 », « e.g. » collé, URL…
  if (ch === '.') {
    const before = text.slice(0, i).match(/([A-Za-z]+)$/)?.[1]?.toLowerCase();
    if (before && ABBREVIATIONS.has(before)) return false;
    if (/\b(?:e\.g|i\.e)$/i.test(text.slice(0, i))) return false; // « e.g. » et « i.e. »: le mot juste avant le dernier point n'est qu'une lettre
    if (/\d$/.test(text.slice(0, i)) && /^\s*\d/.test(text.slice(j))) return false;
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
      for (;;) { // ponctuation répétée (« ?! », « ... ») et fermants
        const after = skipClosers(buffer, end);
        if (after > end) end = after;
        else if (end < buffer.length && /[.!?]/.test(buffer[end])) end++;
        else break;
      }
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

// Analyse d'un flux « Server-Sent Events » reçu par morceaux arbitraires.
// Un morceau réseau peut couper une ligne ou un évènement en deux: on garde le reste en mémoire.

export type SseEvent = { delta?: string; done?: boolean; error?: string };

export function createSseParser(onEvent: (e: SseEvent) => void) {
  let buffer = '';

  function feed(chunk: string): void {
    // Normalisé sur tout le tampon: un « \r\n » coupé entre deux morceaux réseau est reconnu au morceau suivant.
    buffer = (buffer + chunk).replace(/\r\n/g, '\n');
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = raw
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).replace(/^ /, ''))
        .join('\n');
      if (!data) continue; // commentaire ou évènement vide
      try {
        const parsed = JSON.parse(data) as SseEvent;
        if (parsed && typeof parsed === 'object') onEvent(parsed);
      } catch {
        /* évènement illisible: ignoré, le flux continue */
      }
    }
  }

  return { feed };
}

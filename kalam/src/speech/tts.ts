import * as ExpoSpeech from 'expo-speech';
import { estimateSpeechMs, splitForSpeech } from './speechText';

export type SpeakOutcome = 'done' | 'stopped' | 'error';

export interface SpeakOptions {
  lang?: string; // ex: "en-US"
  rate?: number; // 1 = vitesse normale
}

// Sous-ensemble du module expo-speech utilisé ici (injectable pour les tests).
export interface SpeechEngine {
  speak: (text: string, options?: {
    language?: string; voice?: string; rate?: number;
    onDone?: () => void; onStopped?: () => void; onError?: (e: unknown) => void;
  }) => void;
  stop: () => Promise<void> | void;
  getAvailableVoicesAsync: () => Promise<{ identifier: string; language: string; quality?: string }[]>;
  maxSpeechInputLength: number;
}

// Une seule lecture à la fois: lancer une nouvelle lecture interrompt la précédente.
export function createTts(engine: SpeechEngine = ExpoSpeech as unknown as SpeechEngine) {
  let generation = 0;
  let activeTimer: ReturnType<typeof setTimeout> | null = null;
  let activeSettle: ((o: SpeakOutcome) => void) | null = null;

  async function pickVoice(lang: string): Promise<string | undefined> {
    try {
      const voices = await engine.getAvailableVoicesAsync();
      const prefix = lang.slice(0, 2).toLowerCase();
      const candidates = voices.filter((v) => v.language?.toLowerCase().startsWith(prefix));
      const exact = candidates.filter((v) => v.language?.replace('_', '-').toLowerCase() === lang.toLowerCase());
      const pool = exact.length ? exact : candidates;
      const best = pool.find((v) => v.quality === 'Enhanced') ?? pool[0];
      return best?.identifier;
    } catch {
      return undefined;
    }
  }

  // Y a-t-il au moins une voix pour cette langue? (Sinon on prévient l'utilisateur d'en installer une.)
  async function hasVoice(lang: string): Promise<boolean> {
    try {
      const prefix = lang.slice(0, 2).toLowerCase();
      const voices = await engine.getAvailableVoicesAsync();
      return voices.some((v) => v.language?.toLowerCase().startsWith(prefix));
    } catch {
      return true; // on ne peut pas savoir: on tente quand même
    }
  }

  function speakChunk(text: string, lang: string, rate: number, voice: string | undefined): Promise<SpeakOutcome> {
    return new Promise<SpeakOutcome>((resolve) => {
      let settled = false;
      const settle = (o: SpeakOutcome) => {
        if (settled) return;
        settled = true;
        if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
        if (activeSettle === settle) activeSettle = null;
        resolve(o);
      };
      activeSettle = settle;
      // Garde-fou: certains appareils n'appellent jamais onDone.
      activeTimer = setTimeout(() => settle('done'), estimateSpeechMs(text, rate));
      try {
        engine.speak(text, {
          language: lang, voice, rate,
          onDone: () => settle('done'),
          onStopped: () => settle('stopped'),
          onError: () => settle('error'),
        });
      } catch {
        settle('error');
      }
    });
  }

  async function speak(text: string, { lang = 'en-US', rate = 1 }: SpeakOptions = {}): Promise<SpeakOutcome> {
    const myGen = ++generation;
    activeSettle?.('stopped'); // libère la lecture précédente même si le moteur ne le signale pas
    try { await engine.stop(); } catch { /* rien à arrêter */ }
    const chunks = splitForSpeech(text, Math.min(engine.maxSpeechInputLength || 3000, 3000));
    if (chunks.length === 0) return 'done';
    const voice = await pickVoice(lang);
    for (const chunk of chunks) {
      if (myGen !== generation) return 'stopped';
      const outcome = await speakChunk(chunk, lang, rate, voice);
      if (outcome !== 'done') return myGen !== generation ? 'stopped' : outcome;
    }
    return myGen !== generation ? 'stopped' : 'done';
  }

  // Lecture au fil de l'eau: on pousse des phrases au fur et à mesure qu'elles arrivent; elles sont lues
  // l'une après l'autre. `end()` se résout quand tout est lu (ou 'stopped' si on a interrompu).
  function speakStream({ lang = 'en-US', rate = 1 }: SpeakOptions = {}) {
    const myGen = ++generation;
    activeSettle?.('stopped');
    const maxLen = Math.min(engine.maxSpeechInputLength || 3000, 3000);
    const queue: string[] = [];
    let closed = false;
    let running = false;
    let result: SpeakOutcome = 'done';
    let finished = false;
    let finishFn: (o: SpeakOutcome) => void = () => {};
    const done = new Promise<SpeakOutcome>((r) => { finishFn = r; });
    const finish = (o: SpeakOutcome) => { if (!finished) { finished = true; finishFn(o); } };
    const stopped = () => myGen !== generation;
    const ready = (async () => { try { await engine.stop(); } catch { /* rien à arrêter */ } return pickVoice(lang); })();

    async function work() {
      if (running) return;
      running = true;
      const voice = await ready;
      while (queue.length > 0) {
        if (stopped()) break;
        const text = queue.shift() as string;
        const outcome = await speakChunk(text, lang, rate, voice);
        if (stopped()) break;
        if (outcome === 'error') result = 'error'; // on continue avec les phrases suivantes
      }
      running = false;
      if (stopped()) { queue.length = 0; finish('stopped'); }
      else if (closed && queue.length === 0) finish(result);
    }

    return {
      push(text: string) {
        if (closed || stopped()) return;
        const chunks = splitForSpeech(text, maxLen);
        if (chunks.length === 0) return;
        queue.push(...chunks);
        void work();
      },
      end(): Promise<SpeakOutcome> {
        closed = true;
        if (!running && queue.length === 0) finish(stopped() ? 'stopped' : result);
        return done;
      },
    };
  }

  async function stop(): Promise<void> {
    generation++;
    activeSettle?.('stopped');
    if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
    try { await engine.stop(); } catch { /* ignoré */ }
  }

  return { speak, speakStream, stop, hasVoice };
}

// Instance partagée par toute l'app: garantit qu'une seule voix parle à la fois.
export const tts = createTts();

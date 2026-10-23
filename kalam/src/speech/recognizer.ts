// Reconnaissance vocale fiable: gestion des permissions, du réseau, des silences et de l'annulation.
// Le module natif n'existe pas dans Expo Go: on le charge à la demande et on répond « indisponible ».

export type ListenFailure =
  | 'unavailable' // pas de module natif ou service absent
  | 'permission' // refus (on peut redemander)
  | 'permission-blocked' // refus définitif: il faut ouvrir les réglages
  | 'no-speech' // rien entendu
  | 'network' // service en ligne injoignable, et pas de repli hors ligne
  | 'busy' // le moteur est occupé
  | 'language' // langue non supportée sur cet appareil
  | 'cancelled' // annulé volontairement
  | 'error';

export type ListenResult = { ok: true; transcript: string } | { ok: false; reason: ListenFailure };

export interface ListenOptions {
  lang?: string;
  patienceMs?: number; // silence toléré avant la fin automatique
  maxMs?: number; // durée maximale d'une prise de parole
  onPartial?: (text: string) => void; // texte provisoire pendant que la personne parle
}

type Sub = { remove: () => void };
type Perm = { granted: boolean; canAskAgain?: boolean };

// Sous-ensemble du module natif utilisé ici (injectable pour les tests).
export interface RecModule {
  isRecognitionAvailable(): boolean;
  supportsOnDeviceRecognition?(): boolean;
  getPermissionsAsync(): Promise<Perm>;
  requestPermissionsAsync(): Promise<Perm>;
  start(options: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
  addListener(name: string, cb: (e: any) => void): Sub;
}

export function createRecognizer(mod: RecModule | null) {
  let cancelActive: (() => void) | null = null;

  const isAvailable = (): boolean => {
    try { return !!mod && mod.isRecognitionAvailable(); } catch { return false; }
  };

  function attempt(onDevice: boolean, o: Required<Omit<ListenOptions, 'onPartial'>> & Pick<ListenOptions, 'onPartial'>): Promise<ListenResult> {
    return new Promise<ListenResult>((resolve) => {
      const m = mod as RecModule;
      let best = '';
      let settled = false;
      let cancelled = false;
      const subs: Sub[] = [];
      let hardTimer: ReturnType<typeof setTimeout> | null = null;
      let graceTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = (r: ListenResult) => {
        if (settled) return;
        settled = true;
        if (hardTimer) clearTimeout(hardTimer);
        if (graceTimer) clearTimeout(graceTimer);
        subs.forEach((s) => s.remove());
        if (cancelActive === cancel) cancelActive = null;
        resolve(r);
      };
      const withBest = (fallback: ListenFailure): ListenResult =>
        best.trim() ? { ok: true, transcript: best.trim() } : { ok: false, reason: fallback };

      const cancel = () => {
        cancelled = true;
        try { m.abort(); } catch { /* déjà arrêté */ }
        finish({ ok: false, reason: 'cancelled' });
      };
      cancelActive = cancel;

      subs.push(m.addListener('result', (e) => {
        const t = e?.results?.[0]?.transcript;
        if (typeof t === 'string' && t) { best = t; o.onPartial?.(t); }
      }));
      subs.push(m.addListener('error', (e) => {
        const code: string = e?.error ?? 'error';
        if (cancelled || code === 'aborted') return finish({ ok: false, reason: 'cancelled' });
        if (code === 'not-allowed' || code === 'service-not-allowed') return finish({ ok: false, reason: 'permission' });
        if (code === 'language-not-supported') return finish({ ok: false, reason: 'language' });
        if (code === 'busy') return finish(withBest('busy'));
        if (code === 'network') return finish(withBest('network'));
        if (code === 'no-speech' || code === 'speech-timeout') return finish(withBest('no-speech'));
        finish(withBest('error'));
      }));
      subs.push(m.addListener('end', () => finish(withBest('no-speech'))));

      // Durée maximale: on demande un arrêt propre (pour récupérer le texte), puis on force.
      hardTimer = setTimeout(() => {
        try { m.stop(); } catch { /* ignoré */ }
        graceTimer = setTimeout(() => { try { m.abort(); } catch { /* ignoré */ } finish(withBest('no-speech')); }, 2000);
      }, o.maxMs);

      try {
        m.start({
          lang: o.lang,
          interimResults: true,
          continuous: false,
          maxAlternatives: 1,
          requiresOnDeviceRecognition: onDevice,
          addsPunctuation: false,
          // Android: on laisse du temps pour réfléchir, sinon l'écoute coupe en pleine phrase.
          androidIntentOptions: {
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: o.patienceMs,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: o.patienceMs,
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
          },
        });
      } catch {
        finish({ ok: false, reason: 'error' });
      }
    });
  }

  async function listenOnce(options: ListenOptions = {}): Promise<ListenResult> {
    if (!mod || !isAvailable()) return { ok: false, reason: 'unavailable' };
    cancelActive?.(); // une seule écoute à la fois

    let perm: Perm;
    try {
      perm = await mod.getPermissionsAsync();
      if (!perm.granted) {
        if (perm.canAskAgain === false) return { ok: false, reason: 'permission-blocked' };
        perm = await mod.requestPermissionsAsync();
      }
    } catch {
      return { ok: false, reason: 'error' };
    }
    if (!perm.granted) return { ok: false, reason: perm.canAskAgain === false ? 'permission-blocked' : 'permission' };

    const o = { lang: options.lang ?? 'en-US', patienceMs: options.patienceMs ?? 2200, maxMs: options.maxMs ?? 20_000, onPartial: options.onPartial };
    const first = await attempt(false, o);
    // Repli hors ligne si le service en ligne est injoignable.
    if (!first.ok && first.reason === 'network' && mod.supportsOnDeviceRecognition?.()) {
      return attempt(true, o);
    }
    return first;
  }

  return { isAvailable, listenOnce, cancel: () => cancelActive?.() };
}

// ---------- Instance réelle (chargée à la demande) ----------
let real: ReturnType<typeof createRecognizer> | undefined;

function getReal() {
  if (real) return real;
  let mod: RecModule | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = (require('expo-speech-recognition') as { ExpoSpeechRecognitionModule: unknown }).ExpoSpeechRecognitionModule as RecModule;
  } catch {
    mod = null;
  }
  real = createRecognizer(mod);
  return real;
}

export const isSpeechInputAvailable = () => getReal().isAvailable();
export const listenOnce = (o?: ListenOptions) => getReal().listenOnce(o);
export const cancelListening = () => getReal().cancel();

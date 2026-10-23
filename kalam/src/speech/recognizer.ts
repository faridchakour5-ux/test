// Reconnaissance vocale. Le module natif n'existe pas dans Expo Go: on le charge à la demande
// et on renvoie « indisponible » plutôt que de faire planter l'app.
type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cached: SpeechModule | null | undefined;

function getModule(): SpeechModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function isSpeechInputAvailable(): boolean {
  try {
    return getModule()?.isRecognitionAvailable() ?? false;
  } catch {
    return false;
  }
}

export type ListenResult =
  | { ok: true; transcript: string }
  | { ok: false; reason: 'unavailable' | 'permission' | 'no-speech' | 'error' };

export function cancelListening(): void {
  try { getModule()?.abort(); } catch { /* rien à annuler */ }
}

// Écoute une seule phrase et renvoie le texte compris.
export async function listenOnce(lang = 'en-US', timeoutMs = 12_000): Promise<ListenResult> {
  const mod = getModule();
  if (!mod || !isSpeechInputAvailable()) return { ok: false, reason: 'unavailable' };

  const perm = await mod.requestPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };

  return new Promise<ListenResult>((resolve) => {
    let best = '';
    let settled = false;
    const subs: { remove: () => void }[] = [];
    const finish = (r: ListenResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subs.forEach((s) => s.remove());
      resolve(r);
    };
    const timer = setTimeout(() => { mod.abort(); finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'no-speech' }); }, timeoutMs);

    subs.push(mod.addListener('result', (e) => { best = e.results[0]?.transcript ?? best; }));
    subs.push(mod.addListener('error', (e) => {
      if (best) finish({ ok: true, transcript: best });
      else finish({ ok: false, reason: e.error === 'no-speech' ? 'no-speech' : e.error === 'not-allowed' ? 'permission' : 'error' });
    }));
    subs.push(mod.addListener('end', () => finish(best ? { ok: true, transcript: best } : { ok: false, reason: 'no-speech' })));

    mod.start({ lang, interimResults: true, continuous: false, maxAlternatives: 1 });
  });
}

import { AgeProfileId } from '../theme/profiles';
import { Level } from '../domain/lessons';
import { UiLang } from '../i18n/strings';
import { TargetLang } from '../domain/targets';
import { SseEvent, createSseParser } from './sse';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// URL du backend (jamais de clé API ici). Définie via EXPO_PUBLIC_API_URL.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export interface TeacherRequest {
  ageProfile: AgeProfileId;
  level: Level;
  scenario: string;
  uiLang: UiLang;
  targetLang?: TargetLang; // langue enseignée (anglais par défaut côté serveur)
  messages: ChatMessage[];
  start?: boolean; // le professeur ouvre la conversation (messages vide)
}

export type TeacherErrorKind = 'offline' | 'timeout' | 'rate' | 'server' | 'invalid' | 'config' | 'cancelled';

export class TeacherError extends Error {
  constructor(public kind: TeacherErrorKind, public retryable: boolean, message?: string) {
    super(message ?? kind);
    this.name = 'TeacherError';
  }
}

export interface AskOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number; // délai par tentative
  retries?: number; // nombre de nouvelles tentatives (en plus de la première)
  sleep?: (ms: number) => Promise<void>;
}

// En production, le serveur DOIT être en HTTPS (le trafic Android en clair est de toute façon bloqué).
// Un build oublié sans EXPO_PUBLIC_API_URL tomberait sur localhost: on le signale clairement au lieu d'un faux « hors ligne ».
export function resolveApiUrl(url: string = API_URL, dev: boolean = __DEV__): string {
  if (dev) return url;
  if (!/^https:\/\/[^/\s]+/i.test(url)) throw new TeacherError('config', false, 'API URL must be https in production');
  return url.replace(/\/+$/, '');
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function once(req: TeacherRequest, fetchImpl: typeof fetch, timeoutMs: number): Promise<string> {
  const base = resolveApiUrl(); // avant le try: une mauvaise configuration ne doit pas passer pour une panne réseau
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(`${base}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = (e as { name?: string })?.name === 'AbortError';
    throw new TeacherError(aborted ? 'timeout' : 'offline', true);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new TeacherError('rate', true);
  if (res.status >= 500) throw new TeacherError('server', true, `teacher error ${res.status}`);
  if (!res.ok) throw new TeacherError('invalid', false, `teacher error ${res.status}`);
  let data: { reply?: string };
  try { data = (await res.json()) as { reply?: string }; } catch { throw new TeacherError('server', true, 'bad json'); }
  if (!data.reply) throw new TeacherError('server', true, 'empty reply');
  return data.reply;
}

// Demande une réponse au professeur. Réessaie (réseau, délai, 429, 5xx) avec une attente croissante;
// n'insiste jamais sur une requête invalide (4xx).
export async function askTeacher(req: TeacherRequest, opts: AskOptions = {}): Promise<string> {
  const { fetchImpl = fetch, timeoutMs = 20_000, retries = 2, sleep = defaultSleep } = opts;
  let last: TeacherError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await once(req, fetchImpl, timeoutMs);
    } catch (e) {
      last = e instanceof TeacherError ? e : new TeacherError('server', true);
      if (!last.retryable || attempt === retries) break;
      await sleep(600 * 2 ** attempt + Math.floor(Math.random() * 200));
    }
  }
  throw last ?? new TeacherError('server', true);
}

// ---------- Réponse en flux (le professeur parle dès sa première phrase) ----------

// Active avec EXPO_PUBLIC_STREAMING=1 (désactivé par défaut tant que non éprouvé sur appareil).
export const streamingEnabled = (): boolean => process.env.EXPO_PUBLIC_STREAMING === '1';

export interface StreamOptions extends AskOptions {
  onDelta: (text: string) => void; // appelé pour chaque morceau de texte reçu
  signal?: AbortSignal; // permet d'annuler la requête (l'utilisateur interrompt le professeur)
  firstByteMs?: number; // attente max avant le premier morceau
  idleMs?: number; // silence max entre deux morceaux
}

export interface StreamResult {
  text: string;
  partial: boolean; // le flux s'est interrompu: on garde ce qui a été reçu
}

// `fetch` d'Expo sait lire une réponse au fil de l'eau; celui de React Native non.
function streamingFetch(): typeof fetch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo/fetch') as { fetch: unknown }).fetch as typeof fetch;
  } catch {
    return fetch;
  }
}

function failFromStatus(res: Response): void {
  if (res.status === 429) throw new TeacherError('rate', true);
  if (res.status >= 500) throw new TeacherError('server', true, `teacher error ${res.status}`);
  if (!res.ok) throw new TeacherError('invalid', false, `teacher error ${res.status}`);
}

async function streamOnce(req: TeacherRequest, o: Required<Pick<StreamOptions, 'firstByteMs' | 'idleMs'>> & StreamOptions): Promise<StreamResult> {
  const base = resolveApiUrl(); // avant le try: une mauvaise configuration ne doit pas passer pour une panne réseau
  const doFetch = o.fetchImpl ?? streamingFetch();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  const external = o.signal;
  if (external?.aborted) throw new TeacherError('cancelled', false);
  const onExternalAbort = () => controller.abort();
  external?.addEventListener('abort', onExternalAbort);
  const arm = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
  };

  let text = '';
  let done = false;
  let serverError = false;
  const parser = createSseParser((e: SseEvent) => {
    if (e.delta) { text += e.delta; o.onDelta(e.delta); }
    else if (e.done) done = true;
    else if (e.error) serverError = true;
  });

  try {
    arm(o.firstByteMs);
    const res = await doFetch(`${base}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    failFromStatus(res);

    const reader = res.body?.getReader?.();
    if (reader && typeof TextDecoder !== 'undefined') {
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done: finished } = await reader.read();
        if (finished) break;
        arm(o.idleMs);
        parser.feed(decoder.decode(value, { stream: true }));
        if (done || serverError) break;
      }
    } else {
      // Pas de lecture au fil de l'eau sur cet appareil: on lit tout, puis on rejoue les évènements.
      parser.feed(await res.text());
    }
  } catch (e) {
    if (e instanceof TeacherError) throw e;
    // Annulée par l'utilisateur: pas d'erreur à afficher, pas de nouvelle tentative.
    if (external?.aborted) throw new TeacherError('cancelled', false);
    // Interruption APRÈS du texte: on garde ce qui est arrivé (jamais de nouvelle tentative: ça répéterait des phrases).
    if (text) return { text, partial: true };
    throw new TeacherError(timedOut ? 'timeout' : 'offline', true);
  } finally {
    if (timer) clearTimeout(timer);
    external?.removeEventListener('abort', onExternalAbort);
  }

  if (external?.aborted) throw new TeacherError('cancelled', false);
  if (!text) throw new TeacherError('server', true, serverError ? 'stream error' : 'empty reply');
  return { text, partial: serverError || !done };
}

// Demande une réponse en flux. Réessaie seulement tant qu'aucun texte n'a été reçu.
export async function askTeacherStream(req: TeacherRequest, opts: StreamOptions): Promise<StreamResult> {
  const { retries = 2, sleep = defaultSleep, firstByteMs = 20_000, idleMs = 15_000 } = opts;
  let last: TeacherError | null = null;
  let received = false;
  const onDelta = (d: string) => { received = true; opts.onDelta(d); };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await streamOnce(req, { ...opts, onDelta, firstByteMs, idleMs });
    } catch (e) {
      last = e instanceof TeacherError ? e : new TeacherError('server', true);
      if (received || !last.retryable || attempt === retries || opts.signal?.aborted) break;
      await sleep(600 * 2 ** attempt + Math.floor(Math.random() * 200));
    }
  }
  throw last ?? new TeacherError('server', true);
}

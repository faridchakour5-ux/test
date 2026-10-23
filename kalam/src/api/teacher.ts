import { AgeProfileId } from '../theme/profiles';
import { Level } from '../domain/lessons';
import { UiLang } from '../i18n/strings';

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
  messages: ChatMessage[];
  start?: boolean; // le professeur ouvre la conversation (messages vide)
}

export type TeacherErrorKind = 'offline' | 'timeout' | 'rate' | 'server' | 'invalid' | 'config';

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

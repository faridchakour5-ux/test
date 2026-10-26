// Portail parental, consentement et limite de temps du mode enfant.
export interface ParentalGate {
  question: { a: number; b: number };
  options: number[]; // 4 propositions, une seule juste
  answer: number;
}

type Rng = () => number;

function shuffled<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Question d'adulte (multiplication) à choix multiples: un jeune enfant ne la réussira pas par hasard
// de façon répétée, et aucun clavier n'est nécessaire.
export function makeGate(rng: Rng = Math.random): ParentalGate {
  const a = 6 + Math.floor(rng() * 4); // 6..9
  const b = 6 + Math.floor(rng() * 4);
  const answer = a * b;
  const wrong = new Set<number>();
  const candidates = shuffled([answer - 10, answer + 10, answer - 1, answer + 1, answer + 2, answer - 2, answer + 7, answer - 7], rng);
  for (const c of candidates) { if (c > 0 && c !== answer && wrong.size < 3) wrong.add(c); }
  // Mauvaises réponses et ordre tirés au hasard à chaque question: la place de la bonne réponse ne peut pas s'apprendre par cœur.
  const options = shuffled([...wrong, answer], rng);
  return { question: { a, b }, options, answer };
}

export const checkGate = (gate: ParentalGate, choice: number) => choice === gate.answer;

// Verrou après des erreurs répétées: sans cela, un enfant qui tape au hasard (1 chance sur 4, question renouvelée à
// chaque erreur) finirait par entrer. 3 erreurs => 30 s de pause, puis 60 s, 120 s... (plafond 5 min).
export interface GateLock { fails: number; lockedUntil: number }
export const GATE_MAX_TRIES = 3;
const GATE_BASE_LOCK_MS = 30_000;
const GATE_MAX_LOCK_MS = 300_000;
export const openLock = (): GateLock => ({ fails: 0, lockedUntil: 0 });
export const isGateLocked = (lock: GateLock, now: number) => now < lock.lockedUntil;
export function registerGateFail(lock: GateLock, now: number): GateLock {
  const fails = lock.fails + 1;
  if (fails % GATE_MAX_TRIES !== 0) return { fails, lockedUntil: lock.lockedUntil };
  const rounds = fails / GATE_MAX_TRIES; // 1re pause, 2e pause...
  const wait = Math.min(GATE_BASE_LOCK_MS * 2 ** (rounds - 1), GATE_MAX_LOCK_MS);
  return { fails, lockedUntil: now + wait };
}

export interface Consent {
  micAllowed: boolean;
  grantedAt: number | null; // date du consentement, conservée pour preuve
  version: number; // version du texte accepté
}

export const CONSENT_VERSION = 1;
export const noConsent = (): Consent => ({ micAllowed: false, grantedAt: null, version: CONSENT_VERSION });

export const grantMic = (c: Consent, now: number): Consent => ({ ...c, micAllowed: true, grantedAt: now, version: CONSENT_VERSION });
export const revokeMic = (c: Consent): Consent => ({ ...c, micAllowed: false });

export type DailyLimit = 10 | 20 | 30 | null; // minutes, ou null = pas de limite
export const timeIsUp = (limit: DailyLimit, minutesToday: number) => limit !== null && minutesToday >= limit;
export const minutesLeft = (limit: DailyLimit, minutesToday: number) => (limit === null ? null : Math.max(0, limit - minutesToday));

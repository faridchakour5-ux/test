// Portail parental, consentement et limite de temps du mode enfant.
export interface ParentalGate {
  question: { a: number; b: number };
  options: number[]; // 4 propositions, une seule juste
  answer: number;
}

type Rng = () => number;

// Question d'adulte (multiplication) à choix multiples: un jeune enfant ne la réussira pas par hasard
// de façon répétée, et aucun clavier n'est nécessaire.
export function makeGate(rng: Rng = Math.random): ParentalGate {
  const a = 6 + Math.floor(rng() * 4); // 6..9
  const b = 6 + Math.floor(rng() * 4);
  const answer = a * b;
  const wrong = new Set<number>();
  const candidates = [answer - 10, answer + 10, answer - 1, answer + 1, answer + 2, answer - 2, answer + 7, answer - 7];
  for (const c of candidates) { if (c > 0 && c !== answer && wrong.size < 3) wrong.add(c); }
  const options = [...wrong, answer].sort((x, y) => ((x * 7919) % 13) - ((y * 7919) % 13) || x - y);
  return { question: { a, b }, options, answer };
}

export const checkGate = (gate: ParentalGate, choice: number) => choice === gate.answer;

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

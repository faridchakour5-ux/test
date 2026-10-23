import { CONSENT_VERSION, Consent, DailyLimit, noConsent } from '../domain/parental';
import { Card } from '../domain/srs';
import { UI_LANGS, UiLang } from '../i18n/strings';
import { DEFAULT_PALETTE, PALETTE_IDS, PaletteId } from '../theme/palettes';
import { AGE_PROFILES, AgeProfileId } from '../theme/profiles';

// Vérification, champ par champ, d'une sauvegarde lue sur l'appareil. Une valeur inconnue ou abîmée est remplacée
// par une valeur sûre: l'app démarre toujours, jamais de plantage à l'affichage à cause d'un vieux fichier.

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const normalizeProfile = (v: unknown): AgeProfileId | null =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(AGE_PROFILES, v) ? (v as AgeProfileId) : null;

export const normalizeUiLang = (v: unknown): UiLang => ((UI_LANGS as string[]).includes(v as string) ? (v as UiLang) : 'fr');

export const normalizePalette = (v: unknown): PaletteId => ((PALETTE_IDS as string[]).includes(v as string) ? (v as PaletteId) : DEFAULT_PALETTE);

// Les cartes invalides sont écartées une à une (on garde celles qui sont bonnes); doublons supprimés.
export function normalizeCards(v: unknown): Card[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const c of v as Partial<Card>[]) {
    if (!c || typeof c !== 'object' || typeof c.key !== 'string' || !c.key || seen.has(c.key)) continue;
    if (!isNum(c.ease) || !isNum(c.intervalDays) || !isNum(c.due) || c.intervalDays < 0 || c.ease < 1.3 || c.ease > 5) continue;
    seen.add(c.key);
    out.push({ key: c.key, ease: c.ease, intervalDays: c.intervalDays, due: c.due });
  }
  return out;
}

// Consentement parental: par prudence, tout ce qui n'est pas un consentement COMPLET et valide vaut « refusé ».
export function normalizeConsent(v: unknown): Consent {
  const c = v as Partial<Consent> | null | undefined;
  if (!c || typeof c !== 'object') return noConsent();
  if (c.micAllowed === true && isNum(c.grantedAt) && c.grantedAt > 0) {
    return { micAllowed: true, grantedAt: c.grantedAt, version: isNum(c.version) ? c.version : CONSENT_VERSION };
  }
  return { ...noConsent(), version: isNum(c.version) ? c.version : CONSENT_VERSION };
}

const LIMITS: DailyLimit[] = [10, 20, 30, null];

export function normalizeKids(v: unknown, defaults: { stars: number; storiesRead: string[]; consent: Consent; dailyLimit: DailyLimit }) {
  const k = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  return {
    stars: isNum(k.stars) && k.stars >= 0 ? Math.floor(k.stars) : defaults.stars,
    storiesRead: Array.isArray(k.storiesRead) ? [...new Set((k.storiesRead as unknown[]).filter((x): x is string => typeof x === 'string'))] : defaults.storiesRead,
    consent: normalizeConsent(k.consent),
    dailyLimit: (LIMITS as unknown[]).includes(k.dailyLimit) ? (k.dailyLimit as DailyLimit) : defaults.dailyLimit,
  };
}

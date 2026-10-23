import { ar } from './locales/ar';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr, StringKey } from './locales/fr';
import { zh } from './locales/zh';

// Langues de l'INTERFACE (la langue apprise est l'anglais pour l'instant).
export type UiLang = 'fr' | 'en' | 'ar' | 'es' | 'zh';
export type { StringKey };

export const UI_LANGS: UiLang[] = ['fr', 'en', 'ar', 'es', 'zh'];
// Nom de chaque langue écrit dans sa propre langue: on la reconnaît même si on ne comprend pas l'interface.
export const LANG_NAMES: Record<UiLang, string> = { fr: 'Français', en: 'English', ar: 'العربية', es: 'Español', zh: '中文' };

const STRINGS: Record<UiLang, Record<StringKey, string>> = { fr, en, ar, es, zh };

export const RTL_LANGS: UiLang[] = ['ar'];
export const isRtl = (lang: UiLang) => RTL_LANGS.includes(lang);
// Repli sur le français puis l'anglais si une langue venait à manquer d'un texte.
export const t = (lang: UiLang, key: StringKey): string => STRINGS[lang]?.[key] ?? fr[key] ?? key;

// Texte avec variables: « {target} » est remplacé par la valeur fournie.
export function tf(lang: UiLang, key: StringKey, vars: Record<string, string>): string {
  return t(lang, key).replace(/\{(\w+)\}/g, (_m, name: string) => vars[name] ?? '');
}

// Choisit le texte d'un contenu multilingue (titres, traductions) avec repli sûr.
export function pick<T extends Partial<Record<UiLang, string>>>(obj: T, lang: UiLang): string {
  return obj[lang] ?? obj.en ?? obj.fr ?? '';
}

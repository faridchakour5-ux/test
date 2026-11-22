import { ar } from './locales/ar';
import { fr, StringKey } from './locales/fr';

// Langues de l'interface. D'autres (anglais, espagnol…) pourront s'ajouter: il suffit d'un fichier de plus dans locales/.
export type Lang = 'fr' | 'ar';
export type { StringKey };
export const LANGS: Lang[] = ['fr', 'ar'];
// Nom de chaque langue écrit dans sa propre langue: on la reconnaît même si on ne comprend pas l'interface.
export const LANG_NAMES: Record<Lang, string> = { fr: 'Français', ar: 'العربية' };

const STRINGS: Record<Lang, Record<StringKey, string>> = { fr, ar };
export const RTL_LANGS: Lang[] = ['ar'];
export const isRtl = (lang: Lang) => RTL_LANGS.includes(lang);

// Repli sûr sur le français si un texte venait à manquer.
export const t = (lang: Lang, key: StringKey): string => STRINGS[lang]?.[key] || fr[key] || key;

// Texte avec variables: « {amount} » est remplacé par la valeur fournie.
export function tf(lang: Lang, key: StringKey, vars: Record<string, string | number>): string {
  return t(lang, key).replace(/\{(\w+)\}/g, (_m, name: string) => String(vars[name] ?? ''));
}

// Contenu bilingue (noms d'huiles, villes…) avec repli sûr; un texte vide compte comme absent.
export function pick(obj: Partial<Record<Lang, string>>, lang: Lang): string {
  return obj[lang] || obj.fr || obj.ar || '';
}

// Langue au premier lancement: l'arabe si le téléphone est en arabe, sinon le français (ensuite le choix sauvegardé prime).
export function langFromLocale(locale: string | undefined | null): Lang {
  const code = typeof locale === 'string' ? locale.trim().toLowerCase().split(/[-_]/)[0] : '';
  return code === 'ar' ? 'ar' : 'fr';
}
export function deviceLang(): Lang {
  try { return langFromLocale(Intl.DateTimeFormat().resolvedOptions().locale); } catch { return 'fr'; }
}

import { UiLang } from '../i18n/strings';
import type { VocabItem } from './lessons';

// Langues qu'on peut APPRENDRE (distinctes des langues de l'interface).
// Pour l'instant: l'anglais et le français (écriture latine séparée par des espaces: la prononciation se compare mot à mot).
// D'autres langues (arabe, espagnol…) viendront plus tard: elles demandent un traitement propre de l'écriture et de la prononciation.
export type TargetLang = 'en' | 'fr';

export const TARGET_LANGS: TargetLang[] = ['en', 'fr'];
export const DEFAULT_TARGET: TargetLang = 'en';

// Code de langue pour la voix et la reconnaissance vocale.
export const TARGET_LOCALE: Record<TargetLang, string> = { en: 'en-US', fr: 'fr-FR' };

// Nom de chaque langue à apprendre, écrit dans la langue de l'interface.
export const TARGET_NAMES: Record<UiLang, Record<TargetLang, string>> = {
  fr: { en: 'Anglais', fr: 'Français' },
  en: { en: 'English', fr: 'French' },
  ar: { en: 'الإنجليزية', fr: 'الفرنسية' },
  es: { en: 'Inglés', fr: 'Francés' },
  zh: { en: '英语', fr: '法语' },
};

export const isTargetLang = (v: unknown): v is TargetLang => typeof v === 'string' && (TARGET_LANGS as string[]).includes(v);

// Le texte à apprendre dans la langue cible.
export const targetText = (v: VocabItem, target: TargetLang): string => v[target];

// Le sens à afficher: dans la langue de l'interface; si elle est la langue apprise, on prend une autre langue connue.
export function meaningText(v: VocabItem, ui: UiLang, target: TargetLang): string {
  if (ui !== target) return v[ui];
  return target === 'en' ? v.fr : v.en;
}

// Clé d'une leçon dans la progression: l'anglais garde l'ancien format (compatibilité avec les sauvegardes existantes).
export const lessonKey = (lessonId: string, target: TargetLang): string => (target === 'en' ? lessonId : `${target}:${lessonId}`);

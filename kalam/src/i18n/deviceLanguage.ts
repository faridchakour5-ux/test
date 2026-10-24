import { UI_LANGS, UiLang } from './strings';

// Langue de l'interface au PREMIER lancement: celle du téléphone si l'application la propose, sinon l'anglais.
// (Ensuite, le choix de la personne est sauvegardé et prime toujours.)
export function uiLangFromLocale(locale: string | undefined | null): UiLang {
  const code = typeof locale === 'string' ? locale.trim().toLowerCase().split(/[-_]/)[0] : '';
  return (UI_LANGS as string[]).includes(code) ? (code as UiLang) : 'en';
}

export function deviceUiLang(): UiLang {
  try {
    return uiLangFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
}

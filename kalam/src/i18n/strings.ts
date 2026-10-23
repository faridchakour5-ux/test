// Interface bilingue: l'anglais n'est que la langue APPRISE, l'interface suit la langue de l'utilisateur.
export type UiLang = 'fr' | 'ar' | 'en';

const STRINGS = {
  fr: { welcome: 'Bienvenue sur Kalam', pick: 'Qui va apprendre ?', kids: 'Enfant (4-8 ans)', adult: 'Ado / Adulte', senior: 'Senior', start: 'Commencer', tagline: 'Apprends en parlant.' },
  en: { welcome: 'Welcome to Kalam', pick: 'Who is learning?', kids: 'Child (4-8)', adult: 'Teen / Adult', senior: 'Senior', start: 'Start', tagline: 'Learn by speaking.' },
  ar: { welcome: 'مرحبًا بك في كلام', pick: 'من سيتعلّم؟', kids: 'طفل (٤-٨ سنوات)', adult: 'مراهق / بالغ', senior: 'كبير السن', start: 'ابدأ', tagline: 'تعلّم بالكلام.' },
} as const;

export type StringKey = keyof (typeof STRINGS)['fr'];
export const RTL_LANGS: UiLang[] = ['ar'];
export const isRtl = (lang: UiLang) => RTL_LANGS.includes(lang);
export const t = (lang: UiLang, key: StringKey): string => STRINGS[lang][key];

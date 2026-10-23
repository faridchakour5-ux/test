// Interface bilingue: l'anglais n'est que la langue APPRISE, l'interface suit la langue de l'utilisateur.
export type UiLang = 'fr' | 'ar' | 'en';

const STRINGS = {
  fr: { welcome: 'Bienvenue sur Kalam', pick: 'Qui va apprendre ?', kids: 'Enfant (4-8 ans)', adult: 'Ado / Adulte', senior: 'Senior', start: 'Commencer', tagline: 'Apprends en parlant.',
    levelTest: 'Test de niveau', levelTestIntro: 'Quelques questions pour trouver votre niveau.', next: 'Suivant', yourLevel: 'Votre niveau', lessons: 'Leçons', goal: 'Objectif du jour', minutes: 'min', streak: 'Jours d\'affilée', done: 'Terminée', typeHere: 'Écrivez en anglais…', send: 'Envoyer', listen: 'Écouter', back: 'Retour', finish: 'Terminer la leçon', teacherDown: 'Le professeur est indisponible. Réessayez dans un instant.', thinking: 'Le professeur réfléchit…', skipTest: 'Passer', vocab: 'Vocabulaire', language: 'Langue', goalReached: 'Objectif atteint, bravo !' },
  en: { welcome: 'Welcome to Kalam', pick: 'Who is learning?', kids: 'Child (4-8)', adult: 'Teen / Adult', senior: 'Senior', start: 'Start', tagline: 'Learn by speaking.',
    levelTest: 'Level test', levelTestIntro: 'A few questions to find your level.', next: 'Next', yourLevel: 'Your level', lessons: 'Lessons', goal: 'Daily goal', minutes: 'min', streak: 'Day streak', done: 'Done', typeHere: 'Write in English…', send: 'Send', listen: 'Listen', back: 'Back', finish: 'Finish lesson', teacherDown: 'The teacher is unavailable. Please try again shortly.', thinking: 'The teacher is thinking…', skipTest: 'Skip', vocab: 'Vocabulary', language: 'Language', goalReached: 'Goal reached, well done!' },
  ar: { welcome: 'مرحبًا بك في كلام', pick: 'من سيتعلّم؟', kids: 'طفل (٤-٨ سنوات)', adult: 'مراهق / بالغ', senior: 'كبير السن', start: 'ابدأ', tagline: 'تعلّم بالكلام.',
    levelTest: 'اختبار المستوى', levelTestIntro: 'بعض الأسئلة لمعرفة مستواك.', next: 'التالي', yourLevel: 'مستواك', lessons: 'الدروس', goal: 'هدف اليوم', minutes: 'دقيقة', streak: 'أيام متتالية', done: 'مكتمل', typeHere: 'اكتب بالإنجليزية…', send: 'إرسال', listen: 'استماع', back: 'رجوع', finish: 'إنهاء الدرس', teacherDown: 'المعلم غير متاح. حاول مرة أخرى بعد قليل.', thinking: 'المعلم يفكر…', skipTest: 'تخطّي', vocab: 'المفردات', language: 'اللغة', goalReached: 'تم تحقيق الهدف، أحسنت!' },
} as const;

export type StringKey = keyof (typeof STRINGS)['fr'];
export const RTL_LANGS: UiLang[] = ['ar'];
export const isRtl = (lang: UiLang) => RTL_LANGS.includes(lang);
export const t = (lang: UiLang, key: StringKey): string => STRINGS[lang][key];

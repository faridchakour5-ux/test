import { LESSONS } from './lessons';
import { DEFAULT_TARGET, TARGET_LANGS, TARGET_LOCALE, TARGET_NAMES, isTargetLang, lessonKey, meaningText, targetText } from './targets';
import { UI_LANGS } from '../i18n/strings';

describe('langues à apprendre', () => {
  it('seulement l\'anglais et le français sont apprenables (pas d\'arabe pour l\'instant)', () => {
    expect(TARGET_LANGS).toEqual(['en', 'fr']);
    expect(isTargetLang('ar')).toBe(false);
    expect(isTargetLang('es')).toBe(false);
  });
  it('l\'anglais reste la langue par défaut; chaque langue a un code vocal et un nom dans toutes les langues d\'interface', () => {
    expect(DEFAULT_TARGET).toBe('en');
    for (const t of TARGET_LANGS) {
      expect(TARGET_LOCALE[t]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      UI_LANGS.forEach((ui) => expect(TARGET_NAMES[ui][t].trim()).not.toBe(''));
    }
  });
  it('isTargetLang valide les valeurs inconnues ou corrompues', () => {
    expect(isTargetLang('fr')).toBe(true);
    for (const bad of ['de', '', null, undefined, 42, {}, 'EN']) expect(isTargetLang(bad)).toBe(false);
  });
  it('chaque mot de chaque leçon existe dans toutes les langues apprenables', () => {
    for (const l of LESSONS) for (const v of l.vocab) for (const t of TARGET_LANGS) expect(targetText(v, t).trim()).not.toBe('');
  });
  it('targetText donne le mot dans la langue apprise', () => {
    const menu = LESSONS.find((l) => l.id === 'restaurant')!.vocab[0];
    expect(targetText(menu, 'en')).toBe('menu');
    expect(targetText(menu, 'fr')).toBe('carte');
  });
  it('meaningText: sens dans la langue de l\'interface, jamais la langue apprise elle-même', () => {
    const menu = LESSONS.find((l) => l.id === 'restaurant')!.vocab[0];
    expect(meaningText(menu, 'zh', 'fr')).toBe('菜单');
    expect(meaningText(menu, 'ar', 'fr')).toBe('قائمة الطعام');
    expect(meaningText(menu, 'en', 'fr')).toBe('menu'); // interface anglaise, on apprend le français: sens en anglais
    expect(meaningText(menu, 'fr', 'fr')).toBe('menu'); // même langue: on prend l'anglais
    expect(meaningText(menu, 'en', 'en')).toBe('carte'); // comme avant
    expect(meaningText(menu, 'es', 'fr')).toBe('carta'); // interface espagnole, on apprend le français
  });
  it('lessonKey garde l\'ancien format pour l\'anglais (compatibilité) et préfixe les autres', () => {
    expect(lessonKey('family', 'en')).toBe('family');
    expect(lessonKey('family', 'fr')).toBe('fr:family');
  });
});

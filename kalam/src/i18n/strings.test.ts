import { LANG_NAMES, UI_LANGS, isRtl, pick, t, tf } from './strings';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { zh } from './locales/zh';

const ALL = { fr, en, ar, es, zh };

describe('i18n', () => {
  it('toutes les langues ont exactement les mêmes clés', () => {
    const ref = Object.keys(fr).sort();
    for (const [lang, dict] of Object.entries(ALL)) expect([lang, Object.keys(dict).sort()]).toEqual([lang, ref]);
  });
  it('aucun texte vide', () => {
    for (const [lang, dict] of Object.entries(ALL)) for (const [k, v] of Object.entries(dict)) expect([lang, k, v.trim().length > 0]).toEqual([lang, k, true]);
  });
  it('les traductions ne sont pas des copies du français (sauf mots identiques courts)', () => {
    for (const lang of ['en', 'es', 'zh', 'ar'] as const) {
      const same = Object.keys(fr).filter((k) => ALL[lang][k as keyof typeof fr] === fr[k as keyof typeof fr] && fr[k as keyof typeof fr].length > 12);
      expect([lang, same]).toEqual([lang, []]);
    }
  });
  it('le chinois et l\'arabe utilisent leur écriture', () => {
    expect(zh.welcome).toMatch(/[一-鿿]/);
    expect(ar.welcome).toMatch(/[؀-ۿ]/);
  });
  it('5 langues, noms natifs, seul l\'arabe est de droite à gauche', () => {
    expect(UI_LANGS).toHaveLength(5);
    UI_LANGS.forEach((l) => expect(LANG_NAMES[l]).toBeTruthy());
    expect(UI_LANGS.filter(isRtl)).toEqual(['ar']);
  });
  it('t() et pick() ont un repli sûr', () => {
    expect(t('es', 'welcome')).toBe('Bienvenido a Kalam');
    expect(pick({ fr: 'a', en: 'b' }, 'zh')).toBe('b');
    expect(pick({ fr: 'a' }, 'zh')).toBe('a');
  });

  it('tf remplace {target} dans toutes les langues et ne laisse aucune accolade', () => {
    for (const lang of UI_LANGS) {
      for (const key of ['noVoice', 'pLanguage'] as const) {
        expect(t(lang, key)).toContain('{target}');
        const out = tf(lang, key, { target: 'FRTEST' });
        expect(out).toContain('FRTEST');
        expect(out).not.toMatch(/[{}]/);
      }
    }
    expect(tf('fr', 'noVoice', {})).not.toContain('{'); // variable manquante: vide, jamais « {target} » affiché
  });
  it('« Écrivez en anglais » n\'existe plus: le champ de saisie vaut pour toutes les langues apprises', () => {
    for (const lang of UI_LANGS) expect(t(lang, 'typeHere')).not.toMatch(/anglais|English|إنجليزية|inglés|英/i);
  });

  it('chaque traduction garde exactement les mêmes variables {…} que le français (jamais de texte brut « {target} » ni de variable oubliée)', () => {
    const vars = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const problems: string[] = [];
    for (const [key, frText] of Object.entries(fr)) {
      for (const lang of ['en', 'ar', 'es', 'zh'] as const) {
        const other = (ALL[lang] as Record<string, string>)[key];
        if (JSON.stringify(vars(other)) !== JSON.stringify(vars(frText))) problems.push(`${lang}.${key}`);
      }
      expect(frText).not.toMatch(/\{\s|\s\}|\{\}/); // accolades mal formées
    }
    expect(problems).toEqual([]);
  });
  it('aucune accolade ne subsiste dans un texte sans variable', () => {
    for (const lang of UI_LANGS) for (const [key, text] of Object.entries(ALL[lang] as Record<string, string>)) {
      const clean = text.replace(/\{\w+\}/g, '');
      expect([lang, key, /[{}]/.test(clean)]).toEqual([lang, key, false]);
    }
  });
});

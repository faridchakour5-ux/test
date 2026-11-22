import { PALETTE_DICTIONARY, PALETTE_IDS } from './palettes';
import { contrastRatio, meetsAA } from './contrast';
import { Palette } from './tokens';

// Chaque paire (texte, fond) réellement utilisée dans l'application doit être lisible (WCAG AA), en clair comme en sombre.
const PAIRS: [keyof Palette, keyof Palette][] = [
  ['text', 'background'], ['text', 'surface'], ['text', 'surfaceAlt'],
  ['textMuted', 'background'], ['textMuted', 'surface'], ['textMuted', 'surfaceAlt'],
  ['onPrimary', 'primary'], ['primary', 'background'], ['primary', 'surface'], ['primary', 'surfaceAlt'],
  ['onAccent', 'accent'],
  ['success', 'surface'], ['warning', 'surface'], ['danger', 'surface'], ['success', 'background'], ['danger', 'background'],
];

describe('dictionnaire de couleurs', () => {
  it('contient au moins 6 combinaisons, avec un nom et une description en français et en arabe', () => {
    expect(PALETTE_IDS.length).toBeGreaterThanOrEqual(6);
    for (const id of PALETTE_IDS) {
      const e = PALETTE_DICTIONARY[id];
      for (const lang of ['fr', 'ar'] as const) {
        expect(e.name[lang].trim().length).toBeGreaterThan(2);
        expect(e.mood[lang].trim().length).toBeGreaterThan(5);
      }
    }
  });

  it('les noms sont uniques (on reconnaît chaque combinaison)', () => {
    const names = PALETTE_IDS.map((id) => PALETTE_DICTIONARY[id].name.fr);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const id of PALETTE_IDS) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${id} (${mode}): toutes les paires texte/fond atteignent WCAG AA (4,5:1)`, () => {
        const p = PALETTE_DICTIONARY[id][mode];
        const failing = PAIRS.filter(([fg, bg]) => !meetsAA(p[fg], p[bg])).map(([fg, bg]) => `${fg} sur ${bg}: ${contrastRatio(p[fg], p[bg]).toFixed(2)}`);
        expect(failing).toEqual([]);
      });
    }
  }

  it('toutes les couleurs sont des codes hexadécimaux #RRGGBB valides', () => {
    for (const id of PALETTE_IDS) for (const mode of ['light', 'dark'] as const) {
      for (const [k, v] of Object.entries(PALETTE_DICTIONARY[id][mode])) expect(`${id}.${mode}.${k}=${v}`).toMatch(/=#[0-9A-Fa-f]{6}$/);
    }
  });

  it('une palette sombre est réellement plus sombre que sa version claire', () => {
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    for (const id of PALETTE_IDS) expect(lum(PALETTE_DICTIONARY[id].dark.background)).toBeLessThan(lum(PALETTE_DICTIONARY[id].light.background));
  });
});

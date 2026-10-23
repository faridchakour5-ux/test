import { contrastRatio, meetsAA } from './contrast';
import { PALETTE_DICTIONARY, PALETTE_IDS } from './palettes';
import { HIGH_CONTRAST_DARK, HIGH_CONTRAST_LIGHT } from './tokens';

const modes = (id: (typeof PALETTE_IDS)[number]) => [
  [`${id}/clair`, PALETTE_DICTIONARY[id].light],
  [`${id}/sombre`, PALETTE_DICTIONARY[id].dark],
] as const;

describe('dictionnaire de palettes', () => {
  it('contient au moins 5 combinaisons nommées dans les 3 langues', () => {
    expect(PALETTE_IDS.length).toBeGreaterThanOrEqual(5);
    PALETTE_IDS.forEach((id) => { const n = PALETTE_DICTIONARY[id].name; expect(n.fr && n.en && n.ar).toBeTruthy(); });
  });

  for (const id of PALETTE_IDS) {
    for (const [label, p] of modes(id)) {
      describe(label, () => {
        it('texte lisible sur fond et sur surface', () => {
          expect(meetsAA(p.text, p.background)).toBe(true);
          expect(meetsAA(p.text, p.surface)).toBe(true);
          expect(meetsAA(p.textMuted, p.background)).toBe(true);
          expect(meetsAA(p.textMuted, p.surface)).toBe(true);
        });
        it('texte du bouton lisible sur la couleur principale', () => {
          expect(meetsAA(p.onPrimary, p.primary)).toBe(true);
        });
        it('couleur principale visible sur fond et surface (>= 3:1, éléments graphiques)', () => {
          expect(contrastRatio(p.primary, p.background)).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(p.primary, p.surface)).toBeGreaterThanOrEqual(3);
        });
        it('couleurs d\'état lisibles', () => {
          for (const c of [p.success, p.warning, p.danger]) {
            expect(meetsAA(c, p.background)).toBe(true);
            expect(meetsAA(c, p.surface)).toBe(true);
          }
        });
      });
    }
  }

  it('le contraste élevé (seniors) est très fort', () => {
    expect(contrastRatio(HIGH_CONTRAST_LIGHT.text, HIGH_CONTRAST_LIGHT.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(HIGH_CONTRAST_DARK.text, HIGH_CONTRAST_DARK.background)).toBeGreaterThanOrEqual(7);
  });
});

import { buildTheme } from './ThemeProvider';
import { PALETTE_DICTIONARY } from './palettes';

describe('buildTheme', () => {
  it('clair et sombre utilisent la bonne moitié de la palette', () => {
    expect(buildTheme(false, 'olivier').colors).toBe(PALETTE_DICTIONARY.olivier.light);
    expect(buildTheme(true, 'olivier').colors).toBe(PALETTE_DICTIONARY.olivier.dark);
  });
  it('palette inconnue: repli sur la palette par défaut (jamais d\'écran cassé)', () => {
    expect(buildTheme(false, 'inconnue' as never).colors).toBe(PALETTE_DICTIONARY.olivier.light);
  });
  it('la taille du texte agrandit aussi les zones tactiles', () => {
    const a = buildTheme(false, 'olivier', 'normal');
    const b = buildTheme(false, 'olivier', 'xlarge');
    expect(b.font(16)).toBeGreaterThan(a.font(16));
    expect(b.minTouch).toBeGreaterThan(a.minTouch);
    expect(a.minTouch).toBeGreaterThanOrEqual(48); // minimum d'accessibilité
  });
  it('taille inconnue: taille normale', () => {
    expect(buildTheme(false, 'olivier', 'enorme' as never).fontScale).toBe(1);
  });
});

import { I18nManager } from 'react-native';
import { rowDirection, startAlign } from './layout';

const setNative = (rtl: boolean) => { Object.defineProperty(I18nManager, 'isRTL', { value: rtl, configurable: true }); };
afterEach(() => setNative(false));

describe('sens de lecture des mises en page (pas de double inversion sur Android)', () => {
  it('système en gauche → droite (rendu web, ou avant le redémarrage): on inverse à la main seulement pour l\'arabe', () => {
    setNative(false);
    expect(rowDirection('fr')).toBe('row');
    expect(rowDirection('ar')).toBe('row-reverse');
    expect(startAlign('fr')).toBe('flex-start');
    expect(startAlign('ar')).toBe('flex-end');
  });
  it('système déjà en droite → gauche (Android après redémarrage en arabe): React Native inverse tout seul, on n\'inverse PAS une 2e fois', () => {
    setNative(true);
    expect(rowDirection('ar')).toBe('row');
    expect(startAlign('ar')).toBe('flex-start');
  });
  it('on vient de repasser du arabe au français sans redémarrer (système encore en droite → gauche): on inverse à la main pour afficher de gauche à droite', () => {
    setNative(true);
    for (const lang of ['fr', 'en', 'es', 'zh'] as const) {
      expect(rowDirection(lang)).toBe('row-reverse');
      expect(startAlign(lang)).toBe('flex-end');
    }
  });
});

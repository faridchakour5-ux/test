import { buildTheme } from './ThemeProvider';

describe('buildTheme', () => {
  it('agrandit le texte pour les seniors', () => {
    expect(buildTheme('senior', false).font(16)).toBeGreaterThan(buildTheme('adult', false).font(16));
  });
  it('active le contraste élevé pour les seniors', () => {
    expect(buildTheme('senior', false).colors.text).toBe('#000000');
  });
  it('garde des zones tactiles larges pour les enfants', () => {
    expect(buildTheme('kids', false).profile.minTouchSize).toBeGreaterThanOrEqual(64);
  });
});

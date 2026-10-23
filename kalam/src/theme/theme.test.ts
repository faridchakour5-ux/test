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

describe('buildTheme avec palette', () => {
  it('applique la palette choisie en clair et en sombre', () => {
    expect(buildTheme('adult', false, 'ocean').colors.primary).toBe('#0B6E99');
    expect(buildTheme('adult', true, 'ocean').colors.primary).toBe('#5CC8F2');
  });
  it('le contraste élevé des seniors garde la priorité sur la palette', () => {
    expect(buildTheme('senior', false, 'sunset').colors.text).toBe('#000000');
  });
});

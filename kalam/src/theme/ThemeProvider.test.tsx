import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { DEFAULT_PALETTE, PALETTE_DICTIONARY, PALETTE_IDS } from './palettes';
import { AGE_PROFILES } from './profiles';
import { Theme, ThemeProvider, buildTheme, useTheme } from './ThemeProvider';
import { HIGH_CONTRAST_DARK, HIGH_CONTRAST_LIGHT } from './tokens';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));
const scheme = useColorScheme as unknown as jest.Mock;

let seen: Theme[] = [];
function Probe() { const th = useTheme(); seen.push(th); return <Text>{`${th.profile.id}|${th.isDark}|${th.colors.primary}|${th.font(10)}`}</Text>; }
const wrap = (el: React.ReactElement) => render(el);

beforeEach(() => { seen = []; scheme.mockReturnValue('light'); });
afterEach(async () => { await cleanup(); });

describe('profils d\'âge: valeurs d\'accessibilité figées', () => {
  it('textes, zones tactiles, voix et patience par profil', () => {
    expect(AGE_PROFILES.kids).toMatchObject({ fontScale: 1.2, minTouchSize: 72, speechRate: 0.85, highContrast: false, speechPatienceMs: 3500, maxSystemFontScale: 1.5 });
    expect(AGE_PROFILES.adult).toMatchObject({ fontScale: 1, minTouchSize: 48, speechRate: 1, highContrast: false, speechPatienceMs: 2200, maxSystemFontScale: 2 });
    expect(AGE_PROFILES.senior).toMatchObject({ fontScale: 1.4, minTouchSize: 64, speechRate: 0.75, highContrast: true, speechPatienceMs: 3500, maxSystemFontScale: 1.3 });
  });
  it('le réglage du téléphone n\'est jamais interdit (≥ 1) et reste plafonné', () => {
    for (const p of Object.values(AGE_PROFILES)) { expect(p.maxSystemFontScale).toBeGreaterThanOrEqual(1); expect(p.maxSystemFontScale).toBeLessThanOrEqual(2); }
  });
});

describe('buildTheme', () => {
  it('taille de texte arrondie selon le profil', () => {
    expect(buildTheme('adult', false).font(17)).toBe(17);
    expect(buildTheme('kids', false).font(10)).toBe(12);
    expect(buildTheme('senior', false).font(15)).toBe(21);
    expect(buildTheme('senior', false).font(11)).toBe(15); // 15,4 arrondi
  });
  it('palette par défaut: violet; clair et sombre distincts', () => {
    expect(DEFAULT_PALETTE).toBe('violet');
    expect(buildTheme('adult', false).colors).toBe(PALETTE_DICTIONARY.violet.light);
    expect(buildTheme('adult', true).colors).toBe(PALETTE_DICTIONARY.violet.dark);
  });
  it('chaque palette, en clair et en sombre, pour adultes et enfants', () => {
    for (const id of PALETTE_IDS) for (const profile of ['adult', 'kids'] as const) {
      expect(buildTheme(profile, false, id).colors).toBe(PALETTE_DICTIONARY[id].light);
      expect(buildTheme(profile, true, id).colors).toBe(PALETTE_DICTIONARY[id].dark);
    }
  });
  it('seniors: contraste élevé prioritaire sur toute palette', () => {
    for (const id of PALETTE_IDS) {
      expect(buildTheme('senior', false, id).colors).toBe(HIGH_CONTRAST_LIGHT);
      expect(buildTheme('senior', true, id).colors).toBe(HIGH_CONTRAST_DARK);
    }
  });
  it('indique le mode sombre', () => {
    expect(buildTheme('adult', true).isDark).toBe(true);
    expect(buildTheme('adult', false).isDark).toBe(false);
  });
});

describe('ThemeProvider', () => {
  it('sans fournisseur: thème adulte clair par défaut', async () => {
    await wrap(<Probe />);
    expect(screen.getByText(`adult|false|${PALETTE_DICTIONARY.violet.light.primary}|10`)).toBeTruthy();
  });

  it('suit le profil et la palette demandés', async () => {
    await wrap(<ThemeProvider profileId="kids" paletteId="ocean"><Probe /></ThemeProvider>);
    expect(screen.getByText(`kids|false|${PALETTE_DICTIONARY.ocean.light.primary}|12`)).toBeTruthy();
  });

  it('palette par défaut si aucune n\'est donnée', async () => {
    await wrap(<ThemeProvider profileId="adult"><Probe /></ThemeProvider>);
    expect(screen.getByText(`adult|false|${PALETTE_DICTIONARY.violet.light.primary}|10`)).toBeTruthy();
  });

  it('suit le mode sombre du téléphone (et seulement « dark »)', async () => {
    scheme.mockReturnValue('dark');
    await wrap(<ThemeProvider profileId="adult"><Probe /></ThemeProvider>);
    expect(screen.getByText(`adult|true|${PALETTE_DICTIONARY.violet.dark.primary}|10`)).toBeTruthy();
    await cleanup();
    for (const v of ['light', null, undefined]) {
      scheme.mockReturnValue(v);
      await wrap(<ThemeProvider profileId="adult"><Probe /></ThemeProvider>);
      expect(screen.getByText(/\|false\|/)).toBeTruthy();
      await cleanup();
    }
  });

  it('senior: contraste élevé, quelle que soit la palette demandée', async () => {
    await wrap(<ThemeProvider profileId="senior" paletteId="sunset"><Probe /></ThemeProvider>);
    expect(screen.getByText(`senior|false|${HIGH_CONTRAST_LIGHT.primary}|14`)).toBeTruthy();
  });

  it('le thème est recalculé quand le profil, la palette ou le mode changent, et seulement alors', async () => {
    const view = await wrap(<ThemeProvider profileId="adult" paletteId="violet"><Probe /></ThemeProvider>);
    const first = seen[seen.length - 1];
    await view.rerender(<ThemeProvider profileId="adult" paletteId="violet"><Probe /></ThemeProvider>);
    expect(seen[seen.length - 1]).toBe(first); // mêmes réglages: même objet (pas de rendu inutile en cascade)
    await view.rerender(<ThemeProvider profileId="adult" paletteId="forest"><Probe /></ThemeProvider>);
    expect(seen[seen.length - 1].colors).toBe(PALETTE_DICTIONARY.forest.light);
    await view.rerender(<ThemeProvider profileId="kids" paletteId="forest"><Probe /></ThemeProvider>);
    expect(seen[seen.length - 1].profile.id).toBe('kids');
  });
});

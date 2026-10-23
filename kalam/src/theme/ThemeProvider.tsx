import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { AGE_PROFILES, AgeProfile, AgeProfileId } from './profiles';
import { DEFAULT_PALETTE, PALETTE_DICTIONARY, PaletteId } from './palettes';
import { HIGH_CONTRAST_DARK, HIGH_CONTRAST_LIGHT, Palette } from './tokens';

export interface Theme {
  profile: AgeProfile;
  colors: Palette;
  isDark: boolean;
  font: (size: number) => number;
}

// Le contraste élevé des seniors est prioritaire sur la palette choisie.
export function buildTheme(profileId: AgeProfileId, isDark: boolean, paletteId: PaletteId = DEFAULT_PALETTE): Theme {
  const profile = AGE_PROFILES[profileId];
  const colors = profile.highContrast
    ? isDark ? HIGH_CONTRAST_DARK : HIGH_CONTRAST_LIGHT
    : isDark ? PALETTE_DICTIONARY[paletteId].dark : PALETTE_DICTIONARY[paletteId].light;
  return { profile, colors, isDark, font: (size) => Math.round(size * profile.fontScale) };
}

const ThemeContext = createContext<Theme>(buildTheme('adult', false));

export function ThemeProvider({ profileId, paletteId = DEFAULT_PALETTE, children }: { profileId: AgeProfileId; paletteId?: PaletteId; children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => buildTheme(profileId, isDark, paletteId), [profileId, isDark, paletteId]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

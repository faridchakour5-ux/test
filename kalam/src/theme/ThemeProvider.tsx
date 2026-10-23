import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { AGE_PROFILES, AgeProfile, AgeProfileId } from './profiles';
import { DARK, HIGH_CONTRAST_DARK, HIGH_CONTRAST_LIGHT, LIGHT, Palette } from './tokens';

export interface Theme {
  profile: AgeProfile;
  colors: Palette;
  isDark: boolean;
  font: (size: number) => number;
}

export function buildTheme(profileId: AgeProfileId, isDark: boolean): Theme {
  const profile = AGE_PROFILES[profileId];
  const colors = profile.highContrast
    ? isDark ? HIGH_CONTRAST_DARK : HIGH_CONTRAST_LIGHT
    : isDark ? DARK : LIGHT;
  return { profile, colors, isDark, font: (size) => Math.round(size * profile.fontScale) };
}

const ThemeContext = createContext<Theme>(buildTheme('adult', false));

export function ThemeProvider({ profileId, children }: { profileId: AgeProfileId; children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => buildTheme(profileId, isDark), [profileId, isDark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

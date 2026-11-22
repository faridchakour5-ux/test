import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DEFAULT_PALETTE, PALETTE_DICTIONARY, PaletteId } from './palettes';
import { Palette } from './tokens';

// Confort de lecture: taille du texte et des zones tactiles.
export type TextSize = 'normal' | 'large' | 'xlarge';
export const TEXT_SIZES: TextSize[] = ['normal', 'large', 'xlarge'];
const SCALE: Record<TextSize, { fontScale: number; minTouch: number }> = {
  normal: { fontScale: 1, minTouch: 52 },
  large: { fontScale: 1.18, minTouch: 58 },
  xlarge: { fontScale: 1.36, minTouch: 66 },
};

export interface Theme {
  colors: Palette;
  isDark: boolean;
  fontScale: number;
  minTouch: number;
  radius: number;
  font: (size: number) => number;
}

export function buildTheme(isDark: boolean, paletteId: PaletteId = DEFAULT_PALETTE, textSize: TextSize = 'normal'): Theme {
  const entry = PALETTE_DICTIONARY[paletteId] ?? PALETTE_DICTIONARY[DEFAULT_PALETTE];
  const s = SCALE[textSize] ?? SCALE.normal;
  return { colors: isDark ? entry.dark : entry.light, isDark, fontScale: s.fontScale, minTouch: s.minTouch, radius: 20, font: (size) => Math.round(size * s.fontScale) };
}

const ThemeContext = createContext<Theme>(buildTheme(false));

export function ThemeProvider({ paletteId = DEFAULT_PALETTE, textSize = 'normal', children }: { paletteId?: PaletteId; textSize?: TextSize; children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => buildTheme(isDark, paletteId, textSize), [isDark, paletteId, textSize]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

// Les écrans s'étendent sous les barres du système (plein écran d'Android récent). Ce cadre réserve, pour TOUS les écrans:
//  - en bas: la barre de navigation ou de gestes (sinon « Terminer », « Envoyer »… passent dessous);
//  - en haut: seulement ce qui dépasse la marge de 48 que les écrans prévoient déjà (grandes encoches).
export const TOP_ALREADY_RESERVED = 48;
export const frameInsets = (insets: { top: number; bottom: number }) => ({
  paddingTop: Math.max(0, insets.top - TOP_ALREADY_RESERVED),
  paddingBottom: Math.max(0, insets.bottom),
});

export function AppFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return <View testID="app-frame" style={[{ flex: 1, backgroundColor: colors.background }, frameInsets(insets)]}>{children}</View>;
}

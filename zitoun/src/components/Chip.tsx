import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ZText } from './ZText';

interface Props { label: string; sublabel?: string; selected?: boolean; onPress: () => void; testID?: string; style?: StyleProp<ViewStyle> }

// Choix unique: la sélection se voit par le remplissage ET le poids du texte (jamais la couleur seule).
export function Chip({ label, sublabel, selected, onPress, testID, style }: Props) {
  const { colors, minTouch } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityState={{ selected: !!selected, checked: !!selected }}
      onPress={onPress}
      style={[{
        minHeight: minTouch - 6,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}
    >
      <ZText center color={selected ? colors.onPrimary : colors.text} style={{ fontWeight: selected ? '600' : '400' }}>{label}</ZText>
      {sublabel ? <ZText variant="small" center color={selected ? colors.onPrimary : colors.textMuted}>{sublabel}</ZText> : null}
    </Pressable>
  );
}

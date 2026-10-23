import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

interface Props {
  label: string;
  onPress: () => void;
  hint?: string;
}

export function KButton({ label, onPress, hint }: Props) {
  const { colors, profile } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: profile.minTouchSize,
        borderRadius: profile.radius,
        backgroundColor: colors.primary,
        opacity: pressed ? 0.85 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      })}
    >
      <KText weight="600" size={17} style={{ color: colors.onPrimary }}>{label}</KText>
    </Pressable>
  );
}

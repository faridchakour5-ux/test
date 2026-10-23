import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

interface Props {
  label: string;
  onPress: () => void;
  hint?: string;
  variant?: 'primary' | 'secondary'; // secondaire: action moins importante (bordure, sans fond plein)
}

export function KButton({ label, onPress, hint, variant = 'primary' }: Props) {
  const { colors, profile } = useTheme();
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: profile.minTouchSize,
        borderRadius: profile.radius,
        backgroundColor: secondary ? 'transparent' : colors.primary,
        borderWidth: secondary ? 2 : 0,
        borderColor: colors.primary,
        opacity: pressed ? 0.85 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      })}
    >
      <KText weight="600" size={17} style={{ color: secondary ? colors.text : colors.onPrimary, textAlign: 'center' }}>{label}</KText>
    </Pressable>
  );
}

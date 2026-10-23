import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props extends TextProps {
  size?: number;
  muted?: boolean;
  weight?: '400' | '600' | '800';
}

export function KText({ size = 16, muted, weight = '400', style, ...rest }: Props) {
  const { colors, font } = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontSize: font(size), color: muted ? colors.textMuted : colors.text, fontWeight: weight }, style]}
    />
  );
}

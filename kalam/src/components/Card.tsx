import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Card({ style, ...rest }: ViewProps) {
  const { colors, profile } = useTheme();
  return (
    <View
      {...rest}
      style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: profile.radius, padding: 16 }, style]}
    />
  );
}

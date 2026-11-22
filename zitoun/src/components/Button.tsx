import React from 'react';
import { Pressable, View } from 'react-native';
import { useLang } from '../i18n/LangContext';
import { useTheme } from '../theme/ThemeProvider';
import { ZText } from './ZText';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  hint?: string;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, hint, testID }: Props) {
  const { colors, minTouch } = useTheme();
  const { lang } = useLang();
  const primary = variant === 'primary';
  const text = variant === 'text';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: minTouch,
        borderRadius: 999,
        backgroundColor: primary ? colors.primary : 'transparent',
        borderWidth: variant === 'secondary' ? 1.5 : 0,
        borderColor: colors.primary,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: text ? 8 : 28,
      })}
    >
      <View>
        <ZText
          center
          color={primary ? colors.onPrimary : text ? colors.primary : colors.text}
          style={{ fontWeight: '600', letterSpacing: lang === 'ar' ? 0 : 0.3, textDecorationLine: text ? 'underline' : 'none' }}
        >
          {label}
        </ZText>
      </View>
    </Pressable>
  );
}

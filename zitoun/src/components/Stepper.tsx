import React from 'react';
import { Pressable, View } from 'react-native';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { useTheme } from '../theme/ThemeProvider';
import { ZText } from './ZText';

interface Props { value: number; min?: number; max: number; onChange: (n: number) => void; compact?: boolean }

export function Stepper({ value, min = 1, max, onChange, compact }: Props) {
  const { colors, minTouch } = useTheme();
  const { lang, t } = useLang();
  const size = compact ? 40 : minTouch;
  const round = (symbol: string, label: string, disabled: boolean, next: number, testID: string) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: disabled ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <ZText variant="heading" color={disabled ? colors.border : colors.primary} style={{ lineHeight: undefined }}>{symbol}</ZText>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: rowDirection(lang), alignItems: 'center', gap: 18 }}>
      {round('−', t('decrease'), value <= min, value - 1, 'minus')}
      <ZText variant="title" center style={{ minWidth: 36 }} accessibilityLiveRegion="polite">{value}</ZText>
      {round('+', t('increase'), value >= max, value + 1, 'plus')}
    </View>
  );
}

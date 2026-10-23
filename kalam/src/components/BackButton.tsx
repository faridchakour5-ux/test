import React from 'react';
import { Pressable } from 'react-native';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

export function BackButton({ lang, onPress }: { lang: UiLang; onPress: () => void }) {
  const { colors, profile } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'back')} onPress={onPress} style={{ minHeight: profile.minTouchSize, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <KText weight="600" style={{ color: colors.primary }}>← {t(lang, 'back')}</KText>
    </Pressable>
  );
}

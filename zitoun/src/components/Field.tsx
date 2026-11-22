import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { useLang } from '../i18n/LangContext';
import { textAlign } from '../i18n/layout';
import { useTheme } from '../theme/ThemeProvider';
import { ZText } from './ZText';

interface Props extends Omit<TextInputProps, 'style'> { label: string; optional?: boolean; error?: string | null }

// Champ à soulignement: sobre, sans cadre. L'erreur s'écrit en toutes lettres sous le champ.
export function Field({ label, optional, error, ...input }: Props) {
  const { colors, font, minTouch } = useTheme();
  const { lang, t } = useLang();
  const align = textAlign(lang);
  return (
    <View style={{ gap: 4 }}>
      <ZText variant="label">{optional ? `${label} · ${t('optional')}` : label}</ZText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        maxFontSizeMultiplier={1.3}
        textAlign={align === 'auto' ? undefined : align}
        {...input}
        style={{ minHeight: minTouch - 8, fontSize: font(17), color: colors.text, borderBottomWidth: 1.5, borderBottomColor: error ? colors.danger : colors.border, paddingVertical: 8 }}
      />
      {error ? <ZText variant="small" color={colors.danger} accessibilityLiveRegion="polite">{error}</ZText> : null}
    </View>
  );
}

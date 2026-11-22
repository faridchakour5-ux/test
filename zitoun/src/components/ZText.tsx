import React from 'react';
import { Text, TextProps } from 'react-native';
import { useLang } from '../i18n/LangContext';
import { textAlign } from '../i18n/layout';
import { useTheme } from '../theme/ThemeProvider';

// Hiérarchie typographique sobre: titres en empattement (élégance), texte courant sans empattement, étiquettes en petites capitales espacées.
export type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label' | 'price';

const SPEC: Record<Variant, { size: number; line: number; serif?: boolean; weight?: '400' | '500' | '600'; muted?: boolean; upper?: boolean }> = {
  display: { size: 34, line: 42, serif: true },
  title: { size: 26, line: 32, serif: true },
  heading: { size: 20, line: 26, serif: true },
  body: { size: 16, line: 24 },
  small: { size: 14, line: 20, muted: true },
  label: { size: 12, line: 16, weight: '600', muted: true, upper: true },
  price: { size: 20, line: 26, serif: true, weight: '500' },
};

interface Props extends TextProps { variant?: Variant; muted?: boolean; color?: string; center?: boolean }

export function ZText({ variant = 'body', muted, color, center, style, ...rest }: Props) {
  const { colors, font, fontScale } = useTheme();
  const { lang } = useLang();
  const s = SPEC[variant];
  const arabic = lang === 'ar';
  return (
    <Text
      maxFontSizeMultiplier={1.3} // le thème agrandit déjà: on plafonne le cumul avec le réglage du téléphone
      {...rest}
      style={[
        {
          fontSize: font(s.size),
          lineHeight: Math.round(s.line * fontScale),
          color: color ?? (muted ?? s.muted ? colors.textMuted : colors.text),
          fontWeight: s.weight ?? '400',
          fontFamily: s.serif ? 'serif' : undefined,
          textAlign: center ? 'center' : textAlign(lang),
          // L'arabe est une écriture liée: ni espacement entre lettres ni majuscules.
          letterSpacing: arabic ? 0 : s.upper ? 1.4 : variant === 'display' ? -0.3 : 0,
          textTransform: !arabic && s.upper ? 'uppercase' : 'none',
        },
        style,
      ]}
    />
  );
}

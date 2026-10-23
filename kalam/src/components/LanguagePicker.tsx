import React from 'react';
import { I18nManager, Pressable, View } from 'react-native';
import { LANG_NAMES, UI_LANGS, UiLang, isRtl, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

// Sens de lecture au lancement de l'app: sert à savoir si un redémarrage est nécessaire.
const I18N_RTL_AT_START = I18nManager.isRTL;

interface Props {
  value: UiLang;
  onChange: (l: UiLang) => void;
}

export function LanguagePicker({ value, onChange }: Props) {
  const { colors, profile } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <KText weight="800" accessibilityRole="header">🌐 {t(value, 'language')}</KText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {UI_LANGS.map((l) => {
          const on = l === value;
          return (
            <Pressable key={l} accessibilityRole="button" accessibilityLabel={LANG_NAMES[l]} accessibilityState={{ selected: on }} onPress={() => onChange(l)}
              style={{ minHeight: profile.minTouchSize, minWidth: 64, paddingHorizontal: 14, borderRadius: profile.radius, alignItems: 'center', justifyContent: 'center',
                borderWidth: on ? 3 : 1, borderColor: on ? colors.primary : colors.border, backgroundColor: colors.surface }}>
              <KText weight="600">{on ? '✓ ' : ''}{LANG_NAMES[l]}</KText>
            </Pressable>
          );
        })}
      </View>
      {/* Changer le sens de lecture (arabe <-> autres) demande de relancer l'app: on le dit clairement. */}
      {isRtl(value) !== I18N_RTL_AT_START && <KText size={13} muted accessibilityLiveRegion="polite">{t(value, 'restartRtl')}</KText>}
    </View>
  );
}

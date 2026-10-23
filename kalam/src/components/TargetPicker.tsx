import React from 'react';
import { Pressable, View } from 'react-native';
import { TARGET_LANGS, TARGET_NAMES, TargetLang } from '../domain/targets';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

interface Props {
  lang: UiLang;
  value: TargetLang;
  onChange: (t: TargetLang) => void;
}

// Choix de la langue à apprendre (anglais, français).
export function TargetPicker({ lang, value, onChange }: Props) {
  const { colors, profile } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <KText weight="800" accessibilityRole="header">🎓 {t(lang, 'learnLang')}</KText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TARGET_LANGS.map((tl) => {
          const on = tl === value;
          return (
            <Pressable key={tl} accessibilityRole="radio" accessibilityLabel={`${t(lang, 'learnLang')}: ${TARGET_NAMES[lang][tl]}`} accessibilityState={{ checked: on }} onPress={() => onChange(tl)}
              style={{ minHeight: profile.minTouchSize, minWidth: 96, paddingHorizontal: 14, borderRadius: profile.radius, alignItems: 'center', justifyContent: 'center',
                borderWidth: on ? 3 : 1, borderColor: on ? colors.primary : colors.border, backgroundColor: colors.surface }}>
              <KText weight="600">{on ? '✓ ' : ''}{TARGET_NAMES[lang][tl]}</KText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

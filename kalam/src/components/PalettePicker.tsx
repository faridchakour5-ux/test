import React from 'react';
import { Pressable, View } from 'react-native';
import { UiLang, t } from '../i18n/strings';
import { PALETTE_DICTIONARY, PALETTE_IDS, PaletteId } from '../theme/palettes';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

interface Props {
  lang: UiLang;
  value: PaletteId;
  onChange: (id: PaletteId) => void;
}

export function PalettePicker({ lang, value, onChange }: Props) {
  const { colors, profile, isDark } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <KText weight="800">{t(lang, 'colors')}</KText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {PALETTE_IDS.map((id) => {
          const entry = PALETTE_DICTIONARY[id];
          const p = isDark ? entry.dark : entry.light;
          const selected = id === value;
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={entry.name[lang]} accessibilityState={{ selected }} onPress={() => onChange(id)}
              style={{ minHeight: profile.minTouchSize, borderRadius: profile.radius, borderWidth: selected ? 3 : 1, borderColor: selected ? colors.primary : colors.border, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface }}>
              <View style={{ flexDirection: 'row' }}>
                {[p.background, p.primary, p.text].map((c, i) => (
                  <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, borderWidth: 1, borderColor: colors.border, marginStart: i ? -6 : 0 }} />
                ))}
              </View>
              <KText size={14} weight="600">{selected ? '✓ ' : ''}{entry.name[lang]}</KText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

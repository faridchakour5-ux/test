import React from 'react';
import { I18nManager, Pressable, View } from 'react-native';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { ZText } from '../components/ZText';
import { LANGS, LANG_NAMES, Lang, isRtl } from '../i18n/strings';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { PALETTE_DICTIONARY, PALETTE_IDS, PaletteId } from '../theme/palettes';
import { TEXT_SIZES, TextSize, useTheme } from '../theme/ThemeProvider';

interface Props {
  palette: PaletteId; textSize: TextSize;
  onBack: () => void; onLang: (l: Lang) => void; onPalette: (p: PaletteId) => void; onTextSize: (s: TextSize) => void;
}

const SIZE_LABEL = { normal: 'sizeNormal', large: 'sizeLarge', xlarge: 'sizeXLarge' } as const;

export function SettingsScreen({ palette, textSize, onBack, onLang, onPalette, onTextSize }: Props) {
  const { colors, isDark, radius } = useTheme();
  const { lang, t } = useLang();
  const row = { flexDirection: rowDirection(lang), flexWrap: 'wrap', gap: 8 } as const;
  return (
    <Screen testID="settings" onBack={onBack}>
      <ZText variant="title">{t('settings')}</ZText>

      <View style={{ gap: 12 }}>
        <ZText variant="label">{t('langTitle')}</ZText>
        <View style={row}>{LANGS.map((l) => <Chip key={l} testID={`lang-${l}`} label={LANG_NAMES[l]} selected={l === lang} onPress={() => onLang(l)} />)}</View>
        {isRtl(lang) !== I18nManager.isRTL ? <ZText variant="small" accessibilityLiveRegion="polite">{t('restartRtl')}</ZText> : null}
      </View>

      <View style={{ gap: 12 }}>
        <ZText variant="label">{t('colors')}</ZText>
        <View style={{ gap: 10 }}>
          {PALETTE_IDS.map((id) => {
            const entry = PALETTE_DICTIONARY[id];
            const p = isDark ? entry.dark : entry.light;
            const selected = id === palette;
            return (
              <Pressable
                key={id}
                testID={`palette-${id}`}
                accessibilityRole="radio"
                accessibilityLabel={`${entry.name[lang]}. ${entry.mood[lang]}`}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => onPalette(id)}
                style={{ flexDirection: rowDirection(lang), alignItems: 'center', gap: 14, padding: 14, borderRadius: radius, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.surface }}
              >
                <View style={{ flexDirection: rowDirection(lang) }}>
                  {[p.background, p.primary, p.accent].map((c, i) => <View key={i} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: 1, borderColor: colors.border, marginStart: i ? -8 : 0 }} />)}
                </View>
                <View style={{ flex: 1 }}>
                  <ZText style={{ fontWeight: selected ? '600' : '400' }}>{entry.name[lang]}</ZText>
                  <ZText variant="small">{entry.mood[lang]}</ZText>
                </View>
                {selected ? <ZText color={colors.primary} style={{ fontWeight: '600' }}>✓</ZText> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <ZText variant="label">{t('textSizeTitle')}</ZText>
        <View style={row}>{TEXT_SIZES.map((s) => <Chip key={s} testID={`size-${s}`} label={t(SIZE_LABEL[s])} selected={s === textSize} onPress={() => onTextSize(s)} />)}</View>
      </View>

      <View style={{ gap: 6 }}>
        <ZText variant="label">{t('privacyTitle')}</ZText>
        <ZText variant="small">{t('privacyBody')}</ZText>
      </View>
    </Screen>
  );
}

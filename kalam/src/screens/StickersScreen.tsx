import React from 'react';
import { ScrollView, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { KText } from '../components/KText';
import { STICKERS } from '../domain/kids';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

export function StickersScreen({ lang, stars, onBack }: { lang: UiLang; stars: number; onBack: () => void }) {
  const { colors, profile } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 16 }}>
      <BackButton lang={lang} onPress={onBack} />
      <KText size={28} weight="800" accessibilityRole="header">🌟 {t(lang, 'stickers')}</KText>
      <KText muted>⭐ {stars}</KText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {STICKERS.map((s) => {
          const open = stars >= s.stars;
          return (
            <View key={s.id} accessible accessibilityLabel={open ? s.id : `${s.stars - stars} ${t(lang, 'stars')} ${t(lang, 'locked')}`}
              style={{ width: '30%', minHeight: 110, borderRadius: profile.radius, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <KText size={open ? 48 : 36}>{open ? s.emoji : '🔒'}</KText>
              {!open && <KText size={13} muted>{s.stars} ⭐</KText>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

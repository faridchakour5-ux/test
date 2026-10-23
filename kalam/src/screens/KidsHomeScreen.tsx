import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { DailyLimit, minutesLeft, timeIsUp } from '../domain/parental';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  stars: number;
  minutesToday: number;
  dailyLimit: DailyLimit;
  onStories: () => void;
  onPlay: () => void;
  onStickers: () => void;
  onParents: () => void;
}

function Tile({ emoji, label, onPress, tint }: { emoji: string; label: string; onPress: () => void; tint: string }) {
  const { profile } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 150, borderRadius: profile.radius, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1, padding: 12 })}
    >
      <KText size={52}>{emoji}</KText>
      <KText size={20} weight="800" style={{ color: '#1B1A2E', textAlign: 'center' }}>{label}</KText>
    </Pressable>
  );
}

export function KidsHomeScreen({ lang, stars, minutesToday, dailyLimit, onStories, onPlay, onStickers, onParents }: Props) {
  const { colors } = useTheme();
  const up = timeIsUp(dailyLimit, minutesToday);
  const left = minutesLeft(dailyLimit, minutesToday);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View accessible accessibilityLabel={`${stars} ${t(lang, 'stars')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}>
          <KText size={22}>⭐</KText>
          <KText size={20} weight="800">{stars}</KText>
        </View>
        {/* Bouton volontairement petit et discret: réservé aux parents (protégé par le portail). */}
        <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'parents')} onPress={onParents} style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}>
          <KText size={14} muted>🔒 {t(lang, 'parents')}</KText>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Mascot mood={up ? 'sleepy' : 'cheer'} size={200} />
        <KText size={32} weight="800" accessibilityRole="header">Kalam</KText>
      </View>

      {up ? (
        <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 8, padding: 16 }}>
          <KText size={26} weight="800" style={{ textAlign: 'center' }}>{t(lang, 'timeUpTitle')}</KText>
          <KText size={18} muted style={{ textAlign: 'center' }}>{t(lang, 'timeUpBody')}</KText>
        </View>
      ) : (
        <>
          {left !== null && <KText muted style={{ textAlign: 'center' }}>{t(lang, 'timeLeft')}: {left} {t(lang, 'minutes')}</KText>}
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Tile emoji="📖" label={t(lang, 'stories')} onPress={onStories} tint="#FFD6E0" />
            <Tile emoji="🎮" label={t(lang, 'play')} onPress={onPlay} tint="#CDEBFF" />
          </View>
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Tile emoji="🌟" label={t(lang, 'stickers')} onPress={onStickers} tint="#FFF1B8" />
      </View>
    </ScrollView>
  );
}

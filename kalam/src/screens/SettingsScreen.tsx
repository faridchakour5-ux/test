import React from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { LanguagePicker } from '../components/LanguagePicker';
import { PalettePicker } from '../components/PalettePicker';
import { UiLang, isRtl, t } from '../i18n/strings';
import { PaletteId } from '../theme/palettes';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  dailyGoal: 5 | 10 | 20;
  onGoal: (g: 5 | 10 | 20) => void;
  palette: PaletteId;
  onPalette: (p: PaletteId) => void;
  onLang: (l: UiLang) => void;
  onSwitchProfile: () => void;
  onExport: () => Promise<string>;
  onErase: () => void;
  onBack: () => void;
}

// Réglages (ados, adultes, seniors): tout ce qui n'a pas besoin d'être sur l'écran d'accueil.
export function SettingsScreen({ lang, dailyGoal, onGoal, palette, onPalette, onLang, onSwitchProfile, onExport, onErase, onBack }: Props) {
  const { colors, profile } = useTheme();
  const row = { flexDirection: isRtl(lang) ? ('row-reverse' as const) : ('row' as const), gap: 8 };
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 20 }}>
      <BackButton lang={lang} onPress={onBack} />
      <KText size={28} weight="800" accessibilityRole="header">⚙️ {t(lang, 'settings')}</KText>

      <LanguagePicker value={lang} onChange={onLang} />
      <PalettePicker lang={lang} value={palette} onChange={onPalette} />

      <Card style={{ gap: 8 }}>
        <KText weight="800" accessibilityRole="header">{t(lang, 'goal')}</KText>
        <View style={row}>
          {([5, 10, 20] as const).map((g) => (
            <Pressable key={g} accessibilityRole="button" accessibilityLabel={`${g} ${t(lang, 'minutes')}`} accessibilityState={{ selected: dailyGoal === g }} onPress={() => onGoal(g)}
              style={{ minHeight: profile.minTouchSize, minWidth: profile.minTouchSize, borderRadius: profile.radius, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
                backgroundColor: dailyGoal === g ? colors.primary : 'transparent', borderWidth: 1, borderColor: colors.border }}>
              <KText weight="600" style={{ color: dailyGoal === g ? colors.onPrimary : colors.text }}>{g} {t(lang, 'minutes')}</KText>
            </Pressable>
          ))}
        </View>
      </Card>

      <KButton label={t(lang, 'switchProfile')} onPress={onSwitchProfile} />

      <Pressable accessibilityRole="button" onPress={async () => {
        try { await Share.share({ title: t(lang, 'exportTitle'), message: await onExport() }); }
        catch { Alert.alert(t(lang, 'exportFailed')); }
      }} style={{ minHeight: profile.minTouchSize, alignItems: 'center', justifyContent: 'center' }}>
        <KText muted weight="600">{t(lang, 'exportMine')}</KText>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => Alert.alert(t(lang, 'eraseMine'), t(lang, 'eraseMineBody'), [
        { text: t(lang, 'cancel'), style: 'cancel' },
        { text: t(lang, 'eraseConfirm'), style: 'destructive', onPress: onErase },
      ])} style={{ minHeight: profile.minTouchSize, alignItems: 'center', justifyContent: 'center' }}>
        <KText muted weight="600">{t(lang, 'eraseMine')}</KText>
      </Pressable>
    </ScrollView>
  );
}

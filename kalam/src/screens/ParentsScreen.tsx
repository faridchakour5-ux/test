import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { LanguagePicker } from '../components/LanguagePicker';
import { PalettePicker } from '../components/PalettePicker';
import { PaletteId } from '../theme/palettes';
import { DailyLimit, checkGate, makeGate } from '../domain/parental';
import { UiLang, t } from '../i18n/strings';
import { KidsState } from '../state/AppState';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  kids: KidsState;
  minutesToday: number;
  onMic: (on: boolean) => void;
  onLimit: (l: DailyLimit) => void;
  onSwitchProfile: () => void;
  onErase: () => void;
  onBack: () => void;
  palette: PaletteId;
  onPalette: (p: PaletteId) => void;
  onLang: (l: UiLang) => void;
}

export function ParentsScreen({ lang, kids, minutesToday, onMic, onLimit, onSwitchProfile, onErase, onBack, palette, onPalette, onLang }: Props) {
  const { colors, profile } = useTheme();
  const [gate, setGate] = useState(() => makeGate());
  const [unlocked, setUnlocked] = useState(false);
  const [wrong, setWrong] = useState(false);
  const limits: DailyLimit[] = [10, 20, 30, null];

  const tryAnswer = (n: number) => {
    if (checkGate(gate, n)) { setUnlocked(true); setWrong(false); }
    else { setWrong(true); setGate(makeGate()); } // nouvelle question: on ne peut pas deviner par essais
  };

  const confirmErase = () =>
    Alert.alert(t(lang, 'eraseTitle'), t(lang, 'eraseBody'), [
      { text: t(lang, 'cancel'), style: 'cancel' },
      { text: t(lang, 'eraseConfirm'), style: 'destructive', onPress: onErase },
    ]);

  if (!unlocked) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 56, gap: 18 }}>
        <BackButton lang={lang} onPress={onBack} />
        <KText size={26} weight="800" accessibilityRole="header">🔒 {t(lang, 'gateTitle')}</KText>
        <KText size={20}>{t(lang, 'gateIntro')} {gate.question.a} × {gate.question.b} ?</KText>
        {wrong && <KText accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>{t(lang, 'gateWrong')}</KText>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {gate.options.map((o) => (
            <Pressable key={o} accessibilityRole="button" accessibilityLabel={String(o)} onPress={() => tryAnswer(o)}
              style={{ width: '47%', minHeight: 64, borderRadius: profile.radius, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <KText size={24} weight="800">{o}</KText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 56, gap: 16 }}>
      <BackButton lang={lang} onPress={onBack} />
      <KText size={26} weight="800" accessibilityRole="header">{t(lang, 'gateTitle')}</KText>
      <KText muted>{t(lang, 'privacyNote')}</KText>

      <Card style={{ gap: 6 }}>
        <KText weight="800">{t(lang, 'progressTitle')}</KText>
        <KText>⭐ {kids.stars} {t(lang, 'stars')}</KText>
        <KText>📖 {t(lang, 'storiesRead')}: {kids.storiesRead.length}</KText>
        <KText>⏱ {t(lang, 'minutesToday')}: {minutesToday}</KText>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <KText weight="800" style={{ flex: 1 }}>{t(lang, 'micConsentTitle')}</KText>
          <Switch value={kids.consent.micAllowed} onValueChange={onMic} accessibilityLabel={t(lang, 'micConsentTitle')} />
        </View>
        <KText size={14} muted>{t(lang, 'micConsentBody')}</KText>
      </Card>

      <Card style={{ gap: 10 }}>
        <KText weight="800">{t(lang, 'limitTitle')}</KText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {limits.map((l) => {
            const on = kids.dailyLimit === l;
            return (
              <Pressable key={String(l)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onLimit(l)}
                style={{ minHeight: 48, minWidth: 64, paddingHorizontal: 14, borderRadius: profile.radius, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: on ? colors.primary : 'transparent' }}>
                <KText weight="600" style={{ color: on ? colors.onPrimary : colors.text }}>{l === null ? t(lang, 'noLimit') : `${l} ${t(lang, 'minutes')}`}</KText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <LanguagePicker value={lang} onChange={onLang} />
      <PalettePicker lang={lang} value={palette} onChange={onPalette} />

      <KButton label={t(lang, 'switchProfile')} onPress={onSwitchProfile} />

      <Card style={{ gap: 8 }}>
        <KText weight="800">{t(lang, 'eraseTitle')}</KText>
        <KText size={14} muted>{t(lang, 'eraseBody')}</KText>
        <Pressable accessibilityRole="button" onPress={confirmErase} style={{ minHeight: 48, borderRadius: profile.radius, borderWidth: 2, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
          <KText weight="800" style={{ color: colors.danger }}>{t(lang, 'eraseTitle')}</KText>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

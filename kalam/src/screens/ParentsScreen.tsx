import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Switch, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { LanguagePicker } from '../components/LanguagePicker';
import { PalettePicker } from '../components/PalettePicker';
import { PaletteId } from '../theme/palettes';
import { DailyLimit, checkGate, isGateLocked, makeGate, registerGateFail } from '../domain/parental';
import { getGateLock, resetGateLock, setGateLock } from '../state/gateLock';
import { UiLang, t } from '../i18n/strings';
import { KidsState } from '../state/AppState';
import { useTheme } from '../theme/ThemeProvider';
import { useHardwareBack } from '../navigation/useHardwareBack';

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
  onExport: () => Promise<string>;
}

const clock = () => Date.now(); // lu seulement au moment d'un appui ou d'une minuterie, jamais pendant le rendu

export function ParentsScreen({ lang, kids, minutesToday, onMic, onLimit, onSwitchProfile, onErase, onBack, palette, onPalette, onLang, onExport }: Props) {
  const { colors, profile } = useTheme();
  useHardwareBack(onBack);
  const [gate, setGate] = useState(() => makeGate());
  const [unlocked, setUnlocked] = useState(false);
  const [wrong, setWrong] = useState(false);
  const limits: DailyLimit[] = [10, 20, 30, null];

  const [lock, setLock] = useState(getGateLock);
  const [now, setNow] = useState(() => Date.now());
  const locked = isGateLocked(lock, now);

  // Quand la pause se termine, on réactive les boutons.
  useEffect(() => {
    if (!locked) return;
    const id = setTimeout(() => setNow(clock()), Math.max(0, lock.lockedUntil - clock()) + 50);
    return () => clearTimeout(id);
  }, [locked, lock.lockedUntil]);

  const tryAnswer = (n: number) => {
    const at = clock();
    if (isGateLocked(lock, at)) return;
    setNow(at);
    if (checkGate(gate, n)) { resetGateLock(); setLock(getGateLock()); setUnlocked(true); setWrong(false); return; }
    const next = registerGateFail(lock, at);
    setGateLock(next);
    setLock(next);
    setWrong(true);
    setGate(makeGate()); // nouvelle question à chaque erreur
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
        {(wrong || locked) && <KText accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>{t(lang, locked ? 'gateLocked' : 'gateWrong')}</KText>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {gate.options.map((o) => (
            <Pressable key={o} accessibilityRole="button" accessibilityLabel={String(o)} accessibilityState={{ disabled: locked }} disabled={locked} onPress={() => tryAnswer(o)}
              style={{ width: '47%', minHeight: 64, borderRadius: profile.radius, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, opacity: locked ? 0.4 : 1, alignItems: 'center', justifyContent: 'center' }}>
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

      <KButton label={t(lang, 'exportMine')} onPress={async () => {
        try { await Share.share({ title: t(lang, 'exportTitle'), message: await onExport() }); }
        catch { Alert.alert(t(lang, 'exportFailed')); }
      }} />

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

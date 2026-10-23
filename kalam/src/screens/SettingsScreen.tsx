import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Switch, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { LanguagePicker } from '../components/LanguagePicker';
import { PalettePicker } from '../components/PalettePicker';
import { StringKey, UiLang, isRtl, t } from '../i18n/strings';
import { REMINDER_TIMES, ReminderFailure, ReminderResult, ReminderSetting, timeLabel } from '../notifications/reminders';
import { openAppSettings } from '../speech/openSettings';
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
  reminder: ReminderSetting;
  reminderAvailable: boolean; // le module de notifications existe sur cet appareil
  onReminder: (next: ReminderSetting) => Promise<ReminderResult>;
}

const REMINDER_PROBLEM: Record<ReminderFailure, StringKey> = {
  unavailable: 'reminderUnavailable',
  permission: 'reminderDenied',
  'permission-blocked': 'reminderBlocked',
  error: 'reminderError',
};

// Réglages (ados, adultes, seniors): tout ce qui n'a pas besoin d'être sur l'écran d'accueil.
export function SettingsScreen({ lang, dailyGoal, onGoal, palette, onPalette, onLang, onSwitchProfile, onExport, onErase, onBack, reminder, reminderAvailable: available, onReminder }: Props) {
  const { colors, profile } = useTheme();
  const [problem, setProblem] = useState<ReminderFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const changeReminder = async (next: ReminderSetting) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const r = await onReminder(next);
      if (!r.ok) setProblem(r.reason);
    } finally {
      setBusy(false);
    }
  };
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

      <Card style={{ gap: 10 }}>
        <View style={{ ...row, justifyContent: 'space-between', alignItems: 'center' }}>
          <KText weight="800" accessibilityRole="header" style={{ flex: 1 }}>⏰ {t(lang, 'reminderTitle')}</KText>
          <Switch
            accessibilityLabel={t(lang, 'reminderToggle')}
            value={reminder.enabled}
            disabled={busy || !available}
            onValueChange={(on) => { void changeReminder({ ...reminder, enabled: on }); }}
          />
        </View>
        <KText muted size={14}>{t(lang, 'reminderHint')}</KText>
        {reminder.enabled && (
          <View style={{ ...row, flexWrap: 'wrap' }}>
            {REMINDER_TIMES.map(({ hour, minute }) => {
              const selected = reminder.hour === hour && reminder.minute === minute;
              return (
                <Pressable key={timeLabel(hour, minute)} accessibilityRole="button" accessibilityLabel={timeLabel(hour, minute)} accessibilityState={{ selected }}
                  onPress={() => { void changeReminder({ ...reminder, hour, minute }); }}
                  style={{ minHeight: profile.minTouchSize, minWidth: profile.minTouchSize, borderRadius: profile.radius, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
                    backgroundColor: selected ? colors.primary : 'transparent', borderWidth: 1, borderColor: colors.border }}>
                  <KText weight="600" style={{ color: selected ? colors.onPrimary : colors.text }}>{timeLabel(hour, minute)}</KText>
                </Pressable>
              );
            })}
          </View>
        )}
        {(problem || !available) && (
          <KText accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{t(lang, REMINDER_PROBLEM[problem ?? 'unavailable'])}</KText>
        )}
        {problem === 'permission-blocked' && <KButton variant="secondary" label={t(lang, 'openSettings')} onPress={() => { void openAppSettings(); }} />}
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

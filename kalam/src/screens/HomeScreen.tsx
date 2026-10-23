import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { Mascot } from '../components/Mascot';
import { LanguagePicker } from '../components/LanguagePicker';
import { PalettePicker } from '../components/PalettePicker';
import { PaletteId } from '../theme/palettes';
import { KText } from '../components/KText';
import { LESSONS, Level, recommendLessons } from '../domain/lessons';
import { Progress, goalReached, lastDays } from '../domain/progress';
import { LevelBadge } from '../components/LevelBadge';
import { WeekChart } from '../components/WeekChart';
import { UiLang, isRtl, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  level: Level;
  progress: Progress;
  onOpenLesson: (id: string) => void;
  onGoal: (g: 5 | 10 | 20) => void;
  dueCount: number;
  onReview: () => void;
  onSwitchProfile: () => void;
  palette: PaletteId;
  onPalette: (p: PaletteId) => void;
  onLang: (l: UiLang) => void;
  onErase: () => void;
}

export function HomeScreen({ lang, level, progress, onOpenLesson, onGoal, dueCount, onReview, onSwitchProfile, palette, onPalette, onLang, onErase }: Props) {
  const { colors, profile } = useTheme();
  const rtl = isRtl(lang);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const), gap: 8 };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 }}>
        <Mascot mood={goalReached(progress) ? 'cheer' : 'happy'} size={profile.id === 'kids' ? 120 : 80} />
        <View style={{ flex: 1 }}>
          <KText size={30} weight="800" accessibilityRole="header">Kalam · {level}</KText>
          <KText muted>{t(lang, 'hello')}</KText>
        </View>
      </View>
      <KButton label={dueCount > 0 ? `${t(lang, 'review')} (${dueCount} ${t(lang, 'reviewDue')})` : t(lang, 'review')} onPress={onReview} />

      <Card style={{ gap: 8 }}>
        <KText weight="600">{t(lang, 'goal')}: {progress.minutesToday}/{progress.dailyGoalMinutes} {t(lang, 'minutes')}</KText>
        {goalReached(progress) && <KText>{t(lang, 'goalReached')}</KText>}
        <KText muted>{t(lang, 'streak')}: {progress.streak}</KText>
        <View style={row}>
          {([5, 10, 20] as const).map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityState={{ selected: progress.dailyGoalMinutes === g }}
              onPress={() => onGoal(g)}
              style={{ minHeight: profile.minTouchSize, minWidth: profile.minTouchSize, borderRadius: profile.radius, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
                backgroundColor: progress.dailyGoalMinutes === g ? colors.primary : 'transparent', borderWidth: 1, borderColor: colors.border }}
            >
              <KText weight="600" style={{ color: progress.dailyGoalMinutes === g ? colors.onPrimary : colors.text }}>{g}</KText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card><LevelBadge lang={lang} xp={progress.xp} /></Card>

      <Card style={{ gap: 8 }}>
        <KText weight="800" accessibilityRole="header">📊 {t(lang, 'thisWeek')}</KText>
        <WeekChart lang={lang} bars={lastDays(progress, progress.today)} goal={progress.dailyGoalMinutes} lessonsDone={progress.completedLessons.length} />
      </Card>

      {recommendLessons(level, progress.completedLessons).length > 0 && (
        <>
          <KText size={22} weight="600" accessibilityRole="header">⭐ {t(lang, 'recommended')}</KText>
          {recommendLessons(level, progress.completedLessons).map((l) => (
            <Pressable key={`rec-${l.id}`} accessibilityRole="button" accessibilityLabel={l.title[lang]} onPress={() => onOpenLesson(l.id)}>
              <Card style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: profile.minTouchSize, borderColor: colors.primary, borderWidth: 2 }}>
                <KText weight="600">{l.title[lang]}</KText>
                <KText muted>{l.level}</KText>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      <KText size={22} weight="600" accessibilityRole="header">{t(lang, 'allLessons')}</KText>
      {LESSONS.map((l) => (
        <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.title[lang]} onPress={() => onOpenLesson(l.id)}>
          <Card style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: profile.minTouchSize }}>
            <KText weight="600">{l.title[lang]}</KText>
            <KText muted>{progress.completedLessons.includes(l.id) ? `✓ ${t(lang, 'done')}` : l.level}</KText>
          </Card>
        </Pressable>
      ))}
      <LanguagePicker value={lang} onChange={onLang} />
      <PalettePicker lang={lang} value={palette} onChange={onPalette} />
      <KButton label={t(lang, 'switchProfile')} onPress={onSwitchProfile} />
      <Pressable accessibilityRole="button" onPress={() => Alert.alert(t(lang, 'eraseMine'), t(lang, 'eraseMineBody'), [
        { text: t(lang, 'cancel'), style: 'cancel' },
        { text: t(lang, 'eraseConfirm'), style: 'destructive', onPress: onErase },
      ])} style={{ minHeight: profile.minTouchSize, alignItems: 'center', justifyContent: 'center' }}>
        <KText muted weight="600">{t(lang, 'eraseMine')}</KText>
      </Pressable>
    </ScrollView>
  );
}

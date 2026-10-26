import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card } from '../components/Card';
import { ChallengeCard } from '../components/ChallengeCard';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { LevelBadge } from '../components/LevelBadge';
import { Mascot } from '../components/Mascot';
import { TargetPicker } from '../components/TargetPicker';
import { WeekChart } from '../components/WeekChart';
import { LESSONS, Level, recommendLessons } from '../domain/lessons';
import { Progress, currentStreak, goalReached, lastDays, rollDay } from '../domain/progress';
import { DEFAULT_TARGET, TargetLang, lessonKey } from '../domain/targets';
import { UiLang, isRtl, t, tf } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  level: Level;
  progress: Progress;
  onOpenLesson: (id: string) => void;
  dueCount: number;
  onReview: () => void;
  onDuo: () => void;
  onSettings: () => void;
  target?: TargetLang; // langue apprise
  onTarget: (t: TargetLang) => void;
  today: string; // jour local courant (YYYY-MM-DD)
  // Proposition unique d'un rappel doux (après la première leçon). Absente = rien à proposer.
  reminderOffer?: { time: string; onAccept: () => void; onLater: () => void };
}

// Accueil: un seul geste évident (« Continuer »), l'essentiel de la progression, puis les leçons.
// Les réglages vivent dans leur propre écran.
export function HomeScreen({ lang, level, progress: storedProgress, onOpenLesson, dueCount, onReview, onDuo, onSettings, today, target = DEFAULT_TARGET, onTarget, reminderOffer }: Props) {
  // La progression sauvegardée peut dater d'hier: on l'aligne sur le jour courant pour l'affichage.
  const progress = rollDay(storedProgress, today);
  const { colors, profile } = useTheme();
  const rtl = isRtl(lang);
  const recommended = recommendLessons(level, progress.completedLessons, 3, target);
  // La prochaine leçon conseillée; à défaut (tout est fait), la conversation libre.
  const next = recommended[0] ?? LESSONS.find((l) => l.id === 'free');

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 16 }}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 }}>
        <Mascot mood={goalReached(progress) ? 'cheer' : 'happy'} size={profile.id === 'kids' ? 120 : 72} />
        <View style={{ flex: 1 }}>
          {/* « Kalam » puis le niveau dans une pastille: avec de gros caractères (seniors), le niveau passe à la ligne entier au lieu de couper « · A1 » */}
          <View accessible accessibilityRole="header" accessibilityLabel={`Kalam · ${level}`}
            style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4 }}>
            <KText size={28} weight="800">Kalam</KText>
            <View style={{ borderWidth: 2, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 }}>
              <KText size={16} weight="800">{level}</KText>
            </View>
          </View>
          <KText muted>{t(lang, 'hello')}</KText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'settings')} onPress={onSettings}
          style={{ minHeight: Math.max(profile.minTouchSize, 48), minWidth: Math.max(profile.minTouchSize, 48), alignItems: 'center', justifyContent: 'center' }}>
          <KText size={26}>⚙️</KText>
        </Pressable>
      </View>

      {next && <KButton label={`▶ ${t(lang, 'continueLesson')}: ${next.title[lang]}`} onPress={() => onOpenLesson(next.id)} />}

      {/* Boutons l'un sous l'autre: les libellés longs (espagnol, chinois, grands textes) ne se cassent plus sur plusieurs lignes. */}
      <View style={{ gap: 12 }}>
        <KButton variant={dueCount > 0 ? 'primary' : 'secondary'} label={dueCount > 0 ? `${t(lang, 'review')} (${dueCount})` : t(lang, 'review')} onPress={onReview} hint={dueCount > 0 ? `${dueCount} ${t(lang, 'reviewDue')}` : undefined} />
        <KButton variant="secondary" label={`👥 ${t(lang, 'duoTitle')}`} onPress={onDuo} />
      </View>

      <Card style={{ gap: 10 }}>
        <LevelBadge lang={lang} xp={progress.xp} />
        <KText weight="600">{t(lang, 'goal')}: {progress.minutesToday}/{progress.dailyGoalMinutes} {t(lang, 'minutes')}</KText>
        {goalReached(progress) && <KText>{t(lang, 'goalReached')}</KText>}
        <KText muted>{t(lang, 'streak')}: {currentStreak(progress, today)}</KText>
      </Card>

      <ChallengeCard lang={lang} progress={progress} today={today} />

      {reminderOffer && (
        <Card style={{ gap: 10 }}>
          <KText weight="800" accessibilityRole="header">⏰ {t(lang, 'reminderOfferTitle')}</KText>
          <KText muted>{t(lang, 'reminderOfferBody')}</KText>
          <KButton label={tf(lang, 'reminderOfferYes', { time: reminderOffer.time })} onPress={reminderOffer.onAccept} />
          <KButton variant="secondary" label={t(lang, 'reminderOfferNo')} onPress={reminderOffer.onLater} />
        </Card>
      )}

      <TargetPicker lang={lang} value={target} onChange={onTarget} />

      {recommended.length > 1 && (
        <>
          <KText size={22} weight="600" accessibilityRole="header">⭐ {t(lang, 'recommended')}</KText>
          {recommended.slice(1).map((l) => (
            <Pressable key={`rec-${l.id}`} accessibilityRole="button" accessibilityLabel={l.title[lang]} onPress={() => onOpenLesson(l.id)}>
              <Card style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: profile.minTouchSize, borderColor: colors.primary, borderWidth: 2 }}>
                <KText weight="600">{l.title[lang]}</KText>
                <KText muted>{l.level}</KText>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      <Card style={{ gap: 8 }}>
        <KText weight="800" accessibilityRole="header">📊 {t(lang, 'thisWeek')}</KText>
        <WeekChart lang={lang} bars={lastDays(progress, today)} goal={progress.dailyGoalMinutes} lessonsDone={progress.completedLessons.length} />
      </Card>

      <KText size={22} weight="600" accessibilityRole="header">{t(lang, 'allLessons')}</KText>
      {LESSONS.map((l) => (
        <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.title[lang]} onPress={() => onOpenLesson(l.id)}>
          <Card style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: profile.minTouchSize }}>
            <KText weight="600">{l.title[lang]}</KText>
            <KText muted>{progress.completedLessons.includes(lessonKey(l.id, target)) ? `✓ ${t(lang, 'done')}` : l.level}</KText>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

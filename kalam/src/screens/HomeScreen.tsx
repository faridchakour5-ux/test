import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card } from '../components/Card';
import { KText } from '../components/KText';
import { LESSONS } from '../domain/lessons';
import { Level } from '../domain/lessons';
import { Progress, goalReached } from '../domain/progress';
import { UiLang, isRtl, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  level: Level;
  progress: Progress;
  onOpenLesson: (id: string) => void;
  onGoal: (g: 5 | 10 | 20) => void;
}

export function HomeScreen({ lang, level, progress, onOpenLesson, onGoal }: Props) {
  const { colors, profile } = useTheme();
  const rtl = isRtl(lang);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const), gap: 8 };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }}>
      <KText size={30} weight="800" accessibilityRole="header">Kalam · {level}</KText>

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

      <KText size={22} weight="600" accessibilityRole="header">{t(lang, 'lessons')}</KText>
      {LESSONS.map((l) => (
        <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.title[lang]} onPress={() => onOpenLesson(l.id)}>
          <Card style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: profile.minTouchSize }}>
            <KText weight="600">{l.title[lang]}</KText>
            <KText muted>{progress.completedLessons.includes(l.id) ? `✓ ${t(lang, 'done')}` : l.level}</KText>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

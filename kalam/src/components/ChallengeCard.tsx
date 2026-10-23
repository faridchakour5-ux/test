import React from 'react';
import { View } from 'react-native';
import { ChallengeId, Progress, challengeProgress, dailyChallenge } from '../domain/progress';
import { StringKey, UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';
import { KText } from './KText';

const TEXT: Record<ChallengeId, StringKey> = { minutes5: 'chMinutes5', minutes10: 'chMinutes10', lesson1: 'chLesson1' };

// Défi du jour: jamais punitif. Réussi = +15 points; sinon un nouveau défi demain.
export function ChallengeCard({ lang, progress, today }: { lang: UiLang; progress: Progress; today: string }) {
  const { colors } = useTheme();
  const id = dailyChallenge(today);
  const { done, target } = challengeProgress(id, progress, today);
  const complete = done >= target;
  return (
    <Card style={{ gap: 8 }}>
      <KText weight="800" accessibilityRole="header">🎯 {t(lang, 'challengeTitle')}</KText>
      <KText accessibilityLiveRegion="polite">{complete ? '✓ ' : ''}{t(lang, TEXT[id])}{complete ? '' : ` (${done}/${target})`}</KText>
      <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: target, now: done }} style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${Math.round((done / target) * 100)}%`, backgroundColor: colors.primary }} />
      </View>
      <KText size={13} muted>{complete ? t(lang, 'challengeDone') : t(lang, 'challengeHint')}</KText>
    </Card>
  );
}

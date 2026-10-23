import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { PLACEMENTS, scorePlacement } from '../domain/level';
import { DEFAULT_TARGET, TargetLang } from '../domain/targets';
import { Level } from '../domain/lessons';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  target?: TargetLang; // langue dont on évalue le niveau
  onDone: (level: Level) => void;
}

export function LevelTestScreen({ lang, target = DEFAULT_TARGET, onDone }: Props) {
  const { colors, profile } = useTheme();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const questions = PLACEMENTS[target];
  const q = questions[index];

  const choose = (i: number) => {
    const next = [...answers, i];
    if (index + 1 >= questions.length) onDone(scorePlacement(next, target));
    else { setAnswers(next); setIndex(index + 1); }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }}>
      <KText size={28} weight="800" accessibilityRole="header">{t(lang, 'levelTest')}</KText>
      <KText muted>{t(lang, 'levelTestIntro')} ({index + 1}/{questions.length})</KText>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: questions.length, now: index }}
        style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' }}
      >
        <View style={{ height: 10, width: `${(index / questions.length) * 100}%`, backgroundColor: colors.primary }} />
      </View>
      <Card style={{ gap: 12 }}>
        <KText size={22} weight="600">{q.prompt}</KText>
        <View style={{ gap: 10 }}>
          {q.options.map((opt, i) => (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityLabel={opt}
              onPress={() => choose(i)}
              style={{ minHeight: profile.minTouchSize, justifyContent: 'center', paddingHorizontal: 16, borderRadius: profile.radius, borderWidth: 1, borderColor: colors.border }}
            >
              <KText size={18}>{opt}</KText>
            </Pressable>
          ))}
        </View>
      </Card>
      <KButton variant="secondary" label={t(lang, 'skipTest')} onPress={() => onDone('A1')} />
    </ScrollView>
  );
}

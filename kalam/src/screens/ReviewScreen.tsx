import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { ANSWER_QUALITY, Answer, vocabForKey } from '../domain/deck';
import { Card as SrsCard } from '../domain/srs';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  session: SrsCard[];
  onAnswer: (key: string, quality: number) => void;
  onExit: () => void;
}

export function ReviewScreen({ lang, session, onAnswer, onExit }: Props) {
  const { colors, profile } = useTheme();
  // La séance est figée au départ: répondre ne la modifie pas pendant qu'on la parcourt.
  const queue = useMemo(() => session, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [good, setGood] = useState(0);

  const finished = index >= queue.length;
  const current = finished ? undefined : vocabForKey(queue[index].key);

  const answer = (a: Answer) => {
    onAnswer(queue[index].key, ANSWER_QUALITY[a]);
    if (a === 'good' || a === 'easy') setGood((g) => g + 1);
    setRevealed(false);
    setIndex(index + 1);
  };

  const speak = (text: string) => { Speech.stop(); Speech.speak(text, { language: 'en-US', rate: profile.speechRate }); };

  const answers: { id: Answer; key: 'again' | 'hard' | 'good' | 'easy' }[] = [
    { id: 'again', key: 'again' }, { id: 'hard', key: 'hard' }, { id: 'good', key: 'good' }, { id: 'easy', key: 'easy' },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 16, alignItems: 'stretch' }}>
      <Pressable accessibilityRole="button" onPress={onExit} style={{ minHeight: profile.minTouchSize, justifyContent: 'center' }}>
        <KText weight="600" style={{ color: colors.primary }}>← {t(lang, 'back')}</KText>
      </Pressable>
      <KText size={26} weight="800" accessibilityRole="header">{t(lang, 'review')}</KText>

      {finished ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Mascot mood={queue.length === 0 ? 'sleepy' : 'cheer'} size={profile.id === 'kids' ? 200 : 140} />
          <KText size={20} weight="600" style={{ textAlign: 'center' }}>
            {queue.length === 0 ? t(lang, 'nothingToReview') : `${t(lang, 'reviewDone')} ${good}/${queue.length}`}
          </KText>
          <KButton label={t(lang, 'back')} onPress={onExit} />
        </View>
      ) : (
        <>
          <KText muted>{index + 1}/{queue.length}</KText>
          <View style={{ alignItems: 'center' }}>
            <Mascot mood={revealed ? 'happy' : 'thinking'} size={profile.id === 'kids' ? 160 : 100} />
          </View>
          <Card style={{ gap: 12, alignItems: 'center', paddingVertical: 32 }}>
            <KText size={28} weight="800" style={{ textAlign: 'center' }}>{current?.fr}</KText>
            {revealed && (
              <>
                <KText size={26} weight="600" style={{ color: colors.primary, textAlign: 'center' }}>{current?.en}</KText>
                <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'listen')} onPress={() => current && speak(current.en)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <KText weight="600" style={{ color: colors.primary }}>🔊 {t(lang, 'listen')}</KText>
                </Pressable>
              </>
            )}
          </Card>
          {!revealed ? (
            <KButton label={t(lang, 'reveal')} onPress={() => { setRevealed(true); if (current) speak(current.en); }} />
          ) : (
            <View style={{ gap: 10 }}>
              <KText muted style={{ textAlign: 'center' }}>{t(lang, 'howWell')}</KText>
              {answers.map((a) => <KButton key={a.id} label={t(lang, a.key)} onPress={() => answer(a.id)} />)}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

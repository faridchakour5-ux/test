import { tts } from '../speech/tts';
import { useStopInBackground } from '../speech/useStopInBackground';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { meaning } from '../domain/lessons';
import { DEFAULT_TARGET, TARGET_LOCALE, TargetLang, targetText } from '../domain/targets';
import { PronunciationPractice } from '../components/PronunciationPractice';
import { ANSWER_QUALITY, Answer, vocabForKey } from '../domain/deck';
import { Card as SrsCard } from '../domain/srs';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { useHardwareBack } from '../navigation/useHardwareBack';

interface Props {
  target?: TargetLang; // langue apprise
  lang: UiLang;
  session: SrsCard[];
  onAnswer: (key: string, quality: number) => void;
  onExit: () => void;
}

export function ReviewScreen({ lang, session, onAnswer, onExit, target = DEFAULT_TARGET }: Props) {
  useStopInBackground();
  useHardwareBack(onExit);
  const { colors, profile } = useTheme();
  // La séance est figée au départ: répondre ne la modifie pas pendant qu'on la parcourt.
  const [queue] = useState(() => session);
  useEffect(() => () => { void tts.stop(); }, []); // quitter l'écran coupe la phrase en cours
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [good, setGood] = useState(0);

  const finished = index >= queue.length;
  const current = finished ? undefined : vocabForKey(queue[index].key);

  const answeredIndex = useRef(-1);
  const answer = (a: Answer) => {
    if (answeredIndex.current === index) return; // double appui rapide: la même carte ne reçoit pas deux notes
    answeredIndex.current = index;
    onAnswer(queue[index].key, ANSWER_QUALITY[a]);
    if (a === 'good' || a === 'easy') setGood((g) => g + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const speak = (text: string) => { void tts.speak(text, { lang: TARGET_LOCALE[target], rate: profile.speechRate }); };

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
            <KText size={28} weight="800" style={{ textAlign: 'center' }}>{current ? meaning(current, lang, target) : ''}</KText>
            {revealed && (
              <>
                <KText size={26} weight="600" style={{ color: colors.primary, textAlign: 'center' }}>{current ? targetText(current, target) : ''}</KText>
                <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'listen')} onPress={() => current && speak(targetText(current, target))} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <KText weight="600" style={{ color: colors.primary }}>🔊 {t(lang, 'listen')}</KText>
                </Pressable>
              </>
            )}
          </Card>
          {revealed && current && <PronunciationPractice lang={lang} target={target} expected={targetText(current, target)} />}
          {!revealed ? (
            <KButton label={t(lang, 'reveal')} onPress={() => { setRevealed(true); if (current) speak(targetText(current, target)); }} />
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

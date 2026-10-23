import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { PronunciationPractice } from '../components/PronunciationPractice';
import { KIDS_TOPICS, Round, STARS_PER_CORRECT, buildRounds, newlyUnlocked } from '../domain/kids';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  stars: number; // étoiles actuelles (pour détecter les autocollants débloqués)
  micAllowed: boolean; // consentement parental
  onCorrect: () => void;
  onExit: (minutes: number) => void;
}

export function PlayScreen({ lang, stars, micAllowed, onCorrect, onExit }: Props) {
  const { colors, profile } = useTheme();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [index, setIndex] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [earned, setEarned] = useState(0);
  const startStars = useRef(stars);
  const started = useRef(Date.now());
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutes = () => Math.max(1, Math.round((Date.now() - started.current) / 60_000));

  const speak = (text: string) => { Speech.stop(); Speech.speak(text, { language: 'en-US', rate: profile.speechRate }); };
  useEffect(() => () => { Speech.stop(); if (advance.current) clearTimeout(advance.current); }, []);

  const round = rounds?.[index];
  useEffect(() => { if (round && !solved) speak(round.target.en); }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rounds) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 14 }}>
        <BackButton lang={lang} onPress={() => onExit(0)} />
        <KText size={28} weight="800" accessibilityRole="header">🎮 {t(lang, 'chooseTopic')}</KText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {KIDS_TOPICS.map((topic) => (
            <Pressable key={topic.id} accessibilityRole="button" accessibilityLabel={topic.title[lang]} onPress={() => { setRounds(buildRounds(topic.id)); started.current = Date.now(); }}
              style={{ width: '47%', minHeight: 130, borderRadius: profile.radius, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <KText size={48}>{topic.emoji}</KText>
              <KText size={20} weight="800">{topic.title[lang]}</KText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (!round) {
    const unlocked = newlyUnlocked(startStars.current, stars);
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Mascot mood="cheer" size={200} />
        <KText size={30} weight="800" style={{ textAlign: 'center' }}>{t(lang, 'roundsDone')}</KText>
        <KText size={26}>+{earned} ⭐</KText>
        {unlocked.map((s) => (
          <View key={s.id} accessibilityLiveRegion="polite" style={{ alignItems: 'center' }}>
            <KText size={64}>{s.emoji}</KText>
            <KText size={20} weight="800">{t(lang, 'newSticker')}</KText>
          </View>
        ))}
        <KButton label={t(lang, 'back')} onPress={() => onExit(minutes())} />
      </ScrollView>
    );
  }

  const next = () => {
    if (advance.current) { clearTimeout(advance.current); advance.current = null; }
    setSolved(false); setWrongIds([]); setIndex((i) => i + 1);
  };

  const choose = (id: string) => {
    if (solved) return;
    if (id === round.target.id) {
      setSolved(true);
      // L'étoile est donnée même après un essai raté: on récompense l'effort, on ne punit jamais.
      setEarned((e) => e + STARS_PER_CORRECT);
      onCorrect();
      if (!micAllowed) advance.current = setTimeout(next, 1400);
    } else {
      setWrongIds((w) => (w.includes(id) ? w : [...w, id]));
      speak(round.target.en);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 18, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch' }}><BackButton lang={lang} onPress={() => onExit(minutes())} /></View>
      <KText muted>{index + 1}/{rounds.length}</KText>
      <Mascot mood={solved ? 'cheer' : wrongIds.length ? 'thinking' : 'happy'} size={110} />
      <KText size={22} weight="800" accessibilityLiveRegion="polite">
        {solved ? `${t(lang, 'bravo')} ${round.target.en}` : wrongIds.length ? t(lang, 'tryAgain') : t(lang, 'whichOne')}
      </KText>
      <KButton label={`🔊 ${t(lang, 'listen')}`} onPress={() => speak(round.target.en)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
        {round.options.map((o) => {
          const isTarget = o.id === round.target.id;
          const wrong = wrongIds.includes(o.id);
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityLabel={`${o.fr}`}
              accessibilityState={{ disabled: wrong }}
              onPress={() => choose(o.id)}
              style={{ width: 130, minHeight: 130, borderRadius: profile.radius, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 8,
                borderWidth: 4, borderColor: solved && isTarget ? colors.success : colors.border, opacity: wrong ? 0.35 : 1 }}
            >
              <KText size={o.emoji.length > 4 ? 28 : 52}>{o.emoji}</KText>
              {solved && isTarget && <KText weight="800">✓ {o.en}</KText>}
            </Pressable>
          );
        })}
      </View>
      {solved && micAllowed && (
        <View style={{ alignSelf: 'stretch', gap: 12 }}>
          <PronunciationPractice lang={lang} expected={round.target.en} />
          <KButton label={t(lang, 'nextSentence')} onPress={next} />
        </View>
      )}
    </ScrollView>
  );
}

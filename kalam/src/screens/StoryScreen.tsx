import { tts } from '../speech/tts';
import React, { useEffect, useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { STORIES, Story } from '../domain/kids';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  onFinish: (storyId: string, minutes: number) => void;
  onExit: (minutes: number) => void;
}

export function StoryScreen({ lang, onFinish, onExit }: Props) {
  const { colors, profile } = useTheme();
  const [story, setStory] = useState<Story | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [started] = useState(() => Date.now());
  const minutes = () => Math.max(1, Math.round((Date.now() - started) / 60_000));

  const speak = (text: string) => { void tts.speak(text, { lang: 'en-US', rate: profile.speechRate }); };
  useEffect(() => () => { void tts.stop(); }, []);
  useEffect(() => { if (story && !done) speak(story.sentences[index].en); }, [story, index, done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!story) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 14 }}>
        <BackButton lang={lang} onPress={() => onExit(0)} />
        <KText size={28} weight="800" accessibilityRole="header">📖 {t(lang, 'stories')}</KText>
        {STORIES.map((s) => (
          <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.title[lang]} onPress={() => setStory(s)}
            style={{ minHeight: 96, borderRadius: profile.radius, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
            <KText size={44}>{s.emoji}</KText>
            <KText size={22} weight="800" style={{ flex: 1 }}>{s.title[lang]}</KText>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Mascot mood="cheer" size={200} />
        <KText size={30} weight="800" style={{ textAlign: 'center' }}>{t(lang, 'storyDone')}</KText>
        <KText size={22}>+2 ⭐</KText>
        <KButton label={t(lang, 'back')} onPress={() => onFinish(story.id, minutes())} />
      </View>
    );
  }

  const sentence = story.sentences[index];
  const last = index === story.sentences.length - 1;
  const words = sentence.en.split(' ');

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 20, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch' }}><BackButton lang={lang} onPress={() => onExit(minutes())} /></View>
      <KText muted>{index + 1}/{story.sentences.length}</KText>
      <KText size={80}>{story.emoji}</KText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {words.map((w, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={w} onPress={() => speak(w.replace(/[.,!?]/g, ''))}
            style={{ minHeight: 56, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <KText size={30} weight="800">{w}</KText>
          </Pressable>
        ))}
      </View>
      {lang !== 'en' && <KText size={18} muted style={{ textAlign: 'center' }}>{sentence[lang]}</KText>}
      <KText muted>{t(lang, 'tapToHear')}</KText>
      <View style={{ alignSelf: 'stretch', gap: 12 }}>
        <KButton label={`🔊 ${t(lang, 'listen')}`} onPress={() => speak(sentence.en)} />
        <KButton label={t(lang, last ? 'finish' : 'nextSentence')} onPress={() => (last ? setDone(true) : setIndex(index + 1))} />
      </View>
    </ScrollView>
  );
}

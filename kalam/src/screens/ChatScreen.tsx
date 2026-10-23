import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ChatMessage, askTeacher } from '../api/teacher';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Lesson, Level } from '../domain/lessons';
import { UiLang, t } from '../i18n/strings';
import { isSpeechInputAvailable, listenOnce } from '../speech/recognizer';
import { AgeProfileId } from '../theme/profiles';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  lesson: Lesson;
  level: Level;
  ageProfile: AgeProfileId;
  onFinish: (minutes: number) => void;
  onBack: () => void;
}

export function ChatScreen({ lang, lesson, level, ageProfile, onFinish, onBack }: Props) {
  const { colors, profile } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [listening, setListening] = useState(false);
  const started = useRef(Date.now());
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => () => { Speech.stop(); }, []);

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: profile.speechRate });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text.slice(0, 500) }];
    setMessages(next); setInput(''); setLoading(true); setError(false);
    try {
      const reply = await askTeacher({ ageProfile, level, scenario: lesson.scenario, uiLang: lang, messages: next.slice(-20) });
      setMessages([...next, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const dictate = async () => {
    setListening(true); setError(false);
    const r = await listenOnce('en-US');
    setListening(false);
    if (r.ok) setInput(r.transcript.slice(0, 500));
  };

  const finish = () => onFinish(Math.max(1, Math.round((Date.now() - started.current) / 60_000)));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: 24, paddingTop: 64, gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={onBack} style={{ minHeight: profile.minTouchSize, justifyContent: 'center' }}>
          <KText weight="600" style={{ color: colors.primary }}>← {t(lang, 'back')}</KText>
        </Pressable>
        <KText size={24} weight="800" accessibilityRole="header">{lesson.title[lang]}</KText>
        <KText muted>{t(lang, 'vocab')}: {lesson.vocab.map((v) => v.en).join(' · ')}</KText>
      </View>

      <ScrollView ref={scroller} contentContainerStyle={{ padding: 24, gap: 12 }}>
        {messages.map((m, i) => (
          <Card key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.role === 'user' ? colors.primary : colors.surface }}>
            <KText style={{ color: m.role === 'user' ? colors.onPrimary : colors.text }}>{m.content}</KText>
            {m.role === 'assistant' && (
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'listen')} onPress={() => speak(m.content)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <KText weight="600" style={{ color: colors.primary }}>🔊 {t(lang, 'listen')}</KText>
              </Pressable>
            )}
          </Card>
        ))}
        {loading && <View accessibilityLiveRegion="polite"><ActivityIndicator color={colors.primary} /><KText muted>{t(lang, 'thinking')}</KText></View>}
        {error && <KText accessibilityLiveRegion="assertive" style={{ color: colors.primary }}>{t(lang, 'teacherDown')}</KText>}
      </ScrollView>

      <View style={{ padding: 16, gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t(lang, 'typeHere')}
          placeholderTextColor={colors.textMuted}
          maxLength={500}
          accessibilityLabel={t(lang, 'typeHere')}
          onSubmitEditing={send}
          style={{ minHeight: profile.minTouchSize, borderRadius: profile.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.text, backgroundColor: colors.surface, fontSize: profile.fontScale * 16 }}
        />
        {isSpeechInputAvailable() && (
          <KButton label={listening ? t(lang, 'listening') : `🎤 ${t(lang, 'speak')}`} onPress={dictate} />
        )}
        <KButton label={t(lang, 'send')} onPress={send} />
        <KButton label={t(lang, 'finish')} onPress={finish} />
      </View>
    </KeyboardAvoidingView>
  );
}

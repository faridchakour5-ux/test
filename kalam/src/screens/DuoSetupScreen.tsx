import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { MAX_NAME_LENGTH, uniqueNames } from '../domain/duo';
import { FREE_TOPICS, FreeTopic } from '../domain/freeTopics';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { useHardwareBack } from '../navigation/useHardwareBack';

interface Props {
  lang: UiLang;
  onStart: (names: [string, string], topic: FreeTopic | null) => void;
  onBack: () => void;
}

export function DuoSetupScreen({ lang, onStart, onBack }: Props) {
  useHardwareBack(onBack);
  const { colors, profile } = useTheme();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [topic, setTopic] = useState<FreeTopic | null>(null);

  const input = (value: string, set: (v: string) => void, label: string) => (
    <TextInput
          maxFontSizeMultiplier={profile.maxSystemFontScale}
      value={value}
      onChangeText={set}
      placeholder={label}
      placeholderTextColor={colors.textMuted}
      maxLength={MAX_NAME_LENGTH}
      accessibilityLabel={label}
      style={{ minHeight: profile.minTouchSize, borderRadius: profile.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.text, backgroundColor: colors.surface, fontSize: profile.fontScale * 16 }}
    />
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 16 }}>
      <BackButton lang={lang} onPress={onBack} />
      <KText size={26} weight="800" accessibilityRole="header">👥 {t(lang, 'duoTitle')}</KText>
      <KText muted>{t(lang, 'duoIntro')}</KText>
      {input(a, setA, t(lang, 'duoName1'))}
      {input(b, setB, t(lang, 'duoName2'))}
      <KText weight="800">{t(lang, 'chooseFreeTopic')}</KText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[null, ...FREE_TOPICS].map((tp) => {
          const on = (topic?.id ?? null) === (tp?.id ?? null);
          const label = tp ? tp.title[lang] : t(lang, 'anyTopic');
          return (
            <Pressable key={tp?.id ?? 'any'} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => setTopic(tp)}
              style={{ minHeight: profile.minTouchSize, paddingHorizontal: 14, borderRadius: profile.radius, borderWidth: on ? 3 : 1, borderColor: on ? colors.primary : colors.border, justifyContent: 'center', backgroundColor: colors.surface }}>
              <KText weight="600">{on ? '✓ ' : ''}{tp ? `${tp.emoji} ` : ''}{label}</KText>
            </Pressable>
          );
        })}
      </View>
      <KButton label={t(lang, 'duoStart')} onPress={() => onStart(uniqueNames(a, b), topic)} />
    </ScrollView>
  );
}

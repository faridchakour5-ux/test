import React from 'react';
import { ScrollView, View } from 'react-native';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { LanguagePicker } from '../components/LanguagePicker';
import { TargetPicker } from '../components/TargetPicker';
import { TargetLang } from '../domain/targets';
import { Mascot } from '../components/Mascot';
import { UiLang, isRtl, t } from '../i18n/strings';
import { AgeProfileId } from '../theme/profiles';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  onPick: (id: AgeProfileId) => void;
  onLang: (l: UiLang) => void;
  target: TargetLang;
  onTarget: (t: TargetLang) => void;
}

export function ProfilePickerScreen({ lang, onPick, onLang, target, onTarget }: Props) {
  const { colors } = useTheme();
  const rtl = isRtl(lang);
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 72, gap: 16 }}
    >
      <View style={{ alignItems: 'center' }}><Mascot mood="cheer" size={150} /></View>
      <View style={{ gap: 8, alignItems: rtl ? 'flex-end' : 'flex-start' }}>
        <KText size={34} weight="800" accessibilityRole="header">{t(lang, 'welcome')}</KText>
        <KText muted>{t(lang, 'tagline')}</KText>
        <KText size={20} weight="600" style={{ marginTop: 24 }}>{t(lang, 'pick')}</KText>
      </View>
      <KButton label={t(lang, 'kids')} onPress={() => onPick('kids')} />
      <KButton label={t(lang, 'adult')} onPress={() => onPick('adult')} />
      <KButton label={t(lang, 'senior')} onPress={() => onPick('senior')} />
      <View style={{ marginTop: 16, gap: 16 }}>
        <TargetPicker lang={lang} value={target} onChange={onTarget} />
        <LanguagePicker value={lang} onChange={onLang} />
      </View>
    </ScrollView>
  );
}

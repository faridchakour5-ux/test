import React from 'react';
import { View } from 'react-native';
import { levelFromXp } from '../domain/progress';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

// Niveau d'expérience: ne baisse jamais. La barre montre le chemin vers le niveau suivant.
export function LevelBadge({ lang, xp }: { lang: UiLang; xp: number }) {
  const { colors } = useTheme();
  const info = levelFromXp(xp);
  const remaining = info.nextAt - info.xp;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${t(lang, 'level')} ${info.level}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(info.fraction * 100), text: `${info.xp} ${t(lang, 'xpPoints')}, ${remaining} → ${t(lang, 'level')} ${info.level + 1}` }}
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <KText weight="800">🏅 {t(lang, 'level')} {info.level}</KText>
        <KText size={13} muted>{info.xp} {t(lang, 'xpPoints')}</KText>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View testID="level-fill" style={{ height: 10, width: `${Math.max(3, Math.round(info.fraction * 100))}%`, backgroundColor: colors.primary, borderRadius: 5 }} />
      </View>
    </View>
  );
}

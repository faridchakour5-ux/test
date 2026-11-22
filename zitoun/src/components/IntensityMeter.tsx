import React from 'react';
import { View } from 'react-native';
import { INTENSITIES, INTENSITY_LABEL, Intensity } from '../domain/catalog';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { useTheme } from '../theme/ThemeProvider';
import { ZText } from './ZText';

// Cinq points: pleins = intensité de l'huile, creux = le reste (la forme porte l'information, pas seulement la couleur).
export function IntensityMeter({ level, showLabel = true }: { level: Intensity; showLabel?: boolean }) {
  const { colors } = useTheme();
  const { lang, t } = useLang();
  const label = t(INTENSITY_LABEL[level]);
  return (
    <View accessible accessibilityLabel={`${t('intensity')}: ${label}, ${level}/5`} style={{ flexDirection: rowDirection(lang), alignItems: 'center', gap: 10 }}>
      <View style={{ flexDirection: rowDirection(lang), gap: 5 }}>
        {INTENSITIES.map((i) => (
          <View key={i} testID={`dot-${i}`} style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: i <= level ? colors.primary : 'transparent' }} />
        ))}
      </View>
      {showLabel ? <ZText variant="small" color={colors.text}>{label}</ZText> : null}
    </View>
  );
}

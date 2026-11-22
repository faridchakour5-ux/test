import React from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '../components/Screen';
import { IntensityMeter } from '../components/IntensityMeter';
import { ZText } from '../components/ZText';
import { OILS, oilsByIntensity } from '../domain/catalog';
import { formatMoney } from '../domain/money';
import { pick } from '../i18n/strings';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { useTheme } from '../theme/ThemeProvider';

export function OilsScreen({ onBack, onPick }: { onBack: () => void; onPick: (oilId: string) => void }) {
  const { colors, radius } = useTheme();
  const { lang, t, tf } = useLang();
  return (
    <Screen testID="oils" onBack={onBack}>
      <View style={{ gap: 8 }}>
        <ZText variant="title">{t('chooseOil')}</ZText>
        <ZText variant="small">{t('chooseOilSub')}</ZText>
      </View>
      <View style={{ gap: 14 }}>
        {oilsByIntensity(OILS).map((oil) => (
          <Pressable
            key={oil.id}
            testID={`oil-${oil.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${pick(oil.name, lang)}, ${tf('perLiter', { price: formatMoney(oil.pricePerLiter, lang) })}`}
            onPress={() => onPick(oil.id)}
            style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 12, opacity: pressed ? 0.9 : 1 })}
          >
            <IntensityMeter level={oil.intensity} />
            <ZText variant="heading">{pick(oil.name, lang)}</ZText>
            <View style={{ flexDirection: rowDirection(lang), justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
              <ZText variant="small" style={{ flex: 1 }}>{pick(oil.region, lang)}</ZText>
              <ZText variant="price">{tf('perLiter', { price: formatMoney(oil.pricePerLiter, lang) })}</ZText>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

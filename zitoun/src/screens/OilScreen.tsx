import React, { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { IntensityMeter } from '../components/IntensityMeter';
import { Screen, Divider } from '../components/Screen';
import { Stepper } from '../components/Stepper';
import { ZText } from '../components/ZText';
import { INTENSITY_DESC, PACKAGINGS, USE_LABEL, getOil, getPackaging } from '../domain/catalog';
import { formatMoney } from '../domain/money';
import { CartLine, MAX_COUNT_PER_LINE } from '../domain/order';
import { MAX_ORDER_LITERS, nextTier } from '../domain/pricing';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { pick } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props { oilId: string; cartLiters: number; onBack: () => void; onAdd: (line: CartLine) => void }

export function OilScreen({ oilId, cartLiters, onBack, onAdd }: Props) {
  const { colors } = useTheme();
  const { lang, t, tf } = useLang();
  const oil = getOil(oilId);
  const [packagingId, setPackagingId] = useState('can5');
  const [count, setCount] = useState(1);
  if (!oil) return <Screen onBack={onBack}><ZText>{t('chooseOil')}</ZText></Screen>;

  const pack = getPackaging(packagingId) ?? PACKAGINGS[0];
  const room = Math.max(0, Math.floor((MAX_ORDER_LITERS - cartLiters) / pack.liters));
  const max = Math.max(1, Math.min(MAX_COUNT_PER_LINE, room));
  const safeCount = Math.min(count, max);
  const liters = pack.liters * safeCount;
  const total = (oil.pricePerLiter + pack.extraPerLiter) * liters;
  const tier = nextTier(cartLiters + liters);
  const full = room < 1; // la commande a déjà atteint le maximum

  const fact = (label: string, value: string) => (
    <View style={{ flex: 1, gap: 2 }}><ZText variant="label">{label}</ZText><ZText>{value}</ZText></View>
  );

  return (
    <Screen
      testID="oil"
      onBack={onBack}
      footer={<Button testID="add-to-order" disabled={full} label={`${t('addToOrder')} · ${formatMoney(total, lang)}`} onPress={() => onAdd({ oilId: oil.id, packagingId: pack.id, count: safeCount })} />}
    >
      <View style={{ gap: 12 }}>
        <IntensityMeter level={oil.intensity} />
        <ZText variant="display">{pick(oil.name, lang)}</ZText>
        <ZText>{t(INTENSITY_DESC[oil.intensity])}</ZText>
        <View style={{ flexDirection: rowDirection(lang), flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {oil.uses.map((u) => (
            <View key={u} style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 4 }}><ZText variant="small">{t(USE_LABEL[u])}</ZText></View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: rowDirection(lang), gap: 16 }}>
        {fact(t('acidityLabel'), `${String(oil.acidity).replace('.', lang === 'ar' ? '٫' : ',')} %`)}
        {fact(t('harvestLabel'), String(oil.harvest))}
        {fact(t('varietyLabel'), pick(oil.variety, lang))}
      </View>
      <ZText variant="small">{pick(oil.region, lang)}</ZText>
      <Divider />

      <View style={{ gap: 14 }}>
        <ZText variant="title">{t('howMany')}</ZText>
        <ZText variant="label">{t('packaging')}</ZText>
        <View style={{ flexDirection: rowDirection(lang), flexWrap: 'wrap', gap: 8 }}>
          {PACKAGINGS.map((p) => <Chip key={p.id} testID={`pack-${p.id}`} label={t(p.label)} selected={p.id === pack.id} onPress={() => { setPackagingId(p.id); setCount(1); }} />)}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <ZText variant="label">{t('count')}</ZText>
        <Stepper value={safeCount} max={max} onChange={setCount} />
        <ZText variant="heading" testID="liters-total">{tf('litersTotal', { liters })}</ZText>
        <ZText variant="small">{tf('perLiter', { price: formatMoney(oil.pricePerLiter + pack.extraPerLiter, lang) })}</ZText>
        {tier ? <ZText variant="small">{tf('discountHint', { liters: tier.liters, pct: tier.pct })}</ZText> : null}
      </View>
    </Screen>
  );
}

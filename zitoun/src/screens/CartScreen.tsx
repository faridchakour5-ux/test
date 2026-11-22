import React from 'react';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Screen, Divider } from '../components/Screen';
import { Stepper } from '../components/Stepper';
import { ZText } from '../components/ZText';
import { formatMoney } from '../domain/money';
import { CartLine, MAX_COUNT_PER_LINE } from '../domain/order';
import { MAX_ORDER_LITERS, nextTier, quote } from '../domain/pricing';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { pick } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  cart: CartLine[];
  onBack: () => void;
  onChangeCount: (index: number, count: number) => void;
  onRemove: (index: number) => void;
  onAddAnother: () => void;
  onNext: () => void;
}

// Une ligne de total: libellé à un bout, montant à l'autre.
export function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { lang } = useLang();
  return (
    <View style={{ flexDirection: rowDirection(lang), justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <ZText variant={strong ? 'heading' : 'body'} muted={!strong}>{label}</ZText>
      <ZText variant={strong ? 'price' : 'body'}>{value}</ZText>
    </View>
  );
}

export function CartScreen({ cart, onBack, onChangeCount, onRemove, onAddAnother, onNext }: Props) {
  const { colors } = useTheme();
  const { lang, t, tf } = useLang();
  const q = quote(cart);
  const money = (n: number) => formatMoney(n, lang);
  const tier = nextTier(q.liters);

  if (q.lines.length === 0) {
    return (
      <Screen testID="cart" onBack={onBack} footer={<Button testID="add-another" label={t('chooseOil')} onPress={onAddAnother} />}>
        <ZText variant="title">{t('yourOrder')}</ZText>
        <ZText muted>{t('emptyOrder')}</ZText>
      </Screen>
    );
  }
  return (
    <Screen
      testID="cart"
      onBack={onBack}
      footer={<>
        <Button testID="cart-next" label={`${t('next')} · ${money(q.afterDiscount)}`} onPress={onNext} />
        <Button testID="add-another" variant="text" label={t('addAnother')} onPress={onAddAnother} />
      </>}
    >
      <ZText variant="title">{t('yourOrder')}</ZText>
      <View style={{ gap: 20 }}>
        {cart.map((line, index) => {
          const ql = q.lines.find((l) => l.oil.id === line.oilId && l.packaging.id === line.packagingId);
          if (!ql) return null;
          const others = q.liters - ql.liters;
          const max = Math.max(1, Math.min(MAX_COUNT_PER_LINE, Math.floor((MAX_ORDER_LITERS - others) / ql.packaging.liters)));
          return (
            <View key={`${line.oilId}-${line.packagingId}`} style={{ gap: 12 }} testID={`line-${index}`}>
              <View style={{ flexDirection: rowDirection(lang), justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ZText variant="heading">{pick(ql.oil.name, lang)}</ZText>
                  <ZText variant="small">{ql.count} × {t(ql.packaging.label)} · {tf('litersShort', { liters: ql.liters })}</ZText>
                </View>
                <ZText variant="price">{money(ql.total)}</ZText>
              </View>
              <View style={{ flexDirection: rowDirection(lang), justifyContent: 'space-between', alignItems: 'center' }}>
                <Stepper compact value={ql.count} max={max} onChange={(n) => onChangeCount(index, n)} />
                <Button variant="text" label={t('remove')} onPress={() => onRemove(index)} />
              </View>
              <Divider />
            </View>
          );
        })}
      </View>

      <View style={{ gap: 10 }}>
        <TotalRow label={t('subtotal')} value={money(q.subtotal)} />
        {q.pct > 0 ? <TotalRow label={tf('volumeDiscount', { pct: q.pct })} value={`−${money(q.discount)}`} /> : null}
        {tier ? <ZText variant="small" color={colors.primary}>{tf('discountHint', { liters: tier.liters, pct: tier.pct })}</ZText> : null}
        {q.remainingForFree > 0 ? <ZText variant="small" color={colors.primary}>{tf('freeProgress', { amount: money(q.remainingForFree) })}</ZText> : null}
      </View>
    </Screen>
  );
}

import React from 'react';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Screen, Divider } from '../components/Screen';
import { ZText } from '../components/ZText';
import { getOil } from '../domain/catalog';
import { formatDay, toDay } from '../domain/delivery';
import { formatMoney } from '../domain/money';
import { useLang } from '../i18n/LangContext';
import { pick } from '../i18n/strings';
import { PlacedOrder } from '../state/data';
import { rowDirection } from '../i18n/layout';

interface Props { orders: PlacedOrder[]; onBack: () => void; onReorder: (order: PlacedOrder) => void }

export function OrdersScreen({ orders, onBack, onReorder }: Props) {
  const { lang, t, tf } = useLang();
  return (
    <Screen testID="orders" onBack={onBack}>
      <ZText variant="title">{t('ordersTitle')}</ZText>
      {orders.length === 0 ? <ZText muted>{t('noOrders')}</ZText> : null}
      <View style={{ gap: 20 }}>
        {orders.map((o) => {
          const names = o.lines.map((l) => (getOil(l.oilId) ? pick(getOil(l.oilId)!.name, lang) : '')).filter(Boolean).join(' · ');
          return (
            <View key={o.id} testID={`order-${o.id}`} style={{ gap: 8 }}>
              <View style={{ flexDirection: rowDirection(lang), justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <ZText variant="label">{o.id}</ZText>
                <ZText variant="small">{formatDay(toDay(new Date(o.createdAt)), lang).full}</ZText>
              </View>
              <ZText variant="heading">{names}</ZText>
              <ZText variant="small">{tf('litersShort', { liters: o.liters })} · {formatMoney(o.total, lang)}</ZText>
              <Button testID={`reorder-${o.id}`} variant="secondary" label={t('reorder')} onPress={() => onReorder(o)} />
              <Divider />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

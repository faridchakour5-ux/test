import React from 'react';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Screen, Divider } from '../components/Screen';
import { ZText } from '../components/ZText';
import { getCity, formatDay } from '../domain/delivery';
import { formatMoney } from '../domain/money';
import { CartLine, Customer } from '../domain/order';
import { formatLocalPhone, normalizeMoroccanPhone } from '../domain/phone';
import { quote } from '../domain/pricing';
import { useLang } from '../i18n/LangContext';
import { pick } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { TotalRow } from './CartScreen';

interface Props { cart: CartLine[]; customer: Customer; error: string | null; sending: boolean; onBack: () => void; onSend: () => void }

export function ReviewScreen({ cart, customer, error, sending, onBack, onSend }: Props) {
  const { colors } = useTheme();
  const { lang, t, tf } = useLang();
  const q = quote(cart, customer.cityId);
  const money = (n: number) => formatMoney(n, lang);
  const phone = normalizeMoroccanPhone(customer.phone);
  const city = getCity(customer.cityId);
  const slot = customer.slot ? t(({ morning: 'slotMorning', afternoon: 'slotAfternoon', evening: 'slotEvening' } as const)[customer.slot]) : '';
  const info = (label: string, value: string) => (<View style={{ gap: 2 }}><ZText variant="label">{label}</ZText><ZText>{value}</ZText></View>);

  return (
    <Screen
      testID="review"
      onBack={onBack}
      footer={<>
        {error ? <ZText variant="small" color={colors.danger} accessibilityLiveRegion="polite">{error}</ZText> : null}
        <Button testID="send-whatsapp" disabled={sending} label={t('sendWhatsapp')} onPress={onSend} />
        <ZText variant="small" center>{t('sendHint')}</ZText>
      </>}
    >
      <ZText variant="title">{t('review')}</ZText>
      <View style={{ gap: 16 }}>
        {q.lines.map((l) => (
          <View key={`${l.oil.id}-${l.packaging.id}`} style={{ gap: 2 }}>
            <TotalRow label={pick(l.oil.name, lang)} value={money(l.total)} strong />
            <ZText variant="small">{l.count} × {t(l.packaging.label)} · {tf('litersShort', { liters: l.liters })}</ZText>
          </View>
        ))}
      </View>
      <Divider />
      <View style={{ gap: 10 }}>
        <TotalRow label={t('subtotal')} value={money(q.subtotal)} />
        {q.pct > 0 ? <TotalRow label={tf('volumeDiscount', { pct: q.pct })} value={`−${money(q.discount)}`} /> : null}
        <TotalRow label={t('deliveryFee')} value={q.deliveryFee === 0 ? t('freeLabel') : q.deliveryFee === null ? '—' : money(q.deliveryFee)} />
        <TotalRow strong label={t('total')} value={money(q.total)} />
        <ZText variant="small">{t('payOnDelivery')}</ZText>
      </View>
      <Divider />
      <View style={{ gap: 14 }}>
        {info(t('name'), customer.name.trim())}
        {info(t('phone'), phone ? formatLocalPhone(phone) : customer.phone)}
        {info(t('address'), `${customer.address.trim()}${city ? `, ${pick(city.name, lang)}` : ''}`)}
        {info(t('whenQ'), `${formatDay(customer.day, lang).full}${slot ? ` · ${slot}` : ''}`)}
        {customer.note.trim() ? info(t('note'), customer.note.trim()) : null}
      </View>
    </Screen>
  );
}

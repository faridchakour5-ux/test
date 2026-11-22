import React, { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ZText } from '../components/ZText';
import { CITIES, SLOTS, availableDays, earliestDay, formatDay } from '../domain/delivery';
import { CartLine, Customer, OrderError, validateOrder } from '../domain/order';
import { useLang } from '../i18n/LangContext';
import { useTheme } from '../theme/ThemeProvider';
import { rowDirection } from '../i18n/layout';
import { pick } from '../i18n/strings';

interface Props { customer: Customer; cart: CartLine[]; today: string; onChange: (c: Customer) => void; onBack: () => void; onNext: () => void }

const SLOT_LABEL = { morning: 'slotMorning', afternoon: 'slotAfternoon', evening: 'slotEvening' } as const;

export function DeliveryScreen({ customer, cart, today, onChange, onBack, onNext }: Props) {
  const { lang, t, tf } = useLang();
  const { colors } = useTheme();
  const [more, setMore] = useState(false);
  const [tried, setTried] = useState(false); // les erreurs ne s'affichent qu'après une première tentative (pas de rouge avant d'avoir écrit)
  const errors = validateOrder(cart, customer, today);
  const err = (...keys: OrderError[]) => (tried && keys.some((k) => errors.includes(k)) ? t(keys.find((k) => errors.includes(k)) as OrderError) : null);
  const set = (p: Partial<Customer>) => onChange({ ...customer, ...p });
  const row = { flexDirection: rowDirection(lang), flexWrap: 'wrap', gap: 8 } as const;
  const days = availableDays(today, customer.cityId, more ? 30 : 9);

  const pickCity = (cityId: string) => {
    // Le délai dépend de la ville: une date devenue trop proche est effacée plutôt que gardée à tort.
    const stillOk = customer.day && customer.day >= earliestDay(today, cityId);
    set({ cityId, day: stillOk ? customer.day : '' });
  };
  const next = () => { setTried(true); if (errors.filter((e) => e !== 'eEmpty' && e !== 'eTooMany').length === 0) onNext(); };

  return (
    <Screen testID="delivery" keyboard onBack={onBack} footer={<Button testID="delivery-next" label={t('next')} onPress={next} />}>
      <ZText variant="title">{t('delivery')}</ZText>
      <Field testID="field-name" label={t('name')} value={customer.name} onChangeText={(name) => set({ name })} autoComplete="name" textContentType="name" maxLength={60} error={err('eName')} />
      <Field testID="field-phone" label={t('phone')} value={customer.phone} onChangeText={(phone) => set({ phone })} placeholder={t('phoneHint')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={30} error={err('ePhone')} />

      <View style={{ gap: 10 }}>
        <ZText variant="label">{t('city')}</ZText>
        <View style={row}>
          {CITIES.map((c) => <Chip key={c.id} testID={`city-${c.id}`} label={pick(c.name, lang)} selected={customer.cityId === c.id} onPress={() => pickCity(c.id)} />)}
        </View>
        {err('eCity') ? <ZText variant="small" color={colors.danger}>{err('eCity')}</ZText> : null}
      </View>

      <Field testID="field-address" label={t('address')} value={customer.address} onChangeText={(address) => set({ address })} placeholder={t('addressHint')} autoComplete="street-address" textContentType="fullStreetAddress" maxLength={200} multiline error={err('eAddress')} />

      <View style={{ gap: 10 }}>
        <ZText variant="label">{t('whenQ')}</ZText>
        <ZText variant="small">{tf('earliest', { date: formatDay(days[0] ?? earliestDay(today, customer.cityId), lang).full })}</ZText>
        <View style={row}>
          {days.map((d) => {
            const f = formatDay(d, lang);
            return <Chip key={d} testID={`day-${d}`} style={{ width: '31.5%' }} label={f.dayOfMonth} sublabel={`${f.weekday} ${f.month}`} selected={customer.day === d} onPress={() => set({ day: d })} />;
          })}
        </View>
        {!more ? <Button testID="more-dates" variant="text" label={t('moreDates')} onPress={() => setMore(true)} /> : null}
        <View style={row}>
          {SLOTS.map((s) => <Chip key={s} testID={`slot-${s}`} label={t(SLOT_LABEL[s])} selected={customer.slot === s} onPress={() => set({ slot: s })} />)}
        </View>
        {err('eDate') ? <ZText variant="small" color={colors.danger}>{err('eDate')}</ZText> : null}
      </View>

      <Field testID="field-note" label={t('note')} optional value={customer.note} onChangeText={(note) => set({ note })} maxLength={300} multiline />
    </Screen>
  );
}

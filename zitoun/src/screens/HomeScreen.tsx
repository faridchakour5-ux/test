import React from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '../components/Button';
import { Logo, OliveBranch, ReceiptIcon, SlidersIcon } from '../components/Icons';
import { Screen } from '../components/Screen';
import { ZText } from '../components/ZText';
import { FREE_DELIVERY_FROM } from '../domain/pricing';
import { formatMoney } from '../domain/money';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { useTheme } from '../theme/ThemeProvider';

interface Props { cartLiters: number; onOrder: () => void; onResume: () => void; onOrders: () => void; onSettings: () => void }

// Accueil volontairement vide: une marque, une phrase, une seule action.
export function HomeScreen({ cartLiters, onOrder, onResume, onOrders, onSettings }: Props) {
  const { colors } = useTheme();
  const { lang, t, tf } = useLang();
  const iconButton = (label: string, onPress: () => void, icon: React.ReactNode, testID: string) => (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>{icon}</Pressable>
  );
  return (
    <Screen
      testID="home"
      right={
        <View style={{ flexDirection: rowDirection(lang), gap: 4 }}>
          {iconButton(t('myOrders'), onOrders, <ReceiptIcon />, 'open-orders')}
          {iconButton(t('settings'), onSettings, <SlidersIcon />, 'open-settings')}
        </View>
      }
      footer={
        <>
          <Button testID="start-order" label={t('order')} onPress={onOrder} />
          {cartLiters > 0 ? <Button testID="resume-order" variant="text" label={`${t('yourOrder')} · ${tf('litersShort', { liters: cartLiters })}`} onPress={onResume} /> : null}
        </>
      }
    >
      <View style={{ flexDirection: rowDirection(lang), alignItems: 'center', gap: 10 }}>
        <Logo />
        <ZText variant="heading" style={{ letterSpacing: lang === 'ar' ? 0 : 1.5 }}>{t('appName')}</ZText>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 28, paddingVertical: 24 }}>
        <View style={{ alignItems: 'center', opacity: 0.95 }}><OliveBranch width={260} /></View>
        <View style={{ gap: 14 }}>
          <View style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: colors.accent }} />
          <ZText variant="label">{t('tagline')}</ZText>
          <ZText variant="display">{t('homeSub')}</ZText>
        </View>
        <View style={{ gap: 4 }}>
          <ZText variant="small">{t('deliveryLine')}</ZText>
          <ZText variant="small">{tf('freeFrom', { amount: formatMoney(FREE_DELIVERY_FROM, lang) })}</ZText>
        </View>
      </View>
    </Screen>
  );
}

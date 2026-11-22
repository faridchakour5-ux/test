import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SELLER_LANG, sellerWhatsapp } from './src/config/shop';
import { cartLiters, buildOrderMessage, newOrderId, validateOrder, whatsappUrl } from './src/domain/order';
import { quote } from './src/domain/pricing';
import { toDay } from './src/domain/delivery';
import { LangProvider, useLang } from './src/i18n/LangContext';
import { useHardwareBack } from './src/navigation/useHardwareBack';
import { CartScreen } from './src/screens/CartScreen';
import { DeliveryScreen } from './src/screens/DeliveryScreen';
import { DoneScreen } from './src/screens/DoneScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OilScreen } from './src/screens/OilScreen';
import { OilsScreen } from './src/screens/OilsScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useAppData } from './src/state/useAppData';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

type Route =
  | { name: 'home' } | { name: 'oils' } | { name: 'oil'; oilId: string } | { name: 'cart' } | { name: 'delivery' } | { name: 'review' }
  | { name: 'done'; id: string; message: string; opened: boolean } | { name: 'orders' } | { name: 'settings' };

// `clock` est injectable: les tests fixent « aujourd'hui » (les dates de livraison en dépendent).
export default function App({ clock = () => new Date() }: { clock?: () => Date }) {
  const app = useAppData();
  return (
    <SafeAreaProvider>
      <ThemeProvider paletteId={app.data.palette} textSize={app.data.textSize}>
        <LangProvider lang={app.data.lang}>
          <Root app={app} clock={clock} />
        </LangProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Root({ app, clock }: { app: ReturnType<typeof useAppData>; clock: () => Date }) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { data } = app;
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingNow = useRef(false); // garde immédiate contre le double appui (l'état n'est à jour qu'au rendu suivant)
  const route = stack[stack.length - 1];
  const today = toDay(clock());

  const push = useCallback((r: Route) => { setSendError(null); setStack((s) => [...s, r]); }, []);
  const pop = useCallback(() => { setSendError(null); setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); }, []);
  const home = useCallback(() => { setSendError(null); setStack([{ name: 'home' }]); }, []);
  // Retourne à l'écran « huiles » déjà ouvert plutôt que d'en empiler un second.
  const toOils = useCallback(() => setStack((s) => { const i = s.findIndex((r) => r.name === 'oils'); return i >= 0 ? s.slice(0, i + 1) : [...s, { name: 'oils' }]; }), []);

  useHardwareBack(() => {
    if (route.name === 'done') { home(); return true; }
    if (stack.length > 1) { pop(); return true; }
    return false; // accueil: le système ferme l'application
  });

  const send = async () => {
    if (sendingNow.current) return;
    const errors = validateOrder(data.cart, data.customer, today);
    if (errors.length > 0) { setSendError(t(errors[0])); return; }
    const seller = sellerWhatsapp();
    if (!seller) { setSendError(t('eSeller')); return; }
    sendingNow.current = true;
    setSending(true);
    try {
      const q = quote(data.cart, data.customer.cityId);
      const now = clock();
      const id = newOrderId(now);
      const message = buildOrderMessage(q, data.customer, id, SELLER_LANG);
      let opened = true;
      try { await Linking.openURL(whatsappUrl(seller, message)); } catch { opened = false; }
      app.placeOrder({ id, createdAt: now.toISOString(), lines: data.cart, liters: q.liters, total: q.total, cityId: data.customer.cityId, day: data.customer.day });
      app.setCustomer({ ...data.customer, day: '', slot: '', note: '' }); // le reste (nom, téléphone, adresse) est gardé pour la prochaine fois
      setStack([{ name: 'home' }, { name: 'done', id, message, opened }]);
    } finally {
      sendingNow.current = false;
      setSending(false);
    }
  };

  let screen: React.ReactNode;
  switch (route.name) {
    case 'oils':
      screen = <OilsScreen onBack={pop} onPick={(oilId) => push({ name: 'oil', oilId })} />;
      break;
    case 'oil':
      screen = <OilScreen oilId={route.oilId} cartLiters={cartLiters(data.cart)} onBack={pop} onAdd={(line) => { app.addToCart(line); setStack((s) => [...s.slice(0, -1), { name: 'cart' }]); }} />;
      break;
    case 'cart':
      screen = <CartScreen cart={data.cart} onBack={pop} onChangeCount={app.setLineCount} onRemove={app.removeLine} onAddAnother={toOils} onNext={() => push({ name: 'delivery' })} />;
      break;
    case 'delivery':
      screen = <DeliveryScreen customer={data.customer} cart={data.cart} today={today} onChange={app.setCustomer} onBack={pop} onNext={() => push({ name: 'review' })} />;
      break;
    case 'review':
      screen = <ReviewScreen cart={data.cart} customer={data.customer} error={sendError} sending={sending} onBack={pop} onSend={() => { void send(); }} />;
      break;
    case 'done':
      screen = <DoneScreen id={route.id} message={route.message} opened={route.opened} onDone={home} />;
      break;
    case 'orders':
      screen = <OrdersScreen orders={data.orders} onBack={pop} onReorder={(o) => { app.reorder(o.lines); push({ name: 'cart' }); }} />;
      break;
    case 'settings':
      screen = <SettingsScreen palette={data.palette} textSize={data.textSize} onBack={pop} onLang={app.setLang} onPalette={app.setPalette} onTextSize={app.setTextSize} />;
      break;
    default:
      screen = <HomeScreen cartLiters={cartLiters(data.cart)} onOrder={() => push({ name: 'oils' })} onResume={() => push({ name: 'cart' })} onOrders={() => push({ name: 'orders' })} onSettings={() => push({ name: 'settings' })} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {app.ready ? screen : null}
    </View>
  );
}

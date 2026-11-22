import { useCallback, useEffect, useRef, useState } from 'react';
import { I18nManager } from 'react-native';
import { CartLine, Customer, addLine, removeLine, setLineCount } from '../domain/order';
import { isRtl, Lang } from '../i18n/strings';
import { PaletteId } from '../theme/palettes';
import { TextSize } from '../theme/ThemeProvider';
import { AppData, MAX_ORDERS_KEPT, PlacedOrder, defaultData } from './data';
import { loadData, saveData } from './storage';

// Android n'applique le sens de lecture qu'au prochain démarrage: on le prépare dès que la langue change.
function prepareDirection(lang: Lang) {
  try {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== isRtl(lang)) I18nManager.forceRTL(isRtl(lang));
  } catch { /* simulateur ou web: sans effet */ }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadData().then((d) => {
      if (!alive) return;
      loaded.current = true;
      setData(d);
      prepareDirection(d.lang);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  // Sauvegarde groupée (une rafale de clics sur « + » n'écrit qu'une fois).
  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => { void saveData(data); }, 300);
    return () => clearTimeout(timer);
  }, [data]);

  const patch = useCallback((p: Partial<AppData> | ((d: AppData) => Partial<AppData>)) => {
    setData((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) }));
  }, []);

  return {
    data,
    ready,
    setLang: useCallback((lang: Lang) => { prepareDirection(lang); patch({ lang }); }, [patch]),
    setPalette: useCallback((palette: PaletteId) => patch({ palette }), [patch]),
    setTextSize: useCallback((textSize: TextSize) => patch({ textSize }), [patch]),
    addToCart: useCallback((line: CartLine) => patch((d) => ({ cart: addLine(d.cart, line) })), [patch]),
    setLineCount: useCallback((index: number, count: number) => patch((d) => ({ cart: setLineCount(d.cart, index, count) })), [patch]),
    removeLine: useCallback((index: number) => patch((d) => ({ cart: removeLine(d.cart, index) })), [patch]),
    clearCart: useCallback(() => patch({ cart: [] }), [patch]),
    setCustomer: useCallback((customer: Customer) => patch({ customer }), [patch]),
    placeOrder: useCallback((order: PlacedOrder) => patch((d) => ({ orders: [order, ...d.orders].slice(0, MAX_ORDERS_KEPT), cart: [] })), [patch]),
    // « Commander à nouveau »: les lignes de l'ancienne commande sont ajoutées au panier actuel.
    reorder: useCallback((lines: CartLine[]) => patch((d) => ({ cart: lines.reduce((cart, l) => addLine(cart, l), d.cart) })), [patch]),
  };
}

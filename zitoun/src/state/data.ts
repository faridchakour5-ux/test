import { CartLine, Customer, EMPTY_CUSTOMER, MAX_COUNT_PER_LINE } from '../domain/order';
import { getOil, getPackaging } from '../domain/catalog';
import { SLOTS, parseDay } from '../domain/delivery';
import { Lang, LANGS, deviceLang } from '../i18n/strings';
import { DEFAULT_PALETTE, PALETTE_IDS, PaletteId } from '../theme/palettes';
import { TEXT_SIZES, TextSize } from '../theme/ThemeProvider';

// Commande envoyée (copie locale pour « Commander à nouveau »): on garde les lignes, pas les prix (le catalogue peut changer).
export interface PlacedOrder { id: string; createdAt: string; lines: CartLine[]; liters: number; total: number; cityId: string; day: string }

export interface AppData {
  lang: Lang;
  palette: PaletteId;
  textSize: TextSize;
  cart: CartLine[];
  customer: Customer; // pré-rempli au prochain passage (nom, téléphone, ville, adresse): reste sur le téléphone
  orders: PlacedOrder[];
}

export const MAX_ORDERS_KEPT = 30;
export const STORAGE_KEY = 'zitoun:v1';

export const defaultData = (): AppData => ({ lang: deviceLang(), palette: DEFAULT_PALETTE, textSize: 'normal', cart: [], customer: { ...EMPTY_CUSTOMER }, orders: [] });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function normalizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const l of raw) {
    if (!isObj(l)) continue;
    const oilId = str(l.oilId, 60);
    const packagingId = str(l.packagingId, 60);
    const count = Math.floor(num(l.count));
    // Une huile ou un conditionnement qui n'existe plus au catalogue est écarté.
    if (!getOil(oilId) || !getPackaging(packagingId) || count < 1) continue;
    const same = out.find((x) => x.oilId === oilId && x.packagingId === packagingId);
    if (same) same.count = Math.min(MAX_COUNT_PER_LINE, same.count + count);
    else out.push({ oilId, packagingId, count: Math.min(MAX_COUNT_PER_LINE, count) });
  }
  return out;
}

// Relit une sauvegarde sans jamais planter: chaque champ est vérifié, ce qui est invalide retombe sur la valeur par défaut.
export function normalizeData(raw: unknown, base: AppData = defaultData()): AppData {
  if (!isObj(raw)) return base;
  const c = isObj(raw.customer) ? raw.customer : {};
  const slot = SLOTS.includes(c.slot as never) ? (c.slot as Customer['slot']) : '';
  const orders: PlacedOrder[] = [];
  if (Array.isArray(raw.orders)) {
    for (const o of raw.orders) {
      if (!isObj(o)) continue;
      const lines = normalizeLines(o.lines);
      const id = str(o.id, 40);
      if (!id || lines.length === 0 || Number.isNaN(Date.parse(str(o.createdAt, 40)))) continue;
      orders.push({ id, createdAt: str(o.createdAt, 40), lines, liters: Math.max(0, num(o.liters)), total: Math.max(0, num(o.total)), cityId: str(o.cityId, 40), day: parseDay(str(o.day, 10)) ? str(o.day, 10) : '' });
    }
  }
  return {
    lang: LANGS.includes(raw.lang as Lang) ? (raw.lang as Lang) : base.lang,
    palette: PALETTE_IDS.includes(raw.palette as PaletteId) ? (raw.palette as PaletteId) : base.palette,
    textSize: TEXT_SIZES.includes(raw.textSize as TextSize) ? (raw.textSize as TextSize) : base.textSize,
    cart: normalizeLines(raw.cart),
    // La date de livraison n'est jamais gardée d'un passage à l'autre (elle serait périmée).
    customer: { name: str(c.name, 60), phone: str(c.phone, 30), cityId: str(c.cityId, 40), address: str(c.address, 200), day: '', slot, note: '' },
    orders: orders.slice(0, MAX_ORDERS_KEPT),
  };
}

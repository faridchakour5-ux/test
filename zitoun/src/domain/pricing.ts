import { CartLine } from './order';
import { Oil, Packaging, getOil, getPackaging } from './catalog';
import { getCity } from './delivery';

// Remises selon le TOTAL de litres de la commande (pas par ligne): plus on commande, moins le litre coûte.
export const VOLUME_TIERS: { liters: number; pct: number }[] = [{ liters: 10, pct: 5 }, { liters: 20, pct: 8 }, { liters: 50, pct: 12 }];
// Livraison offerte au-delà de ce montant (après remise), en dirhams.
export const FREE_DELIVERY_FROM = 800;
export const MAX_ORDER_LITERS = 200; // au-delà, on invite à contacter le vendeur

export const discountPct = (liters: number): number => VOLUME_TIERS.reduce((pct, t) => (liters >= t.liters ? t.pct : pct), 0);
// Prochain palier (pour inciter doucement à commander un peu plus), ou null.
export const nextTier = (liters: number) => VOLUME_TIERS.find((t) => liters < t.liters) ?? null;

export interface QuoteLine { oil: Oil; packaging: Packaging; count: number; liters: number; unitPerLiter: number; total: number }
export interface Quote {
  lines: QuoteLine[];
  liters: number;
  subtotal: number;
  pct: number;
  discount: number;
  afterDiscount: number;
  deliveryFee: number | null; // null tant que la ville n'est pas choisie
  freeDelivery: boolean;
  total: number; // à payer à la livraison
  remainingForFree: number; // dirhams qui manquent pour la livraison offerte (0 si déjà offerte)
}

// Calcule tout en dirhams entiers. Une ligne dont l'huile ou le conditionnement n'existe plus (catalogue modifié) est ignorée.
export function quote(cart: CartLine[], cityId?: string | null): Quote {
  const lines: QuoteLine[] = [];
  for (const l of cart) {
    const oil = getOil(l.oilId);
    const packaging = getPackaging(l.packagingId);
    const count = Math.floor(Number(l.count));
    if (!oil || !packaging || !Number.isFinite(count) || count < 1) continue;
    const liters = packaging.liters * count;
    const unitPerLiter = oil.pricePerLiter + packaging.extraPerLiter;
    lines.push({ oil, packaging, count, liters, unitPerLiter, total: unitPerLiter * liters });
  }
  const liters = lines.reduce((s, l) => s + l.liters, 0);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const pct = discountPct(liters);
  const discount = Math.round((subtotal * pct) / 100);
  const afterDiscount = subtotal - discount;
  const city = cityId ? getCity(cityId) : undefined;
  const freeDelivery = lines.length > 0 && afterDiscount >= FREE_DELIVERY_FROM;
  const deliveryFee = city ? (freeDelivery ? 0 : city.fee) : null;
  const total = afterDiscount + (deliveryFee ?? 0);
  const remainingForFree = freeDelivery || lines.length === 0 ? 0 : FREE_DELIVERY_FROM - afterDiscount;
  return { lines, liters, subtotal, pct, discount, afterDiscount, deliveryFee, freeDelivery, total, remainingForFree };
}

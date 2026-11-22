import { Lang, pick, t, tf } from '../i18n/strings';
import { SHOP_NAME } from '../config/shop';
import { INTENSITY_LABEL, getOil, getPackaging } from './catalog';
import { SLOTS, Slot, formatDay, getCity, isDeliverable } from './delivery';
import { formatMoney } from './money';
import { formatLocalPhone, normalizeMoroccanPhone } from './phone';
import { MAX_ORDER_LITERS, Quote, quote } from './pricing';

export interface CartLine { oilId: string; packagingId: string; count: number }
export const MAX_COUNT_PER_LINE = 50;

const sameLine = (a: CartLine, b: CartLine) => a.oilId === b.oilId && a.packagingId === b.packagingId;
const litersOf = (l: CartLine) => (getPackaging(l.packagingId)?.liters ?? 0) * l.count;
export const cartLiters = (cart: CartLine[]): number => cart.reduce((s, l) => s + litersOf(l), 0);
export const cartCount = (cart: CartLine[]): number => cart.reduce((s, l) => s + l.count, 0);

// Ajoute une ligne (fusionne avec la même huile + même conditionnement). Ne dépasse jamais MAX_ORDER_LITERS: la ligne est
// réduite au nombre qui rentre encore (peut valoir 0: rien n'est ajouté).
export function addLine(cart: CartLine[], line: CartLine): CartLine[] {
  const pack = getPackaging(line.packagingId);
  const count = Math.floor(Number(line.count));
  if (!pack || !getOil(line.oilId) || !Number.isFinite(count) || count < 1) return cart;
  const existing = cart.find((l) => sameLine(l, line));
  const room = Math.floor((MAX_ORDER_LITERS - cartLiters(cart)) / pack.liters);
  const add = Math.min(count, room, MAX_COUNT_PER_LINE - (existing?.count ?? 0));
  if (add < 1) return cart;
  return existing
    ? cart.map((l) => (l === existing ? { ...l, count: l.count + add } : l))
    : [...cart, { oilId: line.oilId, packagingId: line.packagingId, count: add }];
}

// Change le nombre d'une ligne (0 ou moins = la retirer); plafonné comme addLine.
export function setLineCount(cart: CartLine[], index: number, count: number): CartLine[] {
  const line = cart[index];
  if (!line) return cart;
  const wanted = Math.floor(Number(count));
  if (!Number.isFinite(wanted) || wanted < 1) return cart.filter((_, i) => i !== index);
  const pack = getPackaging(line.packagingId);
  if (!pack) return cart.filter((_, i) => i !== index);
  const others = cartLiters(cart) - litersOf(line);
  const max = Math.min(MAX_COUNT_PER_LINE, Math.floor((MAX_ORDER_LITERS - others) / pack.liters));
  return cart.map((l, i) => (i === index ? { ...l, count: Math.max(1, Math.min(wanted, max)) } : l));
}

export const removeLine = (cart: CartLine[], index: number): CartLine[] => cart.filter((_, i) => i !== index);

export interface Customer { name: string; phone: string; cityId: string; address: string; day: string; slot: Slot | ''; note: string }
export const EMPTY_CUSTOMER: Customer = { name: '', phone: '', cityId: '', address: '', day: '', slot: '', note: '' };

export type OrderError = 'eEmpty' | 'eTooMany' | 'eName' | 'ePhone' | 'eCity' | 'eAddress' | 'eDate';

// Vérifie la commande; renvoie les erreurs dans l'ordre d'affichage (liste vide = commande valide).
export function validateOrder(cart: CartLine[], c: Customer, today: string): OrderError[] {
  const errors: OrderError[] = [];
  const q = quote(cart);
  if (q.lines.length === 0) errors.push('eEmpty');
  else if (q.liters > MAX_ORDER_LITERS) errors.push('eTooMany');
  const name = c.name.trim();
  if (name.length < 2 || name.length > 60) errors.push('eName');
  if (!normalizeMoroccanPhone(c.phone)) errors.push('ePhone');
  if (!getCity(c.cityId)) errors.push('eCity');
  const address = c.address.trim();
  if (address.length < 6 || address.length > 200) errors.push('eAddress');
  if (!isDeliverable(c.day, today, c.cityId) || !SLOTS.includes(c.slot as Slot)) errors.push('eDate');
  return errors;
}

// Numéro de commande lisible au téléphone: ZT-251123-A3F9 (date + 4 caractères sans ambiguïté).
const ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I, L, O, 0, 1
export function newOrderId(now: Date = new Date(), rand: () => number = Math.random): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ID_CHARS[Math.min(ID_CHARS.length - 1, Math.floor(rand() * ID_CHARS.length))];
  return `ZT-${yy}${mm}${dd}-${suffix}`;
}

const SLOT_KEY = { morning: 'slotMorning', afternoon: 'slotAfternoon', evening: 'slotEvening' } as const;

// Message envoyé au vendeur (dans la langue du vendeur). Ne contient que ce que le client a saisi pour sa livraison.
export function buildOrderMessage(q: Quote, c: Customer, id: string, lang: Lang): string {
  const city = getCity(c.cityId);
  const phone = normalizeMoroccanPhone(c.phone);
  const money = (n: number) => formatMoney(n, lang);
  const day = formatDay(c.day, lang).full;
  const slot = c.slot ? t(lang, SLOT_KEY[c.slot]) : '';
  const out: string[] = [
    `${SHOP_NAME} — ${tf(lang, 'orderNumber', { id })}`,
    '',
    `${t(lang, 'name')} : ${c.name.trim()}`,
    `${t(lang, 'phone')} : ${phone ? formatLocalPhone(phone) : c.phone.trim()}`,
    `${t(lang, 'city')} : ${city ? pick(city.name, lang) : c.cityId}`,
    `${t(lang, 'address')} : ${c.address.trim()}`,
    `${t(lang, 'whenQ')} : ${day}${slot ? ` · ${slot}` : ''}`,
    '',
    `${t(lang, 'yourOrder')} :`,
  ];
  for (const l of q.lines) {
    out.push(`• ${pick(l.oil.name, lang)} (${t(lang, INTENSITY_LABEL[l.oil.intensity])}) — ${l.count} × ${t(lang, l.packaging.label)} = ${tf(lang, 'litersShort', { liters: l.liters })} — ${money(l.total)}`);
  }
  out.push('', `${t(lang, 'subtotal')} : ${money(q.subtotal)}`);
  if (q.pct > 0) out.push(`${tf(lang, 'volumeDiscount', { pct: q.pct })} : −${money(q.discount)}`);
  out.push(`${t(lang, 'deliveryFee')} : ${q.deliveryFee === 0 ? t(lang, 'freeLabel') : q.deliveryFee === null ? '—' : money(q.deliveryFee)}`);
  out.push(`${t(lang, 'total')} (${t(lang, 'payOnDelivery')}) : ${money(q.total)}`);
  const note = c.note.trim();
  if (note) out.push('', `${t(lang, 'note')} : ${note.slice(0, 300)}`);
  return out.join('\n');
}

export const whatsappUrl = (number: string, message: string): string => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;


import { Bilingual } from './catalog';
import { Lang } from '../i18n/strings';

// ⚠️ EXEMPLES À ADAPTER: villes desservies, frais de livraison (dirhams) et délai minimal (jours) sont fictifs.
export interface City { id: string; name: Bilingual; fee: number; leadDays: number }
export const CITIES: City[] = [
  { id: 'casablanca', name: { fr: 'Casablanca', ar: 'الدار البيضاء' }, fee: 25, leadDays: 1 },
  { id: 'mohammedia', name: { fr: 'Mohammedia', ar: 'المحمدية' }, fee: 30, leadDays: 1 },
  { id: 'rabat', name: { fr: 'Rabat', ar: 'الرباط' }, fee: 30, leadDays: 2 },
  { id: 'sale', name: { fr: 'Salé', ar: 'سلا' }, fee: 30, leadDays: 2 },
  { id: 'kenitra', name: { fr: 'Kénitra', ar: 'القنيطرة' }, fee: 40, leadDays: 2 },
  { id: 'marrakech', name: { fr: 'Marrakech', ar: 'مراكش' }, fee: 40, leadDays: 2 },
  { id: 'fes', name: { fr: 'Fès', ar: 'فاس' }, fee: 40, leadDays: 2 },
  { id: 'meknes', name: { fr: 'Meknès', ar: 'مكناس' }, fee: 40, leadDays: 2 },
  { id: 'tanger', name: { fr: 'Tanger', ar: 'طنجة' }, fee: 50, leadDays: 3 },
  { id: 'agadir', name: { fr: 'Agadir', ar: 'أكادير' }, fee: 50, leadDays: 3 },
  { id: 'oujda', name: { fr: 'Oujda', ar: 'وجدة' }, fee: 60, leadDays: 3 },
];
export const getCity = (id: string): City | undefined => CITIES.find((c) => c.id === id);

export type Slot = 'morning' | 'afternoon' | 'evening';
export const SLOTS: Slot[] = ['morning', 'afternoon', 'evening'];
export const MAX_DAYS_AHEAD = 45;
export const DAY_CHIPS = 14; // nombre de jours proposés d'un coup à l'écran

// Jours au format AAAA-MM-JJ (heure locale), sans fuseau: une date de livraison est un jour du calendrier, pas un instant.
const pad = (n: number) => String(n).padStart(2, '0');
export const toDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseDay(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12); // midi: à l'abri des changements d'heure
  return toDay(d) === day ? d : null; // refuse 2026-02-31
}
export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  if (!d) return day;
  d.setDate(d.getDate() + n);
  return toDay(d);
}

// Premier jour de livraison possible depuis `today` pour cette ville (ville inconnue: délai le plus long, par prudence).
export function earliestDay(today: string, cityId?: string | null): string {
  const lead = (cityId && getCity(cityId)?.leadDays) || Math.max(...CITIES.map((c) => c.leadDays));
  return addDays(today, lead);
}
export const latestDay = (today: string): string => addDays(today, MAX_DAYS_AHEAD);
export const availableDays = (today: string, cityId?: string | null, count = DAY_CHIPS): string[] => {
  const first = earliestDay(today, cityId);
  return Array.from({ length: count }, (_, i) => addDays(first, i)).filter((d) => d <= latestDay(today));
};
export const isDeliverable = (day: string, today: string, cityId?: string | null): boolean =>
  parseDay(day) !== null && day >= earliestDay(today, cityId) && day <= latestDay(today);

const WEEKDAYS: Record<Lang, string[]> = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
// Noms des mois usuels au Maroc (nonbre: « نونبر », « دجنبر »…).
const MONTHS: Record<Lang, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
};
export function formatDay(day: string, lang: Lang): { weekday: string; dayOfMonth: string; month: string; full: string } {
  const d = parseDay(day);
  if (!d) return { weekday: '', dayOfMonth: '', month: '', full: day };
  const weekday = WEEKDAYS[lang][d.getDay()];
  const month = MONTHS[lang][d.getMonth()];
  return { weekday, dayOfMonth: String(d.getDate()), month, full: `${weekday} ${d.getDate()} ${month}` };
}

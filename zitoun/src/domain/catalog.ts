import { Lang, StringKey } from '../i18n/strings';

// ⚠️ EXEMPLES À REMPLACER: noms, régions, acidités, années de récolte et PRIX (en dirhams le litre) sont fictifs.
// Modifier cette liste suffit à changer le catalogue de l'application.
export type Intensity = 1 | 2 | 3 | 4 | 5;
export type UseId = 'salad' | 'cooking' | 'tajine' | 'grill' | 'bread' | 'care';
export type Bilingual = Record<Lang, string>;

export interface Oil {
  id: string;
  name: Bilingual;
  region: Bilingual;
  variety: Bilingual;
  intensity: Intensity;
  acidity: number; // acidité libre en % (huile vierge extra: 0,8 % au plus)
  harvest: number; // année de récolte
  pricePerLiter: number; // dirhams, entier
  uses: UseId[];
}

export const OILS: Oil[] = [
  { id: 'saiss-doux', name: { fr: 'Doux du Saïss', ar: 'حلو سايس' }, region: { fr: 'Fès-Meknès', ar: 'فاس-مكناس' }, variety: { fr: 'Picholine marocaine', ar: 'البيشولين المغربية' }, intensity: 1, acidity: 0.3, harvest: 2025, pricePerLiter: 98, uses: ['salad', 'bread'] },
  { id: 'tadla-fruite', name: { fr: 'Fruité de Tadla', ar: 'فاكهي تادلة' }, region: { fr: 'Béni Mellal-Khénifra', ar: 'بني ملال-خنيفرة' }, variety: { fr: 'Picholine marocaine', ar: 'البيشولين المغربية' }, intensity: 2, acidity: 0.4, harvest: 2025, pricePerLiter: 92, uses: ['salad', 'cooking', 'bread'] },
  { id: 'haouz-equilibre', name: { fr: 'Équilibré du Haouz', ar: 'متوازن الحوز' }, region: { fr: 'Marrakech-Safi', ar: 'مراكش-آسفي' }, variety: { fr: 'Haouzia', ar: 'الحوزية' }, intensity: 3, acidity: 0.45, harvest: 2025, pricePerLiter: 90, uses: ['cooking', 'tajine', 'salad'] },
  { id: 'rif-intense', name: { fr: 'Intense du Rif', ar: 'قوي الريف' }, region: { fr: 'Tanger-Tétouan-Al Hoceïma', ar: 'طنجة-تطوان-الحسيمة' }, variety: { fr: 'Picholine marocaine', ar: 'البيشولين المغربية' }, intensity: 4, acidity: 0.5, harvest: 2025, pricePerLiter: 105, uses: ['tajine', 'grill', 'bread'] },
  { id: 'atlas-puissant', name: { fr: 'Puissant de l\'Atlas', ar: 'قوي الأطلس' }, region: { fr: 'Haut Atlas', ar: 'الأطلس الكبير' }, variety: { fr: 'Menara', ar: 'المنارة' }, intensity: 5, acidity: 0.35, harvest: 2025, pricePerLiter: 120, uses: ['grill', 'bread', 'care'] },
];

export const INTENSITIES: Intensity[] = [1, 2, 3, 4, 5];
export const INTENSITY_LABEL: Record<Intensity, StringKey> = { 1: 'i1', 2: 'i2', 3: 'i3', 4: 'i4', 5: 'i5' };
export const INTENSITY_DESC: Record<Intensity, StringKey> = { 1: 'd1', 2: 'd2', 3: 'd3', 4: 'd4', 5: 'd5' };
export const USE_LABEL: Record<UseId, StringKey> = { salad: 'uSalad', cooking: 'uCooking', tajine: 'uTajine', grill: 'uGrill', bread: 'uBread', care: 'uCare' };

export const getOil = (id: string): Oil | undefined => OILS.find((o) => o.id === id);
// Du plus doux au plus intense (puis par nom): l'ordre d'affichage.
export const oilsByIntensity = (oils: Oil[] = OILS): Oil[] => [...oils].sort((a, b) => a.intensity - b.intensity || a.id.localeCompare(b.id));

// Conditionnements: `extraPerLiter` = supplément par litre (la bouteille en verre coûte plus cher que le bidon), en dirhams.
export interface Packaging { id: string; liters: number; extraPerLiter: number; label: StringKey }
export const PACKAGINGS: Packaging[] = [
  { id: 'bottle1', liters: 1, extraPerLiter: 8, label: 'bottle1' },
  { id: 'can2', liters: 2, extraPerLiter: 3, label: 'can2' },
  { id: 'can5', liters: 5, extraPerLiter: 0, label: 'can5' },
  { id: 'can10', liters: 10, extraPerLiter: 0, label: 'can10' },
  { id: 'can20', liters: 20, extraPerLiter: 0, label: 'can20' },
];
export const getPackaging = (id: string): Packaging | undefined => PACKAGINGS.find((p) => p.id === id);

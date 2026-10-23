import { UiLang } from '../i18n/strings';
import { DARK, LIGHT, Palette, STATUS_DARK, STATUS_LIGHT } from './tokens';

// Dictionnaire de combinaisons de couleurs. Chaque entrée a une version claire et une version sombre.
// Le test `palettes.test.ts` vérifie que chaque combinaison respecte le contraste WCAG AA.
export type PaletteId = 'violet' | 'ocean' | 'sunset' | 'forest' | 'clear';

export interface PaletteEntry {
  name: Record<UiLang, string>;
  light: Palette;
  dark: Palette;
}

export const PALETTE_DICTIONARY: Record<PaletteId, PaletteEntry> = {
  violet: {
    name: { fr: 'Violet nuit', en: 'Night violet', ar: 'بنفسجي ليلي', es: 'Violeta nocturno', zh: '夜紫' },
    light: LIGHT,
    dark: DARK,
  },
  ocean: {
    name: { fr: 'Océan', en: 'Ocean', ar: 'محيط', es: 'Océano', zh: '海洋' },
    light: { background: '#F3F9FB', surface: '#FFFFFF', text: '#0E2A36', textMuted: '#4A6572', primary: '#0B6E99', onPrimary: '#FFFFFF', border: '#D5E4EA', ...STATUS_LIGHT },
    dark: { background: '#0A1A22', surface: '#12262F', text: '#EAF6FB', textMuted: '#A9C2CC', primary: '#5CC8F2', onPrimary: '#08161D', border: '#27424E', ...STATUS_DARK },
  },
  sunset: {
    name: { fr: 'Coucher de soleil', en: 'Sunset', ar: 'غروب', es: 'Atardecer', zh: '日落' },
    light: { background: '#FFF7F2', surface: '#FFFFFF', text: '#2B1A14', textMuted: '#6B5148', primary: '#B8441C', onPrimary: '#FFFFFF', border: '#F0DCD1', ...STATUS_LIGHT },
    dark: { background: '#1C1210', surface: '#2A1B17', text: '#FFEFE8', textMuted: '#D2B5A8', primary: '#FF9A70', onPrimary: '#1C1210', border: '#4A322A', ...STATUS_DARK },
  },
  forest: {
    name: { fr: 'Forêt', en: 'Forest', ar: 'غابة', es: 'Bosque', zh: '森林' },
    light: { background: '#F4F8F2', surface: '#FFFFFF', text: '#14281A', textMuted: '#4A5F50', primary: '#1F7A45', onPrimary: '#FFFFFF', border: '#D8E4D4', ...STATUS_LIGHT },
    dark: { background: '#0C1A11', surface: '#14271B', text: '#EAF6EE', textMuted: '#A8C4B0', primary: '#6FD39A', onPrimary: '#0C1A11', border: '#284233', ...STATUS_DARK },
  },
  // Pensée pour le daltonisme: bleu / orange (palette Okabe-Ito), jamais rouge contre vert.
  clear: {
    name: { fr: 'Vision claire (daltonisme)', en: 'Clear vision (colour-blind)', ar: 'رؤية واضحة (عمى الألوان)', es: 'Visión clara (daltonismo)', zh: '清晰视觉（色盲友好）' },
    light: { background: '#FAFAF7', surface: '#FFFFFF', text: '#111111', textMuted: '#4D4D4D', primary: '#0072B2', onPrimary: '#FFFFFF', border: '#D9D9D2', ...STATUS_LIGHT },
    dark: { background: '#101114', surface: '#1B1D22', text: '#F5F5F5', textMuted: '#BDBDBD', primary: '#56B4E9', onPrimary: '#0B0C0F', border: '#3A3D45', ...STATUS_DARK },
  },
};

export const PALETTE_IDS = Object.keys(PALETTE_DICTIONARY) as PaletteId[];
export const DEFAULT_PALETTE: PaletteId = 'violet';

import { Lang } from '../i18n/strings';
import { Palette, STATUS_DARK, STATUS_LIGHT } from './tokens';

// Dictionnaire de combinaisons de couleurs inspirées du Maroc. Chaque entrée a une version claire et une version sombre.
// Le test `palettes.test.ts` vérifie que chaque paire texte/fond respecte le contraste WCAG AA (4,5:1).
export type PaletteId = 'olivier' | 'majorelle' | 'terre' | 'menthe' | 'rose' | 'clair';

export interface PaletteEntry {
  name: Record<Lang, string>;
  mood: Record<Lang, string>; // en quelques mots: pour quel esprit cette combinaison est-elle faite
  light: Palette;
  dark: Palette;
}

export const PALETTE_DICTIONARY: Record<PaletteId, PaletteEntry> = {
  olivier: {
    name: { fr: 'Olivier & Or', ar: 'زيتون وذهب' },
    mood: { fr: 'Vert olive et or: naturel, authentique', ar: 'أخضر زيتوني وذهبي: طبيعي وأصيل' },
    light: { background: '#FAF6E9', surface: '#FFFFFF', surfaceAlt: '#F1EBD2', text: '#25301A', textMuted: '#56603F', primary: '#4A6A1C', onPrimary: '#FFFFFF', accent: '#E0B13A', onAccent: '#2A2208', border: '#E2DABB', ...STATUS_LIGHT },
    dark: { background: '#11150B', surface: '#1A2012', surfaceAlt: '#232B18', text: '#F2F0DF', textMuted: '#BCC49F', primary: '#A6C85A', onPrimary: '#11150B', accent: '#E8C050', onAccent: '#1C1604', border: '#38422A', ...STATUS_DARK },
  },
  majorelle: {
    name: { fr: 'Bleu Majorelle', ar: 'أزرق ماجوريل' },
    mood: { fr: 'Bleu profond et jaune: franc, moderne', ar: 'أزرق عميق وأصفر: واضح وعصري' },
    light: { background: '#F5F7FD', surface: '#FFFFFF', surfaceAlt: '#E6ECFA', text: '#121B3A', textMuted: '#4A5578', primary: '#2A3DB5', onPrimary: '#FFFFFF', accent: '#F2C230', onAccent: '#2B2200', border: '#D5DCF2', ...STATUS_LIGHT },
    dark: { background: '#0B1024', surface: '#141B38', surfaceAlt: '#1C2547', text: '#EEF1FF', textMuted: '#AEB8E0', primary: '#8FA0FF', onPrimary: '#0B1024', accent: '#F2C230', onAccent: '#241C00', border: '#2E3966', ...STATUS_DARK },
  },
  terre: {
    name: { fr: 'Terre cuite de Marrakech', ar: 'طين مراكش' },
    mood: { fr: 'Terre cuite et ambre: chaleureux', ar: 'طين وعنبر: دافئ' },
    light: { background: '#FBF3EC', surface: '#FFFFFF', surfaceAlt: '#F4E2D3', text: '#2E1B12', textMuted: '#6A4C3C', primary: '#A33F18', onPrimary: '#FFFFFF', accent: '#E4A24A', onAccent: '#2B1A05', border: '#E9D3C2', ...STATUS_LIGHT },
    dark: { background: '#1A100B', surface: '#26170F', surfaceAlt: '#321F15', text: '#FFEFE3', textMuted: '#D4B6A3', primary: '#FF9D6E', onPrimary: '#1A100B', accent: '#E4A24A', onAccent: '#1F1303', border: '#4A3022', ...STATUS_DARK },
  },
  menthe: {
    name: { fr: 'Thé à la menthe', ar: 'أتاي بالنعناع' },
    mood: { fr: 'Vert menthe et safran: frais, apaisant', ar: 'أخضر نعناعي وزعفراني: منعش ومريح' },
    light: { background: '#F1F8F4', surface: '#FFFFFF', surfaceAlt: '#DDEFE5', text: '#10291E', textMuted: '#44604F', primary: '#136B4A', onPrimary: '#FFFFFF', accent: '#F0B33C', onAccent: '#2A1E02', border: '#CFE3D8', ...STATUS_LIGHT },
    dark: { background: '#08170F', surface: '#10261A', surfaceAlt: '#173324', text: '#E8F8EF', textMuted: '#A3C7B2', primary: '#5FD6A0', onPrimary: '#08170F', accent: '#F0B33C', onAccent: '#1F1602', border: '#2A4A39', ...STATUS_DARK },
  },
  rose: {
    name: { fr: 'Rose de Kelâat M\'Gouna', ar: 'ورد قلعة مكونة' },
    mood: { fr: 'Rose et or: doux, cadeau', ar: 'وردي وذهبي: لطيف ومناسب للهدايا' },
    light: { background: '#FFF5F7', surface: '#FFFFFF', surfaceAlt: '#FBE1E7', text: '#35121C', textMuted: '#7A4755', primary: '#A2234B', onPrimary: '#FFFFFF', accent: '#D9A441', onAccent: '#2B1C03', border: '#F0CFD8', ...STATUS_LIGHT },
    dark: { background: '#1E0C12', surface: '#2B141C', surfaceAlt: '#381B25', text: '#FFEAF0', textMuted: '#DDB2C0', primary: '#FF8FB0', onPrimary: '#1E0C12', accent: '#D9A441', onAccent: '#1F1503', border: '#4E2A37', ...STATUS_DARK },
  },
  // Pensée pour le daltonisme: bleu / orange (palette Okabe-Ito), jamais rouge contre vert.
  clair: {
    name: { fr: 'Vision claire (daltonisme)', ar: 'رؤية واضحة (عمى الألوان)' },
    mood: { fr: 'Bleu et orange, contrastes forts', ar: 'أزرق وبرتقالي بتباين قوي' },
    light: { background: '#FAFAF7', surface: '#FFFFFF', surfaceAlt: '#EFEFE8', text: '#111111', textMuted: '#4D4D4D', primary: '#00669F', onPrimary: '#FFFFFF', accent: '#E69F00', onAccent: '#1A1100', border: '#D9D9D2', ...STATUS_LIGHT },
    dark: { background: '#101114', surface: '#1B1D22', surfaceAlt: '#24272E', text: '#F5F5F5', textMuted: '#BDBDBD', primary: '#56B4E9', onPrimary: '#0B0C0F', accent: '#E69F00', onAccent: '#1A1100', border: '#3A3D45', ...STATUS_DARK },
  },
};

export const PALETTE_IDS = Object.keys(PALETTE_DICTIONARY) as PaletteId[];
export const DEFAULT_PALETTE: PaletteId = 'olivier';

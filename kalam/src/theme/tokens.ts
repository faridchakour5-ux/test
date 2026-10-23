// Les couleurs existent en clair et en sombre. Les ratios de contraste visent WCAG AA.
export interface Palette {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  border: string;
}

export const LIGHT: Palette = {
  background: '#FBF8F3',
  surface: '#FFFFFF',
  text: '#1B1A2E',
  textMuted: '#5B5A70',
  primary: '#3B2FA3',
  onPrimary: '#FFFFFF',
  border: '#E3DED3',
};

export const DARK: Palette = {
  background: '#12111F',
  surface: '#1C1B2E',
  text: '#F4F2FF',
  textMuted: '#B4B1CC',
  primary: '#9C8CFF',
  onPrimary: '#12111F',
  border: '#34324D',
};

// Contraste élevé (seniors): noir/blanc pur, bouton très marqué.
export const HIGH_CONTRAST_LIGHT: Palette = {
  ...LIGHT,
  background: '#FFFFFF',
  text: '#000000',
  textMuted: '#2B2B2B',
  primary: '#1A0F7A',
  border: '#000000',
};

export const HIGH_CONTRAST_DARK: Palette = {
  ...DARK,
  background: '#000000',
  surface: '#0A0A0A',
  text: '#FFFFFF',
  textMuted: '#E0E0E0',
  primary: '#C4B8FF',
  border: '#FFFFFF',
};

// Les couleurs existent en clair et en sombre. Les ratios de contraste visent WCAG AA (voir palettes.test.ts).
export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string; // fond teinté des blocs secondaires (rappels, bandeaux)
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string; // touche décorative (or, safran…): toujours avec onAccent pour le texte posé dessus
  onAccent: string;
  border: string;
  // Couleurs d'état: toujours accompagnées d'un symbole ou d'un texte (jamais la couleur seule).
  success: string;
  warning: string;
  danger: string;
}

export const STATUS_LIGHT = { success: '#17754A', warning: '#8A5300', danger: '#B3261E' };
export const STATUS_DARK = { success: '#5FD99A', warning: '#FFC060', danger: '#FF8A80' };

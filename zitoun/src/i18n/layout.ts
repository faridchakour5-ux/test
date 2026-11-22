import { I18nManager } from 'react-native';
import { Lang, isRtl } from './strings';

// Sens de lecture des mises en page. Sur Android, `I18nManager.forceRTL` n'agit qu'au redémarrage: ensuite, React Native inverse
// LUI-MÊME les lignes. Inverser aussi à la main les remettrait de gauche à droite (double inversion). On n'inverse donc à la main
// QUE pour combler l'écart entre la langue choisie et ce que le système applique déjà (juste après un changement de langue).
const needsManualFlip = (lang: Lang): boolean => isRtl(lang) !== I18nManager.isRTL;

export const rowDirection = (lang: Lang): 'row' | 'row-reverse' => (needsManualFlip(lang) ? 'row-reverse' : 'row');
export const startAlign = (lang: Lang): 'flex-start' | 'flex-end' => (needsManualFlip(lang) ? 'flex-end' : 'flex-start');
// Alignement du texte: automatique quand le système suit déjà la langue, forcé seulement pour combler l'écart.
export const textAlign = (lang: Lang): 'auto' | 'left' | 'right' => (needsManualFlip(lang) ? (isRtl(lang) ? 'right' : 'left') : 'auto');

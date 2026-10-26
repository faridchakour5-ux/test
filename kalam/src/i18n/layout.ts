import { I18nManager } from 'react-native';
import { UiLang, isRtl } from './strings';

// Sens de lecture des mises en page. Sur Android, `I18nManager.forceRTL` n'agit qu'au redémarrage: ensuite, React Native inverse
// LUI-MÊME les lignes (« row » devient droite → gauche). Inverser aussi à la main les remettrait de gauche à droite (double
// inversion). On n'inverse donc à la main QUE pour combler l'écart entre la langue choisie et ce que le système applique déjà
// (juste après un changement de langue, avant le redémarrage; et dans le rendu web, qui ne connaît pas forceRTL).
const needsManualFlip = (lang: UiLang): boolean => isRtl(lang) !== I18nManager.isRTL;

export const rowDirection = (lang: UiLang): 'row' | 'row-reverse' => (needsManualFlip(lang) ? 'row-reverse' : 'row');

// Bord « début » d'une colonne alignée (à droite en arabe).
export const startAlign = (lang: UiLang): 'flex-start' | 'flex-end' => (needsManualFlip(lang) ? 'flex-end' : 'flex-start');

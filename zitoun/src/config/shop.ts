// Réglages de la boutique. Le numéro WhatsApp du vendeur vient de la variable de construction EXPO_PUBLIC_SELLER_WHATSAPP
// (chiffres seulement, avec l'indicatif, ex. 212612345678): il n'est écrit dans aucun fichier du dépôt.
import { Lang } from '../i18n/strings';

export const SHOP_NAME = 'Zitoun';
// Langue du message envoyé au vendeur (indépendante de la langue de l'écran du client).
export const SELLER_LANG: Lang = 'fr';

// Chiffres seulement, 8 à 15 (norme E.164). Valeur absente ou mal formée: null (l'application le dit clairement au client).
export function sellerWhatsapp(raw: string | undefined = process.env.EXPO_PUBLIC_SELLER_WHATSAPP): string | null {
  const digits = String(raw ?? '').replace(/[\s+().-]/g, '');
  return /^\d{8,15}$/.test(digits) && !digits.startsWith('0') ? digits : null;
}

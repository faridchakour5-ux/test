import { Lang } from '../i18n/strings';

// Dirhams entiers, séparateur de milliers = espace insécable fine: « 1 250 DH » (chiffres occidentaux, même en arabe).
export function formatMoney(amount: number, lang: Lang): string {
  const n = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = n < 0 ? '−' : '';
  const grouped = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped} ${lang === 'ar' ? 'د.م.' : 'DH'}`;
}

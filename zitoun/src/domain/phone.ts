// Numéros de téléphone marocains (mobiles 06/07). Accepte +212, 00212, 212 ou 0, avec espaces, points, tirets, parenthèses,
// et les chiffres arabes (٠-٩). Renvoie le format international « +2126XXXXXXXX », ou null si invalide.
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function westernDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (c) => String(ARABIC_DIGITS.indexOf(c))).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
}

export function normalizeMoroccanPhone(input: string): string | null {
  const raw = westernDigits(String(input ?? '')).trim();
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('212')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  else return null; // un numéro local doit commencer par 0 (ou porter l'indicatif)
  return /^[67]\d{8}$/.test(digits) ? `+212${digits}` : null;
}

// Affichage lisible: « 06 12 34 56 78 ».
export function formatLocalPhone(normalized: string): string {
  const m = /^\+212([67]\d{8})$/.exec(normalized);
  if (!m) return normalized;
  const d = `0${m[1]}`;
  return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

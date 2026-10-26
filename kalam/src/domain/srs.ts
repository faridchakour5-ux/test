// Répétition espacée (algorithme simplifié de type SM-2).
export interface Card {
  key: string; // ex: "restaurant:menu"
  ease: number; // facilité (>= 1.3)
  intervalDays: number;
  due: number; // timestamp ms
}

const DAY = 86_400_000;

export const newCard = (key: string, now: number): Card => ({ key, ease: 2.5, intervalDays: 0, due: now });

// quality: 0 (oublié) à 5 (parfait)
export const MAX_EASE = 5; // au-delà, la sauvegarde rejetait la carte (voir normalizeCards): on plafonne ici aussi

export function review(card: Card, quality: number, now: number): Card {
  if (!Number.isFinite(quality)) return card; // une note illisible ne doit jamais abîmer la carte (facilité « NaN » = carte perdue)
  quality = Math.min(5, quality);
  if (quality < 3) return { ...card, intervalDays: 1, ease: Math.max(1.3, card.ease - 0.2), due: now + DAY };
  const ease = Math.min(MAX_EASE, Math.max(1.3, card.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const intervalDays = card.intervalDays === 0 ? 1 : card.intervalDays === 1 ? 3 : Math.round(card.intervalDays * ease);
  return { ...card, ease, intervalDays, due: now + intervalDays * DAY };
}

export const dueCards = (cards: Card[], now: number) => cards.filter((c) => c.due <= now);

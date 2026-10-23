// Un « profil d'âge » règle la taille du texte, des boutons et le rythme de l'app.
export type AgeProfileId = 'kids' | 'adult' | 'senior';

export interface AgeProfile {
  id: AgeProfileId;
  fontScale: number; // multiplicateur de taille de texte
  minTouchSize: number; // taille minimale d'une zone tactile (points)
  radius: number; // arrondi des boutons et cartes
  speechRate: number; // vitesse de la voix du professeur (1 = normale)
  highContrast: boolean;
}

export const AGE_PROFILES: Record<AgeProfileId, AgeProfile> = {
  kids: { id: 'kids', fontScale: 1.2, minTouchSize: 72, radius: 28, speechRate: 0.85, highContrast: false },
  adult: { id: 'adult', fontScale: 1, minTouchSize: 48, radius: 16, speechRate: 1, highContrast: false },
  senior: { id: 'senior', fontScale: 1.4, minTouchSize: 64, radius: 14, speechRate: 0.75, highContrast: true },
};

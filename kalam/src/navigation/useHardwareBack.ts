import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

// Bouton « retour » physique d'Android: il fait la même chose que le bouton « Retour » affiché à l'écran
// (même arrêt de la voix, même temps compté), au lieu de fermer l'application. L'accueil n'en enregistre pas:
// là, le retour ferme l'application comme d'habitude.
// Le dernier écran affiché est appelé en premier. On garde toujours la dernière action (sans se réabonner à chaque rendu).
export function useHardwareBack(onBack: () => void, enabled = true): void {
  const latest = useRef(onBack);
  useEffect(() => { latest.current = onBack; });
  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { latest.current(); return true; });
    return () => sub.remove();
  }, [enabled]);
}

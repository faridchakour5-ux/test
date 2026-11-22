import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

// Bouton « retour » physique d'Android: même effet que le bouton « Retour » affiché à l'écran. Si `handler` renvoie false,
// le système reprend la main (sur l'accueil: fermer l'application). On garde toujours la dernière action.
export function useHardwareBack(handler: () => boolean | void, enabled = true): void {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => latest.current() !== false);
    return () => sub.remove();
  }, [enabled]);
}

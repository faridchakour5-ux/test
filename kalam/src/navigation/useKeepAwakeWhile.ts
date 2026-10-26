import { useEffect } from 'react';

type KeepAwake = { activateKeepAwakeAsync(tag?: string): Promise<void>; deactivateKeepAwake(tag?: string): Promise<void> };

const TAG = 'kalam-hands-free';

// Chargé à la demande: si le module natif manque (ou dans un test), on continue sans écran maintenu allumé.
function load(): KeepAwake | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-keep-awake') as KeepAwake;
  } catch {
    return null;
  }
}

// Pendant la conversation mains libres, l'écran ne doit pas s'éteindre: un écran éteint coupe le micro et l'écoute.
// On rend l'écran à son réglage normal dès que le mode s'arrête ou que l'écran se ferme.
export function useKeepAwakeWhile(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const mod = load();
    if (!mod) return;
    mod.activateKeepAwakeAsync(TAG).catch(() => { /* sans effet grave: l'écran suivra le réglage du téléphone */ });
    return () => { mod.deactivateKeepAwake(TAG).catch(() => { /* idem */ }); };
  }, [active]);
}

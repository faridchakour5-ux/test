import { useEffect, useRef } from 'react';

type KeepAwake = { activateKeepAwakeAsync(tag?: string): Promise<void>; deactivateKeepAwake(tag?: string): Promise<void> };

let runs = 0; // une étiquette par activation: un relâchement tardif d'une ancienne activation ne coupe jamais la nouvelle

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
export function useKeepAwakeWhile(active: boolean, loader: () => KeepAwake | null = load): void {
  const loaderRef = useRef(loader); // le chargeur ne change pas en cours de route (il ne sert qu'aux tests)
  useEffect(() => {
    if (!active) return;
    const mod = loaderRef.current();
    if (!mod) return;
    const tag = `kalam-hands-free-${++runs}`;
    let closed = false;
    const release = () => { mod.deactivateKeepAwake(tag).catch(() => { /* sans effet grave: l'écran suivra le réglage du téléphone */ }); };
    // Si le mode s'arrête avant la fin de l'activation, on relâche aussi une fois l'activation terminée (sinon l'écran resterait allumé).
    mod.activateKeepAwakeAsync(tag).then(() => { if (closed) release(); }, () => { /* idem */ });
    return () => { closed = true; release(); };
  }, [active]);
}

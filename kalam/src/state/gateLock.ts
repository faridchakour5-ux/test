import { GateLock, openLock } from '../domain/parental';

// Le verrou du portail parental vit tant que l'app est ouverte: quitter puis rouvrir l'écran ne remet pas les essais à zéro.
let lock: GateLock = openLock();
export const getGateLock = (): GateLock => lock;
export const setGateLock = (next: GateLock) => { lock = next; };
export const resetGateLock = () => { lock = openLock(); }; // réussite du portail (et tests)

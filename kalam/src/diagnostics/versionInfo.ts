// Ligne de version affichée dans le diagnostic: une capture d'écran suffit alors à savoir quelle version et quel Android a le problème.
export function versionLine(version: string, os: string, osVersion: string | number): string {
  const v = String(version).trim() || '?';
  const o = String(os).trim() || '?';
  const ov = String(osVersion).trim();
  return `Kalam ${v} · ${o}${ov ? ` ${ov}` : ''}`;
}

import fs from 'node:fs';
import path from 'node:path';

// Garde-fou: Expo teste chaque SDK avec des versions précises de ses modules (liste officielle dans le paquet « expo »).
// S'en écarter (même vers une version plus récente) expose à des plantages de construction ou de lancement.
const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
const bundled = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/expo/bundledNativeModules.json'), 'utf8')) as Record<string, string>;

describe('dépendances alignées sur le SDK Expo', () => {
  it('chaque module connu d\'Expo est à la version officielle du SDK', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const gaps = Object.entries(all).filter(([n, v]) => bundled[n] && bundled[n] !== v).map(([n, v]) => `${n}: ${v} (attendu ${bundled[n]})`);
    expect(gaps).toEqual([]);
  });
  it('le stockage installé est celui que le SDK attend', () => {
    const installed = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@react-native-async-storage/async-storage/package.json'), 'utf8')) as { version: string };
    expect(installed.version).toBe(bundled['@react-native-async-storage/async-storage']);
  });
});

// Vie privée: l'application n'a besoin d'aucun suivi, publicité ni serveur. Ce test empêche d'en ajouter sans s'en apercevoir.
describe('vie privée', () => {
  const FORBIDDEN = /firebase|analytics|sentry|crashlytics|admob|google-mobile-ads|facebook|amplitude|mixpanel|segment|appsflyer|adjust|branch|onesignal|expo-notifications|expo-tracking|expo-location|expo-contacts|expo-camera|expo-av/i;
  it('aucune dépendance de suivi, de publicité ou de capteurs sensibles', () => {
    const names = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)];
    expect(names.filter((n) => FORBIDDEN.test(n))).toEqual([]);
  });
  it('aucun appel réseau dans le code (le seul lien sortant est le lien WhatsApp choisi par le client)', () => {
    const files: string[] = [];
    const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p); });
    walk(path.join(ROOT, 'src'));
    files.push(path.join(ROOT, 'App.tsx'));
    const offenders = files.filter((f) => /\bfetch\(|XMLHttpRequest|WebSocket|axios/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});

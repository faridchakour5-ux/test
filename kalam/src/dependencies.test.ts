import fs from 'node:fs';
import path from 'node:path';

// Garde-fou: Expo teste chaque SDK avec des versions précises de ses modules (liste officielle dans le paquet « expo »).
// S'en écarter (même vers une version plus récente) expose à des plantages de construction ou de lancement. `npm install`
// d'un module peut le faire sans qu'on le voie: ce test échoue alors, avec la version à remettre.
const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
const bundled = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/expo/bundledNativeModules.json'), 'utf8')) as Record<string, string>;

describe('dépendances alignées sur le SDK Expo', () => {
  it('chaque module connu d\'Expo est à la version officielle du SDK', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const gaps = Object.entries(all).filter(([n, v]) => bundled[n] && bundled[n] !== v).map(([n, v]) => `${n}: ${v} (attendu ${bundled[n]})`);
    expect(gaps).toEqual([]);
  });

  it('les modules natifs de l\'application sont bien déclarés', () => {
    for (const n of ['expo', 'expo-speech', 'expo-speech-recognition', 'expo-notifications', 'react-native-safe-area-context', '@react-native-async-storage/async-storage']) {
      expect(pkg.dependencies[n]).toBeTruthy();
    }
  });

  it('le stockage installé est celui que le SDK attend (la version 3 ne l\'est pas)', () => {
    const installed = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@react-native-async-storage/async-storage/package.json'), 'utf8')) as { version: string };
    expect(installed.version).toBe(bundled['@react-native-async-storage/async-storage']);
  });
});

// Prépare le projet Android natif (créé par « expo prebuild ») pour une publication signée avec VOTRE clé:
// - le build « release » est signé avec le fichier de clé et les mots de passe donnés par variables d'environnement
//   (jamais écrits dans un fichier du dépôt);
// - le numéro de version (versionCode) est imposé, car Google Play refuse deux envois avec le même numéro.
// Utilisation: node scripts/signRelease.js android/app/build.gradle
// Variables: KALAM_KEYSTORE_FILE, KALAM_KEYSTORE_PASSWORD, KALAM_KEY_ALIAS, KALAM_KEY_PASSWORD, KALAM_VERSION_CODE.
const fs = require('fs');

const REQUIRED = ['KALAM_KEYSTORE_FILE', 'KALAM_KEYSTORE_PASSWORD', 'KALAM_KEY_ALIAS', 'KALAM_KEY_PASSWORD', 'KALAM_VERSION_CODE'];

function missingEnv(env) {
  return REQUIRED.filter((k) => !env[k] || !String(env[k]).trim());
}

function patchGradle(text, env) {
  const missing = missingEnv(env);
  if (missing.length) throw new Error(`Variables manquantes: ${missing.join(', ')}`);
  const code = Number(env.KALAM_VERSION_CODE);
  if (!Number.isInteger(code) || code < 1 || code > 2100000000) throw new Error(`KALAM_VERSION_CODE invalide: ${env.KALAM_VERSION_CODE}`);

  let out = text;
  // 1. numéro de version
  const versionRe = /versionCode \d+/;
  if (!versionRe.test(out)) throw new Error('versionCode introuvable dans build.gradle');
  out = out.replace(versionRe, `versionCode ${code}`);
  // 2. configuration de signature « release » lue dans l'environnement
  const debugBlock = /signingConfigs \{\s*debug \{[^}]*\}\s*\}/;
  if (!debugBlock.test(out)) throw new Error('bloc signingConfigs introuvable dans build.gradle');
  out = out.replace(debugBlock, (m) => m.replace(/\}\s*$/, `    release {
            storeFile file(System.getenv('KALAM_KEYSTORE_FILE'))
            storePassword System.getenv('KALAM_KEYSTORE_PASSWORD')
            keyAlias System.getenv('KALAM_KEY_ALIAS')
            keyPassword System.getenv('KALAM_KEY_PASSWORD')
        }
    }`));
  // 3. le build release utilise cette signature (et plus celle de débogage)
  const releaseRe = /(release \{[^}]*?)signingConfig signingConfigs\.debug/;
  if (!releaseRe.test(out)) throw new Error('signature du build release introuvable dans build.gradle');
  out = out.replace(releaseRe, '$1signingConfig signingConfigs.release');
  return out;
}

module.exports = { patchGradle, missingEnv, REQUIRED };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/signRelease.js android/app/build.gradle'); process.exit(2); }
  try {
    fs.writeFileSync(file, patchGradle(fs.readFileSync(file, 'utf8'), process.env));
    console.log(`ok: ${file} signé avec la clé de publication, versionCode ${process.env.KALAM_VERSION_CODE}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

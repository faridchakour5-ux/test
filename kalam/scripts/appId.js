// Identifiant d'application (Android: package, iOS: bundle identifier), réglable sans modifier de fichier:
// KALAM_APP_ID=com.votrenom.kalam. Par défaut: l'exemple de app.json. Un identifiant mal formé est refusé tout de suite
// (mieux vaut échouer à la construction qu'envoyer à Google Play un identifiant que le store refusera).
const PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
// Mots réservés du langage Java: Android les refuse comme partie d'un identifiant (erreur seulement à la construction native).
const JAVA_RESERVED = new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else',
  'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'true', 'false', 'null', '_']);

function resolveAppId(value, fallback) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return fallback;
  if (!PATTERN.test(raw) || raw.length > 150) {
    throw new Error(`KALAM_APP_ID invalide: « ${raw} ». Format attendu: com.votrenom.kalam (lettres, chiffres, _ et au moins deux parties séparées par des points).`);
  }
  const reserved = raw.split('.').find((part) => JAVA_RESERVED.has(part.toLowerCase()));
  if (reserved) throw new Error(`KALAM_APP_ID invalide: « ${raw} ». « ${reserved} » est un mot réservé de Java (Android le refuserait): choisissez un autre nom (ex. com.votrenom.kalam).`);
  return raw;
}

module.exports = { resolveAppId, PATTERN };

// Garde-fou de construction: un build de PRODUCTION sans adresse HTTPS du serveur donnerait une app qui affiche « problème de
// configuration » chez tout le monde. On échoue à la construction (EAS fournit EAS_BUILD_PROFILE), pas chez les utilisateurs.
function checkProductionEnv(env) {
  if (env.EAS_BUILD_PROFILE !== 'production') return null;
  const url = (env.EXPO_PUBLIC_API_URL || '').trim();
  if (!/^https:\/\/[^/\s]+/i.test(url)) {
    return 'Build de production sans EXPO_PUBLIC_API_URL en https. Créez-la avec: eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://votre-serveur --visibility plaintext';
  }
  return null;
}

module.exports.checkProductionEnv = checkProductionEnv;

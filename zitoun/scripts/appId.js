// Identifiant d'application (Android: package, iOS: bundle identifier), réglable sans modifier de fichier:
// ZITOUN_APP_ID=com.votrenom.zitoun. Par défaut: l'exemple de app.json. Un identifiant mal formé est refusé tout de suite
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
    throw new Error(`ZITOUN_APP_ID invalide: « ${raw} ». Format attendu: com.votrenom.zitoun (lettres, chiffres, _ et au moins deux parties séparées par des points).`);
  }
  const reserved = raw.split('.').find((part) => JAVA_RESERVED.has(part.toLowerCase()));
  if (reserved) throw new Error(`ZITOUN_APP_ID invalide: « ${raw} ». « ${reserved} » est un mot réservé de Java (Android le refuserait): choisissez un autre nom (ex. com.votrenom.zitoun).`);
  return raw;
}

module.exports = { resolveAppId, PATTERN };


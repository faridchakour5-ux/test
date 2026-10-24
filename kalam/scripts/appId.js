// Identifiant d'application (Android: package, iOS: bundle identifier), réglable sans modifier de fichier:
// KALAM_APP_ID=com.votrenom.kalam. Par défaut: l'exemple de app.json. Un identifiant mal formé est refusé tout de suite
// (mieux vaut échouer à la construction qu'envoyer à Google Play un identifiant que le store refusera).
const PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

function resolveAppId(value, fallback) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return fallback;
  if (!PATTERN.test(raw) || raw.length > 150) {
    throw new Error(`KALAM_APP_ID invalide: « ${raw} ». Format attendu: com.votrenom.kalam (lettres, chiffres, _ et au moins deux parties séparées par des points).`);
  }
  return raw;
}

module.exports = { resolveAppId, PATTERN };

// Lecture des variables d'environnement du serveur. Une valeur invalide arrête le démarrage (elle ne doit jamais
// désactiver en silence une protection).

// TRUST_PROXY: nombre de proxys de confiance devant le serveur (0 ou absent = aucun). « 1 » = un proxy.
export function parseTrustProxy(raw) {
  if (raw === undefined || raw === '') return 0;
  if (!/^\d+$/.test(String(raw).trim())) throw new Error(`TRUST_PROXY invalide: « ${raw} » (attendu: nombre entier de proxys, ex. 1)`);
  const n = Number(raw);
  if (n > 10) throw new Error(`TRUST_PROXY invalide: « ${raw} » (10 proxys au plus)`);
  return n;
}

// DAILY_REQUEST_LIMIT: plafond de requêtes par jour (UTC). 0 = illimité (à éviter en production).
export function parseDailyLimit(raw, fallback = 20_000) {
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(String(raw).trim())) throw new Error(`DAILY_REQUEST_LIMIT invalide: « ${raw} » (attendu: nombre entier, ex. 5000)`);
  return Number(raw);
}

// Entier positif lu dans l'environnement (ex. PER_CLIENT_DAILY_LIMIT). Absent = valeur par défaut; invalide = le serveur ne démarre pas.
// `min`/`max` bornent la valeur (0 est permis seulement si min vaut 0).
export function parseCount(name, raw, fallback, { min = 0, max = 1_000_000 } = {}) {
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(String(raw).trim())) throw new Error(`${name} invalide: « ${raw} » (attendu: nombre entier)`);
  const n = Number(raw);
  if (n < min || n > max) throw new Error(`${name} invalide: « ${raw} » (entre ${min} et ${max})`);
  return n;
}

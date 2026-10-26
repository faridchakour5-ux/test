// Limiteur par client (fenêtre glissante). Les clients inactifs sont purgés: la mémoire reste bornée.
export function createRateLimiter({ max = 30, windowMs = 60_000, maxKeys = 10_000 } = {}) {
  const hits = new Map();

  function prune(now) {
    for (const [key, times] of hits) {
      const recent = times.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    }
  }

  return function allow(key, now = Date.now()) {
    if (hits.size >= maxKeys && !hits.has(key)) {
      prune(now);
      // Toujours plein de clients actifs (ex.: adresses falsifiées en rafale): on écarte les plus anciens pour garder la mémoire bornée.
      for (const k of hits.keys()) { if (hits.size < maxKeys) break; hits.delete(k); }
    }
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

// Plafond global quotidien (UTC): protège le budget de l'API en cas d'abus ou de boucle.
// take() prend une place; refund() la rend quand l'appel au fournisseur a échoué sans rien produire (panne passagère: les
// nouvelles tentatives de l'application ne doivent pas vider le budget du jour).
export function createDailyBudget(maxPerDay) {
  let day = '';
  let count = 0;
  const take = function take(now = Date.now()) {
    if (!maxPerDay || maxPerDay <= 0) return true; // 0 = pas de plafond
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== day) { day = today; count = 0; }
    if (count >= maxPerDay) return false;
    count++;
    return true;
  };
  take.refund = (now = Date.now()) => {
    const today = new Date(now).toISOString().slice(0, 10);
    if (today === day && count > 0) count--;
  };
  return take;
}

// Identifie le client. `trustProxy` = nombre de proxys de confiance entre Internet et le serveur (true = 1).
// Chaque proxy AJOUTE l'adresse qui lui a parlé à la fin de X-Forwarded-For; ce qui est à gauche peut être falsifié par le
// client. On lit donc l'entrée à la position « nombre de proxys » en partant de la DROITE (s'il y en a moins, la première).
export function clientKey(req, trustProxy = false) {
  const hops = trustProxy === true ? 1 : Number(trustProxy) > 0 ? Math.floor(Number(trustProxy)) : 0;
  if (hops > 0) {
    const fwd = req.headers['x-forwarded-for'];
    const parts = String(Array.isArray(fwd) ? fwd.join(',') : (fwd ?? '')).split(',').map((s) => s.trim()).filter(Boolean);
    const pick = parts[Math.max(0, parts.length - hops)];
    if (pick) return pick.slice(0, 64);
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

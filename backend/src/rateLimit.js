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
    if (hits.size >= maxKeys) prune(now);
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
export function createDailyBudget(maxPerDay) {
  let day = '';
  let count = 0;
  return function take(now = Date.now()) {
    if (!maxPerDay || maxPerDay <= 0) return true; // 0 = pas de plafond
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== day) { day = today; count = 0; }
    if (count >= maxPerDay) return false;
    count++;
    return true;
  };
}

// Identifie le client. Derrière un proxy de confiance, l'adresse réelle est dans X-Forwarded-For.
export function clientKey(req, trustProxy = false) {
  if (trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

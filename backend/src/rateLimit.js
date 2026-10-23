// Limiteur simple par IP (fenêtre glissante) pour protéger le budget et éviter les abus.
export function createRateLimiter({ max = 30, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return function allow(key, now = Date.now()) {
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

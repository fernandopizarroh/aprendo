// Limitador en memoria (v1, un solo proceso). Ventana deslizante simple por clave.
const hits = new Map<string, number[]>();

const recent = (key: string, windowMs: number, now: number) => {
  const r = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, r);
  return r;
};

/** ¿Ya se alcanzó el máximo? No registra un intento. */
export function isRateLimited(key: string, max = 5, windowMs = 60_000, now = Date.now()): boolean {
  return recent(key, windowMs, now).length >= max;
}

/** Registra un intento (por ejemplo, una contraseña incorrecta). */
export function recordHit(key: string, windowMs = 60_000, now = Date.now()): void {
  recent(key, windowMs, now).push(now);
}

/** Registra el intento y devuelve false si se superó el máximo. */
export function rateLimit(key: string, max = 5, windowMs = 60_000, now = Date.now()): boolean {
  if (isRateLimited(key, max, windowMs, now)) return false;
  recordHit(key, windowMs, now);
  return true;
}

export function resetRateLimit(key?: string) {
  if (key) hits.delete(key);
  else hits.clear();
}

// Repaso: cada flashcard es una unidad; el repaso está completo cuando el alumno vio el 100%.

export const CARD_KEY = /^\d+:\d+$/;

/** Claves "módulo:tarjeta" de todas las flashcards de un repaso. */
export function cardKeys(modules: readonly { flashcards?: unknown[] }[]): string[] {
  return modules.flatMap((m, mi) => (m.flashcards ?? []).map((_, ci) => `${mi}:${ci}`));
}

export function parseViewed(detail: unknown): string[] {
  const v = (detail as { viewed?: unknown } | null)?.viewed;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Marca una tarjeta como vista (idempotente). Devuelve null si la clave no existe en el repaso. */
export function markViewed(
  viewed: readonly string[],
  card: string,
  allKeys: readonly string[],
): { viewed: string[]; total: number; completed: boolean } | null {
  if (!CARD_KEY.test(card) || !allKeys.includes(card)) return null;
  const set = new Set(viewed.filter((k) => allKeys.includes(k))); // descarta claves de un contenido regenerado
  set.add(card);
  return { viewed: [...set], total: allKeys.length, completed: allKeys.every((k) => set.has(k)) };
}

import { db } from "@/lib/db";
import { runGeneration } from "./generate-route";
import type { StageRequest } from "./generate-core";

// Una generación completa son varias llamadas a la IA; pasado este tiempo sin actividad se considera colgada (ej. reinicio del servidor).
export const STALE_GENERATION_MS = 10 * 60_000;

/**
 * Toma el turno de generación de forma atómica (evita dos simultáneas) y la lanza en segundo plano.
 * Devuelve false si la ruta ya se está generando.
 */
export async function claimAndRun(routeId: string, request: StageRequest): Promise<boolean> {
  const claimed = await db.learningRoute.updateMany({
    where: {
      id: routeId,
      OR: [{ status: { not: "generating" } }, { updatedAt: { lt: new Date(Date.now() - STALE_GENERATION_MS) } }],
    },
    data: { status: "generating", errorMessage: null },
  });
  if (claimed.count === 0) return false;
  void runGeneration(routeId, request);
  return true;
}

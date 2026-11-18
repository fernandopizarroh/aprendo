import { db } from "./db";
import { isComplete } from "./ai/schema";
import { readStored } from "./ai/content-store";
import { summarizeAttempts, type RouteSummary } from "./student-progress";

/** Porcentajes de la ruta: abrir el Desafío (desde el Diagnóstico) y aprobar el Desafío. */
export const thresholdsOf = (r: { configUnlockThreshold: number; configChallengeThreshold: number }) => ({
  unlock: r.configUnlockThreshold,
  challenge: r.configChallengeThreshold,
});

/** Ruta lista y con contenido completo, solo si pertenece al alumno. */
export async function loadStudentRoute(routeId: string, studentId: string) {
  const route = await db.learningRoute.findFirst({
    where: { id: routeId, status: "ready", subject: { studentId } },
    include: {
      content: true,
      subject: { select: { name: true, colorTag: true } },
      attempts: {
        where: { studentId },
        orderBy: { createdAt: "asc" },
        select: { id: true, stage: true, completed: true, scorePercentage: true, createdAt: true, completedAt: true, answersDetailJson: true },
      },
    },
  });
  if (!route?.content) return null;
  const { content, versions } = readStored(route.content);
  if (!isComplete(content)) return null;
  return { route, content, versions, summary: summarizeAttempts(route.attempts, thresholdsOf(route)) };
}

export type LoadedRoute = NonNullable<Awaited<ReturnType<typeof loadStudentRoute>>>;

/**
 * Intento de Repaso de la ronda actual. Cuando el alumno agota los intentos del Desafío empieza una ronda nueva
 * y el Repaso anterior (ya completado) no cuenta: hay que hacerlo otra vez en un intento nuevo.
 */
export function currentReviewAttempt<T extends { stage: string; completed: boolean }>(attempts: readonly T[], summary: RouteSummary): T | null {
  const latest = [...attempts].reverse().find((a) => a.stage === "review") ?? null;
  return latest && (!latest.completed || summary.reviewCompleted) ? latest : null;
}

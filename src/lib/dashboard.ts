import { summarizeAttempts, type AttemptRow, type RouteSummary, type Thresholds } from "./student-progress";

export type RouteStatusLabel = "En Repaso" | "En Diagnóstico" | "En Desafío" | "Completado";

/** Estado de la ruta según el avance de la ronda actual. */
export function statusLabel(s: RouteSummary): RouteStatusLabel {
  if (s.passedEver) return "Completado"; // aprobó alguna vez; un Desafío adicional pendiente no le quita eso
  if (!s.reviewCompleted) return "En Repaso";
  if (!s.diagnosticPassed) return "En Diagnóstico";
  return "En Desafío";
}

export interface ActivityTally {
  ok: number;
  help: number;
  error: number;
}

/** Cuenta cómo validó el adulto las actividades de cuaderno, a partir del desglose de los intentos terminados. */
export function activityTally(details: readonly unknown[]): ActivityTally {
  const t: ActivityTally = { ok: 0, help: 0, error: 0 };
  for (const d of details) {
    const breakdown = (d as { breakdown?: unknown } | null)?.breakdown;
    if (!Array.isArray(breakdown)) continue;
    for (const item of breakdown as { type?: string; verdict?: number | null }[]) {
      if (item?.type !== "activity") continue;
      if (item.verdict === 0) t.ok++;
      else if (item.verdict === 1) t.help++;
      else if (item.verdict === 2) t.error++;
    }
  }
  return t;
}

export interface HelpedItem {
  question: string;
  at: Date;
}

/**
 * Actividades de cuaderno que el alumno resolvió con ayuda del adulto: son las que conviene reforzar.
 * Las más recientes primero, sin repetir.
 */
export function helpedItems(attempts: readonly DashboardAttempt[], limit = 5): HelpedItem[] {
  const when = (a: DashboardAttempt) => new Date(a.completedAt ?? a.createdAt);
  const done = attempts.filter((a) => a.completed).sort((a, b) => +when(b) - +when(a));
  const seen = new Set<string>();
  const out: HelpedItem[] = [];
  for (const a of done) {
    const breakdown = (a.answersDetailJson as { breakdown?: unknown } | null)?.breakdown;
    if (!Array.isArray(breakdown)) continue;
    for (const item of breakdown as { type?: string; verdict?: number | null; question?: unknown }[]) {
      if (item?.type !== "activity" || item.verdict !== 1 || typeof item.question !== "string" || seen.has(item.question)) continue;
      seen.add(item.question);
      out.push({ question: item.question, at: when(a) });
    }
  }
  return out.slice(0, limit);
}

export interface DashboardAttempt extends AttemptRow {
  studentId?: string;
  answersDetailJson?: unknown;
}

/** Resumen de una ruta lista para el panel del apoderado (HU-11). */
export function summarizeRoute(attempts: readonly DashboardAttempt[], thresholds: Thresholds) {
  const s = summarizeAttempts(attempts, thresholds);
  return {
    status: statusLabel(s),
    round: s.round,
    needsRepeat: s.needsRepeat,
    diagnosticAttempts: s.diagnosticAttempts,
    bestDiagnostic: s.bestDiagnosticOverall,
    challengeAttempts: s.challengeAttempts,
    challengeAttemptsLeft: s.challengeAttemptsLeft,
    challengeScore: s.lastChallenge,
    bestChallenge: s.bestChallenge,
    ready: s.passedEver, // aprobó el Desafío alguna vez: listo para la prueba
    challengePasses: s.challengePasses,
    extraPending: s.extraPending, // hay un Desafío adicional habilitado
    extraExhausted: s.extraExhausted, // agotó los intentos del adicional (su aprobación anterior sigue vigente)
    canGrantExtra: s.canGrantExtra, // el apoderado puede habilitar otro Desafío
    progressPercent: s.progressPercent,
    lastActivity: s.lastActivity,
    activities: activityTally(attempts.filter((a) => a.completed).map((a) => a.answersDetailJson)),
    helped: helpedItems(attempts), // para reforzar
  };
}

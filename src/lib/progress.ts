export type Stage = "review" | "diagnostic" | "challenge";

export interface RouteProgress {
  reviewCompleted: boolean;
  bestDiagnosticScore: number | null;
}

/** Desbloqueo secuencial (HU-08, HU-09). */
export function unlockedStages(p: RouteProgress, unlockThreshold: number): Stage[] {
  const stages: Stage[] = ["review"];
  if (p.reviewCompleted) stages.push("diagnostic");
  if (p.reviewCompleted && p.bestDiagnosticScore !== null && p.bestDiagnosticScore >= unlockThreshold) {
    stages.push("challenge");
  }
  return stages;
}

export function scorePercentage(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
}

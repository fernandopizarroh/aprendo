import { unlockedStages, type Stage } from "./progress";

/** Intentos del Desafío por ronda antes de tener que repasar y practicar de nuevo. */
export const CHALLENGE_ATTEMPTS_PER_ROUND = 2;

export interface AttemptRow {
  stage: string;
  completed: boolean;
  scorePercentage: number | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

/** Porcentajes de la ruta: `unlock` abre el Desafío desde el Diagnóstico; `challenge` aprueba el Desafío. */
export type Thresholds = number | { unlock: number; challenge: number };

export type ChallengeLock = "review" | "diagnostic" | "done" | null;

export interface RouteSummary {
  /** Ronda actual. Sube cuando el alumno agota los intentos del Desafío sin aprobar. */
  round: number;
  reviewCompleted: boolean; // en la ronda actual
  diagnosticAttempts: number; // total de intentos completados
  bestDiagnostic: number | null; // mejor puntaje de la ronda actual
  bestDiagnosticOverall: number | null;
  diagnosticPassed: boolean; // en la ronda actual
  challengeAttempts: number; // total de intentos completados
  bestChallenge: number | null;
  lastChallenge: number | null;
  challengeDone: boolean; // aprobó el Desafío
  challengeThreshold: number;
  challengeFailsInRound: number;
  challengeAttemptsLeft: number; // intentos que le quedan en la ronda actual (0 si ya aprobó)
  needsRepeat: boolean; // agotó los intentos y debe repasar y practicar de nuevo
  challengeLock: ChallengeLock; // por qué está bloqueado el Desafío
  unlocked: Stage[];
  progressPercent: number; // 0, 33, 67 o 100
  lastActivity: Date | null;
}

const max = (xs: number[]) => (xs.length ? Math.max(...xs) : null);
const finishedAt = (a: AttemptRow) => +new Date(a.completedAt ?? a.createdAt);

/**
 * Resume el avance de un alumno en una ruta reproduciendo sus intentos en orden cronológico.
 * Reglas: Repaso 100% abre el Diagnóstico; Diagnóstico >= `unlock` abre el Desafío; el Desafío se aprueba con >= `challenge`;
 * si el alumno falla `CHALLENGE_ATTEMPTS_PER_ROUND` intentos, empieza una ronda nueva (Repaso y Diagnóstico otra vez).
 */
export function summarizeAttempts(attempts: readonly AttemptRow[], thresholds: Thresholds): RouteSummary {
  const unlockThreshold = typeof thresholds === "number" ? thresholds : thresholds.unlock;
  const passThreshold = typeof thresholds === "number" ? thresholds : thresholds.challenge;
  const done = attempts
    .filter((a) => a.completed)
    .sort((a, b) => finishedAt(a) - finishedAt(b) || +new Date(a.createdAt) - +new Date(b.createdAt));

  let round = 1;
  let reviewDone = false;
  let bestDiag: number | null = null;
  let fails = 0;
  let challengeDone = false;

  const diagScores: number[] = [];
  const chalScores: number[] = [];

  for (const a of done) {
    if (a.stage === "review") {
      reviewDone = true;
    } else if (a.stage === "diagnostic" && a.scorePercentage !== null) {
      diagScores.push(a.scorePercentage);
      if (reviewDone) bestDiag = bestDiag === null ? a.scorePercentage : Math.max(bestDiag, a.scorePercentage);
    } else if (a.stage === "challenge" && a.scorePercentage !== null) {
      chalScores.push(a.scorePercentage);
      if (a.scorePercentage >= passThreshold) {
        challengeDone = true;
      } else if (!challengeDone && !a.completedAt) {
        // Desafío rendido antes de que existiera la regla de los 2 intentos (no tiene fecha de término):
        // queda en el historial, pero no cuenta como intento fallido.
      } else if (!challengeDone && ++fails >= CHALLENGE_ATTEMPTS_PER_ROUND) {
        round++;
        reviewDone = false;
        bestDiag = null;
        fails = 0;
      }
    }
  }

  const diagnosticPassed = reviewDone && bestDiag !== null && bestDiag >= unlockThreshold;
  const unlocked = unlockedStages({ reviewCompleted: reviewDone, bestDiagnosticScore: bestDiag }, unlockThreshold).filter(
    (s) => !(s === "challenge" && challengeDone),
  );
  const challengeLock: ChallengeLock = challengeDone ? "done" : !reviewDone ? "review" : !diagnosticPassed ? "diagnostic" : null;
  const stagesDone = challengeDone ? 3 : [reviewDone, diagnosticPassed].filter(Boolean).length;
  const times = attempts.map((a) => finishedAt(a));

  return {
    round,
    reviewCompleted: reviewDone,
    diagnosticAttempts: diagScores.length,
    bestDiagnostic: bestDiag,
    bestDiagnosticOverall: max(diagScores),
    diagnosticPassed,
    challengeAttempts: chalScores.length,
    bestChallenge: max(chalScores),
    lastChallenge: chalScores.length ? chalScores[chalScores.length - 1] : null,
    challengeDone,
    challengeThreshold: passThreshold,
    challengeFailsInRound: fails,
    challengeAttemptsLeft: challengeDone ? 0 : CHALLENGE_ATTEMPTS_PER_ROUND - fails,
    needsRepeat: round > 1 && !challengeDone,
    challengeLock,
    unlocked,
    progressPercent: Math.round((stagesDone / 3) * 100),
    lastActivity: times.length ? new Date(Math.max(...times)) : null,
  };
}

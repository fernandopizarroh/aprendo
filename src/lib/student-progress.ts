import { unlockedStages, type Stage } from "./progress";

/** Intentos del Desafío por ronda antes de tener que repasar y practicar de nuevo. */
export const CHALLENGE_ATTEMPTS_PER_ROUND = 2;

/**
 * Evento que registra el permiso del apoderado para rendir otro Desafío. Se guarda como un intento
 * (`StudentAttempt`) de esta etapa para que quede en el historial ordenado del alumno; no es una evaluación.
 */
export const CHALLENGE_GRANT_STAGE = "challenge_grant";

export interface AttemptRow {
  stage: string;
  completed: boolean;
  scorePercentage: number | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

/** Porcentajes de la ruta: `unlock` abre el Desafío desde el Diagnóstico; `challenge` aprueba el Desafío. */
export type Thresholds = number | { unlock: number; challenge: number };

export type ChallengeLock = "review" | "diagnostic" | "done" | "extra_used" | null;

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
  /** Tiene aprobado el Desafío vigente. Un Desafío adicional habilitado lo vuelve a poner en falso hasta que se apruebe. */
  challengeDone: boolean;
  /** Aprobó el Desafío alguna vez (se conserva aunque el apoderado habilite otro). */
  passedEver: boolean;
  challengePasses: number; // cuántas veces lo aprobó
  /** Hay un Desafío adicional habilitado por el apoderado y todavía no lo agota ni lo aprueba. */
  extraPending: boolean;
  /** Agotó los intentos de un Desafío adicional sin aprobarlo (su aprobación anterior sigue vigente). */
  extraExhausted: boolean;
  /** El apoderado puede habilitar otro Desafío. */
  canGrantExtra: boolean;
  challengeThreshold: number;
  challengeFailsInRound: number;
  challengeAttemptsLeft: number; // intentos que le quedan (0 si ya aprobó o agotó el adicional)
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
 * Un Desafío adicional (permiso del apoderado tras aprobar) tiene sus propios intentos y NO reinicia la ronda si se falla:
 * quien ya demostró dominar la materia no vuelve al Repaso.
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
  let passes = 0;
  let extraMode = false;
  let extraExhausted = false;

  const diagScores: number[] = [];
  const chalScores: number[] = [];

  for (const a of done) {
    if (a.stage === CHALLENGE_GRANT_STAGE) {
      // Solo tiene efecto si hay algo que reabrir: un Desafío aprobado o un adicional agotado.
      if (challengeDone || extraExhausted) {
        challengeDone = false;
        extraExhausted = false;
        extraMode = true;
        fails = 0;
      }
    } else if (a.stage === "review") {
      reviewDone = true;
    } else if (a.stage === "diagnostic" && a.scorePercentage !== null) {
      diagScores.push(a.scorePercentage);
      if (reviewDone) bestDiag = bestDiag === null ? a.scorePercentage : Math.max(bestDiag, a.scorePercentage);
    } else if (a.stage === "challenge" && a.scorePercentage !== null) {
      chalScores.push(a.scorePercentage);
      if (a.scorePercentage >= passThreshold) {
        challengeDone = true;
        passes++;
        extraMode = false;
        extraExhausted = false;
      } else if (!challengeDone && !a.completedAt) {
        // Desafío rendido antes de que existiera la regla de los 2 intentos (no tiene fecha de término):
        // queda en el historial, pero no cuenta como intento fallido.
      } else if (!challengeDone && !extraExhausted && ++fails >= CHALLENGE_ATTEMPTS_PER_ROUND) {
        if (extraMode) {
          extraExhausted = true; // sin castigo: la aprobación anterior sigue vigente
        } else {
          round++;
          reviewDone = false;
          bestDiag = null;
          fails = 0;
        }
      }
    }
  }

  const passedEver = passes > 0;
  const diagnosticPassed = reviewDone && bestDiag !== null && bestDiag >= unlockThreshold;
  const challengeClosed = challengeDone || extraExhausted;
  const unlocked = unlockedStages({ reviewCompleted: reviewDone, bestDiagnosticScore: bestDiag }, unlockThreshold).filter(
    (s) => !(s === "challenge" && challengeClosed),
  );
  const challengeLock: ChallengeLock = challengeDone
    ? "done"
    : extraExhausted
      ? "extra_used"
      : !reviewDone
        ? "review"
        : !diagnosticPassed
          ? "diagnostic"
          : null;
  const stagesDone = challengeDone || passedEver ? 3 : [reviewDone, diagnosticPassed].filter(Boolean).length;
  // El permiso del apoderado no es actividad del alumno.
  const times = attempts.filter((a) => a.stage !== CHALLENGE_GRANT_STAGE).map((a) => finishedAt(a));

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
    passedEver,
    challengePasses: passes,
    extraPending: extraMode && !challengeDone && !extraExhausted,
    extraExhausted,
    canGrantExtra: challengeDone || extraExhausted,
    challengeThreshold: passThreshold,
    challengeFailsInRound: fails,
    challengeAttemptsLeft: challengeClosed ? 0 : CHALLENGE_ATTEMPTS_PER_ROUND - fails,
    needsRepeat: round > 1 && !challengeDone && !passedEver,
    challengeLock,
    unlocked,
    progressPercent: Math.round((stagesDone / 3) * 100),
    lastActivity: times.length ? new Date(Math.max(...times)) : null,
  };
}

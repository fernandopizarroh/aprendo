import { describe, expect, it } from "vitest";
import { summarizeAttempts, type AttemptRow } from "./student-progress";

let clock = 0;
const at = (m: number) => new Date(2025, 0, 1, 10, m);
/** Intento completado `m` minutos después de las 10:00. */
const a = (stage: string, score: number | null, m: number, completed = true): AttemptRow => ({
  stage, completed, scorePercentage: score, createdAt: at(m - 1), completedAt: completed ? at(m) : null,
});
void clock;

describe("summarizeAttempts: ronda 1", () => {
  it("sin intentos: solo Repaso, 0%", () => {
    expect(summarizeAttempts([], 90)).toMatchObject({ unlocked: ["review"], progressPercent: 0, round: 1, lastActivity: null, bestDiagnostic: null, challengeAttemptsLeft: 2, challengeLock: "review" });
  });
  it("repaso incompleto no desbloquea el Diagnóstico", () => {
    expect(summarizeAttempts([a("review", null, 1, false)], 90).unlocked).toEqual(["review"]);
  });
  it("repaso completo desbloquea el Diagnóstico", () => {
    const s = summarizeAttempts([a("review", null, 1)], 90);
    expect(s.unlocked).toEqual(["review", "diagnostic"]);
    expect(s.progressPercent).toBe(33);
    expect(s.challengeLock).toBe("diagnostic");
  });
  it("diagnóstico bajo el umbral no desbloquea el Desafío", () => {
    const s = summarizeAttempts([a("review", null, 1), a("diagnostic", 80, 2)], 90);
    expect(s.unlocked).not.toContain("challenge");
    expect(s.bestDiagnostic).toBe(80);
  });
  it("usa el MEJOR puntaje y el umbral exacto desbloquea", () => {
    const s = summarizeAttempts([a("review", null, 1), a("diagnostic", 70, 2), a("diagnostic", 90, 3), a("diagnostic", 60, 4)], 90);
    expect(s.unlocked).toContain("challenge");
    expect(s).toMatchObject({ bestDiagnostic: 90, diagnosticAttempts: 3, progressPercent: 67, challengeLock: null });
  });
  it("un intento sin terminar no cuenta", () => {
    expect(summarizeAttempts([a("review", null, 1), a("diagnostic", null, 2, false)], 90).diagnosticAttempts).toBe(0);
  });
});

describe("Desafío: 2 intentos por ronda", () => {
  const base = [a("review", null, 1), a("diagnostic", 100, 2)];

  it("aprobar al primer intento termina la ruta (100%) y ya no se puede rendir", () => {
    const s = summarizeAttempts([...base, a("challenge", 95, 3)], 90);
    expect(s).toMatchObject({ challengeDone: true, progressPercent: 100, challengeAttemptsLeft: 0, challengeLock: "done", lastChallenge: 95 });
    expect(s.unlocked).not.toContain("challenge");
  });

  it("un intento fallido deja 1 intento y el Desafío sigue abierto", () => {
    const s = summarizeAttempts([...base, a("challenge", 60, 3)], 90);
    expect(s).toMatchObject({ challengeDone: false, challengeFailsInRound: 1, challengeAttemptsLeft: 1, round: 1, needsRepeat: false });
    expect(s.unlocked).toContain("challenge");
  });

  it("fallar el primero y aprobar el segundo aprueba", () => {
    const s = summarizeAttempts([...base, a("challenge", 60, 3), a("challenge", 90, 4)], 90);
    expect(s).toMatchObject({ challengeDone: true, progressPercent: 100, challengeAttempts: 2, bestChallenge: 90, lastChallenge: 90 });
  });

  it("dos fallos bloquean el Desafío y obligan a repasar y practicar de nuevo (ronda 2)", () => {
    const s = summarizeAttempts([...base, a("challenge", 60, 3), a("challenge", 70, 4)], 90);
    expect(s).toMatchObject({ round: 2, needsRepeat: true, reviewCompleted: false, bestDiagnostic: null, diagnosticPassed: false, challengeLock: "review", challengeAttemptsLeft: 2, progressPercent: 0 });
    expect(s.unlocked).toEqual(["review"]);
    expect(s.bestDiagnosticOverall).toBe(100); // el historial se conserva
    expect(s.challengeAttempts).toBe(2);
  });

  it("en la ronda 2 el Repaso solo abre el Diagnóstico, y hace falta un Diagnóstico aprobado para abrir otro Desafío", () => {
    const failed = [...base, a("challenge", 60, 3), a("challenge", 70, 4)];
    const afterReview = summarizeAttempts([...failed, a("review", null, 5)], 90);
    expect(afterReview.unlocked).toEqual(["review", "diagnostic"]);
    const lowDiag = summarizeAttempts([...failed, a("review", null, 5), a("diagnostic", 80, 6)], 90);
    expect(lowDiag.unlocked).not.toContain("challenge");
    const goodDiag = summarizeAttempts([...failed, a("review", null, 5), a("diagnostic", 92, 6)], 90);
    expect(goodDiag.unlocked).toContain("challenge");
    expect(goodDiag).toMatchObject({ round: 2, challengeAttemptsLeft: 2, needsRepeat: true });
  });

  it("el Diagnóstico de la ronda anterior no sirve para abrir el Desafío de la ronda nueva", () => {
    const s = summarizeAttempts([...base, a("challenge", 60, 3), a("challenge", 70, 4), a("review", null, 5)], 90);
    expect(s.bestDiagnostic).toBeNull();
    expect(s.unlocked).not.toContain("challenge");
  });

  it("se puede aprobar en la ronda 2 y termina", () => {
    const s = summarizeAttempts(
      [...base, a("challenge", 60, 3), a("challenge", 70, 4), a("review", null, 5), a("diagnostic", 95, 6), a("challenge", 91, 7)],
      90,
    );
    expect(s).toMatchObject({ challengeDone: true, progressPercent: 100, needsRepeat: false, round: 2 });
  });

  it("dos rondas fallidas seguidas", () => {
    const s = summarizeAttempts(
      [...base, a("challenge", 10, 3), a("challenge", 20, 4), a("review", null, 5), a("diagnostic", 95, 6), a("challenge", 30, 7), a("challenge", 40, 8)],
      90,
    );
    expect(s).toMatchObject({ round: 3, needsRepeat: true, reviewCompleted: false, challengeAttempts: 4 });
  });

  it("los intentos llegan desordenados: manda la fecha de término", () => {
    const s = summarizeAttempts([a("challenge", 70, 4), a("diagnostic", 100, 2), a("challenge", 60, 3), a("review", null, 1)], 90);
    expect(s.round).toBe(2);
    expect(s.lastChallenge).toBe(70);
  });

  it("datos antiguos sin fecha de término usan la de creación", () => {
    const old = (stage: string, score: number | null, m: number): AttemptRow => ({ stage, completed: true, scorePercentage: score, createdAt: at(m) });
    const s = summarizeAttempts([old("review", null, 1), old("diagnostic", 100, 2), old("challenge", 100, 3)], 90);
    expect(s.challengeDone).toBe(true);
  });

  it("última actividad = el movimiento más reciente, incluso un intento en curso", () => {
    // el intento en curso se creó en el minuto 8 (a() lo crea un minuto antes de su hora de término)
    expect(summarizeAttempts([a("review", null, 1), a("diagnostic", null, 9, false)], 90).lastActivity).toEqual(at(8));
  });
});

describe("porcentajes separados: abrir el Desafío y aprobarlo", () => {
  const base = [a("review", null, 1), a("diagnostic", 90, 2)];
  const th = { unlock: 90, challenge: 70 };

  it("el Desafío se aprueba con su propio porcentaje, menor que el del Diagnóstico", () => {
    expect(summarizeAttempts([...base, a("challenge", 75, 3)], th)).toMatchObject({ challengeDone: true, challengeThreshold: 70, progressPercent: 100 });
    expect(summarizeAttempts([...base, a("challenge", 75, 3)], 90).challengeDone).toBe(false); // con un solo número, el mismo para ambos
  });
  it("el Diagnóstico sigue abriendo el Desafío con su porcentaje", () => {
    expect(summarizeAttempts([a("review", null, 1), a("diagnostic", 80, 2)], th).unlocked).not.toContain("challenge");
  });
  it("un Desafío exigente (95%) cuenta como fallo aunque sea alto", () => {
    const s = summarizeAttempts([...base, a("challenge", 92, 3), a("challenge", 94, 4)], { unlock: 90, challenge: 95 });
    expect(s).toMatchObject({ challengeDone: false, round: 2, needsRepeat: true });
  });
  it("el porcentaje exacto aprueba", () => {
    expect(summarizeAttempts([...base, a("challenge", 70, 3)], th).challengeDone).toBe(true);
    expect(summarizeAttempts([...base, a("challenge", 69.9, 3)], th).challengeDone).toBe(false);
  });
});

describe("intentos anteriores a la regla de los 2 intentos", () => {
  const legacy = (stage: string, score: number | null, m: number): AttemptRow => ({ stage, completed: true, scorePercentage: score, createdAt: at(m) });

  it("un Desafío fallido de antes (sin fecha de término) no cuenta como intento fallido", () => {
    const s = summarizeAttempts([legacy("review", null, 1), legacy("diagnostic", 90, 2), legacy("challenge", 86.7, 3)], 90);
    expect(s).toMatchObject({ challengeAttemptsLeft: 2, challengeFailsInRound: 0, round: 1, needsRepeat: false, challengeAttempts: 1, lastChallenge: 86.7, challengeDone: false });
    expect(s.unlocked).toContain("challenge");
  });
  it("sí se conserva en el historial (último y mejor puntaje)", () => {
    const s = summarizeAttempts([legacy("review", null, 1), legacy("diagnostic", 100, 2), legacy("challenge", 60, 3), a("challenge", 70, 5)], 90);
    expect(s).toMatchObject({ challengeAttempts: 2, bestChallenge: 70, challengeFailsInRound: 1, challengeAttemptsLeft: 1 });
  });
  it("uno antiguo aprobado sigue aprobando", () => {
    expect(summarizeAttempts([legacy("review", null, 1), legacy("diagnostic", 100, 2), legacy("challenge", 95, 3)], 90).challengeDone).toBe(true);
  });
  it("los intentos nuevos fallidos sí cuentan (2 bloquean aunque haya uno antiguo)", () => {
    const s = summarizeAttempts([legacy("review", null, 1), legacy("diagnostic", 100, 2), legacy("challenge", 50, 3), a("challenge", 60, 5), a("challenge", 65, 6)], 90);
    expect(s).toMatchObject({ round: 2, needsRepeat: true });
  });
});
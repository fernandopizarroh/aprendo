import { describe, expect, it } from "vitest";
import { activityTally, helpedItems, statusLabel, summarizeRoute, type DashboardAttempt } from "./dashboard";
import { summarizeAttempts } from "./student-progress";

const at = (m: number) => new Date(2025, 0, 1, 10, m);
const a = (stage: string, score: number | null, m: number, extra: Partial<DashboardAttempt> = {}): DashboardAttempt => ({
  stage, completed: true, scorePercentage: score, createdAt: at(m - 1), completedAt: at(m), ...extra,
});

describe("statusLabel (HU-11)", () => {
  const label = (att: DashboardAttempt[]) => statusLabel(summarizeAttempts(att, 90));
  it("sin avance o repaso incompleto: En Repaso", () => {
    expect(label([])).toBe("En Repaso");
    expect(label([a("review", null, 1, { completed: false })])).toBe("En Repaso");
  });
  it("repaso completo: En Diagnóstico, hasta aprobar el umbral", () => {
    expect(label([a("review", null, 1)])).toBe("En Diagnóstico");
    expect(label([a("review", null, 1), a("diagnostic", 80, 2)])).toBe("En Diagnóstico");
  });
  it("diagnóstico aprobado: En Desafío", () => {
    expect(label([a("review", null, 1), a("diagnostic", 90, 2)])).toBe("En Desafío");
    expect(label([a("review", null, 1), a("diagnostic", 95, 2), a("challenge", 50, 3)])).toBe("En Desafío");
  });
  it("desafío aprobado: Completado", () => {
    expect(label([a("review", null, 1), a("diagnostic", 95, 2), a("challenge", 92, 3)])).toBe("Completado");
  });
  it("agotó los 2 intentos: vuelve a En Repaso", () => {
    expect(label([a("review", null, 1), a("diagnostic", 95, 2), a("challenge", 50, 3), a("challenge", 60, 4)])).toBe("En Repaso");
  });
});

describe("activityTally", () => {
  const detail = (...v: (number | null)[]) => ({ breakdown: [...v.map((verdict) => ({ type: "activity", verdict })), { type: "choice", verdict: null }] });
  it("cuenta los veredictos del adulto y ignora preguntas de alternativas", () => {
    expect(activityTally([detail(0, 0, 1), detail(2, null)])).toEqual({ ok: 2, help: 1, error: 1 });
  });
  it("tolera datos faltantes o inválidos", () => {
    expect(activityTally([null, {}, { breakdown: "x" }, undefined])).toEqual({ ok: 0, help: 0, error: 0 });
  });
});

describe("summarizeRoute", () => {
  it("entrega los datos pedidos por HU-11", () => {
    const r = summarizeRoute(
      [
        a("review", null, 1),
        a("diagnostic", 70, 2),
        a("diagnostic", 100, 3),
        a("challenge", 60, 4),
        a("challenge", 95, 5, { answersDetailJson: { breakdown: [{ type: "activity", verdict: 1 }] } }),
      ],
      90,
    );
    expect(r).toMatchObject({
      status: "Completado", diagnosticAttempts: 2, bestDiagnostic: 100, challengeAttempts: 2, challengeScore: 95, bestChallenge: 95, ready: true, progressPercent: 100,
      activities: { ok: 0, help: 1, error: 0 },
    });
    expect(r.lastActivity).toEqual(at(5));
  });
  it("marca la ruta que necesita repetir", () => {
    const r = summarizeRoute([a("review", null, 1), a("diagnostic", 95, 2), a("challenge", 10, 3), a("challenge", 20, 4)], 90);
    expect(r).toMatchObject({ status: "En Repaso", needsRepeat: true, ready: false, round: 2, challengeAttempts: 2 });
  });
});

describe("helpedItems (actividades para reforzar)", () => {
  const withBreakdown = (items: object[], m: number) => a("challenge", 50, m, { answersDetailJson: { breakdown: items } });
  it("lista solo las actividades resueltas con ayuda, las más recientes primero y sin repetir", () => {
    const list = helpedItems([
      withBreakdown([{ type: "activity", verdict: 1, question: "Contar hasta 10" }, { type: "activity", verdict: 0, question: "Escribir el 3" }, { type: "choice", verdict: null, question: "¿2+2?" }], 5),
      withBreakdown([{ type: "activity", verdict: 1, question: "Sumar con dedos" }, { type: "activity", verdict: 1, question: "Contar hasta 10" }, { type: "activity", verdict: 2, question: "Dibujar un círculo" }], 9),
    ]);
    expect(list.map((x) => x.question)).toEqual(["Sumar con dedos", "Contar hasta 10"]);
    expect(list[0].at).toEqual(at(9));
  });
  it("respeta el límite y tolera datos faltantes", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ type: "activity", verdict: 1, question: `Actividad ${i}` }));
    expect(helpedItems([withBreakdown(many, 2)], 3)).toHaveLength(3);
    expect(helpedItems([a("challenge", 10, 1), a("review", null, 2, { answersDetailJson: { viewed: [] } })])).toEqual([]);
  });
  it("las actividades con ayuda llegan al resumen de la ruta", () => {
    const r = summarizeRoute([a("review", null, 1), a("diagnostic", 90, 2, { answersDetailJson: { breakdown: [{ type: "activity", verdict: 1, question: "Contar" }] } })], 90);
    expect(r.helped.map((x) => x.question)).toEqual(["Contar"]);
    expect(r.activities.help).toBe(1);
  });
});

describe("porcentajes separados en el panel", () => {
  it("el Desafío se aprueba con su propio porcentaje", () => {
    const att = [a("review", null, 1), a("diagnostic", 95, 2), a("challenge", 75, 3)];
    expect(summarizeRoute(att, { unlock: 90, challenge: 70 })).toMatchObject({ status: "Completado", ready: true });
    expect(summarizeRoute(att, { unlock: 90, challenge: 80 })).toMatchObject({ status: "En Desafío", ready: false });
  });
});
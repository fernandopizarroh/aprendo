import { describe, expect, it } from "vitest";
import { scorePercentage, unlockedStages } from "./progress";

describe("unlockedStages", () => {
  it("solo repaso al inicio", () => {
    expect(unlockedStages({ reviewCompleted: false, bestDiagnosticScore: null }, 90)).toEqual(["review"]);
  });
  it("desbloquea diagnóstico al completar repaso", () => {
    expect(unlockedStages({ reviewCompleted: true, bestDiagnosticScore: null }, 90)).toEqual(["review", "diagnostic"]);
  });
  it("desbloquea desafío con puntaje >= umbral", () => {
    expect(unlockedStages({ reviewCompleted: true, bestDiagnosticScore: 90 }, 90)).toContain("challenge");
    expect(unlockedStages({ reviewCompleted: true, bestDiagnosticScore: 89.9 }, 90)).not.toContain("challenge");
  });
});

describe("scorePercentage", () => {
  it("calcula porcentaje", () => expect(scorePercentage(9, 10)).toBe(90));
});

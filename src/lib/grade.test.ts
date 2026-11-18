import { describe, expect, it } from "vitest";
import { activityMax, activityTarget, gradeKind, gradeNotice, isEarlyGrade } from "./grade";

describe("isEarlyGrade", () => {
  it.each(["1° Basico", "1° básico", "2do básico", "3º Básico", "tercero básico", "Primero Basico", "kinder", "Pre-Kinder", "Transición 2", "3ro basico"])(
    "%s es nivel inicial",
    (g) => expect(isEarlyGrade(g)).toBe(true),
  );
  it.each(["4° básico", "5° básico", "8° Básico", "cuarto básico", "1° medio", "2do medio", "Tercero medio", "", "otro"])(
    "%s no es nivel inicial",
    (g) => expect(isEarlyGrade(g)).toBe(false),
  );
});

describe("actividades de cuaderno", () => {
  it("objetivo proporcional y mínimo 1 desde 5 preguntas", () => {
    expect(activityTarget(4)).toBe(0);
    expect(activityTarget(5)).toBe(1);
    expect(activityTarget(10)).toBe(2);
    expect(activityTarget(15)).toBe(3);
  });
  it("el máximo nunca es menor que el objetivo", () => {
    expect(activityMax(10)).toBe(3);
    expect(activityMax(5)).toBe(2);
    expect(activityMax(15)).toBe(5);
  });
});

describe("gradeKind (aviso al apoderado)", () => {
  it.each(["1° Básico", "3ro básico", "kinder", "Primero basico"])("%s se reconoce como nivel inicial", (g) => expect(gradeKind(g)).toBe("inicial"));
  it.each(["4° básico", "8° Básico", "1° medio", "cuarto medio", "Tercero medio"])("%s se reconoce como nivel general", (g) => expect(gradeKind(g)).toBe("general"));
  it.each(["", "otro", "curso 5", "primaria", "básico"])("«%s» no se reconoce", (g) => expect(gradeKind(g)).toBe("desconocido"));
});

describe("gradeNotice (aviso al apoderado)", () => {
  it("nivel inicial: avisa de dibujos y actividades de cuaderno y pide revisar el curso", () => {
    const n = gradeNotice("1° básico");
    expect(n).toMatchObject({ kind: "inicial", tone: "info" });
    expect(n.title).toMatch(/1° básico/);
    expect(n.text).toMatch(/actividades de cuaderno/);
    expect(n.text).toMatch(/Revisa que el curso esté bien/);
  });
  it("nivel general: sin actividades de cuaderno", () => {
    const n = gradeNotice("5° básico");
    expect(n.kind).toBe("general");
    expect(n.text).toMatch(/sin dibujos ni actividades/);
  });
  it("curso no reconocido: advertencia con ejemplo de cómo escribirlo", () => {
    const n = gradeNotice("segundo año");
    expect(n).toMatchObject({ kind: "desconocido", tone: "warning" });
    expect(n.text).toMatch(/2° básico/);
  });
});
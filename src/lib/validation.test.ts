import { describe, expect, it } from "vitest";
import { createRouteSchema, createStudentSchema, createSubjectSchema, loginSchema, registerSchema, updateRouteContextSchema, updateRouteSettingsSchema, updateStudentSchema } from "./validation";

describe("registerSchema", () => {
  it("normaliza email", () => {
    expect(registerSchema.parse({ email: " A@B.com ", password: "12345678" }).email).toBe("a@b.com");
  });
  it("rechaza contraseña corta o email inválido", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "1234567" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "x", password: "12345678" }).success).toBe(false);
  });
});

describe("createStudentSchema", () => {
  const base = { password: "abcd", displayName: "Ana", gradeLevel: "5° básico" };
  it("acepta usuario válido", () => {
    expect(createStudentSchema.safeParse({ ...base, username: "Ana_05" }).success).toBe(true);
  });
  it("rechaza usuario inválido o contraseña < 4", () => {
    expect(createStudentSchema.safeParse({ ...base, username: "a" }).success).toBe(false);
    expect(createStudentSchema.safeParse({ ...base, username: "ana pérez" }).success).toBe(false);
    expect(createStudentSchema.safeParse({ ...base, username: "ana", password: "abc" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requiere rol válido", () => {
    expect(loginSchema.safeParse({ role: "admin", identifier: "x", password: "y" }).success).toBe(false);
  });
});

describe("createSubjectSchema", () => {
  it("aplica defaults y valida color", () => {
    const r = createSubjectSchema.parse({ studentId: "s", name: "Mate" });
    expect(r.colorTag).toBe("#4F46E5");
    expect(createSubjectSchema.safeParse({ studentId: "s", name: "x", colorTag: "rojo" }).success).toBe(false);
  });
});

describe("createRouteSchema", () => {
  const base = { subjectId: "s", title: "Fracciones", syllabusText: "Suma de fracciones" };
  it("aplica defaults del PRD (10, 15, 90)", () => {
    const r = createRouteSchema.parse(base);
    expect([r.diagQuestions, r.challengeQuestions, r.unlockThreshold, r.challengeThreshold]).toEqual([10, 15, 90, 90]);
  });
  it("convierte strings y respeta rangos", () => {
    expect(createRouteSchema.parse({ ...base, diagQuestions: "5", challengeQuestions: "30" }).diagQuestions).toBe(5);
    expect(createRouteSchema.safeParse({ ...base, diagQuestions: "4" }).success).toBe(false);
    expect(createRouteSchema.safeParse({ ...base, diagQuestions: "16" }).success).toBe(false);
    expect(createRouteSchema.safeParse({ ...base, challengeQuestions: "9" }).success).toBe(false);
    expect(createRouteSchema.safeParse({ ...base, challengeQuestions: "31" }).success).toBe(false);
    expect(createRouteSchema.safeParse({ ...base, unlockThreshold: "101" }).success).toBe(false);
  });
  it("exige temario", () => {
    expect(createRouteSchema.safeParse({ ...base, syllabusText: "corto" }).success).toBe(false);
  });
});

describe("porcentajes configurables por el apoderado", () => {
  const base = { subjectId: "s", title: "T", syllabusText: "Suma de fracciones" };
  it("el porcentaje del Desafío es independiente del del Diagnóstico", () => {
    const r = createRouteSchema.parse({ ...base, unlockThreshold: "90", challengeThreshold: "70" });
    expect([r.unlockThreshold, r.challengeThreshold]).toEqual([90, 70]);
    expect(createRouteSchema.safeParse({ ...base, challengeThreshold: "0" }).success).toBe(false);
    expect(createRouteSchema.safeParse({ ...base, challengeThreshold: "101" }).success).toBe(false);
  });
  it("cambiar los porcentajes de una ruta existente", () => {
    expect(updateRouteSettingsSchema.parse({ challengeThreshold: "80" })).toEqual({ challengeThreshold: 80 });
    expect(updateRouteSettingsSchema.parse({ unlockThreshold: 85, challengeThreshold: 75 })).toEqual({ unlockThreshold: 85, challengeThreshold: 75 });
    expect(updateRouteSettingsSchema.safeParse({}).success).toBe(false);
    expect(updateRouteSettingsSchema.safeParse({ unlockThreshold: 120 }).success).toBe(false);
  });
  it("cambiar el curso del alumno", () => {
    expect(updateStudentSchema.parse({ gradeLevel: "  2° básico " }).gradeLevel).toBe("2° básico");
    expect(updateStudentSchema.safeParse({ gradeLevel: "" }).success).toBe(false);
  });
});

describe("editar el contexto de una ruta", () => {
  it("acepta cambios parciales y aplica valores por defecto", () => {
    expect(updateRouteContextSchema.parse({})).toEqual({ remove: [], regenerate: [] });
    expect(updateRouteContextSchema.parse({ title: "  Nuevo título ", regenerate: ["diagnostic", "challenge"] })).toMatchObject({ title: "Nuevo título", regenerate: ["diagnostic", "challenge"] });
  });
  it("exige un temario con contenido y un título no vacío", () => {
    expect(updateRouteContextSchema.safeParse({ syllabusText: "corto" }).success).toBe(false);
    expect(updateRouteContextSchema.safeParse({ title: "   " }).success).toBe(false);
  });
  it("solo permite regenerar etapas que existen", () => {
    expect(updateRouteContextSchema.safeParse({ regenerate: ["all"] }).success).toBe(false);
    expect(updateRouteContextSchema.safeParse({ regenerate: ["review", "diagnostic", "challenge"] }).success).toBe(true);
  });
});
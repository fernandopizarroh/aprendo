import { describe, expect, it } from "vitest";
import { answerInQuestion, hasDuplicateOptions, isAmbiguousQuestion, textIssue } from "./quality";

describe("isAmbiguousQuestion (casos reales)", () => {
  it("detecta '¿cuántos más hay?' sin decir respecto de qué", () => {
    expect(isAmbiguousQuestion("Si hay 10 globos y 5 son verdes, ¿cuántos más hay?")).toBe(true);
    expect(isAmbiguousQuestion("¿Cuántos más hay si hay 7 globos y 3 globos menos?")).toBe(true);
    expect(isAmbiguousQuestion("¿Cuántas menos hay? Si hay 10 lápices y 4 son azules, ¿cuántos menos hay?")).toBe(true);
  });
  it("acepta comparaciones y preguntas con propósito", () => {
    expect(isAmbiguousQuestion("Si hay 5 manzanas y 3 peras, ¿cuántas más manzanas hay que peras?")).toBe(false);
    expect(isAmbiguousQuestion("Tienes 6 lápices, ¿cuántos más necesitas para tener 10?")).toBe(false);
    expect(isAmbiguousQuestion("Si tienes 10 galletas y comes 4, ¿cuántas te quedan?")).toBe(false);
  });
});

describe("answerInQuestion", () => {
  it("detecta la respuesta escrita en el enunciado", () => {
    expect(answerInQuestion("¿Qué palabra se usa para indicar que algo está entre dos objetos?", ["Encima", "Entre", "Debajo", "Atrás"], 1)).toBe(true);
    expect(answerInQuestion("¿Qué palabra indica que algo está a la izquierda de otra cosa?", ["Arriba", "Derecha", "Izquierda", "Abajo"], 2)).toBe(true);
  });
  it("no aplica a números, a citas ni cuando también aparecen otras alternativas", () => {
    expect(answerInQuestion("¿Cuánto es 2 + 2? Pista: no es 4", ["4", "3", "5", "6"], 0)).toBe(false);
    expect(answerInQuestion("En 'El perro corre', ¿cuál es el verbo?", ["corre", "salta", "come", "duerme"], 0)).toBe(false);
    expect(answerInQuestion("¿Cuál pesa más, una ballena o una hormiga?", ["ballena", "hormiga", "igual", "ninguna"], 0)).toBe(false);
    expect(answerInQuestion("¿Cuál es la capital de Chile?", ["Santiago", "Lima", "Quito", "Bogotá"], 0)).toBe(false);
  });
});

describe("textIssue", () => {
  it("detecta alternativas repetidas", () => {
    expect(hasDuplicateOptions(["Debajo", "debajo", "Arriba", "Entre"])).toBe(true);
    expect(textIssue({ question: "¿Dónde está el gato?", options: ["Debajo", "Debajo ", "Arriba", "Entre"], correctIndex: 0 })).toBe("duplicateOptions");
  });
  it("las actividades solo se revisan por ambigüedad", () => {
    expect(textIssue({ type: "activity", question: "Escribe cuántos más hay. Si hay 10 globos y 4 son rojos, ¿cuántos más hay?" })).toBe("ambiguous");
    expect(textIssue({ type: "activity", question: "Dibuja un gato encima de una silla." })).toBeNull();
  });
});

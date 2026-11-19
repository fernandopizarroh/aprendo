import { describe, expect, it } from "vitest";
import { checkDrawing, leadingNumber, numbersIn, parseVisualText, renderDrawing, safeVisual } from "./visual";

const choice = (question: string, visual: string, correct: string) => ({ question, visual, options: [correct, "x", "y", "z"], correctIndex: 0 });

describe("numbersIn y leadingNumber", () => {
  it("lee cifras y palabras hasta veinte", () => {
    expect([...numbersIn("Tienes 10 galletas y comes cuatro")]).toEqual([10, 4]);
    expect(leadingNumber("6 juguetes en total.")).toBe(6);
    expect(leadingNumber("seis")).toBe(6);
    expect(leadingNumber("Izquierda")).toBeNull();
  });
});

describe("renderDrawing: el sistema dibuja solo los datos", () => {
  it("nunca muestra la operación ni el resultado (eso lo razona el alumno)", () => {
    const out = renderDrawing({ groups: [{ emoji: "🍪", count: 3 }, { emoji: "🍪", count: 2 }], op: "-" });
    expect(out).toBe("🍪🍪🍪 🍪🍪");
    expect(out).not.toMatch(/[−+=❓]/);
  });
  it("sin operación es solo el grupo", () => {
    expect(renderDrawing({ groups: [{ emoji: "⭐", count: 4 }] })).toBe("⭐⭐⭐⭐");
  });
  it("lo que dibuja se puede volver a leer igual", () => {
    const d = { groups: [{ emoji: "🍏", count: 5 }, { emoji: "🍐", count: 3 }], op: null };
    expect(parseVisualText(renderDrawing(d))).toEqual({ drawing: d, shownResult: false });
  });
});

describe("checkDrawing", () => {
  const ok = (r: ReturnType<typeof checkDrawing>) => r.ok;
  it("acepta cantidades del enunciado con la operación que da la respuesta", () => {
    expect(ok(checkDrawing({ groups: [{ emoji: "🍪", count: 10 }, { emoji: "🍪", count: 4 }], op: "-" }, "Si tienes 10 galletas y comes 4, ¿cuántas quedan?", "6"))).toBe(true);
  });
  it("rechaza cantidades que no están en el enunciado (dibujo contradictorio)", () => {
    const r = checkDrawing({ groups: [{ emoji: "✏️", count: 9 }] }, "Si hay 8 lápices y 3 son rojos, ¿cuántos lápices hay en total?", "8");
    expect(r).toMatchObject({ ok: false, dropQuestion: false });
  });
  it("rechaza una operación que no da la respuesta correcta", () => {
    const r = checkDrawing({ groups: [{ emoji: "🌹", count: 3 }, { emoji: "🌼", count: 9 }], op: "+" }, "Si hay 9 flores y 3 son rosas, ¿cuántas no son rosas?", "6");
    expect(r.ok).toBe(false);
  });
  it("preguntas de contar: la respuesta debe ser la cantidad dibujada; si no, se descarta la pregunta", () => {
    expect(ok(checkDrawing({ groups: [{ emoji: "⭐", count: 7 }] }, "¿Cuántas estrellas hay?", "7"))).toBe(true);
    expect(checkDrawing({ groups: [{ emoji: "⭐", count: 7 }] }, "¿Cuántas estrellas hay?", "8")).toMatchObject({ ok: false, dropQuestion: true });
  });
  it("rechaza restas imposibles y grupos con emojis mezclados; acepta grupos de datos sin operación", () => {
    expect(checkDrawing({ groups: [{ emoji: "🍎", count: 2 }, { emoji: "🍎", count: 5 }], op: "-" }, "2 y 5", "3").ok).toBe(false);
    expect(checkDrawing({ groups: [{ emoji: "🍎", count: 2 }, { emoji: "🍐", count: 5 }] }, "2 manzanas y 5 peras, ¿cuál hay más?", "Peras").ok).toBe(true);
    expect(checkDrawing({ groups: [{ emoji: "🐶🪑", count: 2 }] }, "2 perros").ok).toBe(false);
  });
});

describe("safeVisual: bancos antiguos (dibujos escritos por la IA, casos reales)", () => {
  it("oculta los dibujos que muestran el resultado", () => {
    expect(safeVisual(choice("Si hay 6 estrellas y 2 estrellas más, ¿cuántas estrellas hay en total?", "⭐️⭐️⭐️⭐️⭐️⭐️ + ⭐️⭐️ = ⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️", "8"))).toBeUndefined();
    expect(safeVisual(choice("Si tienes 12 caramelos y comes 5, ¿cuántos caramelos te quedan?", "🍬🍬🍬🍬🍬🍬🍬🍬🍬🍬🍬🍬 - 🍬🍬🍬🍬🍬 = 🍬🍬🍬🍬🍬🍬🍬", "7"))).toBeUndefined();
  });
  it("oculta los que no calzan con el enunciado", () => {
    expect(safeVisual(choice("Si hay 15 pelotas y 5 son azules, ¿cuántas no son azules?", "🏐".repeat(16), "10"))).toBeUndefined();
  });
  it("oculta los que no son de cantidades (ubicación)", () => {
    expect(safeVisual(choice("¿Qué palabra indica que algo está a la izquierda de otra cosa?", "👦⬅️👧", "Izquierda"))).toBeUndefined();
    expect(safeVisual(choice("¿Qué palabra indica que algo está adentro?", "📦", "Adentro"))).toBeUndefined();
  });
  it("conserva los correctos, pero sin la operación (solo los datos)", () => {
    expect(safeVisual(choice("Si tienes 10 galletas y comes 4, ¿cuántas galletas te quedan?", "🍪🍪🍪🍪🍪🍪🍪🍪🍪🍪 - 🍪🍪🍪🍪", "6"))).toBe("🍪🍪🍪🍪🍪🍪🍪🍪🍪🍪 🍪🍪🍪🍪");
    expect(safeVisual({ type: "activity", question: "Escribe cuántos juguetes tienes en total si tienes 4 coches y 2 muñecas.", visual: "🚗🚗🚗🚗 + 🧸🧸", expected: "6 juguetes en total." }))
      .toBe("🚗🚗🚗🚗 🧸🧸");
  });
  it("Desafío real (versión 4): los dibujos ya armados dejan de mostrar la resta", () => {
    expect(safeVisual(choice("En una charca hay 12 ranas y 5 patos. ¿Cuántas ranas más que patos hay?", "🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸 − 🦆🦆🦆🦆🦆 = ❓", "7 ranas")))
      .toBe("🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸🐸 🦆🦆🦆🦆🦆");
    expect(safeVisual(choice("Un lápiz mide 7 palitos de largo y una tiza mide 5 palitos de largo. ¿Qué objeto es más largo?", "🪵🪵🪵🪵🪵🪵🪵 − 🪵🪵🪵🪵🪵 = ❓", "El lápiz")))
      .toBe("🪵🪵🪵🪵🪵🪵🪵 🪵🪵🪵🪵🪵");
  });
  it("sin dibujo no muestra nada", () => {
    expect(safeVisual({ question: "x" })).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { buildBreakdown, buildOrder, drawIndices, flaggedIndices, gradeAnswer, gradeVerdict, shuffle, summarize, toClientQuestions, type PoolQuestion } from "./quiz";

describe("flaggedIndices (bancos antiguos con redacción defectuosa)", () => {
  it("marca las ambiguas y las que traen la respuesta en el enunciado; no las buenas", () => {
    const bank: PoolQuestion[] = [
      { question: "Si hay 10 globos y 5 son verdes, ¿cuántos más hay?", options: ["5", "10", "3", "2"], correctIndex: 0, explanation: "" },
      { question: "¿Qué palabra indica que algo está entre dos cosas?", options: ["Arriba", "Entre", "Debajo", "Adentro"], correctIndex: 1, explanation: "" },
      { question: "Si tienes 10 galletas y comes 4, ¿cuántas te quedan?", options: ["6", "4", "10", "14"], correctIndex: 0, explanation: "" },
    ];
    expect(flaggedIndices(bank)).toEqual([0, 1]);
  });
});

const choice = (i: number): PoolQuestion => ({
  question: `P${i}`,
  options: ["a", "b", "c", "d"].map((t) => `${t}${i}`),
  correctIndex: i % 4,
  explanation: `exp${i}`,
  hint: `pista${i}`,
  visual: i % 2 ? "🍎🍎" : undefined,
});
const activity = (i: number): PoolQuestion => ({ type: "activity", question: `Act${i}: suma 3 y 2`, expected: `esperado${i}`, explanation: `expA${i}`, hint: `pistaA${i}`, visual: "⭐⭐⭐ + ⭐⭐" });

const pool: PoolQuestion[] = [...Array.from({ length: 6 }, (_, i) => choice(i)), activity(100), activity(101)];

// RNG determinista para tests
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

describe("shuffle / buildOrder", () => {
  it("conserva los elementos (permutación)", () => {
    expect([...shuffle([1, 2, 3, 4, 5], seeded(1))].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("incluye todas las preguntas, alternativas barajadas y sin alternativas en actividades", () => {
    const order = buildOrder(pool, undefined, seeded(7));
    expect(order.map((o) => o.q).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    for (const o of order) {
      if (o.q >= 6) expect(o.opts).toEqual([]);
      else expect([...o.opts].sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it("intentos distintos barajan distinto", () => {
    expect(JSON.stringify(buildOrder(pool, undefined, seeded(1)))).not.toBe(JSON.stringify(buildOrder(pool, undefined, seeded(2))));
  });
});

describe("drawIndices (evaluaciones siempre distintas)", () => {
  const big: PoolQuestion[] = [...Array.from({ length: 16 }, (_, i) => choice(i)), ...Array.from({ length: 4 }, (_, i) => activity(i))];
  it("elige n preguntas sin repetir ni usar las ya usadas", () => {
    const used = new Set<number>([0, 1, 2, 3, 4]);
    const idx = drawIndices(big, used, 10, seeded(3))!;
    expect(idx).toHaveLength(10);
    expect(new Set(idx).size).toBe(10);
    expect(idx.some((i) => used.has(i))).toBe(false);
  });
  it("dos sorteos sucesivos no comparten preguntas mientras alcance el banco", () => {
    const first = drawIndices(big, new Set(), 10, seeded(5))!;
    const second = drawIndices(big, new Set(first), 10, seeded(6))!;
    expect(second.filter((i) => first.includes(i))).toEqual([]);
  });
  it("devuelve null si no alcanzan las preguntas nuevas", () => {
    const first = drawIndices(big, new Set(), 10, seeded(5))!;
    expect(drawIndices(big, new Set(first), 11)).toBeNull();
    expect(drawIndices(big, new Set(Array.from({ length: 15 }, (_, i) => i)), 10)).toBeNull();
  });
  it("mantiene al menos una actividad cuando el banco las tiene", () => {
    for (let s = 1; s <= 20; s++) {
      const idx = drawIndices(big, new Set(), 10, seeded(s))!;
      expect(idx.some((i) => big[i].type === "activity")).toBe(true);
    }
  });
  it("completa con actividades si faltan alternativas", () => {
    const p = [choice(0), activity(1), activity(2), activity(3)];
    expect(drawIndices(p, new Set(), 4)!.sort()).toEqual([0, 1, 2, 3]);
  });
});

describe("toClientQuestions (no filtra respuestas)", () => {
  const order = buildOrder(pool, undefined, seeded(3));
  it("nunca incluye respuesta correcta, esperada ni explicación", () => {
    const json = JSON.stringify(toClientQuestions(pool, order, true));
    expect(json).not.toMatch(/correctIndex|correctKey|expected|esperado|explanation|exp\d|expA/);
  });
  it("incluye pistas solo si se piden", () => {
    expect(JSON.stringify(toClientQuestions(pool, order, true))).toMatch(/pista0/);
    expect(JSON.stringify(toClientQuestions(pool, order, false))).not.toMatch(/pista|hint/);
  });
  it("actividades sin alternativas, con dibujo", () => {
    const qs = toClientQuestions(pool, order, true);
    const act = qs.find((q) => q.type === "activity")!;
    expect(act.options).toBeUndefined();
    expect(act.visual).toBe("⭐⭐⭐ ⭐⭐"); // solo los datos: sin operación ni resultado
  });
  it("el Desafío (sin pistas) tampoco lleva dibujos", () => {
    expect(toClientQuestions(pool, order, false).some((q) => q.visual)).toBe(false);
  });
  it("las alternativas conservan su clave original", () => {
    const q = toClientQuestions(pool, order, false).find((x) => x.type === "choice")!;
    const o = order[q.position];
    for (const opt of q.options!) expect((pool[o.q] as { options: string[] }).options[opt.key]).toBe(opt.text);
  });
});

describe("gradeAnswer / gradeVerdict", () => {
  const order = buildOrder(pool, undefined, seeded(5));
  const posOf = (pred: (p: PoolQuestion) => boolean) => order.findIndex((o) => pred(pool[o.q]));
  it("corrige por clave original, sin importar el orden mostrado", () => {
    const pos = posOf((p) => p.type !== "activity");
    const p = pool[order[pos].q] as { correctIndex: number; explanation: string };
    expect(gradeAnswer(pool, order, pos, p.correctIndex)).toMatchObject({ correct: true, correctKey: p.correctIndex });
    expect(gradeAnswer(pool, order, pos, (p.correctIndex + 1) % 4)).toMatchObject({ correct: false, explanation: p.explanation });
  });
  it("rechaza posición o clave inválida, y respuestas de alternativa en una actividad", () => {
    expect(gradeAnswer(pool, order, 99, 0)).toBeNull();
    expect(gradeAnswer(pool, order, -1, 0)).toBeNull();
    expect(gradeAnswer(pool, order, posOf((p) => p.type !== "activity"), 7)).toBeNull();
    expect(gradeAnswer(pool, order, posOf((p) => p.type === "activity"), 0)).toBeNull();
  });
  it("veredicto del adulto: Error es incorrecta; Correcto y Con ayuda son correctas", () => {
    const pos = posOf((p) => p.type === "activity");
    expect(gradeVerdict(pool, order, pos, 0)).toMatchObject({ correct: true, helped: false });
    expect(gradeVerdict(pool, order, pos, 1)).toMatchObject({ correct: true, helped: true });
    expect(gradeVerdict(pool, order, pos, 2)).toMatchObject({ correct: false, helped: false });
  });
  it("veredicto inválido o en una pregunta de alternativas", () => {
    expect(gradeVerdict(pool, order, posOf((p) => p.type === "activity"), 5)).toBeNull();
    expect(gradeVerdict(pool, order, posOf((p) => p.type !== "activity"), 0)).toBeNull();
  });
});

describe("buildBreakdown / summarize", () => {
  const order = buildOrder(pool, undefined, seeded(9));
  const allCorrect = Object.fromEntries(order.map((o, i) => [String(i), pool[o.q].type === "activity" ? 0 : (pool[o.q] as { correctIndex: number }).correctIndex]));
  it("todo correcto = 100%", () => {
    expect(summarize(buildBreakdown(pool, order, allCorrect))).toEqual({ correct: 8, total: 8, helped: 0, percentage: 100 });
  });
  it("sin responder cuenta como incorrecta (también las actividades)", () => {
    const b = buildBreakdown(pool, order, {});
    expect(b.every((x) => !x.correct)).toBe(true);
    expect(b.filter((x) => x.type === "activity").every((x) => x.verdict === null)).toBe(true);
    expect(summarize(b).percentage).toBe(0);
  });
  it("actividad con error baja el puntaje; con ayuda cuenta como correcta y se registra", () => {
    const actPositions = order.map((o, i) => (pool[o.q].type === "activity" ? i : -1)).filter((i) => i >= 0);
    const withError = { ...allCorrect, [String(actPositions[0])]: 2, [String(actPositions[1])]: 1 };
    const s = summarize(buildBreakdown(pool, order, withError));
    expect(s).toMatchObject({ correct: 7, total: 8, helped: 1, percentage: 87.5 });
  });
  it("la respuesta esperada y el veredicto quedan en el desglose", () => {
    const b = buildBreakdown(pool, order, allCorrect).find((x) => x.type === "activity")!;
    expect(b.expected).toMatch(/esperado/);
    expect(b.verdict).toBe(0);
  });
  it("ignora claves que no estaban en la pregunta", () => {
    const pos = order.findIndex((o) => pool[o.q].type !== "activity");
    expect(buildBreakdown(pool, order, { [String(pos)]: 9 })[pos].chosenKey).toBeNull();
  });
});

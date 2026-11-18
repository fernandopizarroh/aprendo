import { describe, expect, it, vi } from "vitest";
import { INITIAL_BATCHES, generateBank, generateStage, questionText, stagesToRun } from "./generate-core";
import { parseJsonLoose } from "./json";
import { emptyContent, isComplete, validateStage } from "./schema";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { AiProviderError, AiTransientError, ContentFormatError, type AiProvider, type GenerateInput, type Stage } from "./types";

// Preguntas únicas (el validador rechaza repetidas)
let n = 0;
const q = (hint?: string, extra: object = {}) => ({ question: `¿Pregunta número ${++n}?`, options: ["1", "2", "3", "4"], correctIndex: 3, explanation: "porque sí", hint, ...extra });
const act = (extra: object = {}) => ({ type: "activity", question: `Copia el número ${++n} en tu cuaderno`, expected: "El número bien escrito", explanation: "e", hint: "h", visual: "✏️", ...extra });
const diag = (count: number) => ({ diagnostic: Array.from({ length: count }, () => q("pista")) });
const chal = (count: number) => ({ challenge: Array.from({ length: count }, () => q()) });
const review = { review: [{ title: "t", summary: "s", flashcards: [{ front: "f", back: "b" }] }] };

const input = (stage: Stage, extra: Partial<GenerateInput> = {}): GenerateInput => ({
  apiKey: "k", stage, syllabusText: "t", gradeLevel: "5", images: [], diagnosticCount: 10, challengeCount: 15, ...extra,
});
const provider = (fn: (i: GenerateInput) => Promise<unknown>): AiProvider => ({
  id: "openai",
  testConnection: vi.fn(),
  generateContent: vi.fn(fn),
});
const counts = { diagnostic: 10, challenge: 15 };
const fast = { pauseMs: 0 };

describe("validateStage: tolera defectos sueltos y exige un mínimo de preguntas buenas", () => {
  it("acepta al menos la cantidad pedida", () => {
    expect(validateStage("diagnostic", diag(10), counts)).toHaveLength(10);
    expect(validateStage("challenge", chal(15), counts)).toHaveLength(15);
    expect(validateStage("review", review, counts)).toHaveLength(1);
  });
  it("conserva el margen pedido (12 para 10) y corta lo que pase del margen", () => {
    expect(validateStage("diagnostic", diag(12), counts)).toHaveLength(12);
    expect(validateStage("diagnostic", diag(20), counts)).toHaveLength(12);
  });
  it("caso real del UAT (llegaron 14 de 15): ahora se piden 18, así que una respuesta corta de 16 ya alcanza", () => {
    expect(validateStage("challenge", chal(16), counts)).toHaveLength(16);
  });
  it("rechaza si llegan menos buenas que las pedidas, y dice cuántas llegaron", () => {
    expect(() => validateStage("diagnostic", diag(5), counts)).toThrow(/al menos 10 preguntas válidas, llegaron 5/);
    expect(() => validateStage("challenge", chal(14), counts)).toThrow(/al menos 15 preguntas válidas, llegaron 14/);
  });
  it("descarta solo las preguntas defectuosas, no el lote completo", () => {
    const mixed = { diagnostic: [...diag(10).diagnostic, { question: "rota" }, q(), q("p", { options: ["solo una"] })] };
    // 10 buenas + 1 mal formada + 1 sin pista + 1 con una sola alternativa: se aprovechan las 10 buenas
    expect(validateStage("diagnostic", mixed, counts)).toHaveLength(10);
  });
  it("exige pista en el Diagnóstico (descarta las que no la tienen)", () => {
    expect(() => validateStage("diagnostic", { diagnostic: Array.from({ length: 10 }, () => q()) }, counts)).toThrow(/sin pista/);
  });
  it("rechaza estructura inválida", () => {
    expect(() => validateStage("challenge", { challenge: [{ question: "x" }] }, counts)).toThrow(/mal formadas/);
    expect(() => validateStage("challenge", { otra: [] }, counts)).toThrow();
    expect(() => validateStage("review", { review: [] }, counts)).toThrow();
  });
  it("descarta preguntas repetidas dentro del lote", () => {
    const one = q("p");
    expect(() => validateStage("diagnostic", { diagnostic: Array.from({ length: 10 }, () => one) }, counts)).toThrow(/repetidas/);
  });
  it("descarta preguntas que ya estaban en el banco (evaluaciones siempre distintas), aunque cambien tildes o signos", () => {
    const batch = diag(11);
    const avoid = [batch.diagnostic[3].question.toUpperCase().replace("¿", "").replace("?", "")];
    expect(validateStage("diagnostic", batch, counts, { avoid })).toHaveLength(10);
    expect(() => validateStage("diagnostic", diag(10), counts, { avoid: [diag(10).diagnostic[0].question] })).not.toThrow(); // otras preguntas
    const exact = diag(10);
    expect(() => validateStage("diagnostic", exact, counts, { avoid: [exact.diagnostic[0].question] })).toThrow(/ya usadas/);
  });
  it("sin actividades en niveles que no son iniciales (se descartan)", () => {
    const withAct = { diagnostic: [...diag(9).diagnostic, act()] };
    expect(() => validateStage("diagnostic", withAct, counts)).toThrow(/actividades de cuaderno/);
    expect(validateStage("diagnostic", { diagnostic: [...diag(10).diagnostic, act()] }, counts)).toHaveLength(10);
  });
});

describe("validateStage: nivel inicial (dibujos y actividades de cuaderno)", () => {
  const early = { earlyGrade: true };
  const withVisual = (list: object[]) => list.map((x, i) => (i < 5 ? { ...x, visual: "🍎🍎" } : x));
  it("acepta actividades en el rango y dibujos en al menos el 40%", () => {
    const list = withVisual([...Array.from({ length: 8 }, () => q("p")), act(), act()]);
    expect(validateStage("diagnostic", { diagnostic: list }, counts, early)).toHaveLength(10);
  });
  it("exige actividades de cuaderno", () => {
    expect(() => validateStage("diagnostic", { diagnostic: withVisual(Array.from({ length: 10 }, () => q("p"))) }, counts, early)).toThrow(/actividades de cuaderno/);
  });
  it("si la IA manda actividades de más, descarta las sobrantes y aprovecha el resto", () => {
    const list = withVisual([...Array.from({ length: 9 }, () => q("p")), ...Array.from({ length: 5 }, () => act())]);
    const out = validateStage("diagnostic", { diagnostic: list }, counts, early);
    expect((out as { type?: string }[]).filter((x) => x.type === "activity").length).toBeLessThanOrEqual(4); // máximo para 12 preguntas
    expect(out.length).toBeGreaterThanOrEqual(10);
  });
  it("exige dibujos (visual) en al menos el 40%", () => {
    const list = [...Array.from({ length: 8 }, () => q("p")), act({ visual: undefined }), act({ visual: undefined })];
    expect(() => validateStage("diagnostic", { diagnostic: list }, counts, early)).toThrow(/40%/);
  });
  it("las actividades del Diagnóstico también necesitan pista", () => {
    const list = withVisual([...Array.from({ length: 8 }, () => q("p")), act({ hint: "" }), act()]);
    expect(() => validateStage("diagnostic", { diagnostic: list }, counts, early)).toThrow(/sin pista/);
  });
  it("el Desafío no necesita pistas", () => {
    const list = withVisual([...Array.from({ length: 12 }, () => q()), act({ hint: undefined }), act({ hint: undefined }), act({ hint: undefined })]);
    expect(validateStage("challenge", { challenge: list }, counts, early)).toHaveLength(15);
  });
});

describe("generateStage", () => {
  it("devuelve la etapa válida", async () => {
    expect(await generateStage(provider(async () => diag(12)), input("diagnostic"))).toHaveLength(12);
  });

  it("acumula las preguntas buenas y pide solo las que faltan (en vez de empezar de cero)", async () => {
    const fn = vi.fn().mockResolvedValueOnce(diag(7)).mockResolvedValueOnce(diag(5));
    const out = await generateStage(provider(fn), input("diagnostic"), 4, fast);
    expect(out).toHaveLength(12);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0].diagnosticCount).toBe(10);
    expect(fn.mock.calls[1][0].diagnosticCount).toBe(3); // faltaban 3
    expect(fn.mock.calls[1][0].avoid).toHaveLength(7); // no repetir las 7 ya buenas
    expect(fn.mock.calls[1][0].feedback).toBeUndefined();
  });

  it("caso real del UAT (13 buenas de 15): el segundo intento pide solo las 2 que faltan", async () => {
    const fn = vi.fn().mockResolvedValueOnce(chal(13)).mockResolvedValueOnce(chal(4));
    const out = await generateStage(provider(fn), input("challenge"), 4, fast);
    expect(out.length).toBeGreaterThanOrEqual(15);
    expect(fn.mock.calls[1][0].challengeCount).toBe(2);
  });

  it("falla con mensaje claro tras agotar los intentos si la IA no entrega preguntas válidas", async () => {
    const p = provider(async () => ({ diagnostic: [] }));
    await expect(generateStage(p, input("diagnostic"), 4, fast)).rejects.toThrow(/Diagnóstico después de 4 intentos/);
    expect(p.generateContent).toHaveBeenCalledTimes(4);
  });

  it("reintenta ante JSON mal formado", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new ContentFormatError("no es JSON")).mockResolvedValueOnce(chal(15));
    await expect(generateStage(provider(fn), input("challenge"), 4, fast)).resolves.toHaveLength(15);
  });

  it("no reintenta errores del proveedor (llave, cuota) y conserva el detalle", async () => {
    const p = provider(async () => {
      throw new AiProviderError("sin cuota", "quota exceeded");
    });
    await expect(generateStage(p, input("review"))).rejects.toMatchObject({ providerDetail: "quota exceeded" });
    expect(p.generateContent).toHaveBeenCalledTimes(1);
  });

  it("si la IA repite una pregunta del banco, la descarta y pide otras sin repetirla", async () => {
    const existing = q("p");
    const dup = { diagnostic: [{ ...existing }, ...diag(9).diagnostic] };
    const fn = vi.fn().mockResolvedValueOnce(dup).mockResolvedValueOnce(diag(10));
    const out = await generateStage(provider(fn), input("diagnostic", { avoid: [existing.question] }), 4, fast);
    expect(out.length).toBeGreaterThanOrEqual(10);
    expect(fn.mock.calls[1][0].avoid).toContain(existing.question);
    expect((out as { question: string }[]).some((x) => x.question === existing.question)).toBe(false);
  });

  it("si el lote completo no cumple lo pedido (sin actividades en nivel inicial), lo descarta y reintenta con el motivo", async () => {
    const visual = (list: object[]) => list.map((x) => ({ ...x, visual: "🍎🍎" }));
    const sinActividades = { diagnostic: visual(Array.from({ length: 10 }, () => q("p"))) };
    const conActividades = { diagnostic: visual([...Array.from({ length: 8 }, () => q("p")), act(), act()]) };
    const fn = vi.fn().mockResolvedValueOnce(sinActividades).mockResolvedValueOnce(conActividades);
    const out = await generateStage(provider(fn), input("diagnostic", { earlyGrade: true }), 4, fast);
    expect(out).toHaveLength(10);
    expect(fn.mock.calls[1][0].feedback).toMatch(/actividades de cuaderno/);
    expect(fn.mock.calls[1][0].diagnosticCount).toBe(10); // vuelve a pedir el lote completo
  });
});
describe("generateStage: fallas pasajeras (sin respuesta a tiempo, red, error 5xx)", () => {
  it("se reintentan solas y no gastan intentos de contenido", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new AiTransientError("No pudimos conectar", "timeout"))
      .mockRejectedValueOnce(new AiTransientError("No pudimos conectar", "timeout"))
      .mockResolvedValueOnce(chal(16));
    await expect(generateStage(provider(fn), input("challenge"), 3, fast)).resolves.toHaveLength(16);
    expect(fn).toHaveBeenCalledTimes(3);
  });
  it("tras agotar los reintentos informa la falla", async () => {
    const fn = vi.fn().mockRejectedValue(new AiTransientError("La IA no respondió a tiempo", "timeout"));
    await expect(generateStage(provider(fn), input("challenge"), 3, fast)).rejects.toMatchObject({ providerDetail: "timeout" });
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 reintentos
  });
  it("no se queda esperando para siempre: respeta el tiempo máximo", async () => {
    const fn = vi.fn(async () => { await new Promise((r) => setTimeout(r, 30)); return diag(3); }); // siempre insuficiente
    await expect(generateStage(provider(fn), input("diagnostic"), 10, { deadlineMs: 50, pauseMs: 0 })).rejects.toThrow(/tardando demasiado/);
    expect(fn.mock.calls.length).toBeLessThan(10);
  });
});

describe("generateBank", () => {
  it("genera varios lotes y cada uno recibe lo anterior para no repetirlo", async () => {
    const fn = vi.fn(async (_i: GenerateInput) => diag(12));
    const bank = await generateBank(provider(fn), input("diagnostic"), INITIAL_BATCHES);
    expect(bank).toHaveLength(12 * INITIAL_BATCHES);
    expect(fn).toHaveBeenCalledTimes(INITIAL_BATCHES);
    const secondCall = fn.mock.calls[1][0] as GenerateInput;
    expect(secondCall.avoid).toHaveLength(12);
    expect(secondCall.avoid).toContain(questionText(bank[0]));
    expect(new Set(bank.map(questionText)).size).toBe(bank.length); // todas distintas
  });
});

describe("stagesToRun", () => {
  const full = { review: [1], diagnostic: [1], challenge: [1] };
  it("sin contenido previo: todas", () => {
    expect(stagesToRun(null, undefined)).toEqual(["review", "diagnostic", "challenge"]);
  });
  it("Reintentar con contenido parcial: solo lo que falta", () => {
    expect(stagesToRun({ review: [1], diagnostic: [], challenge: [] }, undefined)).toEqual(["diagnostic", "challenge"]);
  });
  it("Reintentar con todo completo: regenera todo", () => {
    expect(stagesToRun(full, undefined)).toHaveLength(3);
  });
  it("una lista de etapas (editar contexto): solo esas, en el orden del Repaso al Desafío", () => {
    expect(stagesToRun(full, ["challenge", "diagnostic"])).toEqual(["diagnostic", "challenge"]);
    expect(stagesToRun(full, ["review"])).toEqual(["review"]);
    expect(stagesToRun(full, [])).toEqual([]);
  });
  it("una etapa o todas, explícito", () => {
    expect(stagesToRun(full, "diagnostic")).toEqual(["diagnostic"]);
    expect(stagesToRun({ review: [1], diagnostic: [], challenge: [] }, "all")).toHaveLength(3);
  });
});

describe("isComplete", () => {
  it("requiere las tres etapas", () => {
    expect(isComplete(emptyContent())).toBe(false);
    expect(isComplete({ review: [1], diagnostic: [1], challenge: [] })).toBe(false);
    expect(isComplete({ review: [1], diagnostic: [1], challenge: [1] })).toBe(true);
  });
});

describe("prompts", () => {
  const base = { gradeLevel: "5", diagnosticCount: 10, challengeCount: 15 };
  it("piden la cantidad con margen (12 para 10, 18 para 15)", () => {
    expect(buildSystemPrompt({ ...base, stage: "diagnostic" })).toMatch(/EXACTAMENTE 12/);
    expect(buildSystemPrompt({ ...base, stage: "challenge" })).toMatch(/EXACTAMENTE 18/);
  });
  it("niveles superiores: solo alternativas, sin dibujos ni actividades", () => {
    const p = buildSystemPrompt({ ...base, stage: "diagnostic" });
    expect(p).toMatch(/no incluyas actividades de cuaderno/);
    expect(p).not.toMatch(/emojis/);
  });
  it("nivel inicial: dibujos con emojis y actividades de cuaderno con su rango", () => {
    const p = buildSystemPrompt({ ...base, gradeLevel: "1° Basico", stage: "diagnostic", earlyGrade: true });
    expect(p).toMatch(/emojis/);
    expect(p).toMatch(/entre 2 y 4 ACTIVIDADES DE CUADERNO/);
    expect(p).toMatch(/"type": "activity"/);
    expect(p).toMatch(/hasta 3° básico/);
  });
  it("incluye el motivo del rechazo y las preguntas a evitar", () => {
    const u = buildUserPrompt({ syllabusText: "x", images: [], feedback: "llegaron 5", avoid: ["¿Cuánto es 2+2?"] });
    expect(u).toMatch(/llegaron 5/);
    expect(u).toMatch(/No las repitas/);
    expect(u).toMatch(/2\+2/);
  });
  it("las fotos son contexto de ejercicios ya vistos, no obligatorias", () => {
    expect(buildUserPrompt({ syllabusText: "x", images: [{ mimeType: "image/jpeg", base64: "A" }] })).toMatch(/ya trabajó en clases/);
    expect(buildUserPrompt({ syllabusText: "x", images: [] })).toMatch(/solo el temario/);
  });
});

describe("parseJsonLoose", () => {
  it("acepta JSON plano, con cercas de código o con texto alrededor", () => {
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Claro: {"a":1} listo')).toEqual({ a: 1 });
  });
  it("lanza ContentFormatError si no hay JSON", () => {
    expect(() => parseJsonLoose("hola")).toThrow(ContentFormatError);
  });
});

import { z } from "zod";

// Dibujos de apoyo para el nivel inicial (hasta 3° básico).
// La IA no dibuja: entrega cantidades ("drawing") y el sistema arma el dibujo. Así el dibujo nunca trae el resultado
// y las cantidades son exactas (los modelos cuentan mal los emojis repetidos).
// El dibujo muestra SOLO los datos del enunciado (un grupo por fila), sin signo ni "= ❓": qué operación usar lo decide el alumno.
// "op" se usa únicamente para verificar que la respuesta correcta calce con los datos.
// Los dibujos que no calzan con el enunciado se descartan, también en bancos generados antes de este cambio.

export const MAX_PER_GROUP = 20;
export const MAX_TOTAL = 30;
const QUESTION_MARK = "❓";

export const drawingSchema = z.object({
  groups: z
    .array(z.object({ emoji: z.string().trim().min(1).max(16), count: z.number().int().min(1).max(MAX_PER_GROUP) }))
    .min(1)
    .max(3),
  op: z.enum(["+", "-"]).nullish(),
});
export type Drawing = z.infer<typeof drawingSchema>;

const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" });
const graphemes = (s: string) => Array.from(segmenter.segment(s), (x) => x.segment);
/** Compara emojis sin el selector de variante (⭐ y ⭐️ son el mismo). */
const bare = (s: string) => s.replace(/\uFE0F/g, "");
const isEmoji = (g: string) => /\p{Extended_Pictographic}/u.test(g);

const WORDS: Record<string, number> = {
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
};
const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Números que aparecen en un texto, en cifras o en palabras (hasta veinte). */
export function numbersIn(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/\d+/g)) out.add(Number(m[0]));
  for (const w of plain(text).split(/[^a-z]+/)) if (w in WORDS) out.add(WORDS[w]);
  return out;
}

/** Número con que empieza una respuesta ("6", "6 juguetes", "seis"). null si no es numérica. */
export function leadingNumber(text: string): number | null {
  const t = plain(text).trim();
  const d = t.match(/^(\d+)\b/);
  if (d) return Number(d[1]);
  const w = t.split(/[^a-z]+/)[0];
  return w in WORDS ? WORDS[w] : null;
}

/** Grupos separados por espacio (la vista los muestra uno por fila). Nunca incluye la operación ni el resultado. */
export function renderDrawing(d: Drawing): string {
  return d.groups.map((g) => g.emoji.repeat(g.count)).join(" ");
}

/** Lee un dibujo de texto ("🍎🍎🍎 + 🍐🍐 = ❓" o "🍎🍎🍎 🍐🍐"). null si no es un dibujo de cantidades. */
export function parseVisualText(text: string): { drawing: Drawing; shownResult: boolean } | null {
  const [left, ...rest] = text.split("=");
  const after = rest.join("=").trim();
  const shownResult = rest.length > 0 && bare(after) !== bare(QUESTION_MARK) && after !== "?";
  const ops = left.match(/[+\-−]/g) ?? [];
  if (ops.length && !ops.every((o) => o === ops[0])) return null;
  const op = ops.length ? (ops[0] === "+" ? "+" : "-") : null;
  const groups: Drawing["groups"] = [];
  for (const part of left.split(/[+\-−]|\s+/).filter((p) => p.trim())) {
    const gs = graphemes(part);
    if (!gs.length || !gs.every((g) => bare(g) === bare(gs[0]) && isEmoji(g))) return null;
    groups.push({ emoji: gs[0], count: gs.length }); // se conserva el emoji tal cual (con su selector de variante)
  }
  const parsed = drawingSchema.safeParse({ groups, op });
  return parsed.success ? { drawing: parsed.data, shownResult } : null;
}

export type DrawingCheck =
  | { ok: true; visual: string }
  | { ok: false; reason: string; dropQuestion: boolean };

const fail = (reason: string, dropQuestion = false): DrawingCheck => ({ ok: false, reason, dropQuestion });

/**
 * Revisa que el dibujo calce con la pregunta.
 * - Cada cantidad dibujada debe estar en el enunciado (si no, el dibujo contradice o trae la respuesta).
 * - Excepción: preguntas de contar sin números en el enunciado ("¿cuántas manzanas hay?"); ahí la respuesta debe ser la cantidad
 *   dibujada y, si no calza, se descarta la pregunta completa (sin el dibujo no se puede responder).
 * - Con operación, el resultado de la operación debe ser la respuesta correcta (si la respuesta es un número).
 */
export function checkDrawing(d: Drawing, question: string, answer?: string): DrawingCheck {
  for (const g of d.groups) {
    const gs = graphemes(g.emoji);
    if (gs.length !== 1 || !isEmoji(gs[0])) return fail("el dibujo no usa un solo emoji por grupo");
  }
  const total = d.groups.reduce((s, g) => s + g.count, 0);
  if (total > MAX_TOTAL) return fail("el dibujo tiene demasiados emojis");
  if (d.groups.length === 1 && d.op) return fail("el dibujo tiene operación con un solo grupo");
  if (d.op === "-" && (d.groups.length !== 2 || d.groups[0].count < d.groups[1].count)) return fail("la resta del dibujo no tiene sentido");

  const nums = numbersIn(question);
  const n = answer === undefined ? null : leadingNumber(answer);

  if (d.groups.length === 1 && nums.size === 0) {
    if (n === null) return fail("el dibujo no corresponde a una pregunta de cantidades");
    if (n !== d.groups[0].count) return fail("la respuesta no coincide con lo que hay que contar", true);
    return { ok: true, visual: renderDrawing(d) };
  }
  if (!d.groups.every((g) => nums.has(g.count))) return fail("el dibujo no calza con los números del enunciado");
  if (d.op && n !== null) {
    const [a, b, c = { count: 0 }] = d.groups;
    const result = d.op === "+" ? a.count + b.count + c.count : a.count - b.count;
    if (result !== n) return fail("la operación del dibujo no da la respuesta correcta");
  }
  return { ok: true, visual: renderDrawing(d) };
}

/** Respuesta correcta en texto de una pregunta del banco (alternativa correcta o respuesta esperada de una actividad). */
export function answerText(q: { type?: string; options?: string[]; correctIndex?: number; expected?: string }): string | undefined {
  if (q.type === "activity") return q.expected;
  return typeof q.correctIndex === "number" ? q.options?.[q.correctIndex] : undefined;
}

/**
 * Dibujo que se puede mostrar al alumno, o undefined. Aplica las mismas reglas a bancos antiguos (dibujos escritos por la IA):
 * se ocultan los que muestran el resultado, los que no son de cantidades y los que no calzan con el enunciado.
 */
export function safeVisual(q: { question: string; visual?: string; type?: string; options?: string[]; correctIndex?: number; expected?: string }): string | undefined {
  const text = q.visual?.trim();
  if (!text) return undefined;
  const parsed = parseVisualText(text);
  if (!parsed || parsed.shownResult) return undefined;
  const check = checkDrawing(parsed.drawing, q.question, answerText(q));
  return check.ok ? check.visual : undefined;
}

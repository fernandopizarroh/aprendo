import { z } from "zod";
import { activityMax, activityTarget, askCount } from "../grade";
import { answerText, checkDrawing, drawingSchema } from "../visual";
import { TEXT_ISSUE_LABEL, textIssue, type TextIssue } from "./quality";
import type { Stage } from "./types";

// Contrato de salida estructurada de la IA (PRD 6.2), una etapa por llamada.
const visual = z.string().trim().max(200).optional(); // dibujo hecho con emojis (nivel inicial)
/** En preguntas, la IA entrega cantidades y el sistema arma el dibujo (ver src/lib/visual.ts). */
const drawing = drawingSchema.nullish();

export const flashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  example: z.string().optional(),
  visual,
});

export const reviewModuleSchema = z.object({
  title: z.string(),
  summary: z.string(),
  flashcards: z.array(flashcardSchema).min(1),
});

export const choiceQuestionSchema = z.object({
  type: z.literal("choice").optional(),
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  hint: z.string().optional(), // solo Diagnóstico
  visual,
  drawing,
});

/** Actividad para hacer en el cuaderno; la valida un adulto (correcto, con ayuda o error). */
export const activityQuestionSchema = z.object({
  type: z.literal("activity"),
  question: z.string().min(1),
  expected: z.string().min(1), // cómo se ve una respuesta correcta (solo para el adulto)
  explanation: z.string(),
  hint: z.string().optional(),
  visual,
  drawing,
});

export const questionSchema = z.union([activityQuestionSchema, choiceQuestionSchema]);

export type ReviewModule = z.infer<typeof reviewModuleSchema>;
export type Question = z.infer<typeof questionSchema>;
export type ActivityQuestion = z.infer<typeof activityQuestionSchema>;

/** Contenido guardado: una etapa pendiente se representa con arreglo vacío. */
export interface StoredContent {
  review: unknown[];
  diagnostic: unknown[];
  challenge: unknown[];
}

export const STAGES: Stage[] = ["review", "diagnostic", "challenge"];
export const STAGE_LABEL: Record<Stage, string> = { review: "Repaso", diagnostic: "Diagnóstico", challenge: "Desafío" };

export const emptyContent = (): StoredContent => ({ review: [], diagnostic: [], challenge: [] });
export const isComplete = (c: StoredContent) => STAGES.every((s) => c[s].length > 0);

export const normalizeText = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export interface ValidateOptions {
  earlyGrade?: boolean;
  /** Textos de preguntas ya existentes en el banco: no se pueden repetir. */
  avoid?: string[];
}

export interface Screened {
  /** Preguntas buenas: bien formadas, con pista si corresponde, sin repetir y propias del nivel. */
  kept: Question[];
  /** Por qué se descartó el resto (para el mensaje de error). */
  reasons: string[];
  /** Cuántas preguntas mandó la IA. */
  total: number;
  /** Dibujos quitados porque no calzaban con el enunciado (la pregunta se conserva). */
  drawingsRemoved: number;
}

/** Filtra las preguntas defectuosas de una respuesta de la IA. Conserva las buenas aunque haya malas. */
export function screenQuestions(stage: Exclude<Stage, "review">, raw: unknown, opts: ValidateOptions = {}): Screened {
  const items =
    stage === "diagnostic"
      ? z.object({ diagnostic: z.array(z.unknown()) }).parse(raw).diagnostic
      : z.object({ challenge: z.array(z.unknown()) }).parse(raw).challenge;

  const dropped = { invalid: 0, noHint: 0, repeated: 0, notebook: 0, badDrawing: 0 };
  const textDrops: Record<TextIssue, number> = { ambiguous: 0, comparison: 0, duplicateOptions: 0, answerInQuestion: 0 };
  let drawingsRemoved = 0;
  const seen = new Set((opts.avoid ?? []).map(normalizeText));
  const kept: Question[] = [];
  for (const item of items) {
    const parsed = questionSchema.safeParse(item);
    if (!parsed.success) { dropped.invalid++; continue; }
    const { drawing: d, visual: _aiVisual, ...q } = parsed.data; // el dibujo de texto de la IA no se usa: se arma desde "drawing"
    void _aiVisual;
    const issue = textIssue(q);
    if (issue) { textDrops[issue]++; continue; }
    if (d && opts.earlyGrade) {
      const check = checkDrawing(d, q.question, answerText(q));
      if (check.ok) (q as Question).visual = check.visual;
      else if (check.dropQuestion) { dropped.badDrawing++; continue; }
      else drawingsRemoved++;
    }
    if (q.type === "activity" && !opts.earlyGrade) { dropped.notebook++; continue; }
    if (stage === "diagnostic" && !q.hint?.trim()) { dropped.noHint++; continue; }
    const key = normalizeText(q.question);
    if (seen.has(key)) { dropped.repeated++; continue; }
    seen.add(key);
    kept.push(q as Question);
  }
  const reasons = [
    dropped.invalid && `${dropped.invalid} mal formadas`,
    dropped.noHint && `${dropped.noHint} sin pista`,
    dropped.repeated && `${dropped.repeated} repetidas o ya usadas`,
    dropped.notebook && `${dropped.notebook} actividades de cuaderno (este nivel no las usa)`,
    dropped.badDrawing && `${dropped.badDrawing} cuya respuesta no coincide con el dibujo`,
    ...(Object.keys(textDrops) as TextIssue[]).map((k) => textDrops[k] && `${textDrops[k]} ${TEXT_ISSUE_LABEL[k]}`),
  ].filter((r): r is string => Boolean(r));
  return { kept, reasons, total: items.length, drawingsRemoved };
}

/**
 * Revisa un lote de preguntas buenas: cantidad mínima y, en nivel inicial, actividades de cuaderno.
 * Si hay actividades de más, descarta las sobrantes. Lo que pase del margen pedido se corta.
 */
export function checkBatch(
  stage: Exclude<Stage, "review">,
  candidates: Question[],
  expected: number,
  opts: ValidateOptions = {},
  context: { reasons?: string[]; total?: number } = {},
): Question[] {
  let kept = candidates.slice(0, askCount(expected));
  let extraActivities = 0;

  if (opts.earlyGrade) {
    const max = activityMax(kept.length);
    let seenActs = 0;
    kept = kept.filter((q) => {
      if (q.type !== "activity") return true;
      if (++seenActs <= max) return true;
      extraActivities++;
      return false;
    });
  }

  if (kept.length < expected) {
    const reasons = [...(context.reasons ?? []), ...(extraActivities ? [`${extraActivities} actividades de cuaderno de más`] : [])];
    throw new Error(
      `${STAGE_LABEL[stage]}: se esperaban al menos ${expected} preguntas válidas, llegaron ${kept.length}` +
        (context.total !== undefined ? ` de ${context.total}` : "") +
        (reasons.length ? ` (descartadas: ${reasons.join(", ")})` : ""),
    );
  }

  if (opts.earlyGrade) {
    const activities = kept.filter((q) => q.type === "activity").length;
    const min = activityTarget(expected);
    if (activities < min) {
      throw new Error(`Se esperaban entre ${min} y ${activityMax(kept.length)} actividades de cuaderno (type "activity"), llegaron ${activities}`);
    }
  }
  return kept;
}

/**
 * Valida la respuesta de una etapa.
 * - Repaso: estructura.
 * - Diagnóstico y Desafío: descarta solo las preguntas defectuosas y exige al menos `expected` buenas
 *   (se le pide a la IA un margen; el sobrante pasa al banco para los intentos siguientes).
 */
export function validateStage(
  stage: Stage,
  raw: unknown,
  counts: { diagnostic: number; challenge: number },
  opts: ValidateOptions = {},
): ReviewModule[] | Question[] {
  if (stage === "review") {
    return z.object({ review: z.array(reviewModuleSchema).min(1) }).parse(raw).review;
  }
  const expected = stage === "diagnostic" ? counts.diagnostic : counts.challenge;
  const screened = screenQuestions(stage, raw, opts);
  return checkBatch(stage, screened.kept, expected, opts, { reasons: screened.reasons, total: screened.total });
}
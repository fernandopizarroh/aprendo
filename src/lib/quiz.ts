import { z } from "zod";
import { scorePercentage } from "./progress";

// Lógica pura de las evaluaciones del alumno (Diagnóstico y Desafío).
// La respuesta correcta, la respuesta esperada de una actividad y la explicación nunca salen del servidor antes de que corresponda.

export type Rng = () => number;

export interface ChoiceQuestion {
  type?: "choice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  visual?: string;
}
/** Actividad de cuaderno validada por un adulto. */
export interface ActivityQuestion {
  type: "activity";
  question: string;
  expected: string;
  explanation: string;
  hint?: string;
  visual?: string;
}
export type PoolQuestion = ChoiceQuestion | ActivityQuestion;
export const isActivity = (q: PoolQuestion): q is ActivityQuestion => q.type === "activity";

/** Veredicto del adulto: 0 correcto, 1 correcto con ayuda, 2 error. */
export type Verdict = 0 | 1 | 2;
export const VERDICT_LABEL: Record<Verdict, string> = { 0: "Correcto", 1: "Correcto con ayuda", 2: "Error" };

/** Orden de un intento: `q` es el índice en el banco; `opts` son los índices originales de las alternativas, en el orden mostrado (vacío en actividades). */
export interface OrderItem {
  q: number;
  opts: number[];
}

export interface ClientQuestion {
  position: number;
  type: "choice" | "activity";
  question: string;
  visual?: string;
  options?: { key: number; text: string }[]; // key = índice original de la alternativa
  hint?: string;
}

export interface BreakdownItem {
  position: number;
  type: "choice" | "activity";
  question: string;
  visual?: string;
  options: { key: number; text: string }[];
  chosenKey: number | null;
  correctKey: number | null;
  verdict: Verdict | null;
  expected?: string;
  correct: boolean;
  explanation: string;
}

export const attemptDetailSchema = z.object({
  order: z.array(z.object({ q: z.number().int().min(0), opts: z.array(z.number().int().min(0).max(3)) })),
  /** Alternativa elegida (0-3) o veredicto del adulto (0-2) por posición. */
  answers: z.record(z.string(), z.number().int().min(0).max(3)).default({}),
  version: z.number().int().default(1),
  grant: z.object({ position: z.number().int(), until: z.string() }).nullable().optional(),
  breakdown: z.array(z.any()).optional(),
  correct: z.number().optional(),
  total: z.number().optional(),
  helped: z.number().optional(),
  outcome: z.any().optional(),
});
export type AttemptDetail = z.infer<typeof attemptDetailSchema>;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Elige `n` preguntas del banco que no se hayan usado antes, manteniendo la proporción de actividades.
 * Devuelve null si no quedan suficientes (hay que ampliar el banco).
 */
export function drawIndices(pool: readonly PoolQuestion[], used: ReadonlySet<number>, n: number, rng: Rng = Math.random): number[] | null {
  const available = pool.map((_, i) => i).filter((i) => !used.has(i));
  if (available.length < n) return null;
  const acts = available.filter((i) => isActivity(pool[i]));
  const chs = available.filter((i) => !isActivity(pool[i]));

  let k = Math.round((n * acts.length) / available.length);
  if (acts.length > 0 && n >= 5) k = Math.max(k, 1);
  k = Math.min(k, acts.length, n);
  k = Math.max(k, n - chs.length); // si faltan de alternativas, completa con actividades

  return [...shuffle(acts, rng).slice(0, k), ...shuffle(chs, rng).slice(0, n - k)];
}

/** Baraja las preguntas elegidas y las alternativas de cada una. */
export function buildOrder(pool: readonly PoolQuestion[], indices?: readonly number[], rng: Rng = Math.random): OrderItem[] {
  const chosen = indices ?? pool.map((_, i) => i);
  return shuffle(chosen, rng).map((q) => ({
    q,
    opts: isActivity(pool[q]) ? [] : shuffle((pool[q] as ChoiceQuestion).options.map((_, k) => k), rng),
  }));
}

/** Preguntas para el cliente: sin respuesta correcta, sin respuesta esperada y sin explicación. La pista solo si se pide (Diagnóstico). */
export function toClientQuestions(pool: readonly PoolQuestion[], order: readonly OrderItem[], withHints: boolean): ClientQuestion[] {
  return order.map((o, position) => {
    const p = pool[o.q];
    const base: ClientQuestion = {
      position,
      type: isActivity(p) ? "activity" : "choice",
      question: p.question,
      ...(p.visual?.trim() ? { visual: p.visual } : {}),
      ...(isActivity(p) ? {} : { options: o.opts.map((key) => ({ key, text: p.options[key] })) }),
    };
    return withHints && p.hint ? { ...base, hint: p.hint } : base;
  });
}

export function gradeAnswer(
  pool: readonly PoolQuestion[],
  order: readonly OrderItem[],
  position: number,
  key: number,
): { correct: boolean; correctKey: number; explanation: string } | null {
  const o = order[position];
  if (!o) return null;
  const p = pool[o.q];
  if (!p || isActivity(p) || !o.opts.includes(key)) return null;
  return { correct: key === p.correctIndex, correctKey: p.correctIndex, explanation: p.explanation };
}

/** Corrige una actividad según el veredicto del adulto: solo "Error" cuenta como incorrecta. */
export function gradeVerdict(
  pool: readonly PoolQuestion[],
  order: readonly OrderItem[],
  position: number,
  verdict: number,
): { correct: boolean; helped: boolean; verdict: Verdict; explanation: string; expected: string } | null {
  const o = order[position];
  const p = o && pool[o.q];
  if (!p || !isActivity(p) || ![0, 1, 2].includes(verdict)) return null;
  return { correct: verdict !== 2, helped: verdict === 1, verdict: verdict as Verdict, explanation: p.explanation, expected: p.expected };
}

export function buildBreakdown(
  pool: readonly PoolQuestion[],
  order: readonly OrderItem[],
  answers: Readonly<Record<string, number>>,
): BreakdownItem[] {
  return order.map((o, position) => {
    const p = pool[o.q];
    const given = answers[String(position)];
    const visual = p.visual?.trim() ? { visual: p.visual } : {};
    if (isActivity(p)) {
      const verdict = given === 0 || given === 1 || given === 2 ? (given as Verdict) : null;
      return {
        position, type: "activity", question: p.question, ...visual, options: [], chosenKey: null, correctKey: null,
        verdict, expected: p.expected, correct: verdict === 0 || verdict === 1, explanation: p.explanation,
      };
    }
    const chosenKey = typeof given === "number" && o.opts.includes(given) ? given : null;
    return {
      position, type: "choice", question: p.question, ...visual,
      options: o.opts.map((key) => ({ key, text: p.options[key] })),
      chosenKey, correctKey: p.correctIndex, verdict: null, correct: chosenKey === p.correctIndex, explanation: p.explanation,
    };
  });
}

export function summarize(breakdown: readonly BreakdownItem[]) {
  const correct = breakdown.filter((b) => b.correct).length;
  const helped = breakdown.filter((b) => b.verdict === 1).length;
  return { correct, total: breakdown.length, helped, percentage: scorePercentage(correct, breakdown.length) };
}

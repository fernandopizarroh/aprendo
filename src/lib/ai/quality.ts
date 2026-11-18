// Revisiones de redacción de una pregunta generada. Son reglas simples y sin costo: si una falla, la pregunta se descarta
// y el generador pide una de reemplazo.

const plain = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ]+/g, " ").trim();

export type TextIssue = "ambiguous" | "duplicateOptions" | "answerInQuestion";

export const TEXT_ISSUE_LABEL: Record<TextIssue, string> = {
  ambiguous: "ambiguas",
  duplicateOptions: "con alternativas repetidas",
  answerInQuestion: "con la respuesta escrita en el enunciado",
};

/**
 * "¿Cuántos más hay?" sin decir respecto de qué (por ejemplo "10 globos y 5 son verdes, ¿cuántos más hay?").
 * Se acepta cuando compara ("¿cuántas manzanas más que peras?") o dice para qué ("¿cuántos más necesitas para tener 10?").
 */
export function isAmbiguousQuestion(question: string): boolean {
  const t = plain(question);
  const m = t.match(/\bcuant[oa]s\b(?:\s+\w+)?\s+\b(mas|menos)\b(.*)$/);
  if (!m) return false;
  return !/\b(que|para|de lo que)\b/.test(m[2]);
}

/**
 * La alternativa correcta aparece escrita en el enunciado y ninguna otra aparece
 * (por ejemplo "¿Qué palabra indica que algo está entre dos cosas?" con respuesta "Entre").
 * No aplica a respuestas numéricas, muy cortas, ni a enunciados con citas (preguntas sobre una frase dada).
 */
export function answerInQuestion(question: string, options: string[], correctIndex: number): boolean {
  if (/["'«»“”‘’]/.test(question)) return false;
  const q = ` ${plain(question)} `;
  const appears = (o: string) => {
    const p = plain(o);
    return p.length >= 4 && !/^\d/.test(p) && q.includes(` ${p} `);
  };
  const correct = options[correctIndex];
  if (correct === undefined || !appears(correct)) return false;
  return !options.some((o, i) => i !== correctIndex && appears(o));
}

export function hasDuplicateOptions(options: string[]): boolean {
  const seen = new Set(options.map(plain));
  return seen.size !== options.length;
}

/** Primer problema de redacción que tenga la pregunta, o null. */
export function textIssue(q: { type?: string; question: string; options?: string[]; correctIndex?: number }): TextIssue | null {
  if (isAmbiguousQuestion(q.question)) return "ambiguous";
  if (q.type !== "activity" && q.options && typeof q.correctIndex === "number") {
    if (hasDuplicateOptions(q.options)) return "duplicateOptions";
    if (answerInQuestion(q.question, q.options, q.correctIndex)) return "answerInQuestion";
  }
  return null;
}

// Revisiones de redacción de una pregunta generada. Son reglas simples y sin costo: si una falla, la pregunta se descarta
// y el generador pide una de reemplazo.

const plain = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ]+/g, " ").trim();

export type TextIssue = "ambiguous" | "comparison" | "duplicateOptions" | "answerInQuestion";

export const TEXT_ISSUE_LABEL: Record<TextIssue, string> = {
  ambiguous: "ambiguas",
  comparison: "con una comparación que no calza con los datos",
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

/** Artículos y preposiciones que no cambian el sentido ("debajo de una silla" = "debajo de la silla"). */
const FILLER = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a"]);
const core = (s: string) => plain(s).split(" ").filter((w) => w && !FILLER.has(w)).join(" ");

const POSITION_WORDS = new Set([
  "arriba", "abajo", "encima", "debajo", "dentro", "adentro", "fuera", "afuera", "entre", "izquierda", "derecha",
  "delante", "adelante", "detras", "atras", "cerca", "lejos", "sobre", "bajo", "junto", "lado",
]);

const sameNoun = (a: string, b: string) => a.slice(0, 4) === b.slice(0, 4);

/**
 * "¿Cuántos gatos menos que perros hay?" con 8 gatos y 5 perros: la comparación contradice los datos.
 * Solo se revisa cuando ambos sustantivos aparecen con su cantidad ("8 gatos", "5 perros").
 */
export function comparisonMismatch(question: string): boolean {
  const t = plain(question);
  const m =
    t.match(/\bcuant[oa]s (\w+) (mas|menos) que (\w+)/) ??
    t.match(/\bcuant[oa]s (mas|menos) (\w+) (?:\w+ )?que (\w+)/)?.slice(0, 4).map((x, i, a) => (i === 1 ? a[2] : i === 2 ? a[1] : x));
  if (!m) return false;
  const [, a, cmp, b] = m;
  if (sameNoun(a, b)) return false;
  const counts: { n: number; noun: string }[] = [];
  for (const x of t.matchAll(/\b(\d+) (\w+)/g)) counts.push({ n: Number(x[1]), noun: x[2] });
  const countOf = (w: string) => {
    const hits = counts.filter((c) => sameNoun(c.noun, w));
    return hits.length === 1 ? hits[0].n : null;
  };
  const ca = countOf(a), cb = countOf(b);
  if (ca === null || cb === null) return false;
  return cmp === "mas" ? ca <= cb : ca >= cb;
}

/**
 * La alternativa correcta aparece escrita en el enunciado y ninguna otra aparece
 * (por ejemplo "¿Qué palabra indica que algo está entre dos cosas?" con respuesta "Entre").
 * Solo cuenta si la respuesta es una palabra de posición ("debajo", "entre") o una frase de varias palabras copiada
 * ("debajo de la silla"). Un sustantivo suelto que aparece en el enunciado ("la puerta") suele ser una pregunta de
 * razonamiento válida ("A la derecha de una puerta hay una ventana. ¿Qué hay a la izquierda de la ventana?").
 * No aplica a respuestas numéricas, muy cortas, ni a enunciados con citas (preguntas sobre una frase dada).
 */
export function answerInQuestion(question: string, options: string[], correctIndex: number): boolean {
  if (/["'«»“”‘’]/.test(question)) return false;
  const q = ` ${core(question)} `;
  const appears = (o: string) => {
    const p = core(o);
    if (p.length < 4 || /^\d/.test(p)) return false;
    if (!p.includes(" ") && !POSITION_WORDS.has(p)) return false;
    return q.includes(` ${p} `);
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
  if (comparisonMismatch(q.question)) return "comparison";
  if (q.type !== "activity" && q.options && typeof q.correctIndex === "number") {
    if (hasDuplicateOptions(q.options)) return "duplicateOptions";
    if (answerInQuestion(q.question, q.options, q.correctIndex)) return "answerInQuestion";
  }
  return null;
}

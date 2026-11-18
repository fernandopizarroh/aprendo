// Nivel inicial: hasta 3° básico (y educación parvularia). El curso se escribe como texto libre, por eso se interpreta.
const WORD_NUMBER: Record<string, number> = {
  primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3, cuarto: 4, quinto: 5, sexto: 6, septimo: 7, octavo: 8,
};

export function isEarlyGrade(gradeLevel: string): boolean {
  const g = gradeLevel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/(kinder|transicion|parvul|sala cuna|medio menor|medio mayor|nivel medio)/.test(g)) return true;
  if (/\bmedi[oa]\b/.test(g)) return false; // enseñanza media
  if (!g.includes("basic")) return false;

  const digits = g.match(/\d+/);
  if (digits) return Number(digits[0]) <= 3;
  for (const [word, n] of Object.entries(WORD_NUMBER)) if (new RegExp(`\\b${word}\\b`).test(g)) return n <= 3;
  return false;
}

/** Cuántas actividades de cuaderno debe llevar una evaluación de `n` preguntas (nivel inicial). */
export function activityTarget(n: number): number {
  return n >= 5 ? Math.max(1, Math.round(n * 0.2)) : 0;
}
export const activityMax = (n: number) => Math.max(activityTarget(n), Math.ceil(n * 0.3));

/**
 * Cuántas preguntas se le piden a la IA para obtener al menos `n` válidas. Los modelos fallan seguido en el conteo exacto
 * (llegan 14 de 15), así que se pide un margen y se descartan solo las preguntas malas, no el lote entero.
 */
export const askCount = (n: number) => n + Math.max(2, Math.ceil(n * 0.2));

export type GradeLevelKind = "inicial" | "general" | "desconocido";

/** Cómo entiende el sistema el curso escrito por el apoderado (define si hay dibujos y actividades de cuaderno). */
export function gradeKind(gradeLevel: string): GradeLevelKind {
  if (isEarlyGrade(gradeLevel)) return "inicial";
  const g = gradeLevel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasNumber = /\d/.test(g) || Object.keys(WORD_NUMBER).some((w) => new RegExp(`\\b${w}\\b`).test(g));
  const recognized = hasNumber && (g.includes("basic") || /\bmedi[oa]\b/.test(g));
  return recognized ? "general" : "desconocido";
}

export interface GradeNotice {
  kind: GradeLevelKind;
  tone: "success" | "info" | "warning";
  title: string;
  text: string;
}

/** Aviso para el apoderado: qué entendió el sistema del curso y qué cambia en las evaluaciones. */
export function gradeNotice(gradeLevel: string): GradeNotice {
  const kind = gradeKind(gradeLevel);
  const name = `«${gradeLevel.trim()}»`;
  if (kind === "inicial") {
    return {
      kind, tone: "info", title: `Curso ${name}: nivel inicial`,
      text: "Hasta 3° básico las evaluaciones llevan dibujos y actividades de cuaderno que un adulto debe validar. Revisa que el curso esté bien: de él depende el tipo de evaluación.",
    };
  }
  if (kind === "general") {
    return {
      kind, tone: "info", title: `Curso ${name}: 4° básico o superior`,
      text: "Las evaluaciones serán de alternativas, sin dibujos ni actividades de cuaderno. Revisa que el curso esté bien: de él depende el tipo de evaluación.",
    };
  }
  return {
    kind, tone: "warning", title: `No reconocemos el curso ${name}`,
    text: "Escríbelo como «2° básico» o «1° medio» para que las evaluaciones se ajusten a su edad. Mientras tanto se tratará como 4° básico o superior.",
  };
}
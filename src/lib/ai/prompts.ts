import { activityMax, activityTarget, askCount } from "../grade";
import type { GenerateInput, Stage } from "./types";

// Temperatura baja para reducir alucinaciones (PRD riesgo 3).
export const GENERATION_TEMPERATURE = 0.2;

type PromptInput = Pick<GenerateInput, "stage" | "gradeLevel" | "diagnosticCount" | "challengeCount" | "earlyGrade">;

const CHOICE_SHAPE = `{ "question": string, "options": [string, string, string, string], "correctIndex": 0-3, "explanation": string`;
const ACTIVITY_SHAPE = `{ "type": "activity", "question": string, "expected": string, "explanation": string`;

const EARLY_STYLE =
  "El alumno es de nivel inicial (hasta 3° básico): usa frases cortas y palabras simples, tono cálido y cercano.";

function questionRules(i: PromptInput, count: number, withHint: boolean): string[] {
  const hint = withHint ? `, "hint": string` : "";
  if (!i.earlyGrade) {
    return [
      "Todas las preguntas son de alternativas (no incluyas actividades de cuaderno).",
      `Forma de cada pregunta: ${CHOICE_SHAPE}${hint} }`,
    ];
  }
  const min = activityTarget(count);
  const max = activityMax(count);
  return [
    EARLY_STYLE,
    `Agrega a las preguntas el campo "visual": un dibujo hecho solo con emojis que ayude a entender (por ejemplo "🍎🍎🍎 + 🍎🍎"), de máximo 12 emojis. Al menos el 40% de las preguntas debe tenerlo.`,
    `Incluye entre ${min} y ${max} ACTIVIDADES DE CUADERNO mezcladas entre las preguntas: tareas que el alumno hace en su cuaderno (copiar, dibujar, contar, resolver, escribir) y que un adulto revisa. El resto son preguntas de alternativas.`,
    `Forma de una pregunta de alternativas: ${CHOICE_SHAPE}, "visual": string opcional${hint} }`,
    `Forma de una actividad de cuaderno: ${ACTIVITY_SHAPE}, "visual": string opcional${hint} } (en "expected" describe cómo se ve una respuesta correcta, para el adulto que la revisa).`,
  ];
}

function stageInstructions(i: PromptInput): string[] {
  switch (i.stage) {
    case "review":
      return [
        "Genera los módulos de REPASO: uno por cada tema principal del temario, con un resumen claro y flashcards con ejemplos cotidianos.",
        ...(i.earlyGrade
          ? [EARLY_STYLE, `En las flashcards agrega "visual" (dibujo con emojis) cuando ayude a entender.`]
          : []),
        'Responde SOLO con JSON de esta forma: { "review": [ { "title": string, "summary": string, "flashcards": [ { "front": string, "back": string, "example": string, "visual": string opcional } ] } ] }',
      ];
    case "diagnostic":
      return [
        `Genera EXACTAMENTE ${askCount(i.diagnosticCount)} preguntas de DIAGNÓSTICO, todas distintas entre sí. Cuéntalas antes de responder: el arreglo "diagnostic" debe tener ${askCount(i.diagnosticCount)} elementos.`,
        "Cada pregunta lleva una pista que oriente sin revelar la respuesta.",
        ...questionRules(i, askCount(i.diagnosticCount), true),
        `Responde SOLO con JSON: { "diagnostic": [ ...preguntas ] }`,
      ];
    case "challenge":
      return [
        `Genera EXACTAMENTE ${askCount(i.challengeCount)} preguntas de DESAFÍO formal, todas distintas entre sí, sin pistas, que simulen la prueba real. Cuéntalas antes de responder: el arreglo "challenge" debe tener ${askCount(i.challengeCount)} elementos.`,
        ...questionRules(i, askCount(i.challengeCount), false),
        `Responde SOLO con JSON: { "challenge": [ ...preguntas ] }`,
      ];
  }
}

export function buildSystemPrompt(i: PromptInput): string {
  return [
    `Eres un tutor para un alumno de nivel "${i.gradeLevel}". Responde siempre en español.`,
    "Usa el TEMARIO DEL PROFESOR como ancla principal para interpretar letra manuscrita ilegible en las fotos.",
    "Basa el contenido en el temario y en los apuntes; no inventes materia que no aparezca en ellos.",
    "Cada pregunta de alternativas tiene 4 alternativas, un índice correcto (0 a 3) y una explicación. Distribuye la alternativa correcta de forma variada.",
    "En matemáticas y ciencias, resuelve el ejercicio paso a paso internamente antes de fijar la alternativa correcta.",
    ...stageInstructions(i),
    "No incluyas texto fuera del JSON ni bloques de código.",
  ].join("\n");
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

export function buildUserPrompt(i: Pick<GenerateInput, "syllabusText" | "images" | "feedback" | "avoid">): string {
  const photos = i.images.length
    ? `Se adjuntan ${i.images.length} foto(s) de apuntes o ejercicios que el alumno ya trabajó en clases. Úsalas como contexto: imita el tipo, la dificultad y el estilo de esos ejercicios, sin copiarlos.`
    : "No se adjuntaron fotos; usa solo el temario.";
  const avoid = i.avoid?.length
    ? `\n\nYA EXISTEN estas preguntas. No las repitas ni las parafrasees; crea preguntas distintas (otros datos, otros números, otros contextos):\n${i.avoid
        .slice(-60)
        .map((q) => `- ${clip(q, 120)}`)
        .join("\n")}`
    : "";
  const fix = i.feedback
    ? `\n\nTu respuesta anterior fue rechazada por este motivo: ${i.feedback}\nCorrígelo y entrega exactamente lo pedido.`
    : "";
  return `TEMARIO DEL PROFESOR:\n${i.syllabusText}\n\n${photos}${avoid}${fix}`;
}

export type { Stage };

import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { readImages } from "@/lib/storage";
import { isEarlyGrade } from "@/lib/grade";
import { getProvider } from "./index";
import { generateStage, questionText } from "./generate-core";
import { readStored, saveContent } from "./content-store";
import { describeError } from "./describe-error";
import { logAi } from "./log";
import { AiProviderError, type AiProviderId } from "./types";

type RefillStage = "diagnostic" | "challenge";

// Estado en memoria (un solo proceso). Se guarda en globalThis para sobrevivir a la recarga en desarrollo.
const g = globalThis as unknown as { __refill?: { running: Set<string>; errors: Map<string, { message: string; at: number }> } };
const state = (g.__refill ??= { running: new Set(), errors: new Map() });
const keyOf = (routeId: string, stage: RefillStage) => `${routeId}:${stage}`;

/** Tras un fallo (llave inválida, sin cuota...) no se reintenta de inmediato: evita gastar llamadas en bucle. */
export const REFILL_RETRY_AFTER_MS = 60_000;
/** El alumno espera: si en este tiempo no se logra, se informa en vez de dejarlo esperando sin fin. */
export const REFILL_DEADLINE_MS = 150_000;

/** Estado de la preparación de preguntas nuevas de una etapa, para mostrárselo al apoderado. */
export function refillStatus(routeId: string, stage: RefillStage): { running: boolean; error?: string; at?: number } {
  const k = keyOf(routeId, stage);
  const failed = state.errors.get(k);
  return { running: state.running.has(k), ...(failed ? { error: failed.message, at: failed.at } : {}) };
}

export type RefillState = { state: "running" } | { state: "failed"; error: string };

/**
 * Pide ampliar el banco de preguntas de una etapa con un lote nuevo (en segundo plano), usando la llave del apoderado.
 * Se usa cuando al alumno ya no le quedan preguntas nuevas para el siguiente intento.
 */
export function requestRefill(routeId: string, stage: RefillStage, now = Date.now()): RefillState {
  const k = keyOf(routeId, stage);
  if (state.running.has(k)) return { state: "running" };
  const failed = state.errors.get(k);
  if (failed && now - failed.at < REFILL_RETRY_AFTER_MS) return { state: "failed", error: failed.message };

  state.errors.delete(k);
  state.running.add(k);
  const started = Date.now();
  logAi(`${stage}: ampliando el banco de la ruta ${routeId.slice(-6)}…`);
  doRefill(routeId, stage)
    .then(() => logAi(`${stage}: banco ampliado en ${Math.round((Date.now() - started) / 1000)} s`))
    .catch((e) => {
      const message = describeError(e);
      logAi(`${stage}: NO se pudo ampliar el banco tras ${Math.round((Date.now() - started) / 1000)} s -> ${message}`);
      state.errors.set(k, { message, at: Date.now() });
    })
    .finally(() => state.running.delete(k));
  return { state: "running" };
}
async function doRefill(routeId: string, stage: RefillStage): Promise<void> {
  const route = await db.learningRoute.findUnique({
    where: { id: routeId },
    include: { content: true, subject: { include: { student: { include: { parent: true } } } } },
  });
  if (!route?.content) return;
  const { student } = route.subject;
  const parent = student.parent;
  if (!parent.aiProvider || !parent.encryptedApiKey) {
    throw new AiProviderError("Falta conectar la inteligencia artificial.");
  }
  const { content, versions } = readStored(route.content);
  const provider = getProvider(parent.aiProvider as AiProviderId);

  const batch = await generateStage(provider, {
    apiKey: decryptSecret(parent.encryptedApiKey),
    stage,
    syllabusText: route.syllabusText,
    gradeLevel: student.gradeLevel,
    images: await readImages(route.sourceImagesUrls as string[]),
    diagnosticCount: route.configDiagQuestionsCount,
    challengeCount: route.configChallengeQuestionsCount,
    earlyGrade: isEarlyGrade(student.gradeLevel),
    avoid: content[stage].map(questionText),
  }, 3, { deadlineMs: REFILL_DEADLINE_MS });

  // Vuelve a leer: el banco pudo cambiar mientras la IA respondía.
  const fresh = await db.routeContent.findUnique({ where: { routeId } });
  const latest = readStored(fresh);
  if (latest.versions[stage] !== versions[stage]) return; // se regeneró el banco: este lote ya no aplica
  await saveContent(routeId, { ...latest.content, [stage]: [...latest.content[stage], ...batch] }, latest.versions);
}

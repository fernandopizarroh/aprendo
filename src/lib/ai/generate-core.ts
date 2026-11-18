import { ZodError } from "zod";
import { STAGES, STAGE_LABEL, checkBatch, screenQuestions, validateStage, type Question, type StoredContent } from "./schema";
import { logAi } from "./log";
import { AiProviderError, AiTransientError, ContentFormatError, type AiProvider, type GenerateInput, type Stage } from "./types";

export type StageRequest = Stage | Stage[] | "all" | undefined;

/** Lotes de preguntas que se generan al crear la ruta para Diagnóstico y Desafío (para que los intentos sean distintos). */
export const INITIAL_BATCHES = 2;

export const questionText = (q: unknown): string => (q as { question?: string } | null)?.question ?? "";

function describe(e: unknown): string {
  if (e instanceof ZodError) {
    return e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "respuesta"}: ${i.message}`).join("; ");
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * Genera una etapa.
 * - Diagnóstico y Desafío: las preguntas buenas se acumulan entre intentos. Si la IA manda 13 de 15, el intento siguiente pide
 *   solo las que faltan en vez de empezar de cero. Si el lote final no cumple lo pedido (actividades, dibujos), se descarta y se
 *   reintenta informando a la IA del motivo.
 * - Fallas pasajeras (sin respuesta a tiempo, red, 5xx) se reintentan solas sin gastar intentos.
 * - Errores del proveedor (llave, cuota) no se reintentan.
 */
export async function generateStage(
  provider: AiProvider,
  input: GenerateInput,
  maxAttempts = 4,
  opts: { deadlineMs?: number; transientRetries?: number; pauseMs?: number } = {},
): Promise<unknown[]> {
  const { deadlineMs = 300_000, transientRetries = 2, pauseMs = 2_000 } = opts;
  const startedAll = Date.now();
  const stage = input.stage;
  const isQuiz = stage !== "review";
  const expected = stage === "diagnostic" ? input.diagnosticCount : input.challengeCount;
  const validateOpts = { earlyGrade: input.earlyGrade };

  let transientLeft = transientRetries;
  let feedback = input.feedback;
  let lastDetail = "";
  let pool: Question[] = []; // preguntas buenas acumuladas

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (Date.now() - startedAll > deadlineMs) {
      throw new AiProviderError("La IA está tardando demasiado en responder. Intenta de nuevo en unos minutos.", lastDetail.slice(0, 300) || undefined);
    }
    const started = Date.now();
    const need = isQuiz ? Math.max(1, expected - pool.length) : 0;
    const request: GenerateInput = isQuiz
      ? {
          ...input,
          feedback,
          avoid: [...(input.avoid ?? []), ...pool.map(questionText)],
          ...(stage === "diagnostic" ? { diagnosticCount: need } : { challengeCount: need }),
        }
      : { ...input, feedback };
    const secs = () => Math.round((Date.now() - started) / 1000);

    try {
      const raw = await provider.generateContent(request);
      logAi(`${stage}: la IA respondió en ${secs()} s (intento ${attempt}/${maxAttempts}${pool.length ? `, ya había ${pool.length} buenas` : ""})`);
      if (!isQuiz) return validateStage(stage, raw, { diagnostic: input.diagnosticCount, challenge: input.challengeCount }) as unknown[];

      const screened = screenQuestions(stage, raw, { ...validateOpts, avoid: request.avoid });
      pool = [...pool, ...screened.kept];
      if (screened.reasons.length || screened.drawingsRemoved) {
        logAi(`${stage}: revisión de calidad -> ${[...screened.reasons, ...(screened.drawingsRemoved ? [`${screened.drawingsRemoved} dibujos quitados por no calzar con el enunciado`] : [])].join(", ")}`);
      }
      if (pool.length >= expected) {
        try {
          return checkBatch(stage, pool, expected, validateOpts);
        } catch (e) {
          pool = []; // el lote no cumple lo pedido (actividades, dibujos): se pide de nuevo completo
          throw e;
        }
      }
      // Faltan preguntas: no se descarta lo bueno; el siguiente intento pide solo las que faltan.
      feedback = undefined;
      lastDetail = `${STAGE_LABEL[stage]}: se esperaban al menos ${expected} preguntas válidas, llegaron ${pool.length} de ${screened.total}${screened.reasons.length ? ` (descartadas: ${screened.reasons.join(", ")})` : ""}`;
      logAi(`${stage}: ${lastDetail}. Se piden las ${expected - pool.length} que faltan.`);
    } catch (e) {
      if (e instanceof AiTransientError && transientLeft > 0) {
        transientLeft--;
        logAi(`${stage}: falla pasajera tras ${secs()} s -> ${e.message} ${e.providerDetail ?? ""}. Reintentando…`);
        await new Promise((r) => setTimeout(r, pauseMs));
        attempt--;
        continue;
      }
      if (e instanceof AiProviderError && !(e instanceof ContentFormatError)) {
        logAi(`${stage}: error del proveedor tras ${secs()} s -> ${e.message} ${e.providerDetail ?? ""}`);
        throw e;
      }
      lastDetail = describe(e);
      feedback = lastDetail;
      logAi(`${stage}: contenido rechazado (intento ${attempt}/${maxAttempts}, ${secs()} s) -> ${lastDetail.slice(0, 300)}`);
    }
  }
  throw new AiProviderError(
    `La IA no devolvió un contenido válido para ${STAGE_LABEL[stage]} después de ${maxAttempts} intentos. Intenta de nuevo.`,
    lastDetail.slice(0, 300),
  );
}
/** Genera `batches` lotes seguidos de una etapa de preguntas, cada uno sin repetir lo anterior. */
export async function generateBank(provider: AiProvider, input: GenerateInput, batches: number): Promise<unknown[]> {
  const bank: unknown[] = [];
  for (let b = 0; b < batches; b++) {
    const avoid = [...(input.avoid ?? []), ...bank.map(questionText)];
    bank.push(...(await generateStage(provider, { ...input, avoid })));
  }
  return bank;
}

/**
 * Qué etapas generar:
 * - "all": todas.
 * - una etapa: solo esa.
 * - sin indicar (Reintentar): solo las que faltan; si no falta ninguna, todas.
 */
export function stagesToRun(existing: StoredContent | null, request: StageRequest): Stage[] {
  if (request === "all") return [...STAGES];
  if (Array.isArray(request)) return STAGES.filter((s) => request.includes(s));
  if (request) return [request];
  if (!existing) return [...STAGES];
  const missing = STAGES.filter((s) => existing[s].length === 0);
  return missing.length > 0 ? missing : [...STAGES];
}

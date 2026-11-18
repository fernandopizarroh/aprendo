import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { readImages } from "@/lib/storage";
import { isEarlyGrade } from "@/lib/grade";
import { getProvider } from "./index";
import { INITIAL_BATCHES, generateBank, generateStage, stagesToRun, type StageRequest } from "./generate-core";
import { isComplete } from "./schema";
import { readStored, saveContent } from "./content-store";
import { describeError } from "./describe-error";
import { AiProviderError, type AiProviderId } from "./types";

/**
 * Genera las etapas pedidas y guarda cada una al terminar. Nunca lanza: ante un error deja el motivo en la ruta.
 * Diagnóstico y Desafío se generan como un banco de INITIAL_BATCHES lotes para que cada intento del alumno sea distinto.
 * Reintentar solo genera lo que falta.
 */
export async function runGeneration(routeId: string, request?: StageRequest): Promise<void> {
  const route = await db.learningRoute.findUnique({
    where: { id: routeId },
    include: { content: true, subject: { include: { student: { include: { parent: true } } } } },
  });
  if (!route) return;

  const { content: current, versions } = readStored(route.content);
  const hadCompleteContent = isComplete(current);

  try {
    const { student } = route.subject;
    const parent = student.parent;
    if (!parent.aiProvider || !parent.encryptedApiKey) {
      throw new AiProviderError("Falta conectar la inteligencia artificial. Ve a «Conectar IA» y pega tu llave.");
    }
    const apiKey = decryptSecret(parent.encryptedApiKey); // solo en memoria
    const images = await readImages(route.sourceImagesUrls as string[]);
    const provider = getProvider(parent.aiProvider as AiProviderId);

    const work = { ...current };
    const nextVersions = { ...versions };
    for (const stage of stagesToRun(route.content ? current : null, request)) {
      await db.learningRoute.update({ where: { id: routeId }, data: { generationStep: stage } });
      const input = {
        apiKey,
        stage,
        syllabusText: route.syllabusText,
        gradeLevel: student.gradeLevel,
        images,
        diagnosticCount: route.configDiagQuestionsCount,
        challengeCount: route.configChallengeQuestionsCount,
        earlyGrade: isEarlyGrade(student.gradeLevel),
      };
      work[stage] = stage === "review" ? await generateStage(provider, input) : await generateBank(provider, input, INITIAL_BATCHES);
      // Reemplazar un banco con preguntas nuevas: los intentos anteriores quedan como historial de la versión previa.
      if (stage !== "review" && current[stage].length > 0) nextVersions[stage] = versions[stage] + 1;

      await saveContent(routeId, work, nextVersions); // cada etapa queda guardada apenas termina
      // Los intentos a medias del alumno apuntan a preguntas que ya no existen.
      await db.studentAttempt.deleteMany({ where: { routeId, stage, completed: false } });
      // Repaso nuevo: las tarjetas vistas ya no corresponden, así que el alumno debe repasar otra vez.
      // Los puntajes de Diagnóstico y Desafío se conservan como historial.
      if (stage === "review" && current.review.length > 0) await db.studentAttempt.deleteMany({ where: { routeId, stage: "review" } });
    }
    await db.learningRoute.update({
      where: { id: routeId },
      data: { status: "ready", errorMessage: null, generationStep: null },
    });
  } catch (e) {
    // Si ya había contenido completo (regeneración fallida), la ruta sigue usable.
    await db.learningRoute.update({
      where: { id: routeId },
      data: { status: hadCompleteContent ? "ready" : "error", errorMessage: describeError(e), generationStep: null },
    });
  }
}


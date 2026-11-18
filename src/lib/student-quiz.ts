import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { loadStudentRoute, thresholdsOf, type LoadedRoute } from "./student-access";
import {
  attemptDetailSchema,
  buildBreakdown,
  buildOrder,
  drawIndices,
  flaggedIndices,
  gradeAnswer,
  gradeVerdict,
  isActivity,
  summarize,
  toClientQuestions,
  type AttemptDetail,
  type PoolQuestion,
} from "./quiz";
import { isRateLimited, recordHit } from "./rate-limit";
import { requestRefill } from "./ai/refill";
import type { RouteSummary } from "./student-progress";

type Thresholds = { unlock: number; challenge: number };

export type QuizStage = "diagnostic" | "challenge";
export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

/** Tiempo que el adulto tiene para validar una actividad después de ingresar su contraseña. */
export const ADULT_WINDOW_MS = 5 * 60_000;

const err = (status: number, error: string, extra: Record<string, unknown> = {}): ApiResult => ({ status, body: { error, ...extra } });

export function lockMessage(stage: QuizStage, s: RouteSummary, th: Thresholds): string {
  if (stage === "diagnostic") {
    return s.needsRepeat ? "Repasa de nuevo para volver a practicar el Diagnóstico." : "Completa el Repaso para abrir el Diagnóstico.";
  }
  if (s.challengeLock === "review") {
    return s.needsRepeat
      ? `No alcanzaste el ${th.challenge}% en tus 2 intentos. Repasa de nuevo y aprueba un Diagnóstico para abrir un Desafío nuevo.`
      : "Completa el Repaso para abrir el Desafío.";
  }
  return s.needsRepeat
    ? `Para abrir un Desafío nuevo, saca al menos ${th.unlock}% en un Diagnóstico.`
    : "Aprueba el Diagnóstico para abrir el Desafío.";
}

function parseDetail(raw: unknown): AttemptDetail | null {
  const r = attemptDetailSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/** El orden guardado debe corresponder al banco actual (no a contenido ya reemplazado). */
const orderMatchesPool = (d: AttemptDetail, pool: PoolQuestion[]) =>
  d.order.length > 0 &&
  d.order.every((o) => {
    const p = pool[o.q];
    return p && (isActivity(p) ? o.opts.length === 0 : o.opts.length === p.options.length);
  });

/**
 * Preguntas del banco que no se pueden sortear: las ya usadas en intentos de esta versión del banco
 * y las de redacción defectuosa (bancos generados antes de los filtros de calidad).
 */
function usedIndexes(attempts: { answersDetailJson: unknown }[], version: number, pool: readonly PoolQuestion[]): Set<number> {
  const used = new Set<number>(flaggedIndices(pool));
  for (const a of attempts) {
    const d = parseDetail(a.answersDetailJson);
    if (d && d.version === version) d.order.forEach((o) => used.add(o.q));
  }
  return used;
}

const poolOf = (loaded: LoadedRoute, stage: QuizStage) => loaded.content[stage] as PoolQuestion[];
const configCount = (loaded: LoadedRoute, stage: QuizStage) =>
  stage === "diagnostic" ? loaded.route.configDiagQuestionsCount : loaded.route.configChallengeQuestionsCount;

const save = (id: string, detail: AttemptDetail) =>
  db.studentAttempt.update({ where: { id }, data: { answersDetailJson: detail as Prisma.InputJsonValue } });

/** Retroalimentación de lo ya respondido (Diagnóstico), para poder retomar un intento. */
function answeredFeedback(pool: PoolQuestion[], detail: AttemptDetail) {
  const out: Record<string, unknown> = {};
  for (const [pos, val] of Object.entries(detail.answers)) {
    const p = Number(pos);
    const q = pool[detail.order[p]?.q];
    if (!q) continue;
    if (isActivity(q)) {
      const g = gradeVerdict(pool, detail.order, p, val);
      if (g) out[pos] = { verdict: g.verdict, correct: g.correct, helped: g.helped, explanation: g.explanation, expected: g.expected };
    } else {
      const g = gradeAnswer(pool, detail.order, p, val);
      if (g) out[pos] = { key: val, ...g };
    }
  }
  return out;
}

/** Inicia (o retoma) un intento de Diagnóstico o Desafío. Valida el desbloqueo y la novedad de las preguntas en el servidor. */
export async function startQuiz(routeId: string, studentId: string, stage: QuizStage): Promise<ApiResult> {
  const loaded = await loadStudentRoute(routeId, studentId);
  if (!loaded) return err(404, "Ruta no disponible");
  const { summary, route, versions } = loaded;

  if (stage === "challenge" && summary.challengeDone) {
    return err(403, "¡Ya aprobaste el Desafío! Si quieres rendir otro, pídele a tu apoderado que lo habilite.", { code: "done" });
  }
  if (stage === "challenge" && summary.extraExhausted) {
    return err(403, "Ya usaste los intentos del Desafío adicional. ¡Tu aprobación anterior sigue vigente! Si quieres otro, pídele a tu apoderado que lo habilite.", { code: "extra_used" });
  }
  if (!summary.unlocked.includes(stage)) {
    return err(403, lockMessage(stage, summary, thresholdsOf(route)), { code: "locked" });
  }

  const pool = poolOf(loaded, stage);
  const version = versions[stage];
  const count = Math.min(configCount(loaded, stage), pool.length);
  const stageAttempts = route.attempts.filter((a) => a.stage === stage);

  let attemptId = "";
  let detail: AttemptDetail | null = null;

  const open = [...stageAttempts].reverse().find((a) => !a.completed);
  if (open) {
    const d = parseDetail(open.answersDetailJson);
    if (d && d.version === version && orderMatchesPool(d, pool)) {
      attemptId = open.id;
      detail = d;
    } else {
      await db.studentAttempt.delete({ where: { id: open.id } }); // intento de un contenido anterior
    }
  }

  if (!detail) {
    const used = usedIndexes(stageAttempts, version, pool);
    const picked = drawIndices(pool, used, count);
    if (!picked) {
      // No quedan preguntas nuevas: se amplía el banco y el alumno espera. Las evaluaciones nunca se repiten.
      const r = requestRefill(routeId, stage);
      if (r.state === "failed") {
        return err(503, "No pudimos preparar preguntas nuevas en este momento. Avísale a tu apoderado: puede ver el motivo en la ruta. Inténtalo de nuevo en un minuto.", { code: "unavailable" });
      }
      return err(409, "Estamos preparando preguntas nuevas para ti. Espera un momento…", { code: "preparing" });
    }
    detail = { order: buildOrder(pool, picked), answers: {}, version, grant: null };
    const created = await db.studentAttempt.create({
      data: { studentId, routeId, stage, completed: false, answersDetailJson: detail as Prisma.InputJsonValue },
      select: { id: true },
    });
    attemptId = created.id;
  }

  return {
    status: 200,
    body: {
      attemptId,
      stage,
      total: detail.order.length,
      threshold: stage === "diagnostic" ? route.configUnlockThreshold : route.configChallengeThreshold,
      attemptsLeft: stage === "challenge" ? summary.challengeAttemptsLeft : undefined,
      questions: toClientQuestions(pool, detail.order, stage === "diagnostic"),
      answered: stage === "diagnostic" ? answeredFeedback(pool, detail) : {},
      // Desafío: posiciones de actividades que el adulto ya validó (sin revelar el veredicto)
      marked: stage === "challenge" ? Object.keys(detail.answers).filter((p) => isActivity(pool[detail!.order[Number(p)].q])).map(Number) : [],
    },
  };
}

/**
 * Tras un intento sin aprobar se deja listo el banco para el siguiente (la IA tarda ~45 s). Solo se genera si hace falta:
 * si el alumno aprueba, no se gasta una llamada de más.
 */
export async function prepareNextAttempt(routeId: string, studentId: string, stage: QuizStage): Promise<void> {
  const loaded = await loadStudentRoute(routeId, studentId);
  if (!loaded) return;
  const used = usedIndexes(loaded.route.attempts.filter((a) => a.stage === stage), loaded.versions[stage], poolOf(loaded, stage));
  if (poolOf(loaded, stage).length - used.size < configCount(loaded, stage)) requestRefill(routeId, stage);
}

async function loadAttempt(attemptId: string, studentId: string) {
  const attempt = await db.studentAttempt.findFirst({ where: { id: attemptId, studentId } });
  if (!attempt) return null;
  const loaded = await loadStudentRoute(attempt.routeId, studentId);
  return loaded ? { attempt, loaded } : null;
}

async function completeAttempt(attemptId: string, detail: AttemptDetail, pool: PoolQuestion[]) {
  const breakdown = buildBreakdown(pool, detail.order, detail.answers);
  const s = summarize(breakdown);
  const full: AttemptDetail = { ...detail, grant: null, breakdown, correct: s.correct, total: s.total, helped: s.helped };
  await db.studentAttempt.update({
    where: { id: attemptId },
    data: { completed: true, completedAt: new Date(), scorePercentage: s.percentage, answersDetailJson: full as Prisma.InputJsonValue },
  });
  return { breakdown, ...s, detail: full };
}

type Done = { percentage: number; correct: number; total: number; helped: number };

async function resultFor(routeId: string, studentId: string, stage: QuizStage, s: Done, breakdown: unknown, outcome?: unknown) {
  const fresh = await loadStudentRoute(routeId, studentId);
  // Cada evaluación se aprueba con su propio porcentaje.
  const threshold = (stage === "diagnostic" ? fresh?.route.configUnlockThreshold : fresh?.route.configChallengeThreshold) ?? 90;
  return {
    stage,
    percentage: s.percentage,
    correct: s.correct,
    total: s.total,
    helped: s.helped,
    threshold,
    passed: s.percentage >= threshold,
    challengeUnlocked: fresh?.summary.unlocked.includes("challenge") ?? false,
    outcome,
    breakdown,
  };
}

/** Cierra el intento de Diagnóstico si ya se respondió todo; si no, solo guarda. */
async function saveOrFinish(attemptId: string, studentId: string, routeId: string, detail: AttemptDetail, pool: PoolQuestion[], extra: Record<string, unknown>): Promise<ApiResult> {
  if (Object.keys(detail.answers).length < detail.order.length) {
    await save(attemptId, detail);
    return { status: 200, body: { ...extra, finished: false } };
  }
  const done = await completeAttempt(attemptId, detail, pool);
  const result = await resultFor(routeId, studentId, "diagnostic", done, done.breakdown);
  if (!result.passed) void prepareNextAttempt(routeId, studentId, "diagnostic");
  return { status: 200, body: { ...extra, finished: true, result } };
}

/** Diagnóstico: registra una respuesta de alternativas y devuelve retroalimentación inmediata. */
export async function answerDiagnostic(attemptId: string, studentId: string, position: number, key: number): Promise<ApiResult> {
  const found = await loadAttempt(attemptId, studentId);
  if (!found) return err(404, "Intento no encontrado");
  const { attempt, loaded } = found;
  if (attempt.stage !== "diagnostic") return err(400, "Este intento no es un Diagnóstico");
  if (attempt.completed) return err(409, "Este intento ya terminó");

  const detail = parseDetail(attempt.answersDetailJson);
  const pool = poolOf(loaded, "diagnostic");
  if (!detail || !orderMatchesPool(detail, pool)) return err(409, "El contenido cambió. Inicia el Diagnóstico de nuevo.");
  const item = detail.order[position];
  if (item && isActivity(pool[item.q])) return err(400, "Esta es una actividad de cuaderno: la valida un adulto.");

  const previous = detail.answers[String(position)];
  if (previous !== undefined) {
    // Una respuesta no se puede cambiar: devuelve la retroalimentación de la que ya se dio.
    const g = gradeAnswer(pool, detail.order, position, previous);
    return { status: 200, body: { ...g, key: previous, alreadyAnswered: true, finished: false } };
  }
  const grade = gradeAnswer(pool, detail.order, position, key);
  if (!grade) return err(400, "Respuesta inválida");

  detail.answers[String(position)] = key;
  return saveOrFinish(attemptId, studentId, attempt.routeId, detail, pool, { ...grade, key });
}

/**
 * Actividad de cuaderno, paso 1: el adulto ingresa la contraseña de apoderado y ve la respuesta esperada.
 * Así el alumno no puede validarse solo. Se habilita UNA actividad por unos minutos.
 */
export async function adultUnlock(attemptId: string, studentId: string, position: number, password: string): Promise<ApiResult> {
  const found = await loadAttempt(attemptId, studentId);
  if (!found) return err(404, "Intento no encontrado");
  const { attempt, loaded } = found;
  if (attempt.completed) return err(409, "Este intento ya terminó");

  const detail = parseDetail(attempt.answersDetailJson);
  const pool = poolOf(loaded, attempt.stage as QuizStage);
  if (!detail || !orderMatchesPool(detail, pool)) return err(409, "El contenido cambió. Inicia la evaluación de nuevo.");
  const q = pool[detail.order[position]?.q];
  if (!q || !isActivity(q)) return err(400, "Esta pregunta no es una actividad de cuaderno");
  if (attempt.stage === "diagnostic" && detail.answers[String(position)] !== undefined) return err(409, "Esta actividad ya fue validada");

  // Solo cuentan las contraseñas incorrectas: un adulto que valida varias actividades seguidas no se bloquea.
  const limitKey = `adult:${studentId}`;
  if (isRateLimited(limitKey, 5, 60_000)) return err(429, "Demasiados intentos. Espera un minuto.");
  const owner = await db.student.findUnique({ where: { id: studentId }, select: { parent: { select: { passwordHash: true } } } });
  if (!owner || !(await bcrypt.compare(password, owner.parent.passwordHash))) {
    recordHit(limitKey);
    return err(401, "Contraseña incorrecta. Debe ingresarla el apoderado.");
  }

  detail.grant = { position, until: new Date(Date.now() + ADULT_WINDOW_MS).toISOString() };
  await save(attemptId, detail);
  return { status: 200, body: { expected: q.expected, question: q.question } };
}

/** Actividad de cuaderno, paso 2: el adulto marca Correcto (0), Correcto con ayuda (1) o Error (2). Error cuenta como incorrecta. */
export async function markActivity(attemptId: string, studentId: string, position: number, verdict: number): Promise<ApiResult> {
  const found = await loadAttempt(attemptId, studentId);
  if (!found) return err(404, "Intento no encontrado");
  const { attempt, loaded } = found;
  if (attempt.completed) return err(409, "Este intento ya terminó");
  const stage = attempt.stage as QuizStage;

  const detail = parseDetail(attempt.answersDetailJson);
  const pool = poolOf(loaded, stage);
  if (!detail || !orderMatchesPool(detail, pool)) return err(409, "El contenido cambió. Inicia la evaluación de nuevo.");

  const grant = detail.grant;
  if (!grant || grant.position !== position || new Date(grant.until).getTime() < Date.now()) {
    return err(403, "El adulto debe ingresar su contraseña para validar esta actividad.", { code: "adult_required" });
  }
  const grade = gradeVerdict(pool, detail.order, position, verdict);
  if (!grade) return err(400, "Validación inválida");
  if (stage === "diagnostic" && detail.answers[String(position)] !== undefined) return err(409, "Esta actividad ya fue validada");

  detail.answers[String(position)] = verdict;
  detail.grant = null; // una sola validación por autorización

  if (stage === "challenge") {
    await save(attemptId, detail);
    return { status: 200, body: { saved: true, position } }; // sin retroalimentación hasta entregar
  }
  return saveOrFinish(attemptId, studentId, attempt.routeId, detail, pool, {
    verdict: grade.verdict, correct: grade.correct, helped: grade.helped, explanation: grade.explanation, expected: grade.expected,
  });
}

/** Desafío: corrige todo al entregar. Las actividades usan lo que validó el adulto; el resto, lo que respondió el alumno. */
export async function submitChallenge(attemptId: string, studentId: string, answers: Record<string, number>): Promise<ApiResult> {
  const found = await loadAttempt(attemptId, studentId);
  if (!found) return err(404, "Intento no encontrado");
  const { attempt, loaded } = found;
  if (attempt.stage !== "challenge") return err(400, "Este intento no es un Desafío");
  if (attempt.completed) return err(409, "Este intento ya fue entregado");

  const detail = parseDetail(attempt.answersDetailJson);
  const pool = poolOf(loaded, "challenge");
  if (!detail || !orderMatchesPool(detail, pool)) return err(409, "El contenido cambió. Inicia el Desafío de nuevo.");

  const merged: Record<string, number> = {};
  detail.order.forEach((o, i) => {
    const pos = String(i);
    const source = isActivity(pool[o.q]) ? detail.answers : answers; // el alumno no puede enviar veredictos
    if (source[pos] !== undefined) merged[pos] = source[pos];
  });

  const before = loaded.summary;
  const done = await completeAttempt(attemptId, { ...detail, answers: merged }, pool);

  const after = await loadStudentRoute(attempt.routeId, studentId);
  const passed = done.percentage >= loaded.route.configChallengeThreshold;
  const roundReset = Boolean(after && after.summary.round > before.round);
  const outcome = {
    passed,
    extra: before.extraPending, // Desafío adicional habilitado por el apoderado: fallarlo no reinicia nada
    roundReset,
    attemptsLeft: passed || roundReset ? 0 : after?.summary.challengeAttemptsLeft ?? 0,
    threshold: loaded.route.configChallengeThreshold,
  };
  await db.studentAttempt.update({
    where: { id: attemptId },
    data: { answersDetailJson: { ...done.detail, outcome } as Prisma.InputJsonValue },
  });
  // Se prepara el siguiente solo si el alumno aún puede usarlo (en un adicional agotado, lo habilita el apoderado después).
  if (!passed && (roundReset || (after?.summary.challengeAttemptsLeft ?? 0) > 0)) {
    void prepareNextAttempt(attempt.routeId, studentId, "challenge");
    if (roundReset) void prepareNextAttempt(attempt.routeId, studentId, "diagnostic"); // deberá volver a practicar
  }
  return { status: 200, body: { result: await resultFor(attempt.routeId, studentId, "challenge", done, done.breakdown, outcome) } };
}

/** Resultado guardado de un intento terminado. */
export async function getResult(attemptId: string, studentId: string): Promise<ApiResult> {
  const found = await loadAttempt(attemptId, studentId);
  if (!found) return err(404, "Intento no encontrado");
  const { attempt } = found;
  const detail = parseDetail(attempt.answersDetailJson);
  if (!attempt.completed || !detail?.breakdown) return err(409, "Este intento aún no termina");
  const stage = attempt.stage as QuizStage;
  const s = {
    percentage: attempt.scorePercentage ?? 0,
    correct: detail.correct ?? 0,
    total: detail.total ?? detail.breakdown.length,
    helped: detail.helped ?? 0,
  };
  return { status: 200, body: { result: await resultFor(attempt.routeId, studentId, stage, s, detail.breakdown, detail.outcome) } };
}

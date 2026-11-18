import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findOwnedRoute } from "@/lib/ownership";
import { updateRouteSettingsSchema } from "@/lib/validation";
import { refillStatus } from "@/lib/ai/refill";
import { loadStudentRoute } from "@/lib/student-access";

const settingsOf = (r: { configUnlockThreshold: number; configChallengeThreshold: number }) => ({
  unlockThreshold: r.configUnlockThreshold,
  challengeThreshold: r.configChallengeThreshold,
});

// Estado de la ruta (para polling desde la UI)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const route = await findOwnedRoute(params.id, session.sub);
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
  // Estado del Desafío del alumno (para habilitar otro Desafío desde la pantalla de la ruta)
  const owner = await db.learningRoute.findUnique({
    where: { id: route.id },
    select: { subject: { select: { studentId: true, student: { select: { displayName: true } } } } },
  });
  const loaded = route.status === "ready" && owner ? await loadStudentRoute(route.id, owner.subject.studentId) : null;
  const s = loaded?.summary;

  return NextResponse.json({
    id: route.id,
    title: route.title,
    challenge: s
      ? {
          studentName: owner!.subject.student.displayName,
          approved: s.challengeDone,
          passedEver: s.passedEver,
          passes: s.challengePasses,
          extraPending: s.extraPending,
          extraExhausted: s.extraExhausted,
          canGrantExtra: s.canGrantExtra,
          attemptsLeft: s.challengeAttemptsLeft,
        }
      : null,
    syllabusText: route.syllabusText,
    photoPaths: route.sourceImagesUrls as string[],
    status: route.status,
    errorMessage: route.errorMessage,
    step: route.generationStep,
    updatedAt: route.updatedAt,
    // Preparación de preguntas nuevas para los intentos del alumno (en curso o con error reciente)
    refill: Object.fromEntries(
      (["diagnostic", "challenge"] as const)
        .map((stage) => [stage, refillStatus(route.id, stage)] as const)
        .filter(([, st]) => st.running || (st.error && Date.now() - (st.at ?? 0) < 30 * 60_000)),
    ),
    photos: (route.sourceImagesUrls as string[]).length,
    diagQuestions: route.configDiagQuestionsCount,
    challengeQuestions: route.configChallengeQuestionsCount,
    ...settingsOf(route),
  });
}

// El apoderado ajusta los porcentajes de aprobación. El avance de los alumnos se recalcula con las reglas nuevas.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const route = await findOwnedRoute(params.id, session.sub);
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });

  const parsed = updateRouteSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const updated = await db.learningRoute.update({
    where: { id: route.id },
    data: {
      ...(parsed.data.unlockThreshold !== undefined && { configUnlockThreshold: parsed.data.unlockThreshold }),
      ...(parsed.data.challengeThreshold !== undefined && { configChallengeThreshold: parsed.data.challengeThreshold }),
    },
    select: { configUnlockThreshold: true, configChallengeThreshold: true },
  });
  return NextResponse.json(settingsOf(updated));
}

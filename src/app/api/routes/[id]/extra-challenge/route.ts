import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { loadStudentRoute } from "@/lib/student-access";
import { CHALLENGE_ATTEMPTS_PER_ROUND, CHALLENGE_GRANT_STAGE } from "@/lib/student-progress";
import { prepareNextAttempt } from "@/lib/student-quiz";

/**
 * El apoderado habilita otro Desafío para el alumno (2 intentos, preguntas nuevas).
 * Solo cuando el alumno ya aprobó el vigente, o agotó los intentos de un Desafío adicional.
 * Los resultados anteriores se conservan y un adicional fallado no obliga a repasar.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const route = await db.learningRoute.findFirst({
    where: { id: params.id, subject: { student: { parentId: session.sub } } },
    select: { id: true, subject: { select: { studentId: true, student: { select: { displayName: true } } } } },
  });
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });

  const studentId = route.subject.studentId;
  const loaded = await loadStudentRoute(route.id, studentId);
  if (!loaded) return NextResponse.json({ error: "La ruta todavía no está lista para el alumno" }, { status: 409 });

  const s = loaded.summary;
  if (s.extraPending) {
    return NextResponse.json({ error: "Ya hay un Desafío adicional habilitado: el alumno aún no lo usa por completo." }, { status: 409 });
  }
  if (!s.canGrantExtra) {
    return NextResponse.json(
      { error: s.passedEver ? "El alumno ya tiene un Desafío disponible." : "El alumno todavía no aprueba el Desafío: puede rendirlo cuando termine el Repaso y el Diagnóstico." },
      { status: 409 },
    );
  }

  await db.studentAttempt.create({
    data: { studentId, routeId: route.id, stage: CHALLENGE_GRANT_STAGE, completed: true, completedAt: new Date(), answersDetailJson: { grantedBy: session.sub } },
  });
  void prepareNextAttempt(route.id, studentId, "challenge"); // si faltan preguntas nuevas, se preparan ahora para que el alumno no espere

  return NextResponse.json({ ok: true, studentName: route.subject.student.displayName, attempts: CHALLENGE_ATTEMPTS_PER_ROUND });
}

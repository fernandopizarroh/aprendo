import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { summarizeAttempts } from "@/lib/student-progress";

// HU-07: asignaturas y rutas del alumno con su progreso
export async function GET() {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const student = await db.student.findUnique({ where: { id: session.sub }, select: { displayName: true } });
  const subjects = await db.subject.findMany({
    where: { studentId: session.sub },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      colorTag: true,
      routes: {
        where: { status: "ready", content: { isNot: null } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          configUnlockThreshold: true,
          configChallengeThreshold: true,
          attempts: {
            where: { studentId: session.sub },
            select: { stage: true, completed: true, scorePercentage: true, createdAt: true, completedAt: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    displayName: student?.displayName ?? "",
    subjects: subjects
      .filter((s) => s.routes.length > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        colorTag: s.colorTag,
        routes: s.routes.map((r) => {
          const sum = summarizeAttempts(r.attempts, { unlock: r.configUnlockThreshold, challenge: r.configChallengeThreshold });
          return { id: r.id, title: r.title, progressPercent: sum.progressPercent, unlocked: sum.unlocked, bestDiagnostic: sum.bestDiagnostic, challengeDone: sum.passedEver, extraPending: sum.extraPending, needsRepeat: sum.needsRepeat };
        }),
      })),
  });
}

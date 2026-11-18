import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { summarizeRoute } from "@/lib/dashboard";

// HU-11: panel de seguimiento. Solo datos de alumnos del apoderado autenticado.
export async function GET() {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const students = await db.student.findMany({
    where: { parentId: session.sub },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
      gradeLevel: true,
      subjects: {
        orderBy: { name: "asc" },
        select: {
          name: true,
          colorTag: true,
          routes: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              title: true,
              status: true,
              errorMessage: true,
              configUnlockThreshold: true,
              configChallengeThreshold: true,
              attempts: {
                select: { studentId: true, stage: true, completed: true, scorePercentage: true, createdAt: true, completedAt: true, answersDetailJson: true },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    students: students.map((st) => ({
      id: st.id,
      displayName: st.displayName,
      gradeLevel: st.gradeLevel,
      routes: st.subjects.flatMap((su) =>
        su.routes.map((r) => ({
          id: r.id,
          title: r.title,
          subject: { name: su.name, colorTag: su.colorTag },
          generation: r.status, // generating | ready | error
          errorMessage: r.status === "error" ? r.errorMessage : null,
          threshold: r.configUnlockThreshold,
          challengeThreshold: r.configChallengeThreshold,
          progress:
            r.status === "ready"
              ? summarizeRoute(r.attempts.filter((a) => a.studentId === st.id), { unlock: r.configUnlockThreshold, challenge: r.configChallengeThreshold })
              : null,
        })),
      ),
    })),
  });
}

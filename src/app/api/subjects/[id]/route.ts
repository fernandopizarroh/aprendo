import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { gradeKind } from "@/lib/grade";

// Asignatura con su alumno y el nivel que el sistema entiende de su curso (para avisar al crear una ruta).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const subject = await db.subject.findFirst({
    where: { id: params.id, student: { parentId: session.sub } },
    select: { id: true, name: true, student: { select: { id: true, displayName: true, gradeLevel: true } } },
  });
  if (!subject) return NextResponse.json({ error: "Asignatura no encontrada" }, { status: 404 });
  return NextResponse.json({
    subject: { id: subject.id, name: subject.name },
    student: { ...subject.student, levelKind: gradeKind(subject.student.gradeLevel) },
  });
}

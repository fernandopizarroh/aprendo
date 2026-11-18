import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findOwnedStudent } from "@/lib/ownership";
import { updateStudentSchema } from "@/lib/validation";
import { gradeKind } from "@/lib/grade";

// El apoderado corrige el curso del alumno. Define el tipo de evaluación (dibujos y actividades de cuaderno hasta 3° básico).
// El contenido ya generado no cambia: para aplicarlo hay que regenerar la ruta.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await findOwnedStudent(params.id, session.sub))) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }
  const parsed = updateStudentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const student = await db.student.update({
    where: { id: params.id },
    data: { gradeLevel: parsed.data.gradeLevel },
    select: { id: true, username: true, displayName: true, gradeLevel: true },
  });
  return NextResponse.json({ student: { ...student, levelKind: gradeKind(student.gradeLevel) } });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findOwnedStudent } from "@/lib/ownership";
import { createSubjectSchema } from "@/lib/validation";

// HU-04: asignaturas de un alumno del apoderado autenticado
export async function GET(req: Request) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const studentId = new URL(req.url).searchParams.get("studentId");
  if (!studentId || !(await findOwnedStudent(studentId, session.sub))) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }
  const subjects = await db.subject.findMany({
    where: { studentId },
    select: {
      id: true,
      name: true,
      colorTag: true,
      icon: true,
      routes: { select: { id: true, title: true, status: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ subjects });
}

export async function POST(req: Request) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = createSubjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  if (!(await findOwnedStudent(parsed.data.studentId, session.sub))) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }
  const subject = await db.subject.create({
    data: parsed.data,
    select: { id: true, name: true, colorTag: true, icon: true },
  });
  return NextResponse.json({ subject }, { status: 201 });
}

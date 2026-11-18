import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createStudentSchema } from "@/lib/validation";
import { gradeKind } from "@/lib/grade";

// HU-02: perfiles de alumno del apoderado autenticado
export async function GET() {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const students = await db.student.findMany({
    where: { parentId: session.sub },
    select: { id: true, username: true, displayName: true, gradeLevel: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({ students: students.map((s) => ({ ...s, levelKind: gradeKind(s.gradeLevel) })) });
}

export async function POST(req: Request) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createStudentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { password, ...rest } = parsed.data;
  try {
    const student = await db.student.create({
      data: { ...rest, parentId: session.sub, passwordHash: await bcrypt.hash(password, 10) },
      select: { id: true, username: true, displayName: true, gradeLevel: true },
    });
    return NextResponse.json({ student: { ...student, levelKind: gradeKind(student.gradeLevel) } }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese nombre de usuario ya existe" }, { status: 409 });
    }
    throw e;
  }
}

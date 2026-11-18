import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

// HU-01: registro de apoderado
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  try {
    const parent = await db.parent.create({
      data: { email, passwordHash: await bcrypt.hash(password, 10) },
      select: { id: true },
    });
    await createSession({ sub: parent.id, role: "parent" });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }
    throw e;
  }
}

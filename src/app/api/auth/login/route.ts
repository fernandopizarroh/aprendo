import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

// HU-01 / HU-02: ingreso de apoderado (email) o alumno (usuario)
export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { role, password } = parsed.data;
  const identifier = parsed.data.identifier.toLowerCase();

  if (!rateLimit(`login:${role}:${identifier}`)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  const user =
    role === "parent"
      ? await db.parent.findUnique({ where: { email: identifier }, select: { id: true, passwordHash: true } })
      : await db.student.findUnique({ where: { username: identifier }, select: { id: true, passwordHash: true } });

  // Mismo mensaje si no existe o la clave falla, para no revelar cuentas.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });

  await createSession({ sub: user.id, role });
  return NextResponse.json({ ok: true, redirect: role === "parent" ? "/parent/dashboard" : "/student" });
}

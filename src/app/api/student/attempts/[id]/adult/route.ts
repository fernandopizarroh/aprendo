import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { adultUnlock } from "@/lib/student-quiz";

const bodySchema = z.object({ position: z.number().int().min(0), password: z.string().min(1).max(128) });

// Actividad de cuaderno, paso 1: el adulto ingresa la contraseña de apoderado y ve la respuesta esperada
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ingresa la contraseña del apoderado" }, { status: 400 });
  const r = await adultUnlock(params.id, session.sub, parsed.data.position, parsed.data.password);
  return NextResponse.json(r.body, { status: r.status });
}

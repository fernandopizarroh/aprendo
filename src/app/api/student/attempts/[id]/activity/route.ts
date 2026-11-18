import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { markActivity } from "@/lib/student-quiz";

// verdict: 0 = Correcto, 1 = Correcto con ayuda, 2 = Error (cuenta como incorrecta)
const bodySchema = z.object({ position: z.number().int().min(0), verdict: z.number().int().min(0).max(2) });

// Actividad de cuaderno, paso 2: el adulto valida la actividad
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validación inválida" }, { status: 400 });
  const r = await markActivity(params.id, session.sub, parsed.data.position, parsed.data.verdict);
  return NextResponse.json(r.body, { status: r.status });
}

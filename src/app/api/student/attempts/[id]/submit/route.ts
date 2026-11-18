import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { submitChallenge } from "@/lib/student-quiz";

// answers: { "<posición>": <clave de la alternativa elegida> }. Lo no respondido cuenta como incorrecto.
const bodySchema = z.object({ answers: z.record(z.string().regex(/^\d+$/), z.number().int().min(0).max(3)) });

// HU-10: entrega del Desafío; recién aquí se revelan resultados y explicaciones
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Respuestas inválidas" }, { status: 400 });
  const r = await submitChallenge(params.id, session.sub, parsed.data.answers);
  return NextResponse.json(r.body, { status: r.status });
}

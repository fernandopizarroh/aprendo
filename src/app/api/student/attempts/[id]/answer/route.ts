import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { answerDiagnostic } from "@/lib/student-quiz";

const bodySchema = z.object({ position: z.number().int().min(0), key: z.number().int().min(0).max(3) });

// HU-09: responde una pregunta del Diagnóstico y recibe retroalimentación inmediata
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Respuesta inválida" }, { status: 400 });
  const r = await answerDiagnostic(params.id, session.sub, parsed.data.position, parsed.data.key);
  return NextResponse.json(r.body, { status: r.status });
}

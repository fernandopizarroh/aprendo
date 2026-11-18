import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { startQuiz } from "@/lib/student-quiz";

// HU-09: inicia o retoma un intento de Diagnóstico (el servidor valida el desbloqueo)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await startQuiz(params.id, session.sub, "diagnostic");
  return NextResponse.json(r.body, { status: r.status });
}

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getResult } from "@/lib/student-quiz";

// Resultado guardado de un intento terminado
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await getResult(params.id, session.sub);
  return NextResponse.json(r.body, { status: r.status });
}

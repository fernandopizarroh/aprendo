import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { findOwnedRoute } from "@/lib/ownership";
import { generateRouteSchema } from "@/lib/validation";
import { claimAndRun } from "@/lib/ai/start-generation";

// HU-06: reintentar o regenerar la ruta completa o una etapa. Reutiliza el contexto guardado (temario y fotos).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const route = await findOwnedRoute(params.id, session.sub);
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });

  const parsed = generateRouteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });

  if (!(await claimAndRun(route.id, parsed.data.stage))) {
    return NextResponse.json({ error: "La ruta ya se está generando" }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}

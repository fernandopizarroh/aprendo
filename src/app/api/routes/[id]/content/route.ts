import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findOwnedRoute } from "@/lib/ownership";

// Vista previa de solo lectura para el apoderado: incluye respuestas correctas (el alumno nunca usa este endpoint).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const route = await findOwnedRoute(params.id, session.sub);
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
  const content = await db.routeContent.findUnique({ where: { routeId: route.id } });
  if (!content) return NextResponse.json({ error: "La ruta aún no tiene contenido" }, { status: 404 });
  return NextResponse.json({
    review: content.reviewModulesJson,
    diagnostic: content.diagnosticPoolJson,
    challenge: content.challengePoolJson,
  });
}

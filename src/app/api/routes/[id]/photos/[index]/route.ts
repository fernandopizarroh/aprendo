import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { findOwnedRoute } from "@/lib/ownership";
import { readImageFile } from "@/lib/storage";

// Foto de apoyo de una ruta, solo para su apoderado (son fotos del cuaderno del alumno).
export async function GET(_req: Request, { params }: { params: { id: string; index: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const route = await findOwnedRoute(params.id, session.sub);
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });

  const rel = (route.sourceImagesUrls as string[])[Number(params.index)];
  const file = rel ? await readImageFile(rel) : null;
  if (!file) return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  return new Response(new Uint8Array(file.buffer), { headers: { "Content-Type": file.mime, "Cache-Control": "private, max-age=300" } });
}

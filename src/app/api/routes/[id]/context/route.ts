import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findOwnedRoute } from "@/lib/ownership";
import { updateRouteContextSchema } from "@/lib/validation";
import { MAX_IMAGES, MAX_IMAGE_BYTES, appendImages, deleteImages, sniffMime } from "@/lib/storage";
import { runGeneration } from "@/lib/ai/generate-route";

type Mime = "image/jpeg" | "image/png" | "image/webp";

/**
 * Edita el contexto de una ruta ya creada: título, temario y fotos (agregar y quitar).
 * Si se piden etapas en `regenerate`, se regeneran con el contexto nuevo (reemplazan el banco de esas etapas).
 * Si no, el contexto queda guardado y se usará la próxima vez que se regenere o se amplíe el banco de preguntas.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const route = await findOwnedRoute(params.id, session.sub);
  if (!route) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
  if (route.status === "generating") {
    return NextResponse.json({ error: "La ruta se está generando. Espera a que termine para cambiar su contexto." }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const text = (k: string) => (form.has(k) ? String(form.get(k)) : undefined);
  const parsed = updateRouteContextSchema.safeParse({
    title: text("title"),
    syllabusText: text("syllabusText"),
    remove: form.getAll("remove").map(String),
    regenerate: form.getAll("regenerate").map(String),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { title, syllabusText, remove, regenerate } = parsed.data;

  const current = route.sourceImagesUrls as string[];
  const unknown = remove.filter((p) => !current.includes(p));
  if (unknown.length > 0) return NextResponse.json({ error: "Una de las fotos a quitar no pertenece a esta ruta" }, { status: 400 });

  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const kept = current.filter((p) => !remove.includes(p));
  if (kept.length + files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Una ruta admite hasta ${MAX_IMAGES} fotos en total (hoy tiene ${kept.length} tras quitar)` }, { status: 400 });
  }
  const images: { buffer: Buffer; mime: Mime }[] = [];
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Una de las fotos es demasiado pesada (máx. 4 MB)" }, { status: 400 });
    const buffer = Buffer.from(await f.arrayBuffer());
    const mime = sniffMime(buffer);
    if (!mime) return NextResponse.json({ error: "Solo se aceptan fotos JPG, PNG o WebP" }, { status: 400 });
    images.push({ buffer, mime });
  }

  const changesText = (title !== undefined && title !== route.title) || (syllabusText !== undefined && syllabusText !== route.syllabusText);
  if (!changesText && remove.length === 0 && images.length === 0 && regenerate.length === 0) {
    return NextResponse.json({ error: "No hay cambios que guardar" }, { status: 400 });
  }

  // Si se regenera, se toma el turno de generación antes de tocar nada (evita dos generaciones simultáneas).
  const previous = { status: route.status, errorMessage: route.errorMessage };
  if (regenerate.length > 0) {
    const free = await db.learningRoute.updateMany({
      where: { id: route.id, status: { not: "generating" } },
      data: { status: "generating", errorMessage: null, generationStep: null },
    });
    if (free.count === 0) return NextResponse.json({ error: "La ruta ya se está generando" }, { status: 409 });
  }

  try {
    const added = images.length ? await appendImages(route.id, images) : [];
    await db.learningRoute.update({
      where: { id: route.id },
      data: {
        ...(title !== undefined && { title }),
        ...(syllabusText !== undefined && { syllabusText }),
        sourceImagesUrls: [...kept, ...added],
      },
    });
    await deleteImages(route.id, remove);
  } catch {
    if (regenerate.length > 0) await db.learningRoute.update({ where: { id: route.id }, data: previous });
    return NextResponse.json({ error: "No se pudo guardar el contexto. Intenta de nuevo." }, { status: 500 });
  }

  if (regenerate.length > 0) void runGeneration(route.id, regenerate); // el turno ya se tomó arriba
  return NextResponse.json({ ok: true, regenerating: regenerate }, { status: regenerate.length > 0 ? 202 : 200 });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { findOwnedSubject } from "@/lib/ownership";
import { createRouteSchema } from "@/lib/validation";
import { MAX_IMAGES, MAX_IMAGE_BYTES, saveImages, sniffMime } from "@/lib/storage";
import { runGeneration } from "@/lib/ai/generate-route";

// HU-05 / HU-06: crea la ruta con fotos y lanza la generación en segundo plano
export async function POST(req: Request) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const parsed = createRouteSchema.safeParse({
    subjectId: form.get("subjectId"),
    title: form.get("title"),
    syllabusText: form.get("syllabusText"),
    diagQuestions: form.get("diagQuestions") ?? undefined,
    challengeQuestions: form.get("challengeQuestions") ?? undefined,
    unlockThreshold: form.get("unlockThreshold") ?? undefined,
    challengeThreshold: form.get("challengeThreshold") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const p = parsed.data;

  if (!(await findOwnedSubject(p.subjectId, session.sub))) {
    return NextResponse.json({ error: "Asignatura no encontrada" }, { status: 404 });
  }

  const parent = await db.parent.findUnique({ where: { id: session.sub }, select: { encryptedApiKey: true } });
  if (!parent?.encryptedApiKey) {
    return NextResponse.json(
      { error: "Primero conecta la inteligencia artificial.", code: "ai_not_configured" },
      { status: 400 },
    );
  }

  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Máximo ${MAX_IMAGES} fotos por ruta` }, { status: 400 });
  }
  const images: { buffer: Buffer; mime: "image/jpeg" | "image/png" | "image/webp" }[] = [];
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Una de las fotos es demasiado pesada (máx. 4 MB)" }, { status: 400 });
    }
    const buffer = Buffer.from(await f.arrayBuffer());
    const mime = sniffMime(buffer);
    if (!mime) return NextResponse.json({ error: "Solo se aceptan fotos JPG, PNG o WebP" }, { status: 400 });
    images.push({ buffer, mime });
  }

  const route = await db.learningRoute.create({
    data: {
      subjectId: p.subjectId,
      title: p.title,
      syllabusText: p.syllabusText,
      configDiagQuestionsCount: p.diagQuestions,
      configChallengeQuestionsCount: p.challengeQuestions,
      configUnlockThreshold: p.unlockThreshold,
      configChallengeThreshold: p.challengeThreshold,
      status: "generating",
    },
    select: { id: true },
  });
  const paths = await saveImages(route.id, images);
  await db.learningRoute.update({ where: { id: route.id }, data: { sourceImagesUrls: paths } });

  void runGeneration(route.id); // segundo plano: el cliente consulta el estado por polling
  return NextResponse.json({ id: route.id }, { status: 201 });
}

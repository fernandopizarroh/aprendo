import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { currentReviewAttempt, loadStudentRoute } from "@/lib/student-access";
import { cardKeys, markViewed, parseViewed } from "@/lib/review";

// HU-08: contenido del repaso y registro de cada tarjeta vista
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const loaded = await loadStudentRoute(params.id, session.sub);
  if (!loaded) return NextResponse.json({ error: "Ruta no disponible" }, { status: 404 });

  const keys = cardKeys(loaded.content.review as { flashcards?: unknown[] }[]);
  const attempt = currentReviewAttempt(loaded.route.attempts, loaded.summary);
  const viewed = parseViewed(attempt?.answersDetailJson).filter((k) => keys.includes(k));
  return NextResponse.json({
    modules: loaded.content.review,
    viewed,
    total: keys.length,
    completed: loaded.summary.reviewCompleted,
    repeating: loaded.summary.needsRepeat, // ronda nueva: debe repasar otra vez
  });
}

const bodySchema = z.object({ card: z.string() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("student");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const loaded = await loadStudentRoute(params.id, session.sub);
  if (!loaded) return NextResponse.json({ error: "Ruta no disponible" }, { status: 404 });

  const keys = cardKeys(loaded.content.review as { flashcards?: unknown[] }[]);
  const attempt = currentReviewAttempt(loaded.route.attempts, loaded.summary);
  const next = markViewed(parseViewed(attempt?.answersDetailJson), parsed.data.card, keys);
  if (!next) return NextResponse.json({ error: "Tarjeta inválida" }, { status: 400 });

  const wasCompleted = Boolean(attempt?.completed);
  const completed = next.completed || wasCompleted; // un repaso completado no se pierde
  const data = {
    completed,
    ...(completed && !wasCompleted ? { completedAt: new Date() } : {}),
    answersDetailJson: { viewed: next.viewed } as Prisma.InputJsonValue,
  };
  if (attempt) await db.studentAttempt.update({ where: { id: attempt.id }, data });
  else await db.studentAttempt.create({ data: { studentId: session.sub, routeId: params.id, stage: "review", ...data } });

  return NextResponse.json({
    viewed: next.viewed.length,
    total: next.total,
    completed,
    justCompleted: completed && !wasCompleted,
  });
}

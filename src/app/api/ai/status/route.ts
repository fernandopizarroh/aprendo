import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export async function GET() {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = await db.parent.findUnique({
    where: { id: session.sub },
    select: { aiProvider: true, apiKeyLast4: true, encryptedApiKey: true },
  });
  return NextResponse.json({
    configured: Boolean(p?.encryptedApiKey),
    provider: p?.aiProvider ?? null,
    last4: p?.apiKeyLast4 ?? null,
  });
}

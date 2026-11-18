import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { encryptSecret, last4 } from "@/lib/crypto";
import { getProvider } from "@/lib/ai";
import { PROVIDER_IDS } from "@/lib/ai/providers-info";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  apiKey: z.string().trim().min(8).max(512),
});

// HU-03: valida la llave con el proveedor y, si es válida, la guarda cifrada.
// Nunca devuelve la llave.
export async function POST(req: Request) {
  const session = await requireRole("parent");
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Pega la llave completa y elige un proveedor." }, { status: 400 });
  }
  if (!rateLimit(`ai-test:${session.sub}`, 10, 60_000)) {
    return NextResponse.json({ ok: false, message: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  const { provider, apiKey } = parsed.data;
  const result = await getProvider(provider).testConnection(apiKey);
  if (!result.ok) return NextResponse.json(result);

  await db.parent.update({
    where: { id: session.sub },
    data: { aiProvider: provider, encryptedApiKey: encryptSecret(apiKey), apiKeyLast4: last4(apiKey) },
  });
  return NextResponse.json({ ...result, last4: last4(apiKey) });
}

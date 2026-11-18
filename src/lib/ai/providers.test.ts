import { describe, expect, it, vi } from "vitest";
import { getProvider } from "./index";
import { openAiTuning } from "./providers/openai";

const json = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("testConnection", () => {
  it("éxito", async () => {
    const r = await getProvider("gemini", json(200, { models: [] })).testConnection("k");
    expect(r).toEqual({ ok: true, message: "Llave válida y lista" });
  });

  it("llave inválida conserva el detalle del proveedor", async () => {
    const r = await getProvider("openai", json(401, { error: { message: "Incorrect API key" } })).testConnection("k");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/mal copiada/);
    expect(r.providerDetail).toBe("Incorrect API key");
  });

  it("cuota excedida (429)", async () => {
    const r = await getProvider("anthropic", json(429, { error: { message: "rate limited" } })).testConnection("k");
    expect(r.message).toMatch(/cuota o saldo/);
    expect(r.providerDetail).toBe("rate limited");
  });

  it("error de red", async () => {
    const f = vi.fn().mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch;
    const r = await getProvider("gemini", f).testConnection("k");
    expect(r.ok).toBe(false);
    expect(r.providerDetail).toBe("ECONNRESET");
  });

  it("usa el header de autenticación de cada proveedor", async () => {
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await getProvider("anthropic", f as unknown as typeof fetch).testConnection("KEY");
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "x-api-key": "KEY" });
    await getProvider("openai", f as unknown as typeof fetch).testConnection("KEY");
    expect((f.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer KEY" });
  });
});

describe("generateContent por etapa", () => {
  const input = {
    apiKey: "KEY", stage: "diagnostic" as const, syllabusText: "Fracciones", gradeLevel: "5° básico",
    images: [{ mimeType: "image/jpeg", base64: "AAAA" }], diagnosticCount: 10, challengeCount: 15,
  };
  const payload = JSON.stringify({ diagnostic: [] });
  const responses = {
    openai: { choices: [{ message: { content: payload } }] },
    gemini: { candidates: [{ content: { parts: [{ text: payload }] } }] },
    anthropic: { content: [{ type: "text", text: payload }] },
  } as const;

  for (const id of ["openai", "gemini", "anthropic"] as const) {
    it(`${id}: pide la etapa con la cantidad exacta, adjunta la imagen y lee la respuesta`, async () => {
      const f = vi.fn().mockResolvedValue(new Response(JSON.stringify(responses[id]), { status: 200 }));
      const out = await getProvider(id, f as unknown as typeof fetch).generateContent({ ...input, feedback: "llegaron 5" });
      expect(out).toEqual({ diagnostic: [] });
      const body = String((f.mock.calls[0][1] as RequestInit).body);
      expect(body).toContain("EXACTAMENTE 12"); // 10 pedidas + margen
      expect(body).toContain("llegaron 5");
      expect(body).toContain("AAAA");
      if (id !== "openai") expect(body).toContain("0.2"); // OpenAI: la temperatura depende del modelo (ver openAiTuning)
    });
  }

  it("limita el largo de la respuesta: una salida descontrolada no deja al alumno esperando minutos", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify(responses.openai), { status: 200 }));
    await getProvider("openai", f as unknown as typeof fetch).generateContent(input);
    expect(openAiTuning("gpt-4o-mini")).toEqual({ temperature: 0.2, max_completion_tokens: 8000 });
    expect(openAiTuning("gpt-6-luna")).toEqual({ max_completion_tokens: 16000 });
    expect(openAiTuning("o3-mini").temperature).toBeUndefined();
    const body = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body));
    expect(body.max_completion_tokens).toBeGreaterThan(0);
    if (!process.env.OPENAI_MODEL) {
      expect(body.model).toBe("gpt-6-luna");
      expect(body.temperature).toBeUndefined(); // gpt-6-luna solo acepta la temperatura por defecto
    }
    const g = vi.fn().mockResolvedValue(new Response(JSON.stringify(responses.gemini), { status: 200 }));
    await getProvider("gemini", g as unknown as typeof fetch).generateContent(input);
    expect(String((g.mock.calls[0][1] as RequestInit).body)).toContain("maxOutputTokens");
  });

  it("un error 5xx del proveedor es pasajero (se reintenta); una llave inválida no", async () => {
    const e500 = json(503, { error: { message: "overloaded" } });
    await expect(getProvider("openai", e500).generateContent(input)).rejects.toMatchObject({ name: "AiTransientError" });
    const e401 = json(401, { error: { message: "bad key" } });
    await expect(getProvider("openai", e401).generateContent(input)).rejects.toMatchObject({ name: "AiProviderError" });
  });

  it("si la IA no responde a tiempo es una falla pasajera", async () => {
    const f = vi.fn().mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError")) as unknown as typeof fetch;
    await expect(getProvider("openai", f).generateContent(input)).rejects.toMatchObject({ name: "AiTransientError" });
  });

  it("error del proveedor se convierte en AiProviderError con detalle", async () => {
    const f = json(429, { error: { message: "quota" } });
    await expect(getProvider("openai", f).generateContent(input)).rejects.toMatchObject({ providerDetail: "quota" });
  });
});

describe("mensajes de error según el motivo real", () => {
  const test = (id: "openai" | "gemini" | "anthropic", status: number, message: string) =>
    getProvider(id, json(status, { error: { message } })).testConnection("k");

  it("Gemini responde 400 cuando la llave es inválida: se explica como llave", async () => {
    const r = await test("gemini", 400, "API key not valid. Please pass a valid API key.");
    expect(r.message).toMatch(/llave no es válida/);
  });
  it("401 y 403 son llave inválida", async () => {
    expect((await test("openai", 401, "Incorrect API key provided")).message).toMatch(/llave no es válida/);
    expect((await test("anthropic", 403, "forbidden")).message).toMatch(/llave no es válida/);
  });
  it("un 400 por una foto inválida NO se le atribuye a la llave", async () => {
    const r = await test("openai", 400, "You uploaded an unsupported image. Please make sure your image is valid.");
    expect(r.message).toMatch(/no pudo leer una de las fotos/);
    expect(r.message).not.toMatch(/llave/);
    expect(r.providerDetail).toMatch(/unsupported image/);
  });
  it("otro 400 se informa como solicitud rechazada, con el detalle del proveedor", async () => {
    const r = await test("openai", 400, "max_completion_tokens is too large");
    expect(r.message).toMatch(/rechazó la solicitud/);
    expect(r.message).not.toMatch(/llave/);
    expect(r.providerDetail).toBe("max_completion_tokens is too large");
  });
});
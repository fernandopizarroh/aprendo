import { AiProviderError, AiTransientError, ContentFormatError, type AiProvider, type AiProviderId, type GenerateInput } from "../types";
import { SUCCESS_MESSAGE, extractProviderDetail, mapHttpError, networkError } from "../errors";
import { parseJsonLoose } from "../json";
import { logAi } from "../log";

interface GenerateSpec {
  url: string;
  headers(apiKey: string): Record<string, string>;
  body(input: GenerateInput): unknown;
  /** Extrae el texto de la respuesta del proveedor. */
  extractText(json: unknown): string | undefined;
}

interface ProviderConfig {
  id: AiProviderId;
  /** Endpoint de listado de modelos: valida la llave sin consumir tokens. */
  modelsUrl: string;
  headers(apiKey: string): Record<string, string>;
  generate: GenerateSpec;
}

// Una generación normal tarda 20-60 s. Pasado este tiempo se corta y se reintenta, en vez de dejar al alumno esperando.
const GENERATE_TIMEOUT_MS = 90_000;

export function makeProvider(cfg: ProviderConfig, fetchImpl: typeof fetch = fetch): AiProvider {
  return {
    id: cfg.id,
    async testConnection(apiKey) {
      try {
        const res = await fetchImpl(cfg.modelsUrl, {
          method: "GET",
          headers: cfg.headers(apiKey),
          signal: AbortSignal.timeout(15_000),
        });
        if (res.ok) return { ok: true, message: SUCCESS_MESSAGE };
        const body = await res.json().catch(() => undefined);
        return mapHttpError(res.status, extractProviderDetail(body));
      } catch (e) {
        return networkError(e);
      }
    },
    async generateContent(input) {
      const g = cfg.generate;
      let res: Response;
      try {
        res = await fetchImpl(g.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...g.headers(input.apiKey) },
          body: JSON.stringify(g.body(input)),
          signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
        });
      } catch (e) {
        const n = networkError(e);
        const cause = (e as { cause?: { code?: string } })?.cause?.code;
        throw new AiTransientError(n.message, `${n.providerDetail ?? ""}${cause ? ` (${cause})` : ""}`.trim());
      }
      const json = await res.json().catch(() => undefined);
      if (!res.ok) {
        const m = mapHttpError(res.status, extractProviderDetail(json));
        throw res.status >= 500 ? new AiTransientError(m.message, m.providerDetail) : new AiProviderError(m.message, m.providerDetail);
      }
      const text = g.extractText(json);
      if (!text) throw new ContentFormatError("La IA devolvió una respuesta vacía.");
      logAi(`${cfg.id}: respuesta de ${text.length} caracteres`);
      return parseJsonLoose(text);
    },
  };
}

import { makeProvider } from "./factory";
import { GENERATION_TEMPERATURE, buildSystemPrompt, buildUserPrompt } from "../prompts";

// Modelo configurable por entorno: los nombres de modelos cambian con el tiempo.
const model = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const createGeminiProvider = (fetchImpl?: typeof fetch) =>
  makeProvider(
    {
      id: "gemini",
      modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
      headers: (k) => ({ "x-goog-api-key": k }),
      generate: {
        get url() {
          return `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent`;
        },
        headers: (k) => ({ "x-goog-api-key": k }),
        body: (i) => ({
          systemInstruction: { parts: [{ text: buildSystemPrompt(i) }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: buildUserPrompt(i) },
                ...i.images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
              ],
            },
          ],
          generationConfig: { temperature: GENERATION_TEMPERATURE, responseMimeType: "application/json", maxOutputTokens: 8192 },
        }),
        extractText: (json) => {
          const parts = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]
            ?.content?.parts;
          return parts?.map((p) => p.text ?? "").join("");
        },
      },
    },
    fetchImpl,
  );

import { makeProvider } from "./factory";
import { GENERATION_TEMPERATURE, buildSystemPrompt, buildUserPrompt } from "../prompts";

export const DEFAULT_OPENAI_MODEL = "gpt-6-luna";
const model = () => process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

/**
 * Los modelos de razonamiento (gpt-5 en adelante, serie o) rechazan una temperatura distinta de 1 y descuentan
 * los tokens de razonamiento del tope de salida. Solo los modelos clásicos (gpt-4*, gpt-3.5*) reciben temperatura 0.2.
 */
export const acceptsTemperature = (m: string) => /^(gpt-4|gpt-3\.5|chatgpt-4o)/.test(m);
export const openAiTuning = (m: string) =>
  acceptsTemperature(m)
    ? { temperature: GENERATION_TEMPERATURE, max_completion_tokens: 8000 }
    : { max_completion_tokens: 16000 }; // tope: una salida descontrolada no puede dejar al alumno esperando minutos

export const createOpenAiProvider = (fetchImpl?: typeof fetch) =>
  makeProvider(
    {
      id: "openai",
      modelsUrl: "https://api.openai.com/v1/models",
      headers: (k) => ({ Authorization: `Bearer ${k}` }),
      generate: {
        url: "https://api.openai.com/v1/chat/completions",
        headers: (k) => ({ Authorization: `Bearer ${k}` }),
        body: (i) => ({
          model: model(),
          ...openAiTuning(model()),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(i) },
            {
              role: "user",
              content: [
                { type: "text", text: buildUserPrompt(i) },
                ...i.images.map((img) => ({
                  type: "image_url",
                  image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
                })),
              ],
            },
          ],
        }),
        extractText: (json) =>
          (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content,
      },
    },
    fetchImpl,
  );

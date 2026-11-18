import { makeProvider } from "./factory";
import { GENERATION_TEMPERATURE, buildSystemPrompt, buildUserPrompt } from "../prompts";

const model = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

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
          temperature: GENERATION_TEMPERATURE,
          response_format: { type: "json_object" },
          max_completion_tokens: 8000, // tope: una salida descontrolada no puede dejar al alumno esperando minutos
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

import { makeProvider } from "./factory";
import { GENERATION_TEMPERATURE, buildSystemPrompt, buildUserPrompt } from "../prompts";

const model = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const headers = (k: string) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" });

export const createAnthropicProvider = (fetchImpl?: typeof fetch) =>
  makeProvider(
    {
      id: "anthropic",
      modelsUrl: "https://api.anthropic.com/v1/models?limit=1",
      headers,
      generate: {
        url: "https://api.anthropic.com/v1/messages",
        headers,
        body: (i) => ({
          model: model(),
          max_tokens: 12000,
          temperature: GENERATION_TEMPERATURE,
          system: buildSystemPrompt(i),
          messages: [
            {
              role: "user",
              content: [
                ...i.images.map((img) => ({
                  type: "image",
                  source: { type: "base64", media_type: img.mimeType, data: img.base64 },
                })),
                { type: "text", text: buildUserPrompt(i) },
              ],
            },
          ],
        }),
        extractText: (json) =>
          (json as { content?: { type: string; text?: string }[] })?.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join(""),
      },
    },
    fetchImpl,
  );

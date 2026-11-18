import type { AiProvider, AiProviderId } from "./types";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAiProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";

export function getProvider(id: AiProviderId, fetchImpl?: typeof fetch): AiProvider {
  switch (id) {
    case "gemini":
      return createGeminiProvider(fetchImpl);
    case "openai":
      return createOpenAiProvider(fetchImpl);
    case "anthropic":
      return createAnthropicProvider(fetchImpl);
  }
}

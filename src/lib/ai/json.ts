import { ContentFormatError } from "./types";

/** Parsea JSON que puede venir envuelto en ```json ... ``` o con texto alrededor. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* cae al error */
      }
    }
    throw new ContentFormatError("La IA no devolvió un JSON válido.", trimmed.slice(0, 200));
  }
}

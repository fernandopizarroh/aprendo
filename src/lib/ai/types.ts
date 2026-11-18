import type { ConnectionResult } from "./errors";

export type AiProviderId = "openai" | "gemini" | "anthropic";
export type Stage = "review" | "diagnostic" | "challenge";

export interface GenerateInput {
  apiKey: string; // desencriptada solo en memoria
  stage: Stage; // cada etapa se genera en su propia llamada
  syllabusText: string;
  gradeLevel: string;
  images: { mimeType: string; base64: string }[];
  diagnosticCount: number;
  challengeCount: number;
  /** Motivo por el que se rechazó el intento anterior; se le informa a la IA al reintentar. */
  feedback?: string;
  /** Alumno de nivel inicial (hasta 3° básico): dibujos con emojis y actividades de cuaderno. */
  earlyGrade?: boolean;
  /** Preguntas que ya existen en el banco: la IA no debe repetirlas. */
  avoid?: string[];
}

export interface AiProvider {
  id: AiProviderId;
  /** Llamada mínima. Devuelve mensaje en lenguaje humano (HU-03). */
  testConnection(apiKey: string): Promise<ConnectionResult>;
  /** Devuelve JSON ya parseado de la etapa pedida; se valida con validateStage. */
  generateContent(input: GenerateInput): Promise<unknown>;
}

/** Fallo del proveedor (red, cuota, llave). `providerDetail` es el motivo exacto devuelto. */
export class AiProviderError extends Error {
  constructor(message: string, public providerDetail?: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** Falla pasajera (sin respuesta a tiempo, red, error 5xx del proveedor). Se reintenta sola. */
export class AiTransientError extends AiProviderError {
  constructor(message: string, providerDetail?: string) {
    super(message, providerDetail);
    this.name = "AiTransientError";
  }
}

/** El proveedor respondió, pero el contenido no es JSON utilizable. Reintentable. */
export class ContentFormatError extends AiProviderError {
  constructor(message: string, providerDetail?: string) {
    super(message, providerDetail);
    this.name = "ContentFormatError";
  }
}

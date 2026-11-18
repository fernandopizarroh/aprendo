// Metadatos de proveedores. Seguro para importar desde el cliente.
export const PROVIDER_IDS = ["gemini", "openai", "anthropic"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  recommended?: boolean;
  keyUrl: string;
  note: string;
  steps: [string, string, string];
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    recommended: true,
    keyUrl: "https://aistudio.google.com/apikey",
    note: "Recomendado: tiene capa gratuita y es el más simple de activar.",
    steps: [
      "Inicia sesión con tu cuenta de Google.",
      "Haz clic en «Crear clave de API».",
      "Copia la llave y pégala aquí abajo.",
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    note: "Requiere saldo cargado en tu cuenta.",
    steps: [
      "Inicia sesión en la plataforma de OpenAI.",
      "Haz clic en «Create new secret key».",
      "Copia la llave y pégala aquí abajo.",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    note: "Requiere saldo cargado en tu cuenta.",
    steps: [
      "Inicia sesión en la consola de Anthropic.",
      "Haz clic en «Create Key».",
      "Copia la llave y pégala aquí abajo.",
    ],
  },
];

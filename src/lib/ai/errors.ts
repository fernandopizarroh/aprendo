export interface ConnectionResult {
  ok: boolean;
  message: string; // lenguaje humano
  providerDetail?: string; // motivo exacto devuelto por el proveedor
}

/** Extrae el mensaje de error típico de los 3 proveedores ({error:{message}}). */
export function extractProviderDetail(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const err = (body as { error?: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string") {
      return (err as { message: string }).message;
    }
  }
  return undefined;
}

const KEY_MESSAGE = "La llave no es válida o está mal copiada. Revisa que la hayas pegado completa, sin espacios.";

export function mapHttpError(status: number, detail?: string): ConnectionResult {
  let message: string;
  if (status === 401 || status === 403) {
    message = KEY_MESSAGE;
  } else if (status === 400) {
    // Gemini responde 400 cuando la llave es inválida; en otros casos 400 es una solicitud que el proveedor rechazó.
    if (/api[ _-]?key|x-api-key|authenticat|credential/i.test(detail ?? "")) message = KEY_MESSAGE;
    else if (/image|photo|picture|mime/i.test(detail ?? "")) message = "La IA no pudo leer una de las fotos (formato o contenido no válido). Quita esa foto o sube otra, y vuelve a intentarlo.";
    else message = "El proveedor de IA rechazó la solicitud. Revisa el detalle y vuelve a intentarlo.";
  } else if (status === 429) {
    message = "La llave es válida pero no tiene cuota o saldo disponible, o se alcanzó el límite de uso.";
  } else if (status >= 500) {
    message = "El proveedor tiene problemas en este momento. Intenta de nuevo en unos minutos.";
  } else {
    message = `El proveedor respondió con un error inesperado (${status}).`;
  }
  return { ok: false, message, providerDetail: detail };
}

export function networkError(e: unknown): ConnectionResult {
  return {
    ok: false,
    message: "No pudimos conectar con el proveedor. Revisa tu conexión a internet e intenta de nuevo.",
    providerDetail: e instanceof Error ? e.message : undefined,
  };
}

export const SUCCESS_MESSAGE = "Llave válida y lista";

import { AiProviderError } from "./types";

/** Mensaje para el usuario a partir de un error de generación. */
export function describeError(e: unknown): string {
  if (e instanceof AiProviderError) {
    return e.providerDetail ? `${e.message} Detalle del proveedor: ${e.providerDetail}` : e.message;
  }
  return "Ocurrió un error inesperado al generar la ruta. Intenta de nuevo.";
}

/** Registro de la actividad con la IA en la consola del servidor. Nunca incluye llaves ni el contenido de los prompts. */
export function logAi(message: string): void {
  if (process.env.VITEST) return; // sin ruido en los tests
  console.warn(`[ia ${new Date().toISOString().slice(11, 19)}] ${message}`);
}

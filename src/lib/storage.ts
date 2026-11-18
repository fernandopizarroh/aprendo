import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Almacenamiento local en v1. Mantener esta interfaz para migrar a S3 después.
const ROOT = path.resolve(process.cwd(), "uploads");

export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function sniffMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/** Guarda imágenes ya validadas y devuelve rutas relativas a `uploads/`. */
export async function saveImages(routeId: string, images: { buffer: Buffer; mime: keyof typeof EXT }[]): Promise<string[]> {
  const dir = path.join(ROOT, routeId);
  await mkdir(dir, { recursive: true });
  const rels: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const rel = `${routeId}/${i + 1}.${EXT[images[i].mime]}`;
    await writeFile(path.join(ROOT, rel), images[i].buffer);
    rels.push(rel);
  }
  return rels;
}

/** Agrega fotos a una ruta que ya tiene (no pisa las existentes). Devuelve solo las rutas nuevas. */
export async function appendImages(routeId: string, images: { buffer: Buffer; mime: keyof typeof EXT }[]): Promise<string[]> {
  const dir = path.join(ROOT, routeId);
  await mkdir(dir, { recursive: true });
  const rels: string[] = [];
  for (const img of images) {
    const rel = `${routeId}/${randomBytes(6).toString("hex")}.${EXT[img.mime]}`;
    await writeFile(path.join(ROOT, rel), img.buffer);
    rels.push(rel);
  }
  return rels;
}

/** Borra fotos de una ruta. Solo dentro de `uploads/`; ignora las que ya no existen. */
export async function deleteImages(routeId: string, rels: string[]): Promise<void> {
  for (const rel of rels) {
    const full = path.resolve(ROOT, rel);
    if (!rel.startsWith(`${routeId}/`) || !full.startsWith(ROOT + path.sep)) continue;
    await rm(full, { force: true });
  }
}

/** Una foto guardada, para mostrársela a su dueño. */
export async function readImageFile(rel: string): Promise<{ buffer: Buffer; mime: string } | null> {
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) return null;
  try {
    const buffer = await readFile(full);
    const mime = sniffMime(buffer);
    return mime ? { buffer, mime } : null;
  } catch {
    return null;
  }
}

export async function readImages(rels: string[]): Promise<{ mimeType: string; base64: string }[]> {
  const out: { mimeType: string; base64: string }[] = [];
  for (const rel of rels) {
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(ROOT + path.sep)) throw new Error("Ruta de imagen inválida");
    const buf = await readFile(full);
    const mime = sniffMime(buf);
    if (!mime) throw new Error("Imagen almacenada inválida");
    out.push({ mimeType: mime, base64: buf.toString("base64") });
  }
  return out;
}

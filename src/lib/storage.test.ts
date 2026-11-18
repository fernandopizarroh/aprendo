import { describe, expect, it } from "vitest";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendImages, deleteImages, readImageFile, readImages, sniffMime } from "./storage";

describe("sniffMime", () => {
  it("detecta formatos soportados", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(sniffMime(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]))).toBe("image/webp");
  });
  it("rechaza otros contenidos", () => {
    expect(sniffMime(Buffer.from("<html>"))).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });
});

describe("readImages", () => {
  it("bloquea rutas fuera de uploads", async () => {
    await expect(readImages(["../package.json"])).rejects.toThrow(/inválida/);
  });
});

describe("agregar y quitar fotos de una ruta existente", () => {
  const routeId = "ruta-test-unitario";
  const dir = path.resolve(process.cwd(), "uploads", routeId);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const exists = (rel: string) => access(path.resolve(process.cwd(), "uploads", rel)).then(() => true, () => false);

  it("agregar no pisa las fotos que ya existían y usa nombres distintos", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "1.jpg"), jpg);
    const [a, b] = await appendImages(routeId, [{ buffer: jpg, mime: "image/jpeg" }, { buffer: jpg, mime: "image/jpeg" }]);
    expect(a).not.toBe(b);
    expect(await exists(`${routeId}/1.jpg`)).toBe(true);
    expect(await exists(a)).toBe(true);
    expect(await exists(b)).toBe(true);
    await deleteImages(routeId, [a]);
    expect(await exists(a)).toBe(false);
    expect(await exists(b)).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
  it("no borra archivos fuera de la carpeta de la ruta", async () => {
    await mkdir(dir, { recursive: true });
    const other = path.resolve(process.cwd(), "uploads", "otra-ruta-test");
    await mkdir(other, { recursive: true });
    await writeFile(path.join(other, "x.jpg"), jpg);
    await deleteImages(routeId, ["otra-ruta-test/x.jpg", "../package.json"]);
    expect(await exists("otra-ruta-test/x.jpg")).toBe(true);
    expect(await exists("../package.json")).toBe(true);
    await rm(other, { recursive: true, force: true });
    await rm(dir, { recursive: true, force: true });
  });
  it("leer una foto devuelve su tipo, y rechaza rutas fuera de uploads o archivos que no son imagen", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "a.jpg"), jpg);
    await writeFile(path.join(dir, "b.txt"), "no soy imagen");
    expect((await readImageFile(`${routeId}/a.jpg`))?.mime).toBe("image/jpeg");
    expect(await readImageFile(`${routeId}/b.txt`)).toBeNull();
    expect(await readImageFile("../package.json")).toBeNull();
    expect(await readImageFile(`${routeId}/no-existe.jpg`)).toBeNull();
    await rm(dir, { recursive: true, force: true });
  });
});
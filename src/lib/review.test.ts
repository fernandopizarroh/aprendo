import { describe, expect, it } from "vitest";
import { cardKeys, markViewed, parseViewed } from "./review";

const modules = [{ flashcards: [1, 2] }, { flashcards: [1] }];
const keys = cardKeys(modules);

describe("review", () => {
  it("genera una clave por flashcard", () => {
    expect(keys).toEqual(["0:0", "0:1", "1:0"]);
  });
  it("completa solo al ver el 100% de las tarjetas", () => {
    let r = markViewed([], "0:0", keys)!;
    expect(r).toMatchObject({ total: 3, completed: false });
    r = markViewed(r.viewed, "0:1", keys)!;
    expect(r.completed).toBe(false);
    r = markViewed(r.viewed, "1:0", keys)!;
    expect(r.completed).toBe(true);
  });
  it("es idempotente", () => {
    const r = markViewed(["0:0"], "0:0", keys)!;
    expect(r.viewed).toEqual(["0:0"]);
  });
  it("rechaza claves inexistentes o mal formadas", () => {
    expect(markViewed([], "9:9", keys)).toBeNull();
    expect(markViewed([], "abc", keys)).toBeNull();
  });
  it("descarta vistas de un contenido regenerado", () => {
    expect(markViewed(["5:5"], "0:0", keys)!.viewed).toEqual(["0:0"]);
  });
  it("parseViewed tolera datos inválidos", () => {
    expect(parseViewed(null)).toEqual([]);
    expect(parseViewed({ viewed: "x" })).toEqual([]);
    expect(parseViewed({ viewed: ["0:0", 3] })).toEqual(["0:0"]);
  });
});

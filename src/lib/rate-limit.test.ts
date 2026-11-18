import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, rateLimit, recordHit, resetRateLimit } from "./rate-limit";

beforeEach(() => resetRateLimit());

describe("rateLimit", () => {
  it("bloquea tras el máximo y libera tras la ventana", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("k", 5, 1000, 0)).toBe(true);
    expect(rateLimit("k", 5, 1000, 10)).toBe(false);
    expect(rateLimit("k", 5, 1000, 2000)).toBe(true);
  });
  it("claves independientes", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 1000, 0);
    expect(rateLimit("b", 5, 1000, 0)).toBe(true);
  });
});

describe("isRateLimited / recordHit (solo cuentan los fallos)", () => {
  it("consultar no consume intentos", () => {
    for (let i = 0; i < 20; i++) expect(isRateLimited("adult", 5, 1000, 0)).toBe(false);
  });
  it("bloquea solo después de registrar el máximo de fallos y se libera con la ventana", () => {
    for (let i = 0; i < 5; i++) recordHit("adult", 1000, 0);
    expect(isRateLimited("adult", 5, 1000, 10)).toBe(true);
    expect(isRateLimited("adult", 5, 1000, 2000)).toBe(false);
  });
});
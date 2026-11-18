import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, last4 } from "./crypto";

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("crypto", () => {
  it("roundtrip y no deja el texto en claro", () => {
    const enc = encryptSecret("sk-secret-9a8b");
    expect(enc).not.toContain("sk-secret");
    expect(decryptSecret(enc)).toBe("sk-secret-9a8b");
  });
  it("IV distinto en cada cifrado", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });
  it("detecta manipulación del ciphertext", () => {
    const [iv, tag, data] = encryptSecret("hola").split(":");
    const bad = Buffer.from(data, "base64");
    bad[0] ^= 1;
    expect(() => decryptSecret([iv, tag, bad.toString("base64")].join(":"))).toThrow();
  });
  it("rechaza clave de tamaño incorrecto", () => {
    const prev = process.env.APP_ENCRYPTION_KEY;
    process.env.APP_ENCRYPTION_KEY = "corta";
    expect(() => encryptSecret("x")).toThrow();
    process.env.APP_ENCRYPTION_KEY = prev;
  });
  it("last4", () => expect(last4("abcdef1234")).toBe("1234"));
});

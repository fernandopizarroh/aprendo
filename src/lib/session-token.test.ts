import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { requiredRoleForPath, signSession, verifySession } from "./session-token";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-1234";
});

describe("session token", () => {
  it("firma y verifica", async () => {
    const t = await signSession({ sub: "u1", role: "parent" });
    expect(await verifySession(t)).toEqual({ sub: "u1", role: "parent" });
  });
  it("rechaza token manipulado o ausente", async () => {
    const t = await signSession({ sub: "u1", role: "parent" });
    expect(await verifySession(t + "x")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
  it("rechaza token expirado", async () => {
    const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
    const t = await new SignJWT({ role: "parent" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(key);
    expect(await verifySession(t)).toBeNull();
  });
  it("rechaza rol inválido", async () => {
    const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
    const t = await new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setSubject("u1").sign(key);
    expect(await verifySession(t)).toBeNull();
  });
});

describe("requiredRoleForPath", () => {
  it("mapea prefijos", () => {
    expect(requiredRoleForPath("/parent/dashboard")).toBe("parent");
    expect(requiredRoleForPath("/student")).toBe("student");
    expect(requiredRoleForPath("/student/routes/1/review")).toBe("student");
    expect(requiredRoleForPath("/login")).toBeNull();
    expect(requiredRoleForPath("/parentesco")).toBeNull();
  });
});

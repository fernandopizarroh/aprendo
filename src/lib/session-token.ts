import { SignJWT, jwtVerify } from "jose";

// Seguro para Edge (middleware): sin next/headers ni Node APIs.
export type Role = "parent" | "student";
export interface SessionPayload {
  sub: string;
  role: Role;
}

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET no configurada (mínimo 16 caracteres)");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "parent" && payload.role !== "student")) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

/** Reglas de acceso por prefijo de ruta. Devuelve el rol requerido o null si es pública. */
export function requiredRoleForPath(pathname: string): Role | null {
  if (pathname === "/parent" || pathname.startsWith("/parent/")) return "parent";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "student";
  return null;
}

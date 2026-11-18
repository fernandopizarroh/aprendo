# Diseño: Autenticación y Perfiles

- Sesión: JWT firmado con `SESSION_SECRET` (jose) en cookie httpOnly, SameSite=Lax. Payload: `{ sub, role: "parent" | "student" }`.
- Módulo `src/lib/session.ts`: `createSession`, `getSession`, `requireRole(role)`.
- Middleware `src/middleware.ts`: protege `/parent/*` (role parent) y `/student/*` (role student).
- Endpoints: `POST /api/auth/register`, `POST /api/auth/login` (campo `role` decide tabla), `POST /api/auth/logout`, `GET/POST /api/students`.
- Validación Zod: email, contraseña mínimo 8 (apoderado) y mínimo 4 (alumno), username 3-30 caracteres alfanuméricos.
- Autorización por recurso: toda consulta de alumno filtra por `parentId` de la sesión.
- Riesgo: contraseñas simples de alumno. Mitigación: límite de intentos por usuario (contador en memoria en v1).

# Stack y convenciones

- Next.js 14 (App Router) + TypeScript estricto, Prisma + SQLite (dev), Zod, Vitest, jose (sesiones JWT en cookie httpOnly), bcryptjs.
- Alias `@/*` apunta a `src/`.
- Validar toda entrada de API con Zod. Consultas solo vía Prisma.
- API keys: cifrar con `src/lib/crypto.ts` (AES-256-GCM). Nunca devolver la key al cliente; solo `apiKeyLast4`. Nunca registrar keys en logs.
- IA: todo proveedor implementa `AiProvider` (`src/lib/ai/types.ts`). Temperatura 0.2, salida JSON estricta, validar con `validateGeneratedContent`.
- Las respuestas del alumno con la solución correcta no se envían al cliente en el Desafío hasta entregar la prueba.
- Lógica de dominio pura en `src/lib` con tests Vitest junto al archivo (`*.test.ts`).
- Comandos: `npm run dev`, `npm test`, `npx tsc --noEmit`, `npm run db:push`.

## UI
- Estilos en src/app/globals.css (sin librerías). Usar sus clases: .container, .card, .stack, .field, .btn (+ -secondary, -block, -small), .choice, .alert-*, .badge-*, .progress.
- Apoderado: tema por defecto (sobrio). Alumno: data-theme="student" (ya aplicado en src/app/student/layout.tsx).
- Objetivos táctiles >= 48px, contraste alto, foco visible. Los textos de botones y campos se usan en el smoke test: cambiarlos con cuidado.

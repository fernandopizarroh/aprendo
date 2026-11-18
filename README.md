# Aprendo (EstudioAI)

WebApp mobile-first que convierte el temario y las fotos del cuaderno en **rutas de aprendizaje** para escolares: **Repaso → Diagnóstico → Desafío**. El apoderado crea la ruta y la IA (con la llave del propio apoderado, BYOK) genera el contenido. El alumno estudia con refuerzo positivo y el apoderado sigue su avance.

Fuente de requisitos: [`docs/PRD-Aprendo.md`](docs/PRD-Aprendo.md). Decisiones posteriores al PRD: [`docs/DEFINICIONES-PRODUCTO.md`](docs/DEFINICIONES-PRODUCTO.md) (si hay conflicto, mandan estas). Casos de prueba de aceptación: [`docs/UAT-Aprendo.md`](docs/UAT-Aprendo.md).

## Estado
MVP completo (HU-01 a HU-11) más las definiciones de la ronda 1 de UAT: cuentas de apoderado y alumno, conexión guiada de IA (Gemini, OpenAI, Anthropic), rutas con temario y fotos, experiencia del alumno, panel del apoderado, edición del contexto de una ruta, nivel inicial (dibujos y actividades de cuaderno validadas por un adulto) y evaluaciones siempre distintas.

## Primeros pasos

Requisitos: Node.js 20 o superior (probado con 24), npm y Git.

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# completar APP_ENCRYPTION_KEY y SESSION_SECRET (los comandos están en .env.example)
npm run db:push             # crea la base SQLite local
npm run dev                 # http://localhost:3000
```

Para generar contenido hace falta una API key real de Gemini, OpenAI o Anthropic; se configura dentro de la app, en «Conectar IA». El resto de la app funciona sin ella.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests unitarios (Vitest) |
| `npx tsc --noEmit` | Revisión de tipos |
| `npm run db:push` | Aplica `prisma/schema.prisma` a la base local |
| `npm run db:studio` | Explorar la base de datos |

Antes de enviar cambios: `npx tsc --noEmit` y `npm test` deben pasar.

## Cómo está organizado

```
docs/                    PRD, definiciones de producto y casos UAT
.kiro/steering/          contexto del proyecto (producto, tecnología, estructura)
.kiro/specs/<módulo>/    requisitos, diseño y tareas por módulo (01 a 06)
prisma/schema.prisma     modelo de datos
src/app/parent/*         pantallas del apoderado
src/app/student/*        pantallas del alumno
src/app/api/*            endpoints
src/lib/                 dominio puro, con tests *.test.ts al lado
src/lib/ai/              proveedores de IA, prompts, validación y generación
src/lib/client/          utilidades solo de navegador
src/components/          componentes compartidos
```

Stack: Next.js 14 (App Router), TypeScript estricto, Prisma + SQLite, Zod, Vitest, `jose` (sesión JWT en cookie httpOnly) y `bcryptjs`.

## Cómo trabajamos

- **Desarrollo guiado por specs.** Cada módulo tiene `requirements.md` (criterios en formato EARS), `design.md` y `tasks.md` en `.kiro/specs/`. Un cambio de comportamiento se refleja primero ahí.
- **Lógica pura en `src/lib` con tests.** Las reglas de negocio (desbloqueos, rondas del Desafío, validación del contenido de la IA, sorteo de preguntas) son funciones sin efectos secundarios y están probadas. Los endpoints son delgados.
- **Convenciones:**
  - Toda entrada de la API se valida con Zod y toda consulta pasa por Prisma.
  - La API key del apoderado se cifra con `src/lib/crypto.ts` y nunca se devuelve al cliente (solo los últimos 4 caracteres) ni se escribe en logs.
  - Las respuestas correctas, la respuesta esperada de las actividades y las explicaciones no salen al cliente antes de que corresponda (especialmente en el Desafío).
  - Cada recurso se verifica contra el apoderado o alumno de la sesión (`src/lib/ownership.ts`).
  - Estilos con las clases de `src/app/globals.css`, sin librerías. Objetivos táctiles de al menos 48 px.
  - Textos de la interfaz en español.
- **Casos UAT** (`docs/UAT-Aprendo.md`): al cambiar un comportamiento, actualizar o agregar el caso correspondiente.

## Limitaciones conocidas para producción

Esto es un MVP pensado para correr en un solo proceso. Antes de desplegar en otro entorno hay que resolver:

- **SQLite y `db push`:** no hay migraciones versionadas. Para producción conviene una base gestionada y `prisma migrate`.
- **Generación con IA en segundo plano dentro del mismo proceso** (`src/lib/ai/generate-route.ts`, `refill.ts`): no funciona en hosting serverless con límites de tiempo. Hace falta una cola de trabajos.
- **Estado en memoria:** el límite de intentos de login y de la contraseña del adulto (`src/lib/rate-limit.ts`) y el estado de la preparación de preguntas nuevas se pierden al reiniciar y no se comparten entre procesos.
- **Fotos en disco local** (`uploads/`, detrás de `src/lib/storage.ts`): migrar a almacenamiento de objetos.
- **Cada ruta usa varias llamadas a la IA del apoderado** (unas 5 al crearla, más las que se necesiten al ampliar el banco de preguntas). Considerar mostrar el costo estimado.
- **Sin recuperación de contraseña, verificación de correo ni eliminación de alumnos, asignaturas o rutas.**

## Seguridad

Nunca subir `.env`, la base de datos (`*.db`) ni `uploads/` (contienen llaves cifradas, datos de menores y fotos de cuadernos). Están en `.gitignore`.

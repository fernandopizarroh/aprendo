# Estructura del repositorio

- `docs/`: PRD.
- `.kiro/steering/`: contexto del proyecto. `.kiro/specs/<modulo>/`: requirements, design, tasks.
- `prisma/schema.prisma`: modelo de datos.
- `src/app/parent/*`: UI del apoderado. `src/app/student/*`: UI del alumno. `src/app/api/*`: endpoints.
- `src/lib/`: dominio (crypto, progress, ai, db). `src/lib/client/`: utilidades solo de navegador.
- `src/components/`: componentes compartidos.

Orden de specs (dependencias): 01-auth-perfiles, 02-config-ia, 03-asignaturas-rutas, 04-experiencia-alumno, 05-dashboard.

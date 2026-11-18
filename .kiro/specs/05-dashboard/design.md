# Diseño: Dashboard

- `src/lib/dashboard.ts`: `summarizeRoute(route, attempts)` función pura que deriva estado, intentos, mejor puntaje, puntaje de Desafío y última actividad.
- Estado: sin repaso completo = En Repaso; repaso completo y Desafío no entregado = En Diagnóstico o En Desafío según desbloqueo; Desafío entregado = Completado.
- `GET /api/dashboard`: una consulta Prisma con `include` de subjects, routes y attempts filtrada por `parentId`.
- UI `/parent/dashboard`: tarjetas por alumno, tabla por ruta, tono sobrio. Mostrar "listo para la prueba" cuando el mejor Diagnóstico >= umbral.
- KPIs del PRD (activación, finalización, efectividad) quedan fuera de la UI v1; se pueden obtener con consultas SQL desde los mismos datos.

## Diseño final (as built)
- `summarizeRoute` usa las reglas de rondas del spec 06: el estado se deriva de la ronda actual (si el alumno agota los 2 intentos del Desafío vuelve a "En Repaso" y el panel avisa que debe repetir).
- Se añadieron: intentos de Desafío disponibles, veces que repasó de nuevo y conteo de validaciones del adulto (correcto, con ayuda, error) a partir del desglose de los intentos.
- "Listo para la prueba" = aprobó el Desafío.

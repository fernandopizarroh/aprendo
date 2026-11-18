# Tareas: Experiencia del Alumno

- [x] 1. `src/lib/grading.ts`: barajado y correcciÃ³n, con tests
- [x] 2. CÃ¡lculo de progreso desde `StudentAttempt` (`getRouteProgress`) con tests
- [x] 3. `GET /api/student/routes` y UI `/student` (HU-07)
- [x] 4. Endpoint de etapa con validaciÃ³n de desbloqueo y ocultar respuestas en DesafÃ­o
- [x] 5. Repaso: registro de interacciones y UI de flashcards (HU-08)
- [x] 6. DiagnÃ³stico: pistas, check por pregunta, resultados, reintentos (HU-09)
- [x] 7. DesafÃ­o: entrega, desglose y explicaciÃ³n de fallos (HU-10)
- [x] 8. Tests de API: etapa bloqueada devuelve 403; el DesafÃ­o no filtra respuestas

## Notas de implementación
- [x] Vista previa de solo lectura para el apoderado (GET /api/routes/[id]/content), pedida en UAT para revisar la calidad del contenido.
- Verificado: 44 comprobaciones contra el servidor real (desbloqueos, corrección en servidor, sin filtración de respuestas, aislamiento entre alumnos) y recorrido en Edge del flujo completo del alumno.

# Tareas: Asignaturas y Rutas

- [x] 1. `GET/POST /api/subjects` y UI `/parent/subjects` (HU-04)
- [x] 2. AÃ±adir `generationStep` a `LearningRoute` y `npm run db:push`
- [x] 3. `src/lib/storage.ts` (guardar/leer imÃ¡genes)
- [x] 4. `generateContent` en Gemini, OpenAI y Anthropic con salida JSON estricta y temperatura 0.2
- [x] 5. `src/lib/ai/generate-route.ts` con tests (proveedor mockeado: Ã©xito, conteo incorrecto, error de proveedor)
- [x] 6. `POST /api/routes` multipart y `GET /api/routes/[id]`
- [x] 7. `POST /api/routes/[id]/generate` (reintento y regeneraciÃ³n por etapa)
- [x] 8. UI `/parent/routes/new`: temario, cÃ¡mara/galerÃ­a, compresiÃ³n, parÃ¡metros (HU-05)
- [x] 9. UI de progreso de generaciÃ³n con polling y manejo de error con reintento (HU-06)

## Correcciones tras UAT
- [x] Generación por etapa con reintentos informados, guardado parcial y progreso real (UAT-R1)

## Editar contexto
- [x] Endpoint de edición de contexto (texto, fotos, etapas a regenerar) y de lectura de fotos
- [x] Tarjeta "Contexto de la ruta" con miniaturas, quitar y agregar fotos y elección de etapas
- [x] Reinicio del Repaso del alumno al regenerarlo
- [x] Mensaje de error correcto cuando el proveedor rechaza una foto

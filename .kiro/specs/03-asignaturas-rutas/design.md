# DiseÃ±o: Asignaturas y Rutas

- Endpoints: `GET/POST /api/subjects`, `GET/POST /api/routes`, `POST /api/routes/[id]/generate` (body opcional `{ stage }`), `GET /api/routes/[id]` (estado y paso actual).
- Subida: `multipart/form-data` en `POST /api/routes`. ImÃ¡genes guardadas en `uploads/<routeId>/` (local en v1; abstraer en `src/lib/storage.ts` para cambiar a S3 despuÃ©s). `sourceImagesUrls` guarda las rutas.
- Pipeline en `src/lib/ai/generate-route.ts`:
  1. Cargar ruta, alumno (gradeLevel) y apoderado; descifrar llave en memoria.
  2. Leer imÃ¡genes y llamar `provider.generateContent`.
  3. `validateGeneratedContent` con los conteos de la ruta.
  4. Guardar `RouteContent` y `status = ready`; ante error `status = error` y `errorMessage`.
- Progreso de generaciÃ³n: campo `generationStep` en `LearningRoute` (aÃ±adir al schema) consultado por polling cada 2 s desde la UI.
- EjecuciÃ³n: el endpoint responde de inmediato y el trabajo sigue en segundo plano en el mismo proceso (suficiente para MVP; lÃ­mite: serverless con timeouts).
- AutorizaciÃ³n: toda ruta se verifica contra el `parentId` de la sesiÃ³n.
- DecisiÃ³n abierta: cuÃ¡ntas imÃ¡genes y quÃ© tamaÃ±o mÃ¡ximo por ruta (propuesta: 10 imÃ¡genes, 1 MB cada una tras compresiÃ³n).

## Cambio tras UAT (UAT-R1)
- La generación pasa de una llamada única a **una llamada por etapa** (eview, diagnostic, challenge). Una IA entrega la cantidad exacta de preguntas con mucha más fiabilidad cuando pide solo un bloque.
- Hasta 3 intentos por etapa; al reintentar se le informa a la IA el motivo del rechazo (ej. "llegaron 5, se esperaban 10"). Si llegan más preguntas de las pedidas se recortan.
- Cada etapa se guarda al terminar (las pendientes quedan como arreglo vacío). "Reintentar" genera solo las etapas que faltan; "Toda la ruta" (stage: all) regenera todo; "Solo X" hace una llamada.
- LearningRoute.generationStep guarda la etapa en curso y la UI muestra el avance real, en lugar de animarlo por tiempo.
- Costo: las fotos se envían en cada llamada (hasta 3 veces por generación). Posible optimización futura: transcribir las fotos una vez y reutilizar el texto.

## Editar el contexto de una ruta (ronda 2 de UAT)
- `POST /api/routes/[id]/context` (multipart): `title`, `syllabusText`, `remove` (rutas de fotos a quitar), `images` (nuevas) y `regenerate` (etapas). Valida que las fotos a quitar sean de la ruta, el máximo de 10 en total, el tipo real de cada foto (por sus bytes) y que la ruta no se esté generando (409).
- Si se pide regenerar, toma el turno de generación **antes** de escribir nada y lo devuelve si el guardado falla. `runGeneration` acepta una lista de etapas (`stagesToRun`).
- Las fotos nuevas no pisan las existentes (`appendImages`, nombre aleatorio); las quitadas se borran del disco (`deleteImages`, solo dentro de `uploads/<ruta>/`).
- `GET /api/routes/[id]/photos/[index]` entrega la foto solo a su apoderado.
- Al reemplazar el Repaso se borran los intentos de Repaso del alumno (debe repasar otra vez); los de Diagnóstico y Desafío se conservan.
- `mapHttpError`: un 400 solo se interpreta como llave inválida si el detalle lo dice (Gemini devuelve 400 para una llave mala); una foto inválida se informa como foto.

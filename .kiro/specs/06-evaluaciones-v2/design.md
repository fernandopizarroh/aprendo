# Dise√±o: Evaluaciones v2

## Rondas del Desaf√≠o
- `summarizeAttempts` (`src/lib/student-progress.ts`) reproduce los intentos terminados en orden cronol√≥gico (`completedAt ?? createdAt`). Un segundo Desaf√≠o fallido sube `round`, reinicia `reviewCompleted` y `bestDiagnostic`, y deja el Desaf√≠o cerrado hasta repetir el Repaso y aprobar un Diagn√≥stico.
- El Repaso de una ronda nueva es un `StudentAttempt` nuevo (`currentReviewAttempt`).
- Se a√±adi√≥ `StudentAttempt.completedAt`.

## Banco y preguntas nuevas
- `RouteContent.diagnosticPoolJson` y `challengePoolJson` son bancos que crecen. `diagnosticVersion` y `challengeVersion` suben cuando se reemplaza el banco; cada intento guarda la `version` con que se arm√≥.
- `drawIndices` (`src/lib/quiz.ts`) elige las preguntas de cada intento entre las no usadas (uni√≥n de los `order` de intentos de la misma versi√≥n), con proporci√≥n de actividades.
- `generateBank` genera `INITIAL_BATCHES` lotes seguidos; cada lote recibe las preguntas anteriores (`avoid`) y `validateStage` rechaza repetidas (texto normalizado).
- `requestRefill` (`src/lib/ai/refill.ts`) ampl√≠a el banco en segundo plano. Un fallo se recuerda 60 s para no reintentar en bucle. El alumno recibe 409 `preparing` y la pantalla reintenta cada 6 s, o 503 `unavailable`.
- Si tras elegir un intento quedan menos preguntas nuevas que el tama√±o del siguiente, se ampl√≠a el banco de inmediato.

## Nivel inicial y actividades
- `isEarlyGrade` (`src/lib/grade.ts`) interpreta el curso. `earlyGrade` cambia el prompt y la validaci√≥n (`validateStage`): rango de actividades `activityTarget` a `activityMax`, 40% con `visual`, pista en todo el Diagn√≥stico.
- Una pregunta es `choice` o `activity { expected }`. El cliente nunca recibe `correctIndex` ni `expected`.

## Validaci√≥n del adulto
- `POST /api/student/attempts/[id]/adult` verifica la contrase√±a de apoderado (bcrypt), limita solo los fallos (5 por minuto por alumno) y abre una autorizaci√≥n de una actividad por 5 minutos (`detail.grant`).
- `POST .../activity` guarda el veredicto (0 correcto, 1 con ayuda, 2 error) y cierra la autorizaci√≥n. En el Desaf√≠o no devuelve el resultado.
- `submitChallenge` ignora cualquier veredicto que env√≠e el cliente: usa solo los guardados.

## Panel del apoderado
- `src/lib/dashboard.ts` (`statusLabel`, `activityTally`, `summarizeRoute`) y `GET /api/dashboard`, filtrado por apoderado.

## Ajustes de la segunda vuelta
- `LearningRoute.configChallengeThreshold` (nuevo, default 90) separa el porcentaje que aprueba el DesafÌo de `configUnlockThreshold` (abre el DesafÌo). `summarizeAttempts` recibe ambos (`{ unlock, challenge }`). Las rutas existentes conservaron su comportamiento (se copiÛ el valor anterior).
- `PATCH /api/routes/[id]` cambia los porcentajes; el avance se calcula al leer, asÌ que se recalcula solo.
- `helpedItems` (`src/lib/dashboard.ts`) lista las actividades con veredicto "con ayuda"; `ResultView` las separa en "Para reforzar" y usa clases `item-help` / `help-text` (·mbar).
- `gradeKind` y `gradeNotice` (`src/lib/grade.ts`) generan el aviso del curso; `Toast` lo muestra y no se cierra solo. `PATCH /api/students/[id]` permite corregir el curso y `GET /api/subjects/[id]` entrega el alumno y su nivel para el recordatorio al crear rutas.

## Ajustes tras el UAT de nivel inicial (generaciÛn y espera)
- **Causa de la espera de 5 minutos:** la llamada a OpenAI se quedÛ sin responder 2 minutos y el cÛdigo la daba por fallida sin reintentar. Adem·s el motivo se descartaba en silencio. Ahora hay `AiTransientError` (sin respuesta a tiempo, red, 5xx): se reintenta sola hasta 2 veces sin gastar intentos de contenido; tiempo m·ximo por llamada 90 s y por preparaciÛn 150 s.
- **Conteo de la IA:** `generateStage` pide `askCount(n)` preguntas (n + margen), filtra solo las defectuosas (`screenQuestions`) y **acumula las buenas entre intentos**: si llegan 13 de 15, el intento siguiente pide las 2 que faltan. Si el lote final no cumple actividades o dibujos, se descarta y se reintenta con el motivo (`checkBatch`).
- **Tope de salida:** `max_completion_tokens` (OpenAI) y `maxOutputTokens` (Gemini), y los dibujos de emojis limitados a 12, para que una salida descontrolada no deje esperando.
- **Cu·ndo se prepara el banco:** al terminar un intento sin aprobar (`prepareNextAttempt`), no al iniciar uno. Si igual falta, se genera a pedido y el alumno espera con `WaitingCard`.
- **Visibilidad:** `logAi` registra en la consola del servidor cada llamada, su duraciÛn y por quÈ se rechazÛ. `GET /api/routes/[id]` incluye el estado de la preparaciÛn (`refill`) y la pantalla de la ruta lo muestra al apoderado.
- **Intentos anteriores a las reglas:** un DesafÌo completado sin `completedAt` se trata como historial y no cuenta como intento fallido.

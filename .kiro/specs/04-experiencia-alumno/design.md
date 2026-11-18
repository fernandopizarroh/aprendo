# DiseÃ±o: Experiencia del Alumno

- Datos: `StudentAttempt` por intento. Repaso: un intento `review` con `answersDetailJson = { viewedCards: [...] }`; `completed` al ver todas. DiagnÃ³stico y DesafÃ­o: un intento por entrega con `scorePercentage`.
- Desbloqueo calculado en servidor con `unlockedStages` (`src/lib/progress.ts`) sobre el historial; la API nunca confÃ­a en el cliente.
- Endpoints: `GET /api/student/routes`, `GET /api/student/routes/[id]/stage/[stage]` (valida desbloqueo; el DesafÃ­o omite `correctIndex` y `explanation`), `POST /api/routes/[id]/attempts` (corrige en servidor, devuelve resultado).
- DiagnÃ³stico: el servidor baraja preguntas y alternativas por intento y devuelve `hint`; la correcciÃ³n se hace en servidor por pregunta (`POST .../check`) para dar retroalimentaciÃ³n inmediata.
- DesafÃ­o: se envÃ­an todas las preguntas sin respuestas; al entregar, el servidor corrige y devuelve el desglose.
- UI lÃºdica: barra de progreso, refuerzo positivo, botones grandes; componentes `Flashcard`, `QuestionCard`, `ProgressBar` en `src/components/student/`.
- Riesgo: intentos repetidos del DiagnÃ³stico memorizando respuestas. MitigaciÃ³n v1: barajado; ampliar el pool queda fuera de alcance.

## Diseño final (as built)
- **Intentos con estado en servidor.** Diagnóstico y Desafío crean un `StudentAttempt` con `answersDetailJson = { order, answers, breakdown? }`. `order` guarda el barajado de preguntas y alternativas, así que el servidor corrige sin confiar en el cliente. Las alternativas viajan con su índice original (`key`); el cliente nunca recibe `correctIndex`.
- **Diagnóstico:** `POST /api/student/routes/[id]/diagnostic` inicia o retoma el intento. `POST /api/student/attempts/[id]/answer` corrige una pregunta, guarda la respuesta (no se puede cambiar) y devuelve retroalimentación. Al responder la última cierra el intento y calcula el puntaje. Esto evita que se consulte la respuesta sin comprometerla.
- **Desafío:** `POST .../challenge` inicia o retoma. Todas las respuestas se envían juntas a `POST /api/student/attempts/[id]/submit`. Antes de entregar no existe ninguna ruta que revele aciertos. Lo no respondido cuenta como incorrecto. Se puede rendir más de una vez (supuesto a confirmar).
- **Repaso:** una tarjeta es una unidad (`"módulo:tarjeta"`). `POST .../review` registra la vista de forma idempotente. Completa al ver el 100% y no se pierde si el contenido se regenera.
- **Desbloqueo:** `summarizeAttempts` + `unlockedStages`, evaluado en el servidor en cada inicio de etapa (403 si está bloqueada). Usa el mejor puntaje de Diagnóstico contra `configUnlockThreshold`.
- **Resultados:** al cerrar un intento se guarda un `breakdown` (copia de las preguntas y respuestas). Los resultados anteriores no cambian si luego se regenera el contenido.
- **Regeneración:** al regenerar una etapa se borran los intentos incompletos de esa etapa. La ruta solo está disponible para el alumno con `status = ready`.
- **Tema del alumno:** `data-theme="student"` (violeta) en `src/app/student/layout.tsx`.

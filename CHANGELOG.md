# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Las versiones siguen [SemVer](https://semver.org/lang/es/) y cada una tiene una etiqueta de Git (`vX.Y.Z`) y un Release en GitHub.

## [1.0.0-rc.1] - 2026-11-18

**Candidata a versión 1.0, congelada para cerrar el UAT.** Mientras dure el UAT solo se aceptan correcciones de defectos (se publican como `rc.2`, `rc.3`...); las funciones nuevas esperan a que el UAT cierre.

Casos de prueba: [`docs/UAT-Aprendo.md`](docs/UAT-Aprendo.md) (141 casos).

### Incluye

**Cuentas y perfiles (HU-01, HU-02)**
- Registro e ingreso del apoderado con correo y contraseña. Sesión en cookie `httpOnly` y límite de intentos de ingreso.
- Perfiles de alumno con usuario y contraseña, sin correo. El apoderado puede cambiar el curso del alumno y recibe un aviso del nivel que el sistema entendió.

**Conexión de la IA (HU-03)**
- Asistente paso a paso para Google Gemini, OpenAI y Anthropic, con botón «Probar Conexión».
- La llave se guarda cifrada (AES-256-GCM) y nunca se devuelve al navegador, solo sus últimos 4 caracteres.

**Asignaturas y rutas (HU-04, HU-05, HU-06)**
- Asignaturas por alumno. Rutas con temario y fotos opcionales (compresión en el navegador).
- Generación con IA por etapa (Repaso, Diagnóstico, Desafío) con reintentos, tiempos máximos y mensajes de error entendibles.
- Edición posterior del contexto de la ruta (título, temario, fotos) y regeneración de las etapas que el apoderado elija.
- Porcentajes configurables: el del Diagnóstico para abrir el Desafío y el del Desafío para aprobarlo.
- Vista previa de solo lectura del contenido generado.

**Experiencia del alumno (HU-07 a HU-10)**
- Repaso con tarjetas, Diagnóstico con pistas y retroalimentación inmediata, y Desafío formal sin ayudas.
- Desafío con 2 intentos por ronda; al agotarlos, el alumno vuelve a repasar y a aprobar un Diagnóstico.
- Evaluaciones siempre distintas: el sistema mantiene un banco de preguntas y lo amplía solo.
- Hasta 3° básico: dibujos hechos con emojis y actividades de cuaderno que valida un adulto (Correcto, Correcto con ayuda, Error). «Con ayuda» cuenta como correcta y se destaca para reforzar.

**Panel del apoderado (HU-11)**
- Estado de cada ruta, intentos, mejores puntajes, Desafío, última actividad y actividades para reforzar.

**Calidad**
- 199 tests automáticos y una acción de GitHub que revisa tipos, tests y compilación en cada cambio.

### Cambios respecto del PRD
Las decisiones tomadas después del PRD están en [`docs/DEFINICIONES-PRODUCTO.md`](docs/DEFINICIONES-PRODUCTO.md); si hay conflicto, mandan esas definiciones.

### Limitaciones conocidas (no son defectos de esta versión)
- No hay recuperación de contraseña, verificación de correo ni eliminación de alumnos, asignaturas o rutas.
- Los pasos de una regeneración avanzan por etapa, no por porcentaje.
- Una llamada a la IA puede quedarse sin responder; el sistema la reintenta sola (hasta 90 segundos por llamada).
- La base de datos es SQLite local, sin migraciones versionadas ni respaldos. Las fotos se guardan en disco local.
- El límite de intentos y el estado de la preparación de preguntas viven en memoria: se pierden al reiniciar.
- La generación con IA corre dentro del mismo proceso del servidor.

### Fuera de esta versión
Despliegue estable en un hosting, migraciones de base de datos versionadas, respaldos y estimación del costo de IA por ruta.

[1.0.0-rc.1]: https://github.com/fernandopizarroh/aprendo/releases/tag/v1.0.0-rc.1

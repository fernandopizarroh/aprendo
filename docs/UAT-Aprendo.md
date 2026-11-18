# Casos de prueba UAT: Aprendo (EstudioAI)

Versión bajo prueba: MVP completo del PRD (HU-01 a HU-11) más las definiciones de producto de la ronda 1 de UAT (ver `docs/DEFINICIONES-PRODUCTO.md`).
Fuente de requisitos: `docs/PRD-Aprendo.md` y `.kiro/specs/*/requirements.md`.

## 1. Alcance de esta ronda

| Módulo PRD | Historias | Estado | En esta ronda |
|---|---|---|---|
| 1. Autenticación y perfiles | HU-01, HU-02 | Implementado | Sí |
| 2. Configuración del Cerebro IA | HU-03 | Implementado | Sí |
| 3. Asignaturas y rutas de aprendizaje | HU-04, HU-05, HU-06 | Implementado | Sí |
| 4. Experiencia del alumno | HU-07 a HU-10 | Implementado | Sí |
| 5. Dashboard del apoderado | HU-11 | Implementado | Sí |

### Limitaciones conocidas (no son defectos de esta ronda)
- Los dibujos de apoyo (nivel inicial) son composiciones de emojis. No se generan imágenes reales.
- El nivel inicial (hasta 3° básico) se deduce del curso que el apoderado escribe en el perfil del alumno ("1° básico", "2do básico", "kinder"...). Si el curso se escribe de forma inusual, el sistema lo tratará como nivel superior.
- Cada ruta usa varias llamadas a tu proveedor de IA: al crearla se generan 2 lotes de Diagnóstico y 2 de Desafío (para que cada intento tenga preguntas nuevas), y se genera un lote más automáticamente cuando al alumno se le acaban las preguntas nuevas.
- La validación del adulto en las actividades de cuaderno pide la contraseña de apoderado en cada actividad. Un adulto que la escribe mal 5 veces en un minuto queda bloqueado un minuto.
- Las fotos son un apoyo opcional: ayudan a la IA a conocer el tipo de ejercicios que el alumno ya trabajó en clase.
- El alumno ve su resultado al terminar cada intento y, en el centro de la ruta, el número de intentos y los mejores puntajes. Aún no hay lista de intentos anteriores.
- El uso de pistas no se registra. En el Diagnóstico cada pregunta se responde una sola vez y no se puede cambiar la respuesta.
- Si se toca un botón antes de que la página termine de cargar (redes lentas), el toque puede no registrarse y hay que repetirlo.
- No existe recuperar contraseña, verificación de correo, ni eliminar alumnos, asignaturas o rutas. Se puede editar el contexto de una ruta (título, temario y fotos), los porcentajes de aprobación y el curso del alumno.
- La generación corre en segundo plano en el mismo servidor. Si el servidor se reinicia durante una generación, la ruta queda "Generando" hasta 5 minutos y luego se puede reintentar.
- La IA genera cada etapa (Repaso, Diagnóstico, Desafío) en una llamada propia, por lo que consume más llamadas a tu proveedor que una sola. Si una etapa falla, las ya completadas quedan guardadas y "Reintentar" solo genera las que faltan.

## 2. Preparación

**URL:** `http://localhost:3000` (el servidor debe estar corriendo con `npm run dev`).

**Datos y materiales**

| Material | Detalle |
|---|---|
| Dos correos de prueba | Apoderado A y apoderado B. Contraseña de 8 o más caracteres. |
| Llave de IA válida | Recomendado: Google Gemini (capa gratuita, https://aistudio.google.com/apikey). Opcional: OpenAI y Anthropic. |
| Llave falsa | Cualquier texto de 8 o más caracteres, por ejemplo `FAKE-KEY-0123456789`. |
| Foto nítida | JPG de una página de cuaderno o libro con buena luz, del mismo tema que el temario. |
| Foto borrosa u oscura | Para el caso de baja legibilidad. |
| Archivo no imagen | Un PDF o un `.txt`. |
| 11 fotos | Para probar el máximo de 10. |
| Temario de ejemplo | "Suma y resta de fracciones con distinto denominador. Fracciones equivalentes. Simplificación." |
| Dispositivos | Un celular real (iOS o Android) y un computador. |

**Convenciones**
- Prioridad: **A** crítico (bloquea la salida), **M** importante, **B** menor.
- Estado: Pendiente / Aprobado / Rechazado / Bloqueado.
- Cada caso rechazado debe registrar evidencia (captura) y una observación.

## 3. Casos de prueba

### Módulo 1. Autenticación y perfiles (HU-01, HU-02)

| ID | HU | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-001 | HU-01 | A | Registro de apoderado exitoso | 1. Abrir `/register`.<br>2. Ingresar correo nuevo y contraseña de 8 o más caracteres.<br>3. Pulsar "Crear cuenta". | Se crea la cuenta, se inicia sesión y se muestra "Alumnos" con la barra superior (Alumnos, Asignaturas, Conectar IA). | Pendiente | |
| UAT-002 | HU-01 | A | Correo ya registrado | 1. Repetir el registro con el mismo correo (con otras mayúsculas). | Mensaje "Ese correo ya está registrado". No se crea otra cuenta. | Pendiente | |
| UAT-003 | HU-01 | M | Contraseña corta | 1. Registrar con contraseña de 7 caracteres. | No se envía el formulario o se muestra "La contraseña debe tener al menos 8 caracteres". | Pendiente | |
| UAT-004 | HU-01 | B | Correo con formato inválido | 1. Registrar con `usuario@` o sin arroba. | El formulario no avanza y avisa del formato. | Pendiente | |
| UAT-005 | HU-01 | A | Ingreso de apoderado | 1. Abrir `/login`, pestaña "Soy apoderado".<br>2. Ingresar correo y contraseña correctos. | Ingresa y llega al "Panel de seguimiento" (`/parent/dashboard`). La barra superior (Panel, Alumnos, Asignaturas, Conectar IA) aparece. | Pendiente | |
| UAT-006 | HU-01 | A | Ingreso con clave incorrecta | 1. Ingresar un correo existente con contraseña errónea.<br>2. Repetir con un correo que no existe. | En ambos casos el mismo mensaje: "Usuario o contraseña incorrectos". No revela si el correo existe. | Pendiente | |
| UAT-007 | HU-01 | M | Límite de intentos de ingreso | 1. Intentar ingresar 6 veces seguidas, en menos de un minuto, con el mismo correo. | A partir del intento 6 aparece "Demasiados intentos. Espera un minuto." Pasado un minuto se puede intentar de nuevo. | Pendiente | |
| UAT-008 | HU-01 | A | Cerrar sesión | 1. Con sesión iniciada, pulsar "Cerrar sesión".<br>2. Usar el botón Atrás del navegador. | Vuelve a `/login`. Al retroceder no se accede a pantallas del apoderado (redirige a `/login`). | Pendiente | |
| UAT-009 | HU-01 | A | Pantallas protegidas sin sesión | 1. Sin sesión, abrir `/parent/students`, `/parent/subjects`, `/parent/ai-setup` y `/student`. | Todas redirigen a `/login`. | Pendiente | |
| UAT-010 | HU-01 | M | Persistencia de sesión | 1. Iniciar sesión.<br>2. Recargar la página y cerrar y reabrir la pestaña. | La sesión se mantiene (dura 7 días). | Pendiente | |
| UAT-011 | HU-02 | A | Crear perfil de alumno | 1. En "Alumnos", completar nombre, curso, usuario y contraseña de 4 o más caracteres.<br>2. Pulsar "Crear alumno". | El alumno aparece en la lista con su nombre, curso y usuario. Los campos se limpian. | Pendiente | |
| UAT-012 | HU-02 | M | Usuario duplicado | 1. Crear otro alumno con el mismo usuario (incluso con otras mayúsculas). | Mensaje "Ese nombre de usuario ya existe". | Pendiente | |
| UAT-013 | HU-02 | M | Usuario con formato inválido | 1. Probar usuario con espacios o tildes (`ana pérez`) y de menos de 3 caracteres. | Se rechaza con el mensaje de formato (3 a 30 caracteres: letras, números, `_ . -`). | Pendiente | |
| UAT-014 | HU-02 | M | Contraseña de alumno muy corta | 1. Crear alumno con contraseña de 3 caracteres. | Se rechaza (mínimo 4). | Pendiente | |
| UAT-015 | HU-02 | M | Varios alumnos | 1. Crear dos o más alumnos para el mismo apoderado. | Todos se listan. | Pendiente | |
| UAT-016 | HU-02 | A | Ingreso de alumno sin correo | 1. Cerrar sesión.<br>2. En `/login` elegir "Soy alumno".<br>3. Ingresar usuario y contraseña del alumno. | Ingresa a `/student`: saludo "¡Hola, nombre!", tema violeta, botón "Cerrar sesión" y sus asignaturas y rutas listas (o un mensaje amable si aún no hay). No pide correo. | Pendiente | |
| UAT-017 | HU-02 | B | Usuario del alumno con mayúsculas | 1. Ingresar el usuario escrito con mayúsculas. | El ingreso funciona. | Pendiente | |
| UAT-018 | HU-02 | A | Alumno no accede a pantallas de apoderado | 1. Con sesión de alumno, abrir `/parent/students`, `/parent/subjects` y `/parent/ai-setup`. | Redirige a `/login`. No se ven datos del apoderado. | Pendiente | |
| UAT-019 | HU-02 | A | Apoderado no accede a pantallas de alumno | 1. Con sesión de apoderado, abrir `/student`. | Redirige a `/login`. | Pendiente | |
| UAT-020 | HU-02 | A | Aislamiento entre apoderados | 1. Crear alumnos con el apoderado A.<br>2. Ingresar como apoderado B y abrir "Alumnos" y "Asignaturas". | B no ve los alumnos ni las asignaturas de A. | Pendiente | |

### Módulo 2. Configuración del Cerebro IA (HU-03)

| ID | HU | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-021 | HU-03 | A | Asistente guiado: contenido | 1. Abrir "Conectar IA". | Se ven 3 pasos: elegir proveedor, obtener llave y pegarla. Hay 3 proveedores (Gemini, OpenAI, Anthropic). Gemini viene seleccionado y marcado "Recomendado". | Pendiente | |
| UAT-022 | HU-03 | A | Guía por proveedor | 1. Elegir cada proveedor.<br>2. Pulsar el enlace "Abrir el sitio de …". | Cambia la guía de 3 pasos (iniciar sesión, crear llave, copiar y pegar) y la nota de cada proveedor. El enlace abre en una pestaña nueva el portal de llaves correcto. | Pendiente | |
| UAT-023 | HU-03 | M | Claridad para un usuario no técnico | 1. Pedir a una persona sin conocimientos de IA que obtenga y pegue la llave sin ayuda. | Lo logra sin asistencia en un tiempo razonable (anotar minutos y dudas). | Pendiente | |
| UAT-024 | HU-03 | M | Botón deshabilitado sin llave | 1. Dejar el campo vacío o escribir menos de 8 caracteres. | "Probar Conexión" está deshabilitado. | Pendiente | |
| UAT-025 | HU-03 | A | Llave inválida | 1. Pegar una llave falsa.<br>2. Pulsar "Probar Conexión". | Mensaje rojo en lenguaje humano ("La llave no es válida o está mal copiada…") más el detalle del proveedor. No se guarda nada: el banner "Conectado" no aparece. | Pendiente | |
| UAT-026 | HU-03 | A | Llave válida | 1. Pegar una llave real del proveedor elegido.<br>2. Pulsar "Probar Conexión". | Mensaje verde "Llave válida y lista". Aparece "Conectado con … Llave terminada en …XXXX" (últimos 4 caracteres) y el campo se limpia. | Pendiente | |
| UAT-027 | HU-03 | A | La llave nunca se expone | 1. Con la llave guardada, recargar "Conectar IA".<br>2. Revisar con las herramientas del navegador (pestaña Red) las respuestas de `/api/ai/status` y `/api/ai/test-connection`. | Solo se ve el proveedor y los últimos 4 caracteres. La llave completa no aparece en pantalla ni en ninguna respuesta. | Pendiente | |
| UAT-028 | HU-03 | A | Llave cifrada en el servidor (asistido) | 1. Ejecutar `npm run db:studio`.<br>2. Abrir la tabla `Parent` y leer `encryptedApiKey`. | El valor son tres bloques base64 separados por `:`. No contiene la llave en texto claro. | Pendiente | |
| UAT-029 | HU-03 | M | Reemplazar la llave | 1. Con una llave ya guardada, probar otra válida (por ejemplo de otro proveedor). | Se reemplaza: el banner muestra el nuevo proveedor y los nuevos 4 caracteres. | Pendiente | |
| UAT-030 | HU-03 | M | Llave de otro proveedor | 1. Elegir OpenAI y pegar una llave de Gemini. | Se rechaza con el mensaje de llave inválida. | Pendiente | |
| UAT-031 | HU-03 | M | Sin conexión a internet | 1. Desactivar la red del equipo.<br>2. Pulsar "Probar Conexión" con una llave. | Mensaje claro "No pudimos conectar con el proveedor…". La app no se rompe. | Pendiente | |
| UAT-032 | HU-03 | B | Límite de pruebas | 1. Pulsar "Probar Conexión" más de 10 veces en un minuto. | A partir de la 11ª aparece "Demasiados intentos. Espera un minuto." | Pendiente | |
| UAT-033 | HU-03 | M | Llave sin saldo (si es posible) | 1. Probar una llave válida de un proveedor sin saldo ni cuota. | Aviso comprensible. **Nota:** la prueba de conexión solo confirma que la llave es válida y puede no detectar falta de saldo. En ese caso el error aparece al generar una ruta (UAT-054). | Pendiente | |

### Módulo 3. Asignaturas y rutas de aprendizaje (HU-04, HU-05, HU-06)

| ID | HU | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-034 | HU-04 | A | Crear asignatura | 1. Abrir "Asignaturas".<br>2. Escribir un nombre, elegir un color y pulsar "Crear asignatura". | La asignatura aparece como tarjeta con borde del color elegido y "Sin rutas todavía". | Pendiente | |
| UAT-035 | HU-04 | M | Sin alumnos | 1. Con un apoderado sin alumnos, abrir "Asignaturas". | Mensaje "Primero crea un alumno…" y botón "Ir a Alumnos". | Pendiente | |
| UAT-036 | HU-04 | M | Asignaturas por alumno | 1. Con dos alumnos, crear asignaturas distintas para cada uno.<br>2. Cambiar el selector "Alumno". | Cada alumno muestra solo sus asignaturas. | Pendiente | |
| UAT-037 | HU-04 | B | Nombre vacío | 1. Intentar crear una asignatura sin nombre. | No se crea. | Pendiente | |
| UAT-038 | HU-05 | A | Aviso si falta conectar la IA | 1. Con un apoderado sin llave guardada, abrir "Nueva ruta de aprendizaje".<br>2. Completar el formulario y enviarlo. | Se ve un aviso amarillo con enlace a "Conectar IA". Al enviar, error "Primero conecta la inteligencia artificial." No se crea la ruta. | Pendiente | |
| UAT-039 | HU-05 | A | Formulario de nueva ruta | 1. Con la IA conectada, pulsar "+ Nueva ruta de aprendizaje". | Hay campos para título, temario, fotos (cámara y galería), el consejo "asegúrate de tener buena luz", y las reglas con valores iniciales 10 (Diagnóstico), 15 (Desafío) 90 (% para abrir el Desafío) y 90 (% para aprobar el Desafío). | Pendiente | |
| UAT-040 | HU-05 | A | Cámara en celular | 1. Desde un celular, pulsar "Tomar foto". | Se abre la cámara trasera directamente. La foto tomada se agrega a la lista. | Pendiente | |
| UAT-041 | HU-05 | A | Galería, selección múltiple | 1. Pulsar "Elegir de la galería" y seleccionar 3 fotos a la vez. | Las 3 aparecen en la lista. | Pendiente | |
| UAT-042 | HU-05 | M | Quitar una foto | 1. Agregar 3 fotos.<br>2. Pulsar "Quitar" en una. | Se elimina solo esa foto. | Pendiente | |
| UAT-043 | HU-05 | M | Máximo de 10 fotos | 1. Intentar agregar 11 fotos. | Solo quedan 10 en la lista. | Pendiente | |
| UAT-044 | HU-05 | A | Archivo que no es imagen | 1. Intentar subir un PDF o `.txt` (si el equipo lo permite elegir). | El servidor rechaza con "Solo se aceptan fotos JPG, PNG o WebP". | Pendiente | |
| UAT-045 | HU-05 | M | Foto de iPhone (HEIC) | 1. Desde un iPhone, tomar o elegir una foto y subirla. | La foto se acepta (el sistema suele entregarla como JPEG). Si falla, anotar el modelo y la versión de iOS. | Pendiente | |
| UAT-046 | HU-05 | A | Compresión en el navegador | 1. Subir una foto grande (por ejemplo de 5 MB o más).<br>2. En las herramientas del navegador (Red), ver el tamaño de la petición a `/api/routes`. | La foto sube comprimida (mucho menos que el original, objetivo cercano a 1 MB por foto). La subida es fluida en red móvil. | Pendiente | |
| UAT-047 | HU-05 | A | Límites de las reglas | 1. Probar Diagnóstico con 4 y con 16. 2. Desafío con 9 y con 31. 3. Cada porcentaje (abrir el Desafío y aprobar el Desafío) con 0 y con 101. | Cada valor fuera de rango se rechaza (aviso del formulario o del servidor). Los límites 5, 15, 10, 30 y 1 a 100 sí se aceptan. | Pendiente | |
| UAT-048 | HU-05 | M | Temario obligatorio | 1. Enviar con el temario vacío o con menos de 10 caracteres. | No se envía o se muestra "Escribe o pega el temario (mínimo 10 caracteres)". | Pendiente | |
| UAT-049 | HU-05 | M | Ruta solo con temario (sin fotos) | 1. Crear una ruta sin ninguna foto. | Se crea y genera usando solo el temario. **Definido:** las fotos son opcionales y sirven de apoyo para que la IA conozca los ejercicios que el alumno ya trabajó en clase. La pantalla lo explica. | Pendiente | |
| UAT-050 | HU-06 | A | Generación exitosa, flujo completo | 1. Completar temario y 2 o 3 fotos nítidas.<br>2. Pulsar "Crear ruta".<br>3. Esperar sin recargar. | Se abre la pantalla de la ruta con "Preparando tu ruta" y 3 pasos que avanzan según la etapa real: "Leyendo apuntes y creando tarjetas de repaso…", "Diseñando el Diagnóstico…", "Diseñando el Desafío…". Al terminar muestra "Ruta lista para el alumno" con: repaso, Diagnóstico con N preguntas y su %, y Desafío con M preguntas. Anotar el tiempo total. | Pendiente | |
| UAT-051 | HU-06 | A | Contenido correcto: cantidades y estructura | 1. Abrir la ruta lista en "Asignaturas".<br>2. En "Vista previa del contenido" desplegar Repaso, Diagnóstico y Desafío. | El Diagnóstico y el Desafío traen un banco de al menos el doble de las preguntas configuradas (cada intento del alumno usa solo la cantidad configurada). Cada pregunta tiene 4 alternativas, una marcada como correcta y una explicación. Cada pregunta del Diagnóstico tiene pista. | Pendiente | |
| UAT-052 | HU-06 | A | Calidad pedagógica | 1. Un docente o el apoderado lee la vista previa (misma vía que UAT-051). | El contenido corresponde al temario y a las fotos. Las respuestas marcadas como correctas son correctas. Las pistas orientan sin dar la respuesta. El nivel es adecuado al curso del alumno. Anotar errores con ejemplos. | Pendiente | |
| UAT-053 | HU-06 | M | Foto poco legible | 1. Generar una ruta con una foto borrosa u oscura y el temario completo. | La IA se apoya en el temario. El contenido sigue siendo coherente con el temario. | Pendiente | |
| UAT-054 | HU-06 | A | Error del proveedor y reintento | 1. Guardar una llave válida en "Conectar IA".<br>2. Revocar o eliminar esa llave en el portal del proveedor.<br>3. Crear una ruta. | Termina en "No se pudo generar la ruta" con el motivo exacto del proveedor, la nota "Tus fotos y el temario siguen guardados" y el botón "Reintentar". | Pendiente | |
| UAT-055 | HU-06 | A | Reintentar sin volver a subir fotos | 1. Desde el error, corregir la causa (por ejemplo reemplazar la llave en "Conectar IA").<br>2. Volver a la ruta y pulsar "Reintentar". | Genera la ruta sin pedir las fotos otra vez y termina en "Ruta lista". | Pendiente | |
| UAT-056 | HU-06 | M | Regenerar ruta completa o una etapa | 1. En una ruta lista, pulsar "Solo Diagnóstico".<br>2. Repetir con "Solo Repaso", "Solo Desafío" y "Toda la ruta". | Cada acción vuelve a "Preparando tu ruta" y termina en "Ruta lista". "Solo …" deja las otras etapas intactas (verificar en la vista previa). Al regenerar Diagnóstico o Desafío se reemplaza todo su banco de preguntas. | Pendiente | |
| UAT-057 | HU-06 | M | Regeneración fallida conserva lo anterior | 1. En una ruta lista, revocar la llave en el portal del proveedor.<br>2. Pulsar "Toda la ruta". | La ruta vuelve a "lista" con un aviso amarillo ("La última regeneración falló y se conservó el contenido anterior"). | Pendiente | |
| UAT-058 | HU-06 | M | Salir y volver durante la generación | 1. Crear una ruta.<br>2. Cerrar la pestaña y volver a abrirla desde "Asignaturas". | La ruta figura "Generando…" y luego "Lista" (o "Con error"). No se pierde. | Pendiente | |
| UAT-059 | HU-06 | M | Etiquetas de estado en la lista | 1. Abrir "Asignaturas" con rutas en distintos estados. | Cada ruta muestra su etiqueta: "Generando…", "Lista" o "Con error", y su enlace abre el detalle. | Pendiente | |
| UAT-060 | HU-06 | A | Aislamiento de rutas entre apoderados | 1. Copiar la URL de una ruta del apoderado A.<br>2. Abrirla con sesión del apoderado B. | "Ruta no encontrada". B no puede ver ni regenerar la ruta. | Pendiente | |
| UAT-061 | HU-06 | B | Evitar generaciones simultáneas | 1. Abrir la misma ruta en dos pestañas.<br>2. Pulsar "Reintentar" casi a la vez. | Solo una generación se ejecuta. La otra pestaña muestra "La ruta ya se está generando". | Pendiente | |

| UAT-071 | HU-06 | A | Cantidad exacta de preguntas con distintos proveedores (regresión del defecto UAT-R1) | 1. Con OpenAI, crear 3 rutas distintas con Diagnóstico 10 y Desafío 15.<br>2. Repetir con Gemini (o Anthropic).<br>3. Regenerar "Solo Diagnóstico" 3 veces en una ruta.<br>4. Revisar las cantidades en `npm run db:studio`. | Todas terminan en "Ruta lista" con exactamente 10 y 15 preguntas. Si una etapa necesitó reintentos, igual termina bien. Anotar cuántas veces falló y con qué mensaje. | Pendiente | |
| UAT-096 | HU-06 | A | Vista previa de solo lectura del apoderado | 1. Con una ruta lista, abrirla.<br>2. Desplegar cada bloque de la vista previa.<br>3. Abrir la misma URL con otro apoderado y con una sesión de alumno. | El dueño ve Repaso (resumen y tarjetas), Diagnóstico (con pistas) y Desafío, con la respuesta correcta marcada y su explicación. Otro apoderado recibe "Ruta no encontrada"; un alumno no accede. No hay opciones para editar preguntas. | Pendiente | |

### Módulo 4. Experiencia de aprendizaje del alumno (HU-07 a HU-10)

Precondición: una ruta en estado "Lista" para el alumno, creada por su apoderado. Ingresar con el usuario del alumno.

| ID | HU | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-072 | HU-07 | A | Lista de asignaturas y rutas | 1. Ingresar como alumno. | Saludo con su nombre, asignaturas con sus rutas, barra de progreso con porcentaje y chips de etapa (Repaso, Diagnóstico y Desafío con candado si están bloqueados). | Pendiente | |
| UAT-073 | HU-07 | M | Solo rutas disponibles y propias | 1. Con el apoderado, dejar una ruta en "Generando" o "Con error".<br>2. Ingresar como alumno. | Solo aparecen las rutas listas de sus propias asignaturas. | Pendiente | |
| UAT-074 | HU-07 | B | Alumno sin rutas | 1. Ingresar con un alumno que no tiene rutas listas. | Mensaje amable que le pide a su apoderado crear una ruta. | Pendiente | |
| UAT-075 | HU-07 | A | Centro de la ruta y bloqueos | 1. Abrir una ruta nueva (sin avance). | Muestra las 3 etapas. Repaso disponible. Diagnóstico y Desafío con candado y el motivo ("Termina el Repaso…", "Saca al menos X% en el Diagnóstico…"). | Pendiente | |
| UAT-076 | HU-08 | A | Repaso con tarjetas | 1. Abrir "Empezar" en Repaso.<br>2. Tocar una tarjeta, leer el resumen, usar Anterior y Siguiente. | La tarjeta muestra la pregunta y, al tocarla, la respuesta con su ejemplo. Hay resumen del tema, indicador "Tarjeta n de total" y barra de avance. | Pendiente | |
| UAT-077 | HU-08 | A | Se registra cada tarjeta vista | 1. Dar vuelta 2 tarjetas.<br>2. Salir y volver al Repaso. | Retoma en la primera tarjeta no vista. El centro de la ruta muestra "2 de N tarjetas vistas". | Pendiente | |
| UAT-078 | HU-08 | A | Se desbloquea al ver el 100% | 1. Dar vuelta todas las tarjetas menos una y revisar el centro de la ruta.<br>2. Dar vuelta la última. | Con N-1 tarjetas el Diagnóstico sigue bloqueado. Al completar aparece "¡Repaso completo!" y el Diagnóstico se abre. | Pendiente | |
| UAT-079 | HU-08 | M | Repasar de nuevo no vuelve a bloquear | 1. Con el repaso completo, usar "Repasar de nuevo". | Se puede repasar de nuevo y el Diagnóstico sigue abierto. | Pendiente | |
| UAT-080 | HU-09 | A | Pista que orienta sin regalar | 1. En el Diagnóstico pulsar "Ver Pista" en varias preguntas. | La pista aparece y orienta. **El tester evalúa** que no revela la respuesta directa. | Pendiente | |
| UAT-081 | HU-09 | A | Retroalimentación inmediata | 1. Responder una pregunta bien y otra mal. | Al instante: la correcta en verde con ✔, la elegida equivocada en rojo con ✖, mensaje positivo y explicación. No se puede cambiar la respuesta dada. | Pendiente | |
| UAT-082 | HU-09 | A | Resultado del Diagnóstico | 1. Terminar todas las preguntas. | Porcentaje, "x de N correctas", mensaje de ánimo, sección "Para revisar" con tu respuesta, la correcta y su explicación. | Pendiente | |
| UAT-083 | HU-09 | A | Regla de desbloqueo con el umbral | 1. Sacar menos que el umbral (por ejemplo 80% con umbral 90%).<br>2. Repetir hasta alcanzar el umbral. | Con menos del umbral el Desafío sigue bloqueado y el mensaje indica cuánto falta. Con un puntaje igual o mayor se abre y aparece "Ir al Desafío". Probar también el valor exacto del umbral. | Pendiente | |
| UAT-084 | HU-09 | M | Repetir el Diagnóstico | 1. Usar "Practicar de nuevo" 3 veces. | Cada intento trae **preguntas distintas** a las de los intentos anteriores (comparar enunciados). El centro de la ruta muestra el número de intentos y el mejor puntaje. | Pendiente | |
| UAT-085 | HU-09 | M | Retomar un Diagnóstico a medias | 1. Responder 2 preguntas, cerrar la pestaña y volver a entrar. | Retoma en la siguiente pregunta sin responder y conserva las respuestas ya dadas con su retroalimentación. | Pendiente | |
| UAT-086 | HU-10 | A | Desafío sin ayudas | 1. Comenzar el Desafío.<br>2. Responder varias preguntas. | No hay botón de pista. Al elegir una alternativa no se muestra si es correcta ni explicación. Se puede cambiar la respuesta y volver a cualquier pregunta. | Pendiente | |
| UAT-087 | HU-10 | A | Entrega con preguntas sin responder | 1. Dejar algunas sin responder.<br>2. Pulsar "Entregar prueba". | Aparece una confirmación que indica cuántas faltan y que contarán como incorrectas. Se puede volver a revisar o entregar. | Pendiente | |
| UAT-088 | HU-10 | A | Resultado del Desafío | 1. Confirmar la entrega. | Porcentaje, "x de N correctas", mensaje según el resultado, y "Para revisar" con tu respuesta, la correcta y la explicación de cada fallo. Las correctas quedan en un bloque plegable. | Pendiente | |
| UAT-089 | HU-10 | A | Etapa bloqueada por URL directa | 1. Con el Repaso incompleto, abrir `/student/routes/<id>/diagnostic`.<br>2. Con el Diagnóstico sin aprobar, abrir `/student/routes/<id>/challenge` y pulsar "Comenzar". | En ambos casos se muestra el motivo del bloqueo y no se inicia la evaluación. | Pendiente | |
| UAT-090 | HU-10 | A | Las respuestas no se filtran | 1. Con las herramientas del navegador (Red), abrir la respuesta que entrega las preguntas del Desafío y la del Diagnóstico antes de responder. | No aparece la alternativa correcta ni la explicación (en el Desafío tampoco la pista). Solo se ven tras responder (Diagnóstico) o entregar (Desafío). | Pendiente | |
| UAT-091 | HU-10 | M | Segundo intento del Desafío | 1. Fallar el Desafío (menos del umbral).<br>2. Usar "Intentar de nuevo". | Comienza un intento nuevo con preguntas distintas. El centro de la ruta muestra "Intentos disponibles: 1 de 2", el último y el mejor puntaje. | Pendiente | |
| UAT-092 | HU-10 | M | Una entrega por intento | 1. Entregar el Desafío.<br>2. Volver atrás en el navegador e intentar entregar otra vez. | No se duplica el resultado. | Pendiente | |
| UAT-093 | HU-07 | A | Aislamiento entre alumnos | 1. Con otro alumno (de otro apoderado), abrir por URL la ruta de un alumno ajeno. | "Ruta no disponible". No ve avance ni resultados ajenos. | Pendiente | |
| UAT-094 | HU-06 | M | Regeneración mientras el alumno estudia | 1. Con el alumno a mitad de un Diagnóstico, el apoderado regenera "Solo Diagnóstico".<br>2. El alumno vuelve a entrar. | Durante la regeneración la ruta no está disponible para el alumno. Después, el Diagnóstico a medias se reinicia con las preguntas nuevas. El avance ya completado (resultados, repaso) se conserva. | Pendiente | |
| UAT-095 | HU-07 | M | Tono y usabilidad para el alumno | 1. Recorrer todo el módulo en un celular con un alumno real del curso. | Botones grandes, lenguaje cercano, refuerzo positivo, sin lecturas densas. Anotar dónde se confunde o se aburre. | Pendiente | |

### Reglas de evaluación y nivel inicial (definiciones de la ronda 1)

Precondición para los casos de nivel inicial: un alumno con curso "1° básico" (o hasta 3°) y una ruta generada con **IA real**.

| ID | HU | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-097 | HU-10 | A | El Desafío permite 2 intentos por ronda | 1. Abrir el Desafío y fallarlo (menos del umbral).<br>2. Revisar el resultado y el centro de la ruta. | Mensaje de ánimo, "te queda 1 intento", botón "Intentar de nuevo" y "Intentos disponibles: 1 de 2". El Desafío sigue abierto. | Pendiente | |
| UAT-098 | HU-10 | A | Dos fallos bloquean el Desafío | 1. Fallar un segundo intento del Desafío. | Resultado "Vamos a practicar un poco más" con botón "Ir al Repaso". El Desafío queda bloqueado con el mensaje de repasar. El centro de la ruta muestra el aviso y el avance vuelve a 0%. El historial de puntajes se conserva. | Pendiente | |
| UAT-099 | HU-08 | A | Repetir Repaso y Diagnóstico tras el bloqueo | 1. Intentar abrir el Diagnóstico sin repasar.<br>2. Abrir el Repaso: ¿parte de cero y avisa "vamos a repasar otra vez"?<br>3. Completar el 100% del Repaso.<br>4. Sacar menos del umbral en un Diagnóstico y revisar el Desafío.<br>5. Sacar el umbral o más en un Diagnóstico. | Sin repasar: Diagnóstico bloqueado. Con el Repaso al 100%: Diagnóstico abierto y Desafío aún cerrado. Con un Diagnóstico bajo el umbral: Desafío cerrado. Con un Diagnóstico aprobado: se abre un Desafío nuevo con 2 intentos otra vez. | Pendiente | |
| UAT-100 | HU-10 | A | Aprobar termina el Desafío | 1. Aprobar el Desafío (porcentaje de aprobación del Desafío o más). | "¡Aprobaste el Desafío!", la ruta queda al 100% y "Aprobado". Ya no se puede rendir de nuevo: el botón no aparece y abrir la URL del Desafío lo informa. | Pendiente | |
| UAT-101 | HU-09 | A | Las evaluaciones siempre son distintas | 1. Hacer 3 Diagnósticos seguidos y 2 Desafíos.<br>2. Anotar los enunciados de cada intento y compararlos. | Ninguna pregunta se repite entre intentos (ni siquiera con otro orden). | Pendiente | |
| UAT-102 | HU-09 | A | Se amplía el banco cuando se agotan las preguntas | 1. Seguir practicando el Diagnóstico, sacando menos del porcentaje, hasta agotar las preguntas nuevas (con llave de IA válida). Al terminar un intento sin aprobar, el sistema empieza a preparar las siguientes. | Si el banco alcanzó, el intento siguiente abre al tiro. Si no, aparece "Estamos preparando preguntas nuevas para ti" con un contador de espera (normalmente menos de 1 minuto), la pantalla reintenta sola y entrega un intento con preguntas que no se habían visto. | Pendiente | |
| UAT-103 | HU-09 | M | Sin IA para ampliar el banco | 1. Con las preguntas agotadas, revocar la llave de IA en el portal del proveedor.<br>2. Pedir un Diagnóstico nuevo. | El alumno ve: "No pudimos preparar preguntas nuevas en este momento. Avísale a tu apoderado: puede ver el motivo en la ruta. Inténtalo de nuevo en un minuto." **No** repite preguntas anteriores. El apoderado ve el motivo en el detalle de la ruta (ver UAT-132). | Pendiente | |
| UAT-104 | HU-06 | A | Dibujos de apoyo en nivel inicial | 1. Generar una ruta para un alumno de "1° básico".<br>2. Revisar la vista previa y las pantallas del alumno. | Al menos el 40% de las preguntas y varias tarjetas del Repaso traen un dibujo hecho de emojis que ayuda a entender. **El tester valora** si los dibujos son útiles y apropiados. | Pendiente | |
| UAT-105 | HU-06 | A | Actividades de cuaderno en nivel inicial | 1. Revisar la vista previa del Diagnóstico y del Desafío de un alumno de 1° básico. | Entre 2 y 3 de cada 10 preguntas son "Actividad de cuaderno", con la respuesta esperada para el adulto. Están mezcladas con las preguntas de alternativas. | Pendiente | |
| UAT-106 | HU-06 | M | Sin actividades en niveles superiores | 1. Generar una ruta para un alumno de "5° básico" o más. | Todas las preguntas son de alternativas, sin actividades de cuaderno. | Pendiente | |
| UAT-107 | HU-09 | A | Validación del adulto: flujo | 1. En el Diagnóstico llegar a una actividad.<br>2. Pulsar "Ya terminé: llamar al adulto".<br>3. Ingresar la contraseña de apoderado.<br>4. Revisar la respuesta esperada y marcar una opción. | El adulto ve la respuesta esperada y tres opciones: "Correcto", "Correcto con ayuda", "Error". Tras marcar, el alumno ve su retroalimentación. | Pendiente | |
| UAT-108 | HU-09 | A | Efecto de cada validación | 1. Resolver varias actividades y marcar Correcto, Correcto con ayuda y Error.<br>2. Ver el puntaje final. | Error cuenta como incorrecta. Correcto y Correcto con ayuda cuentan como correctas. La cantidad "con ayuda" se muestra en el resultado, en otro color (ámbar), con la indicación de reforzar (ver UAT-121). | Pendiente | |
| UAT-109 | HU-09 | A | El alumno no puede validarse solo | 1. En una actividad, ingresar una contraseña incorrecta.<br>2. Ingresar mal la contraseña 5 veces en un minuto.<br>3. Entregar el Desafío con una actividad sin validar. | Contraseña incorrecta: "Contraseña incorrecta. Debe ingresarla el apoderado". Tras 5 fallos, bloqueo de 1 minuto. Una actividad sin validar cuenta como incorrecta. | Pendiente | |
| UAT-110 | HU-10 | A | Actividades en el Desafío sin retroalimentación | 1. En el Desafío validar una actividad como adulto. | Queda "Actividad registrada" sin decir si estuvo bien. El resultado y las explicaciones se ven solo al entregar. Se puede corregir la validación antes de entregar (pide la contraseña otra vez). | Pendiente | |
| UAT-111 | HU-05 | M | Fotos opcionales como apoyo | 1. Abrir "Nueva ruta".<br>2. Crear una ruta con fotos y otra sin fotos del mismo tema.<br>3. Comparar el contenido. | El formulario explica que las fotos son opcionales y sirven de apoyo con ejemplos de ejercicios vistos en clase. Ambas rutas se generan. Con fotos el estilo de los ejercicios se parece al de la clase. | Pendiente | |

| UAT-121 | HU-09 | A | "Con ayuda" se ve distinto en el resultado | 1. Resolver una actividad de cuaderno y marcarla "Correcto con ayuda".<br>2. Terminar la evaluación y ver el resultado. | Cuenta como correcta, pero se ve en color ámbar: aviso "1 actividad resuelta con ayuda del adulto: ¡a reforzar!" y una sección propia "Para reforzar" con esa actividad. No queda mezclada con las correctas. | Pendiente | |
| UAT-122 | HU-11 | A | "Con ayuda" destacado en el panel | 1. Con una actividad resuelta con ayuda, abrir el "Panel". | El contador 🤝 se ve en ámbar y aparece el recuadro "Resolvió con ayuda: conviene reforzar" con el enunciado de cada actividad y su fecha (hasta 5, las más recientes). | Pendiente | |
| UAT-123 | HU-05 | A | % de aprobación del Desafío configurable al crear la ruta | 1. En "Nueva ruta" poner 90% para abrir el Desafío y 70% para aprobarlo.<br>2. Generar la ruta y abrir su detalle y la vista del alumno. | Los dos porcentajes se guardan y se muestran por separado ("abre el Desafío con 90%", "se aprueba con 70%"). El alumno ve cada porcentaje donde corresponde. | Pendiente | |
| UAT-124 | HU-10 | A | El Desafío se aprueba con su propio porcentaje | 1. Con Diagnóstico 90% y Desafío 70%, sacar 80% en el Desafío. | Aprueba (80% ≥ 70%) aunque sea menos que el 90% del Diagnóstico. El mensaje dice "Necesitas 70%" en un intento fallido. | Pendiente | |
| UAT-125 | HU-11 | A | Cambiar los porcentajes de una ruta existente | 1. Abrir una ruta lista: sección "Reglas de aprobación".<br>2. Subir el % del Desafío por sobre el último puntaje del alumno y guardar.<br>3. Revisar el panel y la vista del alumno.<br>4. Volver al valor anterior. | Aparece "Guardado" y el avance se recalcula: con la regla más exigente el intento cuenta como fallido (queda 1 intento) y el estado vuelve a "En Desafío". Al restablecer, vuelve a "Completado". | Pendiente | |
| UAT-126 | HU-05 | M | Porcentajes inválidos | 1. En "Reglas de aprobación" probar 0, 101 y un campo vacío. | No se guardan (límites de 1 a 100). | Pendiente | |
| UAT-127 | HU-02 | A | Aviso (toast) del curso al crear un alumno | 1. Crear un alumno con "2° básico".<br>2. Crear otro con "5° básico".<br>3. Crear otro con un curso mal escrito ("segundo año"). | Aparece un aviso flotante que se queda hasta cerrarlo. "2° básico": nivel inicial, con dibujos y actividades de cuaderno. "5° básico": 4° básico o superior, sin actividades. "segundo año": advertencia de curso no reconocido con ejemplos de cómo escribirlo. Los tres piden revisar que el curso esté bien. | Pendiente | |
| UAT-128 | HU-02 | A | Cambiar el curso de un alumno | 1. En "Alumnos" pulsar "Cambiar curso", escribir otro curso y guardar.<br>2. Revisar la etiqueta del alumno y el aviso.<br>3. Abrir una ruta ya creada de ese alumno. | Se guarda el curso, se muestra el aviso y la etiqueta cambia (Nivel inicial, 4° básico o superior, Curso no reconocido). El contenido de las rutas ya creadas **no cambia**: hay que regenerarlas para aplicar el nuevo nivel. | Pendiente | |
| UAT-129 | HU-05 | M | Recordatorio del curso al crear una ruta | 1. Abrir "Nueva ruta" para un alumno de 1° básico y otro de 5° básico. | Se ve un recuadro con el alumno, su curso, qué entendió el sistema y el enlace "Revisar o cambiar el curso". | Pendiente | |

| UAT-130 | HU-10 | A | Un Desafío rendido antes de las reglas nuevas no cuenta como intento fallido | 1. En una ruta creada antes de la regla de 2 intentos, con un Desafío ya rendido y no aprobado, entrar como alumno.<br>2. Abrir el centro de la ruta y el Desafío. | Aparecen los 2 intentos disponibles y no hay bloqueo. El puntaje anterior se conserva como historial (último y mejor). Un Desafío aprobado antes sigue contando como aprobado. | Pendiente | |
| UAT-131 | HU-09 | A | La espera por preguntas nuevas es tolerable | 1. Agotar las preguntas de un Desafío o Diagnóstico y pedir un intento nuevo.<br>2. Anotar cuánto tarda en abrirse. | Se muestra "Estamos preparando…" con un contador. Normalmente abre en menos de 1 minuto. Si tarda más de 2,5 minutos aparece "Está tardando más de lo normal" con botón "Volver a la ruta". Nunca queda esperando sin aviso. | Pendiente | |
| UAT-132 | HU-06 | A | El apoderado ve por qué falló la preparación | 1. Con las preguntas agotadas, revocar la llave de IA en el portal del proveedor.<br>2. Como alumno, pedir un intento nuevo.<br>3. Como apoderado, abrir el detalle de esa ruta. | La ruta muestra un aviso amarillo "No se pudieron preparar preguntas nuevas de …" con el motivo exacto y qué hacer (esperar un minuto o regenerar esa etapa). Mientras se prepara, un aviso azul "Preparando preguntas nuevas…". | Pendiente | |
| UAT-133 | HU-06 | M | No se gasta IA de más (asistido) | 1. Abrir la consola del servidor.<br>2. Aprobar un Desafío al primer intento.<br>3. En otra ruta, fallar un intento. | Al aprobar no aparece ninguna línea `[ia …] ampliando el banco`. Al fallar un intento sí aparece, para dejar listo el siguiente. | Pendiente | |
| UAT-134 | HU-06 | M | La IA se equivoca en el conteo sin que se note | 1. Crear o regenerar varias rutas con IA real (nivel inicial y superior).<br>2. Revisar que todas terminen en "Ruta lista" y la consola del servidor. | Todas terminan bien. Si la IA manda menos preguntas de las pedidas, el sistema pide solo las que faltan (línea "Se piden las N que faltan") y no vuelve a empezar. | Pendiente | |

| UAT-135 | HU-05 | A | Editar título y temario de una ruta existente | 1. Abrir una ruta lista y desplegar "Contexto de la ruta".<br>2. Cambiar el título y agregar texto al temario.<br>3. Desmarcar todas las etapas y pulsar "Guardar solo el contexto". | Aparece "Contexto guardado" y el título nuevo se ve arriba. Las preguntas, el Repaso y el avance del alumno **no cambian**. El contexto nuevo se usará cuando se regenere o se amplíe el banco de preguntas. | Pendiente | |
| UAT-136 | HU-05 | A | Agregar y quitar fotos de una ruta existente | 1. En "Contexto de la ruta" ver las fotos actuales (miniaturas).<br>2. Pulsar "Quitar" en una (y probar "Deshacer").<br>3. Agregar una foto nueva con cámara o galería.<br>4. Guardar. | Se ven las fotos guardadas. Las quitadas se marcan "Se quitará · Deshacer". El contador "(n de 10)" cuenta las que quedan más las nuevas. Tras guardar, la lista refleja los cambios. Nunca se pasa de 10 fotos y solo se aceptan JPG, PNG o WebP. | Pendiente | |
| UAT-137 | HU-06 | A | Regenerar con el contexto nuevo (IA real) | 1. Agregar al temario un tema nuevo y subir una foto de ejercicios de ese tema.<br>2. Dejar marcados Diagnóstico y Desafío y pulsar "Guardar y regenerar (2 etapas)".<br>3. Esperar y revisar la "Vista previa del contenido". | La ruta pasa por "Preparando tu ruta" y vuelve a "Ruta lista". Las preguntas nuevas incluyen el tema agregado y se parecen a los ejercicios de la foto. El Repaso queda igual. **El tester valora** si el contexto nuevo se nota. | Pendiente | |
| UAT-138 | HU-08 | A | Regenerar el Repaso obliga a repasar otra vez | 1. Con un alumno que ya completó el Repaso, regenerar el Repaso desde "Contexto de la ruta" (casilla Repaso).<br>2. Entrar como alumno. | Aparece la advertencia "El alumno deberá repasar otra vez". El alumno ve el Repaso de nuevo a cero (0 tarjetas vistas) y debe completarlo para volver a abrir el Diagnóstico. Sus puntajes anteriores de Diagnóstico y Desafío siguen en el historial y en el panel. | Pendiente | |
| UAT-139 | HU-06 | M | Si falla la regeneración no se pierde nada | 1. Regenerar con una llave de IA revocada, o subir una foto ilegible.<br>2. Revisar la ruta y el panel. | La ruta sigue "lista" con el contenido anterior y un aviso amarillo con el motivo. El contexto nuevo queda guardado. Una foto que la IA no puede leer se informa como problema de foto ("Quita esa foto o sube otra"), **no** como llave inválida. | Pendiente | |
| UAT-140 | HU-06 | M | Límites y permisos de la edición | 1. Intentar editar el contexto mientras la ruta se está generando.<br>2. Con otro apoderado, abrir por URL las fotos o la edición de esa ruta.<br>3. Con un alumno, abrir por URL las fotos de la ruta. | Mientras se genera no se puede editar ("La ruta se está generando…"). Otro apoderado recibe "no encontrada". Un alumno no puede ver las fotos del cuaderno ni editar. | Pendiente | |
| UAT-141 | HU-06 | M | Regenerar solo el Repaso desde el botón antiguo | 1. Con un alumno que completó el Repaso, usar "Solo Repaso" al final de la ruta.<br>2. Entrar como alumno. | Mismo efecto que UAT-138: el alumno repasa otra vez y se conserva el historial de puntajes. El texto de la sección lo advierte. | Pendiente | |

### Módulo 5. Dashboard del apoderado (HU-11)

| ID | HU | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-112 | HU-11 | A | Datos del panel por ruta | 1. Con un alumno que ya estudió, abrir "Panel". | Por cada ruta: estado, intentos de Diagnóstico, mejor puntaje de Diagnóstico, último y mejor puntaje del Desafío, intentos de Desafío disponibles y fecha de última actividad. Agrupado por alumno. | Pendiente | |
| UAT-113 | HU-11 | A | Los estados se actualizan | 1. Revisar el panel antes de estudiar, tras el Repaso, tras aprobar el Diagnóstico y tras aprobar el Desafío. | "En Repaso" → "En Diagnóstico" → "En Desafío" → "Completado", con barra de avance. | Pendiente | |
| UAT-114 | HU-11 | A | Listo para su prueba | 1. Aprobar el Desafío y revisar el panel. | Aparece "Aprobó el Desafío: listo para su prueba". | Pendiente | |
| UAT-115 | HU-11 | M | Aviso de repetición | 1. Agotar los 2 intentos del Desafío y revisar el panel. | Aviso amarillo de que debe repasar y aprobar un Diagnóstico, estado "En Repaso", y "Veces que repasó de nuevo: 1". | Pendiente | |
| UAT-116 | HU-11 | M | Actividades de cuaderno en el panel | 1. Con actividades validadas (Correcto, con ayuda y Error), abrir el panel. | Resumen "Actividades de cuaderno ✔ n · 🤝 n · ✖ n". | Pendiente | |
| UAT-117 | HU-11 | A | El panel solo muestra datos propios | 1. Con otro apoderado, abrir su "Panel". | No ve alumnos ni rutas de otro apoderado. | Pendiente | |
| UAT-118 | HU-11 | M | Rutas generando o con error | 1. Tener una ruta "Generando" o "Con error" y abrir el panel. | Se indica el estado y hay un enlace "Ver ruta". | Pendiente | |
| UAT-119 | HU-11 | M | Panel en celular | 1. Abrir el panel en un celular. | Sin scroll horizontal, datos legibles. | Pendiente | |
| UAT-120 | HU-11 | M | Navegación del apoderado | 1. Iniciar sesión como apoderado y usar el menú. | Llega al Panel y el menú tiene "Panel", "Alumnos", "Asignaturas" y "Conectar IA". | Pendiente | |

### Requisitos no funcionales y transversales

| ID | Área | Prioridad | Caso | Pasos | Resultado esperado | Estado | Obs. |
|---|---|---|---|---|---|---|---|
| UAT-062 | UX móvil | A | Uso en celular | 1. Recorrer todo el flujo en un celular real (ancho cercano a 390 px). | No hay scroll horizontal. Los botones son grandes y fáciles de tocar. El texto es legible. | Pendiente | |
| UAT-063 | UX escritorio | M | Uso en computador | 1. Recorrer el flujo en pantalla de 1280 px o más. | El contenido se centra en una columna legible. Nada queda deformado. | Pendiente | |
| UAT-064 | Compatibilidad | M | Navegadores | 1. Repetir el flujo principal (UAT-001, 005, 026, 034, 050) en Chrome, Edge, Safari y Chrome en Android. | Se comporta igual en todos. | Pendiente | |
| UAT-065 | Accesibilidad | M | Teclado y foco | 1. Navegar un formulario solo con Tab y Enter. | El foco es visible (borde naranja) y se puede completar y enviar con el teclado. | Pendiente | |
| UAT-066 | Accesibilidad | M | Contraste y lectura | 1. Revisar textos, botones y mensajes de error con buena y mala luz de pantalla. | Todo se lee con claridad. Los errores no dependen solo del color (incluyen texto). | Pendiente | |
| UAT-067 | Lenguaje | M | Tono y textos | 1. Leer todas las pantallas del apoderado. | Todo está en español, con tono sobrio y mensajes de error comprensibles para un usuario no técnico. | Pendiente | |
| UAT-068 | Seguridad | A | Cookie de sesión | 1. En las herramientas del navegador, abrir Aplicación y Cookies. | La cookie `session` es `HttpOnly` y `SameSite=Lax`. | Pendiente | |
| UAT-069 | Seguridad | M | Contraseñas ocultas | 1. Revisar los campos de contraseña y de llave. | Se muestran como puntos y no quedan visibles en la pantalla ni en la URL. | Pendiente | |
| UAT-070 | Resiliencia | M | Servidor o red caída | 1. Cortar la red a mitad de una acción (crear alumno, crear asignatura, enviar ruta). | La app muestra un mensaje y no se queda en un estado roto. Al volver la red se puede reintentar. | Pendiente | |

## 4. Resumen de ejecución

| Módulo | Casos | Aprobados | Rechazados | Bloqueados |
|---|---|---|---|---|
| Módulo 1 (UAT-001 a 020) | 20 | | | |
| Módulo 2 (UAT-021 a 033) | 13 | | | |
| Módulo 3 (UAT-034 a 061, 071 y 096) | 30 | | | |
| Módulo 4 (UAT-072 a 095) | 24 | | | |
| Reglas de evaluación, nivel inicial, configuración y edición de contexto (UAT-097 a 111 y 121 a 141) | 36 | | | |
| Módulo 5 (UAT-112 a 120) | 9 | | | |
| Transversales (UAT-062 a 070) | 9 | | | |
| **Total** | **141** | | | |

## 5. Registro de defectos

| ID defecto | Caso UAT | Descripción | Severidad (Crítica, Alta, Media, Baja) | Evidencia | Estado |
|---|---|---|---|---|---|
| UAT-R1 | UAT-050 / 056 | Con OpenAI, la IA devolvió 5 preguntas de Diagnóstico en lugar de 10 en dos intentos seguidos. La generación pedía todo en una sola llamada y el reintento no informaba a la IA del error. En una regeneración, el aviso hacía parecer que la ruta no se había creado. | Alta | Captura del apoderado (ruta "PRUEBA 3") | Corregido: una llamada por etapa, hasta 3 intentos informando el motivo, guardado por etapa. Pendiente de re-prueba (UAT-071). |

## 6. Criterios de aceptación de la ronda

- Todos los casos de prioridad **A** aprobados.
- Ningún defecto de severidad Crítica o Alta abierto.
- Los casos de prioridad **M** rechazados tienen un plan acordado.
- UAT-050 a UAT-052, UAT-071, UAT-101 a UAT-105 ejecutados con una llave real de IA.

## 7. Aprobación

| Rol | Nombre | Fecha | Firma | Decisión (Aprobado, Con observaciones, Rechazado) |
|---|---|---|---|---|
| Responsable de producto | | | | |
| Apoderado de prueba | | | | |
| Equipo técnico | | | | |

## 8. Cómo repetir las pruebas con datos limpios

La base de desarrollo (`prisma/dev.db`) puede tener cuentas de pruebas anteriores. Para empezar desde cero, detener el servidor, borrar `prisma/dev.db` y la carpeta `uploads/`, y ejecutar `npm run db:push`. Hacerlo solo en un entorno de pruebas.

## 9. Casos bloqueados

Ninguno: todos los módulos del PRD (HU-01 a HU-11) están implementados.

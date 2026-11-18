Product Requirements Document (PRD): EstudioAI (Aprendo)

1\. Resumen Ejecutivo y Visión

* **Visión:** Empoderar a los apoderados y estudiantes escolares mediante una aplicación web responsiva (*Mobile-First*) que transforma los apuntes físicos, libros y temarios de evaluación en rutas de aprendizaje personalizadas, lúdicas y progresivas impulsadas por Inteligencia Artificial.  
* **Propuesta de Valor:** Elimina el tiempo que los padres invierten preparando guías de estudio y combate la frustración de los alumnos frente a la materia, estructurando el estudio en tres niveles de dominio progresivo (**Repaso → Diagnóstico → Desafío**) utilizando sus propios cuadernos como fuente de verdad.

---

2\. Problema y Oportunidad

* **El Problema:** Los estudiantes suelen estudiar de forma pasiva (releyendo cuadernos) sin validar si realmente comprenden la materia antes de una evaluación. Por otro lado, los apoderados carecen de tiempo o herramientas pedagógicas para crear evaluaciones de práctica alineadas exactamente con lo que el profesor vio en clases.  
* **La Oportunidad:** Aprovechar las capacidades multimodales de los Modelos de Lenguaje (LLMs) actuales para digitalizar fotografías de cuadernos/libros y generar contenido pedagógico estructurado en segundos, bajo un esquema de "Trae tu propia llave" (BYOK \- *Bring Your Own Key*) que mantiene bajos los costos operativos del sistema.

---

3\. Perfiles de Usuario (Personas)

3.1. Apoderado (Administrador / Tutor)

* **Perfil:** Padre, madre o tutor responsable del rendimiento académico del escolar. Nivel técnico básico a intermedio (neófito en configuraciones de IA).  
* **Objetivos:** Configurar rápidamente el entorno de estudio, digitalizar el material escolar desde su teléfono, personalizar la exigencia de las pruebas y monitorear si su hijo realmente está estudiando y aprendiendo.

3.2. Alumno (Estudiante Escolar)

* **Perfil:** Estudiante de educación básica o media. Nativo digital, acostumbrado a interfaces dinámicas y gamificadas, con baja tolerancia a lecturas densas y aburridas.  
* **Objetivos:** Entender la materia rápidamente, practicar sin miedo a equivocarse y sentirse preparado para obtener una buena calificación en su evaluación real.

---

4\. Alcance del Proyecto (MVP v1.0)

4.1. Dentro del Alcance (In-Scope)

* WebApp responsiva optimizada para uso móvil (captura de cámara y galería) y escritorio.  
* Sistema de autenticación dual: registro de Apoderado (email/contraseña) y creación de sub-cuentas de Alumno (usuario/contraseña simple sin requerir email).  
* Asistente guiado paso a paso para configurar el proveedor de IA y validar la *API Key* (ej. OpenAI, Google Gemini, Anthropic).  
* Gestión de Asignaturas y creación de Rutas de Aprendizaje a partir de texto (temario) \+ carga múltiple de imágenes (fotos de cuaderno/libro).  
* Motor de generación automática de las 3 etapas pedagógicas: **Repaso**, **Diagnóstico** y **Desafío**.  
* Lógica de desbloqueo secuencial parametrizable por el apoderado.  
* Dashboard de progreso y métricas para el apoderado.

4.2. Fuera del Alcance (Out-of-Scope)

* Aplicaciones móviles nativas (iOS/Android en tiendas).  
* Pasarela de pagos, suscripciones o venta de créditos internos.  
* Integración con plataformas escolares externas (Google Classroom, SchoolNet, etc.).  
* Edición manual profunda de las preguntas generadas por la IA (en v1 solo se permite regenerar la ruta completa o por etapa si hay error).  
* Funcionalidades sociales, rankings entre distintos usuarios o chat libre con la IA para el alumno.

---

5\. Flujos de Usuario y Requisitos Funcionales

Módulo 1: Autenticación y Gestión de Perfiles

* **HU-01 (Registro Apoderado):** Como apoderado, quiero registrarme con mi correo y contraseña para administrar las rutas de estudio de mis hijos.  
* **HU-02 (Creación Perfil Alumno):** Como apoderado, quiero crear uno o más perfiles de alumno asignándoles un nombre\_usuario y una contraseña sencilla, para que puedan iniciar sesión sin necesidad de tener correo electrónico propio.  
  * *Criterio de Aceptación:* El alumno inicia sesión en una pantalla dedicada o mediante un selector de rol usando únicamente su usuario y clave.

Módulo 2: Configuración del "Cerebro IA" (Zero-Friction Onboarding)

* **HU-03 (Configuración Guiada de API Key):** Como apoderado neófito en tecnología, quiero un asistente visual paso a paso que me explique cómo obtener y pegar mi *API Key*, para conectar la inteligencia artificial sin frustrarme.  
  * *Criterios de Aceptación:*  
    * Selector visual de proveedores soportados (ej. Google Gemini, OpenAI, Anthropic).  
    * Enlace directo externo al portal de llaves del proveedor seleccionado \+ guía visual (capturas o GIFs de 3 pasos: *1\. Inicia sesión, 2\. Haz clic en Crear Llave, 3\. Copia y pega aquí*).  
    * Botón **"Probar Conexión"** que realiza una llamada mínima de validación y muestra un mensaje claro de éxito o error en lenguaje humano (ej. *"Llave válida y lista"* o *"La llave no tiene saldo o está mal copiada"*).  
    * La llave debe almacenarse encriptada en el servidor.

Módulo 3: Creación de Asignaturas y Rutas de Aprendizaje (Apoderado)

* **HU-04 (Gestión de Asignaturas):** Como apoderado, quiero crear asignaturas (ej. Matemáticas, Historia, Ciencias) asociadas a un alumno para mantener el material ordenado.  
* **HU-05 (Carga de Material y Parametrización):** Como apoderado, quiero crear una nueva Ruta de Aprendizaje para una evaluación ingresando el temario, subiendo fotos del cuaderno/libro y definiendo las reglas de evaluación.  
  * *Criterios de Aceptación:*  
    * Campo de texto para pegar o escribir el **Temario indicado por el profesor**.  
    * Componente de carga de imágenes compatible con móviles (capture="environment" para abrir cámara directamente o seleccionar múltiples fotos desde la galería).  
    * Parámetros configurables por ruta:  
      * Cantidad de preguntas del **Diagnóstico** (ej. 5 a 15, por defecto 10).  
      * Cantidad de preguntas del **Desafío** (ej. 10 a 30, por defecto 15).  
      * Porcentaje mínimo de aprobación del Diagnóstico para desbloquear el Desafío (por defecto **90%**).  
* **HU-06 (Generación Automática con IA):** Como apoderado, al guardar la ruta, quiero que el sistema procese automáticamente las imágenes (OCR multimodal) junto al temario y genere las 3 etapas sin intervención manual.  
  * *Criterio de Aceptación:* Mostrar un estado de carga claro con pasos visuales (*"Leyendo apuntes..."*, *"Creando tarjetas de repaso..."*, *"Diseñando evaluación..."*).

Módulo 4: Experiencia de Aprendizaje Progresivo (Alumno)

* **HU-07 (Visualización de Asignaturas y Rutas):** Como alumno, quiero ver mis asignaturas y las rutas pendientes con un indicador claro de mi progreso y qué etapas tengo desbloqueadas.  
* **HU-08 (Etapa 1 \- Repaso Lúdico):** Como alumno, quiero repasar los conceptos clave mediante tarjetas interactivas (*flashcards*), resúmenes visuales con ejemplos cotidianos o mini-juegos de asociación, para entender la materia antes de ser evaluado.  
  * *Criterio de Aceptación:* El sistema registra la interacción con cada tarjeta/bloque de repaso. Al completar el **100%** del repaso, se desbloquea automáticamente la Etapa 2\.  
* **HU-09 (Etapa 2 \- Diagnóstico con Pistas):** Como alumno, quiero responder una evaluación de práctica donde pueda solicitar **pistas** si me atasco y recibir retroalimentación inmediata en cada pregunta.  
  * *Criterios de Aceptación:*  
    * Cada pregunta incluye un botón "Ver Pista" generado por la IA que orienta sin dar la respuesta directa.  
    * Al finalizar, muestra el porcentaje de logro y las respuestas explicadas.  
    * El alumno puede repetir el diagnóstico tantas veces como necesite (idealmente con variaciones de preguntas o en orden aleatorio).  
    * **Regla de Desbloqueo:** Si el puntaje obtenido es igual o superior al umbral configurado por el apoderado (ej. \>= 90%), se desbloquea la Etapa 3\.  
* **HU-10 (Etapa 3 \- Desafío Formal):** Como alumno, quiero rendir una evaluación formal sin pistas ni ayuda inmediata que simule la prueba real, para comprobar que domino el temario.  
  * *Criterios de Aceptación:*  
    * Sin botón de pistas ni retroalimentación hasta entregar la prueba completa.  
    * Al finalizar, entrega nota/porcentaje final, desglose de aciertos/errores y explicación de los fallos.

Módulo 5: Dashboard de Seguimiento (Apoderado)

* **HU-11 (Panel de Control):** Como apoderado, quiero ver un resumen del avance de mi hijo para saber si está listo para su prueba.  
  * *Criterios de Aceptación:* Visualizar por cada ruta: estado actual (En Repaso / En Diagnóstico / En Desafío / Completado), cantidad de intentos en Diagnóstico, mejor puntaje en Diagnóstico, puntaje en Desafío y fecha de última actividad.

---

6\. Modelo de Datos y Arquitectura Lógica

6.1. Entidades Principales (Esquema Conceptual)

* **Parent (Apoderado):** id, email, password\_hash, ai\_provider (enum: openai, gemini, anthropic), encrypted\_api\_key, created\_at.  
* **Student (Alumno):** id, parent\_id (FK), username, password\_hash, display\_name, grade\_level (curso/nivel escolar).  
* **Subject (Asignatura):** id, student\_id (FK), name, color\_tag, icon.  
* **LearningRoute (Ruta de Aprendizaje):** id, subject\_id (FK), title (ej. "Prueba Fracciones"), syllabus\_text (temario), source\_images\_urls (array), config\_diag\_questions\_count (int), config\_challenge\_questions\_count (int), config\_unlock\_threshold (int, default 90), status (generating, ready, error).  
* **RouteContent (Contenido Generado por IA):** id, route\_id (FK), review\_modules\_json (conceptos/flashcards), diagnostic\_pool\_json (preguntas \+ pistas \+ explicaciones), challenge\_pool\_json (preguntas formales \+ explicaciones).  
* **StudentAttempt (Intentos y Progreso):** id, student\_id (FK), route\_id (FK), stage (review, diagnostic, challenge), score\_percentage (float), completed (boolean), answers\_detail\_json, created\_at.

6.2. Arquitectura de Procesamiento IA (Pipeline)

1. **Ingesta:** El frontend comprime las imágenes en el cliente (máx. 1024px-1500px en su lado mayor para reducir latencia y consumo de tokens) antes de subirlas.  
2. **Orquestación de Prompt:** El backend desencripta temporalmente la API Key del apoderado en memoria, envía las imágenes \+ el syllabus\_text \+ el grade\_level del alumno al proveedor seleccionado, exigiendo una respuesta estricta en formato **JSON Schema** (Structured Outputs) que contenga las 3 etapas.  
3. **Validación y Persistencia:** El backend valida que el JSON cumpla con la cantidad de preguntas solicitadas y lo guarda en RouteContent.

---

7\. Requisitos No Funcionales

* **Seguridad de Credenciales:** Las *API Keys* de los apoderados deben cifrarse en reposo mediante **AES-256** y nunca exponerse al frontend una vez guardadas (mostrar solo los últimos 4 caracteres, ej. sk-...9a8b).  
* **Rendimiento y Optimización Móvil:** Compresión automática de imágenes en el navegador antes de la subida para garantizar funcionamiento fluido en redes móviles (4G/5G).  
* **Tolerancia a Fallos de IA:** Si la API del proveedor falla por cuota excedida o error de red, el sistema debe mostrar un mensaje claro al apoderado indicando el motivo exacto devuelto por el proveedor y permitir reintentar sin perder las fotos ya subidas.  
* **Diseño UX/UI:** Interfaz limpia, botones grandes táctiles, alto contraste y lenguaje adaptado al rol (sobrio y analítico para el apoderado; visual, con barras de progreso y refuerzo positivo para el alumno).

---

8\. Métricas de Éxito (KPIs) y Riesgos

8.1. KPIs del MVP

* **Tasa de Activación (Onboarding):** % de apoderados registrados que logran validar exitosamente su *API Key* y crear su primera ruta de aprendizaje.  
* **Tasa de Finalización de Ruta:** % de rutas iniciadas por alumnos que llegan a completar al menos un *Desafío*.  
* **Efectividad Pedagógica:** Incremento promedio de puntaje entre el primer *Diagnóstico* y el *Desafío* final de una misma ruta.

8.2. Riesgos y Mitigaciones

* **Riesgo 1: Fricción en la obtención de la API Key.**  
  * *Mitigación:* Priorizar proveedores con capas gratuitas fáciles de activar (como Google AI Studio / Gemini) como opción recomendada por defecto en el asistente guiado.  
* **Riesgo 2: Letra manuscrita ilegible en fotos de cuadernos.**  
  * *Mitigación:* Instruir en el *System Prompt* de la IA que utilice el **Temario del profesor** como ancla principal para desambiguar palabras difíciles de leer en las fotos del cuaderno, y añadir un tip visual al subir fotos (*"Asegúrate de tener buena luz"*).  
* **Riesgo 3: Alucinaciones de la IA en materias exactas (Matemáticas/Física).**  
  * *Mitigación:* Configurar temperatura baja (0.2 \- 0.3) en las llamadas a la API para la generación de preguntas y exigir en el prompt que el modelo resuelva paso a paso el ejercicio internamente antes de definir la alternativa correcta.


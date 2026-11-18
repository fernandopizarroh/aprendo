# Requisitos: Asignaturas y Rutas de Aprendizaje (PRD Módulo 3)

## HU-04 Gestión de asignaturas
1. WHEN el apoderado crea una asignatura con nombre, color e ícono para un alumno suyo, THE sistema SHALL guardarla asociada a ese alumno.
2. THE sistema SHALL listar las asignaturas por alumno.

## HU-05 Carga de material y parámetros
1. THE formulario SHALL incluir un campo de texto para el temario del profesor.
2. THE formulario SHALL permitir capturar con la cámara (`capture="environment"`) o elegir varias fotos de la galería, y mostrar el consejo "Asegúrate de tener buena luz".
3. THE sistema SHALL comprimir las imágenes en el navegador antes de subirlas (lado mayor máx. 1500px).
4. THE formulario SHALL permitir configurar preguntas de Diagnóstico (5 a 15, default 10), preguntas de Desafío (10 a 30, default 15) y umbral de aprobación (default 90%).

## HU-06 Generación automática con IA
1. WHEN el apoderado guarda la ruta, THE sistema SHALL generar Repaso, Diagnóstico y Desafío sin intervención manual.
2. WHILE se genera, THE UI SHALL mostrar pasos: "Leyendo apuntes...", "Creando tarjetas de repaso...", "Diseñando evaluación...".
3. THE sistema SHALL validar que el contenido tenga la cantidad de preguntas pedida antes de marcar la ruta como `ready`.
4. IF el proveedor falla, THEN THE sistema SHALL marcar la ruta `error`, mostrar el motivo exacto y permitir reintentar sin volver a subir las fotos.
5. THE sistema SHALL permitir regenerar la ruta completa o una etapa.
6. IF no hay API key configurada, THEN THE sistema SHALL dirigir al apoderado al asistente de configuración.

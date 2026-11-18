# Requisitos: Experiencia de Aprendizaje del Alumno (PRD Módulo 4)

## HU-07 Asignaturas y rutas
1. THE sistema SHALL mostrar al alumno sus asignaturas y rutas `ready`, con barra de progreso y etapas desbloqueadas.

## HU-08 Repaso lúdico
1. THE sistema SHALL presentar el repaso como flashcards y resúmenes con ejemplos cotidianos.
2. WHEN el alumno interactúa con una tarjeta, THE sistema SHALL registrar esa interacción.
3. WHEN el alumno completa el 100% del repaso, THE sistema SHALL desbloquear el Diagnóstico.

## HU-09 Diagnóstico con pistas
1. WHEN el alumno pulsa "Ver Pista", THE sistema SHALL mostrar la pista sin revelar la respuesta.
2. WHEN el alumno responde una pregunta, THE sistema SHALL mostrar retroalimentación inmediata.
3. WHEN termina, THE sistema SHALL mostrar el porcentaje y las respuestas explicadas.
4. THE alumno SHALL poder repetir el Diagnóstico; cada intento SHALL usar orden aleatorio de preguntas y de alternativas.
5. IF el puntaje es >= umbral de la ruta, THEN THE sistema SHALL desbloquear el Desafío.

## HU-10 Desafío formal
1. THE Desafío SHALL no mostrar pistas ni retroalimentación hasta que el alumno entregue la prueba completa.
2. WHEN el alumno entrega, THE sistema SHALL mostrar nota/porcentaje, desglose de aciertos y errores, y explicación de cada fallo.
3. IF la etapa no está desbloqueada, THEN THE sistema SHALL rechazar el acceso desde la UI y desde la API.

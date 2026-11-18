# Requisitos: Evaluaciones v2 (definiciones de la ronda 1 de UAT)

Fuente: `docs/DEFINICIONES-PRODUCTO.md`.

## R1. Desafío con 2 intentos por ronda
1. WHEN el alumno entrega un Desafío con puntaje >= porcentaje de aprobación, THE sistema SHALL marcar la ruta como completada y no permitir más intentos de Desafío.
2. WHEN el alumno entrega un Desafío con puntaje menor, THE sistema SHALL contar un intento fallido y mostrar cuántos intentos le quedan.
3. WHEN el alumno acumula 2 intentos fallidos en una ronda, THE sistema SHALL bloquear el Desafío, iniciar una ronda nueva y exigir el Repaso al 100% y un Diagnóstico aprobado antes de abrir un Desafío nuevo con 2 intentos.
4. THE sistema SHALL conservar el historial de intentos y puntajes de todas las rondas.

## R2. Evaluaciones siempre distintas
1. THE sistema SHALL armar cada intento de Diagnóstico y de Desafío solo con preguntas no usadas en intentos anteriores de la misma ruta.
2. WHEN se crea una ruta, THE sistema SHALL generar un banco de 2 lotes por evaluación.
3. WHEN no quedan preguntas nuevas suficientes para un intento, THE sistema SHALL generar un lote nuevo en segundo plano con la llave del apoderado y avisar al alumno que espere.
4. IF no se puede generar un lote nuevo, THEN THE sistema SHALL informar al alumno que avise a su apoderado y SHALL NOT repetir preguntas.
5. WHEN se regenera una etapa, THE sistema SHALL reemplazar su banco y descartar los intentos incompletos de esa etapa.

## R3. Nivel inicial (hasta 3° básico)
1. WHERE el curso del alumno es hasta 3° básico, THE sistema SHALL pedir a la IA un lenguaje simple, dibujos de emojis en al menos el 40% de las preguntas y entre 2 y 3 actividades de cuaderno de cada 10 preguntas.
2. WHERE el curso es superior, THE sistema SHALL generar solo preguntas de alternativas.

## R4. Validación del adulto
1. WHEN el alumno termina una actividad de cuaderno, THE sistema SHALL pedir la contraseña de apoderado antes de mostrar la respuesta esperada.
2. THE adulto SHALL poder marcar Correcto, Correcto con ayuda o Error.
3. THE sistema SHALL contar Error como incorrecta y las otras dos como correctas, y registrar las "con ayuda".
4. THE sistema SHALL contar como incorrecta una actividad sin validar.
5. IF la contraseña es incorrecta 5 veces en un minuto, THEN THE sistema SHALL bloquear nuevos intentos durante un minuto.
6. IN el Desafío, THE sistema SHALL NOT revelar el resultado de la validación hasta la entrega.

## R5. Fotos opcionales
1. THE sistema SHALL permitir crear una ruta sin fotos.
2. WHERE hay fotos, THE sistema SHALL indicarle a la IA que son ejemplos de ejercicios ya trabajados en clase.

## R6. "Con ayuda" visible para reforzar
1. THE sistema SHALL contar "Correcto con ayuda" como correcta y mostrarla en otro color, separada de las correctas, en el resultado del alumno ("Para reforzar").
2. THE panel del apoderado SHALL destacar las actividades resueltas con ayuda y listar las m�s recientes.

## R7. Porcentajes configurables
1. THE apoderado SHALL poder definir, por ruta, el porcentaje para abrir el Desaf�o (Diagn�stico) y el porcentaje para aprobar el Desaf�o, de forma independiente.
2. WHEN el apoderado cambia un porcentaje, THE sistema SHALL recalcular el avance de los alumnos con las reglas nuevas.
3. THE sistema SHALL aceptar solo valores de 1 a 100.

## R8. Aviso sobre el curso
1. WHEN el apoderado crea o cambia el curso de un alumno, THE sistema SHALL mostrar un aviso con el nivel reconocido (inicial, 4� b�sico o superior, o no reconocido) y pedir revisar el curso.
2. WHEN el apoderado crea una ruta, THE sistema SHALL recordar el curso del alumno y el nivel reconocido.
3. THE apoderado SHALL poder cambiar el curso de un alumno. El contenido ya generado no cambia hasta regenerar la ruta.

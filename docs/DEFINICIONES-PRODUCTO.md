# Definiciones de producto (ronda 1 de UAT)

Decisiones tomadas por el responsable del producto después de probar el MVP. Complementan `docs/PRD-Aprendo.md`. Si hay conflicto, mandan estas definiciones.

## 1. Fotos opcionales
- Subir fotos al crear una ruta es opcional.
- Las fotos son un apoyo: dan a la IA contexto sobre el tipo de ejercicios que el alumno ya trabajó en clases. No son la fuente principal; el temario sigue siendo el ancla.

## 1b. Editar el contexto de una ruta
- El apoderado puede cambiar en cualquier momento el título, el temario y las fotos (agregar o quitar, hasta 10 en total) de una ruta ya creada.
- Después elige qué etapas **regenerar** con el contexto nuevo (Repaso, Diagnóstico, Desafío). Regenerar reemplaza el banco de esa etapa; los puntajes e intentos ya terminados del alumno se conservan como historial y los intentos a medias de esa etapa se pierden.
- Si se regenera el Repaso, el alumno **debe repasar otra vez** (las tarjetas ya no son las mismas).
- Si no se elige ninguna etapa, el contexto queda guardado y se usará la próxima vez que se regenere la ruta o se amplíe su banco de preguntas.
- No se puede editar mientras la ruta se está generando.

## 2. El Desafío: 2 intentos por ronda
- El Desafío se aprueba con su **propio porcentaje**, que el apoderado configura por ruta (por defecto 90%) y puede cambiar cuando quiera. Es independiente del porcentaje que el Diagnóstico necesita para abrir el Desafío.
- Tiene **2 intentos**. Si no aprueba en esos 2:
  1. El Desafío se bloquea.
  2. Debe repetir el Repaso (100% de las tarjetas, otra vez).
  3. Debe aprobar un Diagnóstico (con el porcentaje que abre el Desafío) hecho después del bloqueo.
  4. Entonces se abre un Desafío nuevo, con 2 intentos más.
- Al aprobar, la ruta queda completada y el Desafío no se rinde de nuevo.
- El historial de intentos y puntajes se conserva siempre.
- Los Desafíos rendidos antes de existir la regla de 2 intentos quedan en el historial, pero no cuentan como intento fallido.

## 2b. Desafío adicional

El apoderado puede habilitar otro Desafío cuando el alumno ya lo aprobó (o agotó un adicional anterior). Sirve para que el apoderado pruebe el modo Desafío y para que el alumno lo repita. Se habilita desde el panel o desde el detalle de la ruta ("➕ Habilitar otro Desafío", con confirmación).

- Da 2 intentos nuevos, con preguntas distintas a las ya vistas. Se puede repetir las veces que el apoderado quiera; el historial se conserva.
- La aprobación anterior sigue vigente: la ruta sigue "Completado" y el progreso en 100%.
- **Supuesto por confirmar:** fallar los 2 intentos de un adicional no reinicia la ronda ni obliga a repasar; el apoderado puede habilitar otro.
- Regenerar "Solo Desafío" cambia las preguntas pero no reabre el Desafío.

## 3. Evaluaciones siempre distintas
- Cada intento de Diagnóstico y de Desafío usa preguntas que el alumno no ha visto antes en esa ruta.
- Al crear la ruta se genera un banco con 2 lotes por evaluación. Cuando quedan menos preguntas nuevas que las necesarias para el próximo intento, el sistema genera un lote nuevo en segundo plano, con la llave de IA del apoderado.
- Las preguntas nuevas se preparan cuando el alumno termina un intento sin aprobar (si aprueba, no se gasta una llamada de IA de más). Normalmente tardan menos de 1 minuto.
- Si la IA entrega menos preguntas de las pedidas, se conservan las buenas y se piden solo las que faltan.
- Si no se puede generar (por ejemplo la llave ya no funciona), el alumno no recibe preguntas repetidas: se le informa que avise a su apoderado, y el apoderado ve el motivo en el detalle de la ruta.

## 4. Alumnos hasta 3° básico
- **Dibujos de apoyo:** las preguntas y las tarjetas del Repaso pueden llevar un dibujo hecho de emojis. Al menos el 40% de las preguntas lo trae.
- **Actividades de cuaderno:** entre 2 y 3 de cada 10 preguntas son actividades que el alumno hace en su cuaderno. Las valida un adulto supervisor.
- **Validación del adulto:** el adulto ingresa la contraseña de apoderado, ve la respuesta esperada y marca una de tres opciones:
  - **Correcto:** cuenta como correcta.
  - **Correcto con ayuda:** cuenta como correcta, pero se destaca en otro color (ámbar) en el resultado del alumno ("Para reforzar") y en el panel del apoderado, que además lista esas actividades para saber qué reforzar.
  - **Error:** cuenta como incorrecta.
- El alumno no puede validarse solo. Una actividad sin validar cuenta como incorrecta.
- El nivel se deduce del curso escrito en el perfil del alumno ("1° básico", "2do básico", "kinder"...).
- **Aviso al apoderado:** al crear o cambiar el curso de un alumno aparece un aviso (toast) que dice qué nivel entendió el sistema y pide revisar que el curso esté bien. Lo mismo se recuerda al crear una ruta. Si el curso no se reconoce, se advierte cómo escribirlo ("2° básico", "1° medio").
- El apoderado puede cambiar el curso de un alumno. Las rutas ya generadas no cambian: hay que regenerarlas para aplicar el nuevo nivel.

## 5. Dashboard del apoderado (HU-11)
Por cada ruta: estado (En Repaso, En Diagnóstico, En Desafío, Completado), intentos de Diagnóstico, mejor puntaje de Diagnóstico, puntaje del Desafío, intentos de Desafío disponibles, fecha de última actividad, veces que repasó de nuevo y cómo validó el adulto las actividades de cuaderno.

## Supuestos confirmados
- "Correcto con ayuda" cuenta como correcta, destacada en otro color para reforzar.
- El porcentaje para aprobar el Desafío es configurable por el apoderado, además del que abre el Desafío desde el Diagnóstico.
- "Un diagnóstico más correcto" = aprobar de nuevo el Diagnóstico después del bloqueo.
- Los dibujos son de emojis; no se generan imágenes reales.
- El apoderado debe cuidar que el curso esté bien escrito: de él depende el tipo de evaluación.
# Requisitos: Autenticación y Perfiles (PRD Módulo 1)

## HU-01 Registro de apoderado
Como apoderado, quiero registrarme con correo y contraseña para administrar las rutas de mis hijos.
1. WHEN el apoderado envía correo válido y contraseña, THE sistema SHALL crear la cuenta y abrir sesión.
2. IF el correo ya existe, THEN THE sistema SHALL rechazar con un mensaje claro sin revelar datos adicionales.
3. THE sistema SHALL guardar la contraseña solo como hash.

## HU-02 Perfiles de alumno
Como apoderado, quiero crear perfiles de alumno con usuario y contraseña simple para que entren sin correo.
1. WHEN el apoderado crea un alumno con nombre de usuario, contraseña, nombre visible y curso, THE sistema SHALL guardarlo asociado al apoderado.
2. THE sistema SHALL exigir nombre de usuario único.
3. WHEN un alumno ingresa usuario y contraseña en la pantalla de ingreso, THE sistema SHALL abrir una sesión con rol alumno.
4. THE sistema SHALL impedir que un alumno acceda a pantallas de apoderado y que un apoderado acceda a datos de alumnos ajenos.

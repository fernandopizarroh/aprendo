# Producto: Aprendo (EstudioAI)

Fuente de verdad de requisitos: `docs/PRD-Aprendo.md`.

- WebApp mobile-first. Apoderado crea rutas de aprendizaje desde temario + fotos de cuaderno; el alumno estudia en 3 etapas: Repaso, Diagnóstico (con pistas), Desafío (formal).
- BYOK: la IA usa la API key del apoderado (OpenAI, Gemini, Anthropic). Gemini es el proveedor recomendado por defecto.
- Roles: Apoderado (email/contraseña) y Alumno (usuario/contraseña sin email, creado por el apoderado).
- Desbloqueo: Repaso 100% completado, luego Diagnóstico >= umbral (default 90%), luego Desafío.
- Fuera de alcance v1: apps nativas, pagos, integraciones escolares, edición manual de preguntas, funciones sociales, chat libre.
- UX: botones táctiles grandes, alto contraste; tono sobrio para apoderado, lúdico con refuerzo positivo para alumno. Textos en español.

## Definiciones de la ronda 1 de UAT (ver `docs/DEFINICIONES-PRODUCTO.md`)
- Fotos opcionales: apoyo con ejemplos de ejercicios vistos en clase.
- Desafío: se aprueba con su propio porcentaje, configurable por el apoderado. 2 intentos por ronda. Si no aprueba, repite Repaso (100%) y aprueba un Diagnóstico para abrir un Desafío nuevo. Al aprobar, no se rinde de nuevo.
- Diagnóstico y Desafío: cada intento con preguntas nuevas (banco que se amplía con la llave del apoderado).
- Hasta 3° básico: dibujos de emojis y actividades de cuaderno validadas por un adulto (Correcto, Correcto con ayuda, Error; Error cuenta como incorrecta).
- Curso del alumno: define el nivel de la evaluación; el sistema avisa al apoderado (toast) qué entendió y que debe cuidar que esté bien.
- "Correcto con ayuda" cuenta como correcta, pero se muestra en otro color para reforzar.

# Requisitos: Configuración del Cerebro IA (PRD Módulo 2)

## HU-03 Configuración guiada de API Key
Como apoderado neófito, quiero un asistente paso a paso para conectar la IA sin frustrarme.
1. THE asistente SHALL mostrar un selector visual de proveedores (Gemini recomendado, OpenAI, Anthropic).
2. WHEN se elige un proveedor, THE asistente SHALL mostrar un enlace externo al portal de llaves y una guía de 3 pasos: iniciar sesión, crear llave, copiar y pegar.
3. WHEN el apoderado pulsa "Probar Conexión", THE sistema SHALL hacer una llamada mínima al proveedor y mostrar un mensaje en lenguaje humano de éxito o error.
4. WHEN la prueba es exitosa, THE sistema SHALL guardar la llave cifrada con AES-256 y el proveedor elegido.
5. THE sistema SHALL mostrar solo los últimos 4 caracteres de la llave guardada y nunca enviarla al frontend.
6. IF el proveedor responde cuota excedida, llave inválida o error de red, THEN THE sistema SHALL mostrar el motivo concreto devuelto por el proveedor.

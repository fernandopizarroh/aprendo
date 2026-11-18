# Diseño: Configuración IA

- Interfaz `AiProvider.testConnection(apiKey)` en `src/lib/ai/providers/{gemini,openai,anthropic}.ts`; registro en `src/lib/ai/index.ts` (`getProvider(id)`).
- Endpoint `POST /api/ai/test-connection` `{ provider, apiKey }`: llama al proveedor; si ok, cifra con `encryptSecret`, guarda `aiProvider`, `encryptedApiKey`, `apiKeyLast4` en `Parent`.
- Endpoint `GET /api/ai/status`: devuelve `{ provider, last4, configured }`.
- Mapeo de errores del proveedor a mensajes humanos (401/403 llave inválida, 429 cuota, red) conservando el detalle original en `providerDetail`.
- UI `/parent/ai-setup`: wizard de 3 pasos con componentes en `src/components/ai-setup/`. Guías en texto con imágenes estáticas en `public/guides/`.
- La llave solo se descifra en servidor, en memoria, al llamar al proveedor.
- Pruebas: proveedores con `fetch` mockeado; test de que ninguna respuesta de API contiene la llave.
